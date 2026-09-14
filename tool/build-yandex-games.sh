#!/usr/bin/env bash
# Builds the archive for the games.yandex.ru catalogue.
#
# Two things make this different from `npm run build`, and both matter:
#
#   1. VITE_YANDEX_GAMES=1 switches the game to the platform's own ads
#      (`ysdk.adv`) and keeps РСЯ's loader script out of the page. Inside
#      the catalogue's iframe our РСЯ block cannot be served at all — it is
#      registered to runechess.ru — so a build that still reached for it
#      would simply have no ads.
#   2. The site's own furniture is stripped: CNAME, robots.txt, sitemap.xml,
#      ads.txt, app-ads.txt and the signed ads config all describe
#      runechess.ru and mean nothing inside somebody else's domain.
#
# The pages the menu links to (about, how-to-play, privacy) stay: they are
# reachable from inside the game, and a 404 behind a menu link is the kind
# of thing moderation opens tickets about.
set -euo pipefail

cd "$(dirname "$0")/.."
OUT="release-artifacts/runechess-yandex-games.zip"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

VITE_YANDEX_GAMES=1 npm run build

cp -R dist/. "$STAGE/"
rm -f "$STAGE"/{CNAME,robots.txt,sitemap.xml,ads.txt,app-ads.txt}
rm -rf "$STAGE/config"

# The three content pages go too. §8.4.2 of the platform rules forbids
# links to any resource from inside a game, and moderation rejected the
# first submission over exactly this: it opened privacy.html from the menu
# and found "runechess.ru" in the first sentence, plus outbound links to
# Yandex's own policies at the bottom. The menu no longer offers them in
# this build (see BUILT_FOR_YANDEX_GAMES), and shipping unreachable pages
# that still name the domain would be asking for the same answer twice.
rm -f "$STAGE"/{about.html,how-to-play.html,privacy.html}

# The platform serves the archive from its own domain; a file name with a
# space or a Cyrillic letter is a broken asset there, not a warning.
if find "$STAGE" -regex '.*[а-яА-Я ].*' | grep -q .; then
  echo "! file names with spaces or Cyrillic letters:" >&2
  find "$STAGE" -regex '.*[а-яА-Я ].*' >&2
  exit 1
fi

# Fail loudly rather than shipping a catalogue build that still carries the
# ad system it cannot use.
if grep -q "ads/system/context.js" "$STAGE/index.html"; then
  echo "! the РСЯ loader is still in index.html — VITE_YANDEX_GAMES did not take" >&2
  exit 1
fi
# §8.4.2 again, checked rather than trusted: nothing in the archive may
# point at a site, a store or a domain of ours.
if grep -rilE 'runechess\.ru|apps\.apple\.com|rustore\.ru|play\.google\.com' "$STAGE" \
    --include='*.html' --include='*.js' --include='*.css' | grep -q .; then
  echo "! в архиве осталась ссылка на внешний ресурс:" >&2
  grep -rilE 'runechess\.ru|apps\.apple\.com|rustore\.ru|play\.google\.com' "$STAGE" \
    --include='*.html' --include='*.js' --include='*.css' >&2
  exit 1
fi

if [[ ! -f "$STAGE/index.html" ]]; then
  echo "! no index.html at the archive root" >&2
  exit 1
fi

mkdir -p release-artifacts
rm -f "$OUT"
(cd "$STAGE" && zip -qr "$OLDPWD/$OUT" . -x '.*')

echo
echo "$OUT"
unzip -l "$OUT" | tail -1
du -h "$OUT" | cut -f1 | sed 's/^/размер: /'
