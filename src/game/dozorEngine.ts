import { campaignLevels, campaignSolutions, FIRST_SCORED_LEVEL_INDEX } from '../data/campaignLevels';
import { computeAttacks, rayDeltasFor, isInBounds } from './attackRules';
import type { Beacon, Beam, Cell, Piece, TrayItem } from './models';
import { cellKey } from './models';
import type { LevelAttemptResult } from './starRating';
import { computeStars } from './starRating';

export { FIRST_SCORED_LEVEL_INDEX };

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
  moveCount = 0;
  hintUsedCount = 0;
  levelResult: LevelAttemptResult | null = null;
  /** Set once a rewarded-ad bonus star has been granted for the current
   * frozen result; reset on every fresh attempt (see `loadLevel`). Mirrors
   * the mobile `DozorController._bonusStarAppliedForAttempt` guard — it
   * only gates *when the offer is shown*, not how many times `applyBonusStar`
   * itself can be called (1→2, then 2→3 each need their own confirmed ad). */
  bonusStarApplied = false;

  onLevelSolved: ((levelIndex: number, result: LevelAttemptResult) => void) | null = null;
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
    // Invalidate the memoized snapshot so `useSyncExternalStore` gets a
    // fresh, referentially-stable object per state change rather than a new
    // object identity on every render (which would defeat React's tearing
    // check and loop forever).
    this.cachedSnapshot = null;
    for (const listener of this.listeners) listener();
  }

  get level() {
    return campaignLevels[this.levelIndex];
  }
  get beacons() {
    return this.level.beacons;
  }

  private loadLevel(): void {
    this.pieces = [];
    this.tray = [...this.level.tray];
    this.sel = null;
    this.held = null;
    this.hint = false;
    this.attemptStart = Date.now();
    this.moveCount = 0;
    this.hintUsedCount = 0;
    this.levelResult = null;
    this.bonusStarApplied = false;
  }

  private checkForSolve(): void {
    if (this.levelResult != null) return;
    if (!this.snapshot().solved) return;
    const elapsedSeconds = Math.round((Date.now() - this.attemptStart) / 1000);
    const requiredMoves = this.level.tray.length;
    const scored = this.levelIndex >= FIRST_SCORED_LEVEL_INDEX;
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
    this.onLevelSolved?.(this.levelIndex, result);
  }

  nextLevel(): void {
    if (this.levelIndex >= campaignLevels.length - 1) return;
    this.levelIndex++;
    this.loadLevel();
    this.notify();
  }

  goToLevel(index: number): void {
    this.levelIndex = Math.min(Math.max(index, 0), campaignLevels.length - 1);
    this.loadLevel();
    this.notify();
  }

  attacks(p: Piece, occ: ReadonlySet<string>): Cell[] {
    return computeAttacks({
      type: p.type,
      c: p.c,
      r: p.r,
      pawnDirection: p.pawnDirection,
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
    this.levelResult = { ...current, stars: starsAfter };
    this.onBonusStarApplied?.(this.levelIndex, currentStars, starsAfter);
    this.notify();
  }

  private currentAttemptMetrics(): { elapsedSeconds: number; moveCount: number; hintUsedCount: number } {
    return {
      elapsedSeconds: Math.round((Date.now() - this.attemptStart) / 1000),
      moveCount: this.moveCount,
      hintUsedCount: this.hintUsedCount,
    };
  }

  private hintCell(occ: ReadonlySet<string>, beaconKey: ReadonlySet<string>): Cell | null {
    if (this.levelIndex >= campaignSolutions.length) return null;
    const solution = campaignSolutions[this.levelIndex];
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
    if (cell == null || this.levelIndex >= campaignSolutions.length) return null;
    const solution = campaignSolutions[this.levelIndex];
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
    };
  }
}
