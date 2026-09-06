import { campaignLevels, campaignSolutions, FIRST_SCORED_LEVEL_INDEX } from '../data/campaignLevels';
import { computeAttacks, rayDeltasFor, isInBounds } from './attackRules';
import type { Beacon, Beam, Cell, LevelDefinition, Piece, TrayItem } from './models';
import { cellKey } from './models';
import type { PieceType } from './pieceTypes';
import type { LevelAttemptResult } from './starRating';
import { computeStars } from './starRating';

export { FIRST_SCORED_LEVEL_INDEX };

/** The three beats of the fifth lesson — see `TutorialCoachmark`. */
export type LessonPhase = 'trial' | 'overflow' | 'solution';

export interface DozorSnapshot {
  pieces: Piece[];
  tray: TrayItem[];
  beams: Beam[];
  counts: Record<string, number>;
  beacons: Beacon[];
  doneCount: number;
  solved: boolean;
  levelNumber: number;
  levelCount: number;
  levelLabel: string;
  active: boolean;
  solutionCell: Cell | null;
  hintItem: TrayItem | null;
  nextSolutionCell: Cell | null;
  nextSolutionItem: TrayItem | null;
  sel: string | null;
  held: string | null;
  cellPx: number;
  boardSize: number;
  occ: ReadonlySet<string>;
  beaconKey: ReadonlySet<string>;
  /** How many figures the level started with. The tray sizes its tiles from
   * this rather than from what is left, so they hold one size for the whole
   * level — see `Tray`. */
  levelTrayCount: number;
  /** See `DozorEngine.lessonPhase`. */
  lessonPhase: LessonPhase;
  /** The cell a dragged figure is being held over, and what it is — the
   * board draws a ghost of it there. Null unless a drag is in flight over a
   * placeable cell. See `DozorEngine.setDragPreview`. */
  previewCell: Cell | null;
  previewType: PieceType | null;
  /** What that figure would light up from `previewCell`: `previewBeams` to
   * the beacons it would hit, `previewCells` every square it would strike. */
  previewBeams: Beam[];
  previewCells: Cell[];
}

function hypot(dx: number, dy: number): number {
  const v = dx * dx + dy * dy;
  return v <= 0 ? 1 : Math.sqrt(v);
}

/**
 * Port of the original Flutter `DozorController`: pick up a piece (from the
 * board or the tray) and drop it on an empty, non-beacon cell. Recomputes
 * attack beams and beacon completion on every change. This class holds
 * state directly (no framework state manager) and notifies subscribers, the
 * same "ChangeNotifier" shape as the original — React components subscribe
 * via `useSyncExternalStore` (see `useDozorEngine`).
 */
export class DozorEngine {
  levelIndex = 0;
  pieces: Piece[] = [];
  tray: TrayItem[] = [];
  sel: string | null = null;
  held: string | null = null;
  hint = false;

  private attemptStart = Date.now();

  /** Time this attempt spent with the tab hidden, and when that stretch
   * started (null while the tab is visible).
   *
   * Elapsed used to be plain wall-clock, so a level left open in a
   * background tab overnight reported hours of "solving" — and the mobile
   * app had exactly the same fault, which matters because the two feed one
   * funnel. Play time is what the metric describes, so time away is
   * subtracted. See `App.tsx`'s visibilitychange handler. */
  private hiddenFor = 0;
  private hiddenSince: number | null = null;

  private elapsedMs(): number {
    const away =
      this.hiddenFor + (this.hiddenSince == null ? 0 : Date.now() - this.hiddenSince);
    return Math.max(0, Date.now() - this.attemptStart - away);
  }

  /** Idempotent in both directions: a repeated hide, or a show without a
   * preceding hide, changes nothing. */
  onHidden(): void {
    this.hiddenSince ??= Date.now();
  }

  onVisible(): void {
    if (this.hiddenSince == null) return;
    this.hiddenFor += Date.now() - this.hiddenSince;
    this.hiddenSince = null;
  }

  /** How the current attempt is going, for an abandonment report — the
   * attempt's own clock is private, so a caller cannot assemble this. */
  get attemptMetrics(): { elapsedSeconds: number; moveCount: number; hintUsedCount: number } {
    return {
      elapsedSeconds: Math.round(this.elapsedMs() / 1000),
      moveCount: this.moveCount,
      hintUsedCount: this.hintUsedCount,
    };
  }
  moveCount = 0;
  hintUsedCount = 0;
  levelResult: LevelAttemptResult | null = null;
  /** Set once a rewarded-ad bonus star has been granted for the current
   * frozen result; reset on every fresh attempt (see `loadLevel`). Mirrors
   * the mobile `DozorController._bonusStarAppliedForAttempt` guard — it
   * only gates *when the offer is shown*, not how many times `applyBonusStar`
   * itself can be called (1→2, then 2→3 each need their own confirmed ad). */
  bonusStarApplied = false;

