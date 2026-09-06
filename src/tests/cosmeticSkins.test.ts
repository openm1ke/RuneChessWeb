// A cosmetic set is a list of file paths, and a wrong one fails as a broken
// image on the board — in the player's browser, with nothing in any log
// anybody reads. These check the catalogue against what is actually in
// `public/`, and against the mobile app it is a port of: the two platforms
// have to offer the same sets under the same ids, or a player who plays both
// sees two different games.
import { describe, expect, it } from 'vitest';
// Imported through Vite's `?raw` rather than read with node:fs: this project
// is typechecked by `tsc -b` without Node types, so a `node:fs` import builds
// locally under vitest and fails the deploy.
import shippedFiles from '../../public/assets/images/cosmetics/obsidian_astral/board.webp?url';
import { ALL_PIECE_TYPES } from '../game/pieceTypes';
import {
  classicSkin,
  coinAsset,
  cosmeticSkins,
  obsidianAstralSkin,
  skinById,
  uprightRotationOf,
} from '../game/cosmeticSkins';

describe('cosmetic skins', () => {
  it('every set draws every figure and all six coin faces', () => {
    for (const skin of cosmeticSkins) {
      for (const type of ALL_PIECE_TYPES) {
        expect(skin.pieceAssets[type], `${skin.id}/${type}`).toBeTruthy();
      }
      expect(skin.coinAssets, skin.id).toHaveLength(6);
      // Beacons ask for 0..5; anything else must still return a face rather
      // than an undefined src on the board.
      expect(coinAsset(skin, 0)).toBe(skin.coinAssets[0]);
      expect(coinAsset(skin, 5)).toBe(skin.coinAssets[5]);
      expect(coinAsset(skin, 9)).toBe(skin.coinAssets[5]);
    }
  });

  it('the set with its own art is actually shipped in public/', () => {
    // Resolving the file through Vite fails the build if it is missing, and
    // the skin has to point at that same file.
    expect(shippedFiles).toBeTruthy();
    expect(obsidianAstralSkin.boardAsset).toContain(
      'cosmetics/obsidian_astral/board.webp',
    );
    expect(obsidianAstralSkin.boardFrameAsset).toContain('board-frame.webp');
  });

  it('sets have distinct ids, and an unknown one falls back to classic', () => {
    const ids = cosmeticSkins.map((skin) => skin.id);
    expect(new Set(ids).size).toBe(ids.length);

    expect(skinById('obsidian_astral').id).toBe('obsidian_astral');
    // A set dropped in a later build must not leave the game unplayable.
    expect(skinById('a_set_that_was_removed')).toBe(classicSkin);
    expect(skinById(null)).toBe(classicSkin);
  });

  it('matches the mobile catalogue: same ids, same corrections', () => {
    // The Flutter app's `CosmeticSkin.all`, in order. A set added on one
    // platform and not the other is the drift this catches.
    expect(cosmeticSkins.map((skin) => skin.id)).toEqual([
      'classic',
      'obsidian_astral',
    ]);
    // The classic art is not drawn upright; the obsidian art is.
    expect(uprightRotationOf(classicSkin, 'king')).toBe(-6.5);
    expect(uprightRotationOf(classicSkin, 'rook')).toBe(4);
    expect(uprightRotationOf(obsidianAstralSkin, 'king')).toBe(0);
  });

  it('a set carved from one material lights its figures', () => {
    // The classic figures are six colours already; obsidian ones are not,
    // and without the halo they vanish into the squares.
    expect(classicSkin.pieceAmbientGlow).toBe(0);
    expect(obsidianAstralSkin.pieceAmbientGlow).toBeGreaterThan(0);
  });

  it('a set brings its own room and its own wide table', () => {
    // Landscape and the menu are skinned too; a set that named neither
    // would fall back to the classic room mid-scene.
    for (const skin of cosmeticSkins) {
      expect(skin.menuBackground, skin.id).toBeTruthy();
      expect(skin.wideMenuBackground, skin.id).toBeTruthy();
      expect(skin.wideBoardAsset, skin.id).toBeTruthy();
    }
    expect(obsidianAstralSkin.wideBoardAsset).toContain('board-wide.webp');
    expect(obsidianAstralSkin.menuBackground).toContain('menu.webp');
  });

  it('the classic room breathes, the obsidian one keeps still', () => {
    // The brighter twin is what `.menu-backdrop-breath` fades in and out;
    // a set without one must render no layer at all rather than an empty
    // <img>.
    expect(classicSkin.menuBackgroundLively).toContain('living-bright');
    expect(obsidianAstralSkin.menuBackgroundLively).toBeNull();
  });

  it('only a frame that overhangs carries a layer of its own', () => {
    // The classic frame ends where the felt begins; the obsidian one leans
    // its gems in over the squares, so it needs to be drawn back on top.
    expect(classicSkin.boardFrameAsset).toBeNull();
    expect(obsidianAstralSkin.boardFrameAsset).not.toBeNull();
  });
});
