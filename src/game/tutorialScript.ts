import type { PieceType } from './pieceTypes';

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
export const tutorialScript: Record<string, string> = {
  'l1.place': 'Перетащите пешку на светящуюся клетку.',
  'l1.ray': 'Луч дошёл до монеты: пешка бьёт по диагонали вперёд.',
  'l2.place.first': '{piece} — на светящуюся клетку. Или тапом: фигура, клетка.',
  'l2.place.second': 'Теперь {piece} — на вторую светящуюся клетку.',
  'l2.ray': 'Ладья бьёт по прямым, слон — по диагоналям.',
  'l3.place.first': 'Цифра на монете — сколько лучей ей нужно.',
  'l3.place.second': 'Теперь {piece} — на вторую светящуюся клетку.',
  'l3.ray': 'Проверьте: лучей ровно столько, сколько на монете.',
  'l4.hint': 'Не знаете куда? Нажмите лампочку — покажем клетку.',
  'l4.place.king': 'Король — на светящуюся клетку: он бьёт вокруг себя.',
  'l4.place.first': '{piece} — на светящуюся клетку.',
  'l4.place.next': 'Дальше {piece} — на светящуюся клетку.',
  'l4.ray': 'Лучей у монеты должно быть ровно столько, сколько на ней.',
  'l5.trial.first': 'Попробуем так: {piece} — на светящуюся клетку.',
  'l5.trial.second': 'Теперь {piece} — на светящуюся клетку.',
  'l5.overflow': 'Лучей больше, чем нужно. Нажмите сброс — попробуем иначе.',
  'l5.place.first': '{piece} — на светящуюся клетку.',
  'l5.place.second': 'Теперь {piece} — на вторую светящуюся клетку.',
  'l5.ray': 'Две фигуры вместе должны зажечь все три монеты.',
};

/** Figure names in the nominative, the only case the script needs. */
export const tutorialPieceName: Record<PieceType, string> = {
  rook: 'Ладья',
  bishop: 'Слон',
  knight: 'Конь',
  king: 'Король',
  queen: 'Ферзь',
  pawn: 'Пешка',
};

/**
 * The line for `id`, with `{piece}` filled in. A missing figure falls back to
 * "Фигура", which reads correctly in every sentence above — that is the point
 * of keeping them nominative.
 */
export function tutorialLine(id: string, piece?: PieceType | null): string {
  const text = tutorialScript[id] ?? '';
  return text.replace('{piece}', piece ? tutorialPieceName[piece] : 'Фигура');
}
