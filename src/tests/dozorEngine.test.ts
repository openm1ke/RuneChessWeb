import { beforeEach, describe, expect, it } from 'vitest';
import { DozorEngine } from '../game/dozorEngine';
import { campaignSolutions, MAIN_CAMPAIGN_LEVEL_COUNT } from '../data/campaignLevels';

describe('DozorEngine', () => {
  let engine: DozorEngine;
  beforeEach(() => {
    engine = new DozorEngine();
  });

  it('starts on level 0 with an empty board and a full tray', () => {
    const snapshot = engine.snapshot();
    expect(engine.levelIndex).toBe(0);
    expect(snapshot.pieces).toHaveLength(0);
    expect(snapshot.tray).toHaveLength(1); // level 1 hands out a single pawn
    expect(snapshot.solved).toBe(false);
  });

  it('solves level 1 by placing the pawn on its known solution cell', () => {
    const solution = campaignSolutions[0];
    engine.tapTray('l1-pawn');
    engine.tapCell(solution[0].c, solution[0].r);
    const snapshot = engine.snapshot();
    expect(snapshot.tray).toHaveLength(0);
    expect(snapshot.solved).toBe(true);
    expect(engine.levelResult).not.toBeNull();
  });

  it('does not solve the level if a beacon is over-illuminated', () => {
    // Level 5 (index 4): beacons at (5,1) target 1, (5,0) target 1, (4,1)
    // target 2. Placing the rook at (0,1) correctly hits (5,1) once; placing
    // the queen at (5,4) also hits (5,1) via its own column, pushing that
    // single-target coin's count to 2 — over its target, so the level must
    // not register as solved even though the tray empties out.
    engine.goToLevel(4);
    const rookId = engine.tray.find((t) => t.type === 'rook')!.id;
    const queenId = engine.tray.find((t) => t.type === 'queen')!.id;
    engine.tapTray(rookId);
    engine.tapCell(0, 1);
    engine.tapTray(queenId);
    engine.tapCell(5, 4);
    const snapshot = engine.snapshot();
    expect(snapshot.tray).toHaveLength(0);
    expect(snapshot.counts['5,1']).toBe(2); // over the beacon's target of 1
    expect(snapshot.solved).toBe(false);
  });

  it('reset returns every figure to the tray and clears the frozen result', () => {
    const solution = campaignSolutions[0];
    engine.tapTray('l1-pawn');
    engine.tapCell(solution[0].c, solution[0].r);
    expect(engine.snapshot().solved).toBe(true);
    engine.resetLevel();
    const snapshot = engine.snapshot();
    expect(snapshot.pieces).toHaveLength(0);
    expect(snapshot.tray).toHaveLength(1);
    expect(snapshot.solved).toBe(false);
    expect(engine.levelResult).toBeNull();
    expect(engine.moveCount).toBe(0);
  });

  it('toggling the hint counts as a hint use and reveals the solution cell', () => {
    engine.toggleHint();
    expect(engine.hintUsedCount).toBe(1);
    const snapshot = engine.snapshot();
    expect(snapshot.solutionCell).toEqual(campaignSolutions[0][0]);
  });

  it('a piece can be picked up, moved, and returned to the tray', () => {
    const solution = campaignSolutions[0];
    engine.tapTray('l1-pawn');
    engine.tapCell(solution[0].c, solution[0].r);
    expect(engine.snapshot().pieces).toHaveLength(1);
    const moved = engine.movePiece('l1-pawn', 0, 5);
    expect(moved).toBe(true);
    expect(engine.snapshot().pieces[0]).toMatchObject({ c: 0, r: 5 });
    const returned = engine.returnPieceToTray('l1-pawn');
    expect(returned).toBe(true);
    expect(engine.snapshot().pieces).toHaveLength(0);
    expect(engine.snapshot().tray).toHaveLength(1);
  });

  it('cannot place a piece on top of a beacon or another piece', () => {
    const beacon = engine.beacons[0];
    engine.tapTray('l1-pawn');
    expect(engine.canDropTrayItem(beacon.c, beacon.r)).toBe(false);
  });

  it('a bonus-campaign level loads a 7×7 board with the matching cellPx', () => {
    engine.goToLevel(MAIN_CAMPAIGN_LEVEL_COUNT);
    const snapshot = engine.snapshot();
    expect(snapshot.boardSize).toBe(7);
    expect(snapshot.cellPx).toBeCloseTo(292 / 7);
  });

  it('an original-campaign level still loads a 6×6 board', () => {
    const snapshot = engine.snapshot();
    expect(snapshot.boardSize).toBe(6);
    expect(snapshot.cellPx).toBeCloseTo(292 / 6);
  });
});
