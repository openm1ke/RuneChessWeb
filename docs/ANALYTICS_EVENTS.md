# Каталог событий аналитики

Единственный источник правды по именам событий. Мобильное приложение шлёт их
в AppMetrica, веб — целями в Яндекс Метрику; **имена обязаны совпадать**, иначе
одна воронка считается по двум разным наборам данных.

Это уже случалось: `level_completed` в вебе слал `stars: 0` для обучающих
уровней, где мобайл не слал ничего, а `streak_length` был только у одного из
двух. Расхождения нашлись не по коду, а по расхождению цифр в отчётах — то
есть спустя месяцы.

Поэтому список ниже проверяется тестами в обоих проектах:

- мобайл — `test/analytics_catalog_test.dart`
- веб — `src/tests/analyticsCatalog.test.ts`

Тест падает, если код шлёт событие, которого нет в таблице, или если таблица
обещает событие, которого код не шлёт. **Добавляя событие, правь таблицу в
обоих репозиториях в одном коммите.**

## Ключевое различие платформ

AppMetrica показывает любое событие сама. Метрика показывает **только те,
для которых заведена цель** — событие без цели уходит в счётчик и исчезает.
Поэтому у каждого веб-события в таблице проставлена цель.

## События

| Событие | Мобайл | Веб | Параметры |
| --- | --- | --- | --- |
| `level_selected` | ✔ | ✔ | `level`, `is_tutorial` |
| `level_started` | ✔ | ✔ | `level`, `is_tutorial`, `entry_source` |
| `level_completed` | ✔ | ✔ | `level`, `is_tutorial`, `stars`¹, `moves`, `elapsed_seconds`, `hints_used`, `entry_source` |
| `level_abandoned` | ✔ | ✔ | `level`, `is_tutorial`, `moves`, `elapsed_seconds`, `hints_used` |
| `level_reset` | ✔ | ✔ | `level`, `moves`, `elapsed_seconds`, `hints_used` |
| `hint_used` | ✔ | ✔ | `level`, `hint_number`, `via_ad` |
| `tutorial_completed` | ✔ | ✔ | — |
| `main_campaign_completed` | ✔ | ✔ | — |
| `campaign_completed` | ✔ | ✔ | — |
| `levels_opened` | ✔ | ✔ | — |
| `achievements_opened` | ✔ | ✔ | — |
| `achievement_viewed` | ✔ | ✔ | `achievement_id`, `unlocked` |
| `achievement_unlocked` | ✔ | ✔ | `achievement_id`, `category`, `trigger` |
| `rules_opened` | ✔ | ✔² | — |
| `settings_opened` | ✔ | ✔ | — |
| `music_enabled` / `music_disabled` | ✔ | ✔ | — |
| `progress_reset_confirmed` | ✔ | ✔ | — |
| `daily_challenge_opened` | ✔ | ✔ | `date` |
| `daily_challenge_started` | ✔ | ✔ | `date` |
| `daily_challenge_completed` | ✔ | ✔ | `date`, `stars`¹, `hints_used`, `streak_length` |
| `ad_offer_shown` | ✔ | ✔ | `placement` |
| `ad_requested` | ✔ | ✔ | `placement` |
| `ad_loaded` | ✔ | ✔ | `placement` |
| `ad_load_failed` | ✔ | ✔ | `placement`, `reason` |
| `ad_shown` | ✔ | ✔ | `placement` |
| `ad_show_failed` | ✔ | ✔ | `placement`, `reason` |
| `ad_rewarded` | ✔ | ✔ | `placement` |
| `ad_closed_without_reward` | ✔ | ✔ | `placement` |
| `ad_unavailable` | ✔ | ✔ | `placement` |
| `bonus_star_granted` | ✔ | ✔ | `level`, `stars_before`, `stars_after` |
| `service_failed` | ✔ | — | `component`, `stage`, `reason` |

¹ `stars` **отсутствует** для неоцениваемого обучающего уровня — не `0`.
Ноль утянул бы вниз любое среднее по этому событию, а «без оценки» это не
оценка «ноль».

² В вебе правила — отдельная статическая страница, поэтому клик по иконке
отправляет цель с колбэком и уводит уже из него, иначе переход обгонял бы
отправку.

## Соглашения

- `level` — **1-based**, тот номер, который видит игрок, никогда не индекс.
- `entry_source` — `menu_play` | `level_select` | `next_level` | `skip_level`.
- `placement` — `extra_hint` | `bonus_star`.
- `date` — локальный календарный день `yyyy-MM-dd` (см. `dailyChallengeKey`).
- Никаких персональных данных и никаких текстов исключений: в `reason`
  попадает тип ошибки или короткая машинная причина, но не сообщение, которое
  может нести URL или путь.

## Как заводить цель в Метрике

Настройки → Цели → Добавить цель → «Целевое событие», условие «идентификатор
содержит», значение — имя события из таблицы. Название по-русски, в стиле
существующих («Реклама показана», «Уровень брошен»).

Осторожно с `campaign_completed`: у неё стоит **точное** совпадение, иначе
она ловила бы ещё и `main_campaign_completed`.