  /** Set only while playing the daily challenge (see `loadDailyChallenge`):
   * overrides `level` and its reference solution without disturbing
   * `levelIndex`, which keeps pointing at whatever campaign level the
   * player was last on so returning to the campaign resumes exactly there. */
  private dailyLevel: LevelDefinition | null = null;
  private dailySolution: Cell[] | null = null;
  private dailyDateLabel: string | null = null;
  get isDailyChallenge(): boolean {
    return this.dailyLevel != null;
  }

  onLevelSolved: ((levelIndex: number, result: LevelAttemptResult) => void) | null = null;
  /** The daily-challenge counterpart of `onLevelSolved`, kept separate
   * because there is no meaningful `levelIndex` to report for it. */
  onDailyChallengeSolved: ((result: LevelAttemptResult) => void) | null = null;
  onHintUsed: ((levelIndex: number, hintUsedCount: number, viaAd: boolean) => void) | null = null;
  onBonusStarApplied: ((levelIndex: number, starsBefore: number, starsAfter: number) => void) | null = null;
  onLevelReset:
    | ((levelIndex: number, metrics: { elapsedSeconds: number; moveCount: number; hintUsedCount: number }) => void)
    | null = null;

  private listeners = new Set<() => void>();
  private cachedSnapshot: DozorSnapshot | null = null;

