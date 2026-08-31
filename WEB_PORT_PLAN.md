# Dozor — веб-порт: технический план

## Стек

**TypeScript + Vite + React**, стилизация через обычный CSS (design tokens в
`src/styles/tokens.css`) плюс `<canvas>`/SVG для доски и лучей атаки. Без
тяжёлого игрового фреймворка (Phaser/PixiJS не нужны — сцена статична и
состоит из позиционированных спрайтов, как в оригинале на Flutter, где тоже
просто `Stack` + `Positioned` + `CustomPaint`). Без бэкенда — весь прогресс
живёт в `localStorage`.

Тесты — `vitest` (уже совместим с Vite, не требует отдельного раннера).

## Точное сохранение уровней и решений

Процедурная генерация уровней 13–112 в `lib/data/campaign_levels.dart`
использует `dart:math.Random` с фиксированными сидами. Алгоритм PRNG в
Dart VM не документирован и не переносится побитово в JS. Вместо того чтобы
переизобретать генератор на другом PRNG (что дало бы *другие*, пусть и
валидные, уровни), значения были выгружены прямо из Dart:

- временный тестовый файл (`flutter test`) импортировал
  `kTutorialLevels`/`kCampaignSolutions` и сериализовал их в JSON;
- результат сохранён как `web/src/data/campaignLevelsData.json` (112 уровней
  + 112 решений, побайтово те же данные, что видит игрок в Flutter-версии);
- временный скрипт/тест удалён сразу после выгрузки — в исходном Flutter-коде
  никаких следов не осталось.

Это даёт 100% идентичность уровней при нулевом риске рассинхронизации с
оригинальным генератором.

## Структура

```
web/
  src/
    game/                  // чистая игровая логика (без React/DOM)
      pieceTypes.ts         // PieceType, скины, размеры спрайтов, ассеты
      models.ts             // Piece, TrayItem, Beacon, Cell, Beam
      attackRules.ts         // computeAttacks — единая логика атак (порт attack_rules.dart)
      starRating.ts          // computeStars, mergeBestStars
      dozorEngine.ts         // порт DozorController: чистый reducer/класс без ChangeNotifier
    data/
      campaignLevelsData.json
      campaignLevels.ts     // загружает JSON → LevelDefinition[] + решения
    services/
      progressRepository.ts // localStorage: прогресс, звёзды, музыка
      musicService.ts       // Web Audio/HTMLAudio, два зацикленных трека + фейды
    components/
      board/Board.tsx, BoardPerspective.ts, PieceSprite.tsx, BeaconCoin.tsx, HintGhost.tsx
      tray/Tray.tsx
      LevelResultOverlay.tsx
      TutorialCoachmark.tsx
      StarRow.tsx
      RoundControl.tsx
    screens/
      MenuScreen.tsx
      LevelSelectScreen.tsx
      GameScreen.tsx
      SettingsScreen.tsx
      WarpTransitionScreen.tsx
      CampaignCompleteScreen.tsx
      TutorialCompleteScreen.tsx
    styles/
      tokens.css, global.css
    App.tsx                 // экранный стейт-машина, аналог _DozorAppState
    main.tsx
  tests/ (или src/**/*.test.ts)
  public/assets/images, public/assets/audio  // оригинальные ассеты как есть
```

## Игровая логика — точный перенос

- `computeAttacks` — 1:1 порт `attack_rules.dart`: ладья/слон/ферзь — лучи,
  останавливаются на первой занятой клетке (клетка блокировки включается);
  конь — 8 L-клеток без блокировки; король — 8 соседей без блокировки; пешка
  — обе передние диагонали (без атаки прямо вперёд), без блокировки.
- `DozorEngine` — порт `DozorController`/`DozorSnapshot`: те же переходы
  состояний (`tapCell`, `tapPiece`, `tapTray`, `dropTrayItem`, `movePiece`,
  `returnPieceToTray`, `toggleHint`, `resetLevel`), тот же расчёт `solved`
  (все монеты — точное число ударов, трей пуст, **и** каждая поставленная
  фигура бьёт хотя бы одну монету — иначе король может "запарковаться").
- Метрики попытки (`moveCount`, `hintUsedCount`, время) и `computeStars` —
  порт один в один, включая то, что сброс уровня обнуляет только текущую
  попытку, а не сохранённый лучший результат по уровню.
- `mergeBestStars` — сохранённый результат никогда не понижается повторным
  прохождением.

## Экраны и переходы

Все полноэкранные сцены компонуются на неизменном холсте 430×932 (как в
оригинале — `designCanvasFit`), масштабируемом через CSS `transform: scale`
на реальный viewport, включая ту же логику "contain vs fitWidth" для широких
экранов, чтобы низ (трей, кнопка «ГОТОВО») никогда не обрезался.

Перенесены: Меню → Уровни → Игра → Результат уровня → Обучение завершено →
Кампания завершена, плюс Настройки и warp-переход между Меню и Игрой
(упрощённая, но узнаваемая версия CSS-анимации вместо `CustomPainter`
частиц — эффект "прыжка в портал" сохраняется).

## Хранилище

`ProgressRepository` (единственное место работы с `localStorage`):
разблокированные уровни, лучшие звёзды на уровень, флаг завершения обучения,
уже показанные обучающие уровни, настройки музыки (вкл/выкл + громкость).
Формат ключей и миграции такие же по смыслу, как в `progress_repository.dart`.

## Что не переносится побитово (и почему)

- Некоторые декоративные анимации Flutter (`CustomPainter` для warp-тоннеля,
  частицы "seal"-вспышки) переписаны на CSS/canvas-эквиваленты с той же
  идеей и таймингом, а не как точная копия кривых Безье — визуально и по
  ощущениям близко, но не пиксель-в-пиксель.
- Аудиофокус/микс с системными звуками — специфика Android
  (`AudioContextConfigFocus.mixWithOthers`) не имеет веб-аналога; в браузере
  несколько `<audio>`/`AudioBufferSourceNode` просто играют одновременно.
