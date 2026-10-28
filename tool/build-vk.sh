#!/usr/bin/env bash
# Builds the game for the VK Games catalogue (dev.vk.ru → the app →
# «Размещение»).
#
# The same idea as tool/build-playgama.sh, for VK's rules
# (https://dev.vk.ru/ru/mini-apps-rules):
#
#   1. VITE_VK=1 brings VK Bridge up before the app is drawn, keeps progress
#      in VK Storage so it follows the player between devices (2.3.8),
#      shows VK's own rewarded and between-levels ads and nothing else
#      (4.2.2, 5.1.2), and compiles Metrica, the consent banner and the
#      browser reminders out (see src/services/vkPlatform.ts).
#   2. Everything that belongs to runechess.ru or names another platform is
#      stripped — the site's files, its pages, the store badges — because
#      rule 4.1.8 forbids leading players out of VK and 4.2.6 forbids any
#      mention of another platform.
#
# The result is a directory, published by deploy-pages.yml at
# https://runechess.ru/vk/ (the address for all three of VK's fields), and
# the same files as a ZIP for VK's own hosting, should it be used instead.
set -euo pipefail

cd "$(dirname "$0")/.."
OUT_DIR="release-artifacts/runechess-vk"
OUT_ZIP="release-artifacts/runechess-vk.zip"

VITE_VK=1 npm run build

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"
cp -R dist/. "$OUT_DIR/"
rm -f "$OUT_DIR"/{CNAME,robots.txt,sitemap.xml,ads.txt,app-ads.txt}
rm -rf "$OUT_DIR/config"
rm -f "$OUT_DIR"/{about.html,how-to-play.html,privacy.html,terms.html}
rm -rf "$OUT_DIR/assets/badges"

fail() {
  echo "! $1" >&2
  exit 1
}

[[ -f "$OUT_DIR/index.html" ]] || fail "index.html is missing"
grep -q 'noindex' "$OUT_DIR/index.html" || fail "VITE_VK did not take: no noindex in index.html"
# 5.1.2: VK's ad network and nobody else's — no Yandex SDK, no РСЯ loader.
if grep -rqE 'yandex\.ru/games/sdk|ads/system/context\.js' "$OUT_DIR" --include='*.html' --include='*.js'; then
  fail "a Yandex SDK or the РСЯ loader is still in the build"
fi
if grep -rqE 'mc\.yandex\.ru|googletagmanager|google-analytics' "$OUT_DIR" --include='*.js' --include='*.html'; then
  fail "the build still carries an external analytics loader"
fi
grep -rq 'VKWebAppInit' "$OUT_DIR/assets" || fail "VK Bridge is not in the bundle"
# 4.1.8 and 4.2.3: no way out of VK — not to our site, not to a store.
if grep -rilE 'runechess\.ru|apps\.apple\.com|rustore\.ru|play\.google\.com|playgama' "$OUT_DIR" \
    --include='*.html' --include='*.js' --include='*.css' --include='*.svg' | grep -q .; then
  echo "! the build still links out or names another platform:" >&2
  grep -rilE 'runechess\.ru|apps\.apple\.com|rustore\.ru|play\.google\.com|playgama' "$OUT_DIR" \
    --include='*.html' --include='*.js' --include='*.css' --include='*.svg' >&2
  exit 1
fi
# 4.1.3: nothing of the developer's console left on.
if grep -rqE 'eruda|vconsole' "$OUT_DIR" --include='*.js' --include='*.html'; then
  fail "a debug console is in the build"
fi
if find "$OUT_DIR" -regex '.*[а-яА-Я ].*' | grep -q .; then
  fail "file names with spaces or Cyrillic letters"
fi

rm -f "$OUT_ZIP"
(cd "$OUT_DIR" && zip -qr "$OLDPWD/$OUT_ZIP" . -x '.*')

echo
echo "$OUT_DIR"
echo "$OUT_ZIP"
unzip -l "$OUT_ZIP" | tail -1
du -h "$OUT_ZIP" | cut -f1 | sed 's/^/size: /'
