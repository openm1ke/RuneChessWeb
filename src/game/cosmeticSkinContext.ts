/**
 * Hands the chosen set to everything that draws the board.
 *
 * A context rather than a prop because the board, the tray, the figures and
 * the coins are several levels apart in the tree and none of the components
 * between them care which set is on. Mirrors `CosmeticSkinScope` in the
 * Flutter app.
 */
import { createContext, useContext } from 'react';

import { classicSkin, type CosmeticSkin } from './cosmeticSkins';

export const CosmeticSkinContext = createContext<CosmeticSkin>(classicSkin);

export function useCosmeticSkin(): CosmeticSkin {
  return useContext(CosmeticSkinContext);
}
