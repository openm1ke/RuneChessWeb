import type { Strings } from '../l10n/ru';
import { pieceName, type PieceType } from './pieceTypes';

/**
 * Every line the first five levels say, as data — the mirror of the mobile
 * app's `lib/data/tutorial_script.dart`.
 *
 * The wording used to live in a `switch` on the level number inside the
 * coach-mark component, with a hand-typed copy of that switch in the Flutter
 * app. The two drifted, and nothing could notice: there were no tests,
 * because there was nothing to test but a component. Now the wording is a map
 * keyed by a stable id, `docs/TUTORIAL_SCRIPT.md` is the shared catalogue,
 * and both apps have a test that fails when a line stops matching it.
 *
 * The rules the wording follows, and why:
 *
 * - **The verb first.** A player reading a coach mark wants to know what to
 *   do; the explanation lands better once the thing has moved.
 * - **One line, one idea.** Every card fits a single line of the panel; the
 *   longest line used to be 118 characters and read as a paragraph.
 * - **One word per thing.** Монета, фигура, луч, светящаяся клетка — the old
 *   copy also said "пунктирная линия", "линии", "номинал", "число ударов"
 *   and "подсвеченная клетка" for the same five things.
 * - **Names in the nominative only.** They used to be stored in the
 *   accusative and pasted into three different grammatical positions, so the
 *   game shipped "Начните с ладью" and "ладью уже ждёт вас в панели".
 */
/** The ids, stable and shared with the Flutter app. The wording lives in
 * the language files; `docs/TUTORIAL_SCRIPT.md` remains the shared
 * catalogue and `tutorialScript.test.ts` still fails when the two
 * disagree. */
export const tutorialLineIds: readonly string[] = [
  'l1.place',
  'l1.ray',
  'l2.place.first',
  'l2.place.second',
  'l2.ray',
  'l3.place.first',
  'l3.place.second',
  'l3.ray',
  'l4.hint',
  'l4.place.king',
  'l4.place.first',
  'l4.place.next',
  'l4.ray',
  'l5.trial.first',
  'l5.trial.second',
  'l5.overflow',
  'l5.place.first',
  'l5.place.second',
  'l5.ray',
];

/** The line for [id], with the figure's name filled in.
 *
 * A missing figure falls back to `tutorialAnyPiece`, which reads correctly
 * in every sentence — that is the point of keeping the names nominative. */
export function tutorialLine(
  l10n: Strings,
  id: string,
  piece?: PieceType | null,
): string {
  const name = piece ? pieceName(l10n, piece) : l10n.tutorialAnyPiece;
  return ({
    'l1.place': l10n.tutL1Place,
    'l1.ray': l10n.tutL1Ray,
    'l2.place.first': l10n.tutL2PlaceFirst(name),
    'l2.place.second': l10n.tutL2PlaceSecond(name),
    'l2.ray': l10n.tutL2Ray,
    'l3.place.first': l10n.tutL3PlaceFirst,
    'l3.place.second': l10n.tutL3PlaceSecond(name),
    'l3.ray': l10n.tutL3Ray,
    'l4.hint': l10n.tutL4Hint,
    'l4.place.king': l10n.tutL4PlaceKing,
    'l4.place.first': l10n.tutL4PlaceFirst(name),
    'l4.place.next': l10n.tutL4PlaceNext(name),
    'l4.ray': l10n.tutL4Ray,
    'l5.trial.first': l10n.tutL5TrialFirst(name),
    'l5.trial.second': l10n.tutL5TrialSecond(name),
    'l5.overflow': l10n.tutL5Overflow,
    'l5.place.first': l10n.tutL5PlaceFirst(name),
    'l5.place.second': l10n.tutL5PlaceSecond(name),
    'l5.ray': l10n.tutL5Ray,
  } as Record<string, string>)[id] ?? '';
}