  constructor() {
    this.loadLevel();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private notify(): void {
    this.syncLessonPhase();
    // Invalidate the memoized snapshot so `useSyncExternalStore` gets a
    // fresh, referentially-stable object per state change rather than a new
    // object identity on every render (which would defeat React's tearing
    // check and loop forever).
    this.cachedSnapshot = null;
    for (const listener of this.listeners) listener();
  }

  get level(): LevelDefinition {
    return this.dailyLevel ?? campaignLevels[this.levelIndex];
  }
  get beacons() {
    return this.level.beacons;
  }

  /** Starts a daily-challenge puzzle on a clean board — always empty, even
   * for a day already solved before: reopening it is a deliberate replay
   * (typically to improve the score), not a resume. `dateLabel` is kept
   * only to label the header (see `DozorSnapshot.levelLabel`) — the level
   * and solution themselves must already be generated for it by the caller
   * (`dailyChallengeLevel`). */
  loadDailyChallenge(level: LevelDefinition, solution: Cell[], dateLabel: string): void {
    this.dailyLevel = level;
    this.dailySolution = solution;
    this.dailyDateLabel = dateLabel;
    this.loadLevel();
    this.notify();
  }

  /** Leaves daily-challenge mode and returns to whatever campaign level
   * `levelIndex` still points at. */
  exitDailyChallenge(): void {
    this.dailyLevel = null;
    this.dailySolution = null;
    this.dailyDateLabel = null;
    this.loadLevel();
    this.notify();
  }

  private loadLevel(): void {
    this.pieces = [];
    this.tray = [...this.level.tray];
    this.sel = null;
    this.held = null;
    this.hint = false;
    this.attemptStart = Date.now();
    this.lessonPhase = 'trial';
    this.hiddenFor = 0;
    // Stay "still hidden", but start the stretch now: a fresh attempt cannot
    // have been away longer than it has existed.
    if (this.hiddenSince != null) this.hiddenSince = Date.now();
    this.moveCount = 0;
    this.hintUsedCount = 0;
    this.levelResult = null;
    this.bonusStarApplied = false;
  }

  private checkForSolve(): void {
    if (this.levelResult != null) return;
    if (!this.snapshot().solved) return;
    const elapsedSeconds = Math.round(this.elapsedMs() / 1000);
    const requiredMoves = this.level.tray.length;
    const scored = this.isDailyChallenge || this.levelIndex >= FIRST_SCORED_LEVEL_INDEX;
    const result: LevelAttemptResult = {
      stars: scored
        ? computeStars({
            requiredMoves,
            moveCount: this.moveCount,
            hintUsedCount: this.hintUsedCount,
            elapsedSeconds,
          })
        : null,
      elapsedSeconds,
      moveCount: this.moveCount,
      hintUsedCount: this.hintUsedCount,
    };
    this.levelResult = result;
    if (this.isDailyChallenge) this.onDailyChallengeSolved?.(result);
    else this.onLevelSolved?.(this.levelIndex, result);
  }

  nextLevel(): void {
    if (this.levelIndex >= campaignLevels.length - 1) return;
    this.dailyLevel = null;
    this.dailySolution = null;
    this.dailyDateLabel = null;
    this.levelIndex++;
    this.loadLevel();
    this.notify();
  }

  /** Opens an unlocked level with a clean board. Always leaves
   * daily-challenge mode if it was active — every campaign entry point
   * must, so a stray missed `exitDailyChallenge` call can never leave a
   * campaign level silently showing the daily puzzle instead. */
  goToLevel(index: number): void {
    this.dailyLevel = null;
    this.dailySolution = null;
    this.dailyDateLabel = null;
    this.levelIndex = Math.min(Math.max(index, 0), campaignLevels.length - 1);
    this.loadLevel();
    this.notify();
  }

  attacks(p: Piece, occ: ReadonlySet<string>): Cell[] {
    return computeAttacks({
      type: p.type,
      c: p.c,
      r: p.r,
      occupied: occ,
      boardN: this.level.boardSize,
    });
  }

  private isCellFreeForPlacement(cellC: number, cellR: number, excludingPieceId?: string): boolean {
    const busy = this.pieces.some((p) => p.id !== excludingPieceId && p.c === cellC && p.r === cellR);
    const isBeacon = this.beacons.some((b) => b.c === cellC && b.r === cellR);
    return !busy && !isBeacon;
  }

  tapCell(cellC: number, cellR: number): void {
    if (!this.isCellFreeForPlacement(cellC, cellR)) return;

    if (this.held != null) {
      const heldId = this.held;
      this.pieces = this.pieces.map((p) => (p.id === heldId ? { ...p, c: cellC, r: cellR } : p));
      this.held = null;
      this.hint = false;
      this.moveCount++;
      this.cachedSnapshot = null;
    this.checkForSolve();
      this.notify();
      return;
    }

    if (this.sel == null) return;
    const item = this.tray.find((t) => t.id === this.sel);
    if (item == null) return;
    this.pieces = [
      ...this.pieces,
      { id: item.id, type: item.type, c: cellC, r: cellR, pawnDirection: item.pawnDirection },
    ];
    this.tray = this.tray.filter((t) => t.id !== this.sel);
    this.sel = null;
    this.hint = false;
    this.moveCount++;
    this.cachedSnapshot = null;
    this.checkForSolve();
    this.notify();
  }

  tapPiece(id: string): void {
    if (this.held === id) {
      this.held = null;
      this.notify();
      return;
    }
    this.held = id;
    this.sel = null;
    this.notify();
  }

  tapTray(id: string): void {
    this.sel = this.sel === id ? null : id;
    this.held = null;
    this.notify();
  }

  returnPieceToTray(pieceId: string): boolean {
    const piece = this.pieces.find((p) => p.id === pieceId);
    if (piece == null) return false;
    this.pieces = this.pieces.filter((p) => p.id !== pieceId);
    this.tray = [...this.tray, { id: piece.id, type: piece.type, pawnDirection: piece.pawnDirection }];
    this.held = null;
    this.sel = null;
    this.hint = false;
    this.moveCount++;
    this.notify();
    return true;
  }

  resetLevel(): void {
    this.onLevelReset?.(this.levelIndex, this.currentAttemptMetrics());
    this.loadLevel();
    this.notify();
  }

  canDropTrayItem(cellC: number, cellR: number): boolean {
    return this.isCellFreeForPlacement(cellC, cellR);
  }

  dropTrayItem(itemId: string, cellC: number, cellR: number): boolean {
    if (!this.canDropTrayItem(cellC, cellR)) return false;
    const item = this.tray.find((t) => t.id === itemId);
    if (item == null) return false;
    this.pieces = [
      ...this.pieces,
      { id: item.id, type: item.type, c: cellC, r: cellR, pawnDirection: item.pawnDirection },
    ];
    this.tray = this.tray.filter((t) => t.id !== itemId);
    this.sel = null;
    this.held = null;
    this.hint = false;
    this.moveCount++;
    this.cachedSnapshot = null;
    this.checkForSolve();
    this.notify();
    return true;
  }

  canMovePiece(pieceId: string, cellC: number, cellR: number): boolean {
    const piece = this.pieces.find((p) => p.id === pieceId);
    if (piece == null) return false;
    return this.isCellFreeForPlacement(cellC, cellR, pieceId);
  }

  movePiece(pieceId: string, cellC: number, cellR: number): boolean {
    if (!this.canMovePiece(pieceId, cellC, cellR)) return false;
    this.pieces = this.pieces.map((piece) =>
      piece.id === pieceId ? { ...piece, c: cellC, r: cellR } : piece,
    );
    this.held = null;
    this.sel = null;
    this.hint = false;
    this.moveCount++;
    this.cachedSnapshot = null;
    this.checkForSolve();
    this.notify();
    return true;
  }

  /** Free toggle for tutorial levels — never used on campaign levels, where
   * every hint is earned via [grantHint]. */
  toggleHint(): void {
    const turningOn = !this.hint;
    this.hint = !this.hint;
    if (turningOn) {
      this.hintUsedCount++;
      this.onHintUsed?.(this.levelIndex, this.hintUsedCount, false);
    }
    this.notify();
  }

  /** Grants one earned hint after a confirmed rewarded-ad view — campaign
   * hints are "purchased" individually this way, never toggled off by a
   * second tap. Mirrors `DozorController.grantHint()`. */
  grantHint(): void {
    this.hint = true;
    this.hintUsedCount++;
    this.onHintUsed?.(this.levelIndex, this.hintUsedCount, true);
    this.notify();
  }

  /** Bumps the current frozen result by one star (never above 3) after a
   * confirmed bonus-star ad reward. May be called again after a fresh ad
   * view once the result is still below 3 (1→2, then 2→3). Mirrors
   * `DozorController.applyBonusStar()`. */
  applyBonusStar(): void {
    const current = this.levelResult;
    const currentStars = current?.stars;
    if (current == null || currentStars == null || currentStars >= 3) return;
    this.bonusStarApplied = true;
    const starsAfter = currentStars + 1;
    const updated = { ...current, stars: starsAfter };
    this.levelResult = updated;
    // The daily challenge has no `levelIndex` of its own to report a bonus
    // star against — `onDailyChallengeSolved` already merges into the best
    // saved result for the day, so reusing it here for the improved result
    // is correct, not just convenient. `onBonusStarApplied` stays
    // campaign-only.
    if (this.isDailyChallenge) this.onDailyChallengeSolved?.(updated);
    else this.onBonusStarApplied?.(this.levelIndex, currentStars, starsAfter);
    this.notify();
  }

  private currentAttemptMetrics(): { elapsedSeconds: number; moveCount: number; hintUsedCount: number } {
    return {
      elapsedSeconds: Math.round(this.elapsedMs() / 1000),
      moveCount: this.moveCount,
      hintUsedCount: this.hintUsedCount,
    };
  }

  private hintCell(occ: ReadonlySet<string>, beaconKey: ReadonlySet<string>): Cell | null {
    const solution = this.isDailyChallenge
      ? this.dailySolution!
      : this.levelIndex >= campaignSolutions.length
        ? null
        : campaignSolutions[this.levelIndex];
    if (solution == null) return null;
    const originalTray = this.level.tray;
    for (const item of this.tray) {
      const index = originalTray.findIndex((t) => t.id === item.id);
      if (index < 0 || index >= solution.length) continue;
      const target = solution[index];
      const key = cellKey(target.c, target.r);
      if (occ.has(key) || beaconKey.has(key)) continue;
      return target;
    }
    return null;
  }

  private hintItemForCell(cell: Cell | null): TrayItem | null {
    if (cell == null) return null;
    const solution = this.isDailyChallenge
      ? this.dailySolution!
      : this.levelIndex >= campaignSolutions.length
        ? null
        : campaignSolutions[this.levelIndex];
    if (solution == null) return null;
    for (const item of this.tray) {
      const index = this.level.tray.findIndex((original) => original.id === item.id);
      if (index < 0 || index >= solution.length) continue;
      if (solution[index].c === cell.c && solution[index].r === cell.r) return item;
    }
    return null;
  }

  /**
   * Memoized presentation state, mirroring `renderVals()`/`snapshot()` in the
   * original. Recomputed lazily, only after a state-changing call invalidates
   * the cache (see `notify`), so repeated calls between mutations — e.g. from
   * React's `useSyncExternalStore` re-render check — return the same object.
   */
  /**
   * Every beam a piece standing on its cell would draw to the beacons it
   * hits. Extracted from `computeSnapshot` so a piece the player is only
   * *holding over* a cell can be previewed with the same geometry the placed
   * ones use — see `setDragPreview`.
   */
  private beamsFor(
    p: Piece,
    hits: Cell[],
    occ: ReadonlySet<string>,
    beaconKey: ReadonlySet<string>,
    cellPx: number,
    boardSize: number,
  ): Beam[] {
    const beams: Beam[] = [];
    const px = p.c * cellPx + cellPx / 2;
    const py = p.r * cellPx + cellPx / 2;

    if (p.type === 'knight') {
      for (const h of hits.filter((h) => beaconKey.has(cellKey(h.c, h.r)))) {
        const hx = h.c * cellPx + cellPx / 2;
        const hy = h.r * cellPx + cellPx / 2;
        const mx = (px + hx) / 2;
        const my = (py + hy) / 2;
        const dx = hx - px;
        const dy = hy - py;
        const len = dx * dx + dy * dy === 0 ? 1 : hypot(dx, dy);
        const ox = (-dy / len) * 38;
        const oy = (dx / len) * 38;
        beams.push({
          type: p.type,
          points: [
            { dx: px, dy: py },
            { dx: mx + ox, dy: my + oy },
            { dx: hx, dy: hy },
          ],
        });
      }
    } else if (p.type === 'king' || p.type === 'pawn') {
      for (const h of hits.filter((h) => beaconKey.has(cellKey(h.c, h.r)))) {
        beams.push({
          type: p.type,
          points: [
            { dx: px, dy: py },
            { dx: h.c * cellPx + cellPx / 2, dy: h.r * cellPx + cellPx / 2 },
          ],
        });
      }
    } else {
      for (const [dc, dr] of rayDeltasFor(p.type)) {
        let c = p.c + dc;
        let r = p.r + dr;
        while (isInBounds(c, r, boardSize)) {
          const key = cellKey(c, r);
          if (beaconKey.has(key)) {
            beams.push({
              type: p.type,
              points: [
                { dx: px, dy: py },
                { dx: c * cellPx + cellPx / 2, dy: r * cellPx + cellPx / 2 },
              ],
            });
          }
          if (occ.has(key)) break;
          c += dc;
          r += dr;
        }
      }
    }
    return beams;
  }

  /** The cell a dragged figure is currently held over, and which figure it
   * is — the board previews what that figure would light up from there.
   *
   * The game is entirely about "where does this piece strike", and until now
   * the only way to find out was to place it and look: beams appeared after
   * the fact. Answering the question while the figure is still in the air is
   * the difference between reasoning and guessing. */
  private previewCell: Cell | null = null;
  private previewPieceId: string | null = null;

  /** Called from the drag controller as the figure moves over the board.
   * `id` is a tray item id or an already-placed piece id; a null `cell`
   * (the drag left the board, or was dropped) clears the preview. */
  setDragPreview(id: string | null, cell: Cell | null): void {
    const same =
      this.previewPieceId === (cell == null ? null : id) &&
      this.previewCell?.c === cell?.c &&
      this.previewCell?.r === cell?.r;
    if (same) return;
    this.previewPieceId = cell == null ? null : id;
    this.previewCell = cell;
    this.notify();
  }

  clearDragPreview(): void {
    this.setDragPreview(null, null);
  }

  /** The piece the preview would put on `previewCell`, or null when nothing
   * is being dragged over a placeable cell. */
  private previewPiece(): Piece | null {
    const cell = this.previewCell;
    const id = this.previewPieceId;
    if (cell == null || id == null) return null;
    const item = this.tray.find((t) => t.id === id);
    if (item != null) {
      return { id: item.id, type: item.type, c: cell.c, r: cell.r, pawnDirection: item.pawnDirection };
    }
    // An already-placed figure being moved: preview it from the new cell,
    // with its old position no longer blocking anything.
    const placed = this.pieces.find((p) => p.id === id);
    return placed == null ? null : { ...placed, c: cell.c, r: cell.r };
  }

  /** How far the fifth lesson has got: its "try it, see it overflow, now do
   * it properly" arc.
   *
   * It lived in the coach mark's own state, so anything that remounted the
   * component restarted the lesson from the beginning, halfway through. It
   * belongs to the attempt, like every other piece of progress. */
  lessonPhase: LessonPhase = 'trial';

  /** Every mutation funnels through `notify`, which is the one place that
   * sees each board change exactly once. */
  private syncLessonPhase(): void {
    if (this.levelIndex !== FIRST_SCORED_LEVEL_INDEX - 1) return;
    if (this.lessonPhase === 'trial' && this.tray.length === 0 && this.hasOverfilledBeacon()) {
      this.lessonPhase = 'overflow';
    } else if (this.lessonPhase === 'overflow' && this.pieces.length === 0) {
      this.lessonPhase = 'solution';
    }
  }

  private hasOverfilledBeacon(): boolean {
    const occ = new Set(this.pieces.map((p) => cellKey(p.c, p.r)));
    const counts: Record<string, number> = {};
    for (const p of this.pieces) {
      for (const hit of this.attacks(p, occ)) {
        const key = cellKey(hit.c, hit.r);
        counts[key] = (counts[key] ?? 0) + 1;
      }
    }
    return this.beacons.some((b) => (counts[cellKey(b.c, b.r)] ?? 0) > b.target);
  }

  snapshot(): DozorSnapshot {
    if (this.cachedSnapshot != null) return this.cachedSnapshot;
    this.cachedSnapshot = this.computeSnapshot();
    return this.cachedSnapshot;
  }

  private computeSnapshot(): DozorSnapshot {
    const boardSize = this.level.boardSize;
    const cellPx = 292.0 / boardSize;
    const occ = new Set<string>(this.pieces.map((p) => cellKey(p.c, p.r)));
    const beaconKey = new Set<string>(this.beacons.map((b) => cellKey(b.c, b.r)));
    const counts: Record<string, number> = {};
    const beams: Beam[] = [];

    let allPiecesUseful = true;

    for (const p of this.pieces) {
      const hits = this.attacks(p, occ);
      if (allPiecesUseful && !hits.some((h) => beaconKey.has(cellKey(h.c, h.r)))) {
        allPiecesUseful = false;
      }
      for (const h of hits) {
        const k = cellKey(h.c, h.r);
        counts[k] = (counts[k] ?? 0) + 1;
      }
      beams.push(...this.beamsFor(p, hits, occ, beaconKey, cellPx, boardSize));
    }

    // What the figure currently held over the board would light up from
    // there: the same beams a placed figure draws, plus every cell it
    // strikes, so the board can answer "where does this hit" before the
    // player commits to an answer.
    const previewPiece = this.previewPiece();
    let previewBeams: Beam[] = [];
    let previewCells: Cell[] = [];
    if (previewPiece != null) {
      // The moved figure's own square must not block its new line of fire.
      const previewOcc = new Set(occ);
      previewOcc.delete(cellKey(previewPiece.c, previewPiece.r));
      previewCells = this.attacks(previewPiece, previewOcc);
      previewBeams = this.beamsFor(previewPiece, previewCells, previewOcc, beaconKey, cellPx, boardSize);
    }

    const doneCount = this.beacons.filter((b) => (counts[cellKey(b.c, b.r)] ?? 0) === b.target).length;
    const active = this.sel != null || this.held != null;
    const nextSolutionCell = this.hintCell(occ, beaconKey);
    const nextSolutionItem = this.hintItemForCell(nextSolutionCell);
    const solutionCell = this.hint ? nextSolutionCell : null;
    const hintItem = this.hint ? nextSolutionItem : null;

    return {
      pieces: this.pieces,
      tray: this.tray,
      beams,
      counts,
      beacons: this.beacons,
      doneCount,
      solved: this.tray.length === 0 && doneCount === this.beacons.length && allPiecesUseful,
      levelNumber: this.levelIndex + 1,
      levelCount: campaignLevels.length,
      levelLabel: this.isDailyChallenge ? `ЗАДАНИЕ ДНЯ · ${this.dailyDateLabel}` : `УРОВЕНЬ ${this.levelIndex + 1}`,
      active,
      solutionCell,
      hintItem,
      nextSolutionCell,
      nextSolutionItem,
      sel: this.sel,
      held: this.held,
      cellPx,
      boardSize,
      occ,
      beaconKey,
      levelTrayCount: this.level.tray.length,
      lessonPhase: this.lessonPhase,
      previewCell: previewPiece == null ? null : { c: previewPiece.c, r: previewPiece.r },
      previewType: previewPiece?.type ?? null,
      previewBeams,
      previewCells,
    };
  }
}
