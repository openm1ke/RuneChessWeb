#!/usr/bin/env bash
# Builds the archive for Playgama (developer.playgama.com → Add Game →
# Upload Build).
#
# The same idea as tool/build-yandex-games.sh, for the other catalogue:
#
#   1. VITE_PLAYGAMA=1 puts Playgama Bridge on the page instead of the
#      Yandex Games SDK, routes rewarded ads and the between-levels
#      interstitial through it, and keeps progress in `bridge.storage`
#      (see src/services/playgamaPlatform.ts).
#   2. Everything that belongs to runechess.ru is stripped — the site's
#      files, its content pages, the store badges — because Playgama and
#      the partner sites it redistributes to forbid links out of the game.
#   3. playgama-bridge-config.json goes next to index.html, where Bridge
#      looks for it.
set -euo pipefail

cd "$(dirname "$0")/.."
OUT="release-artifacts/runechess-playgama.zip"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

VITE_PLAYGAMA=1 npm run build

cp -R dist/. "$STAGE/"
rm -f "$STAGE"/{CNAME,robots.txt,sitemap.xml,ads.txt,app-ads.txt}
rm -rf "$STAGE/config"
rm -f "$STAGE"/{about.html,how-to-play.html,privacy.html}
rm -rf "$STAGE/assets/badges"
cp tool/playgama/playgama-bridge-config.json "$STAGE/"

# Partner sites serve the archive from their own domains; a file name with
# a space or a Cyrillic letter is a broken asset there.
if find "$STAGE" -regex '.*[а-яА-Я ].*' | grep -q .; then
  echo "! file names with spaces or Cyrillic letters:" >&2
  find "$STAGE" -regex '.*[а-яА-Я ].*' >&2
  exit 1
fi

if ! grep -q 'bridge.playgama.com/v2/stable/playgama-bridge.js' "$STAGE/index.html"; then
  echo "! Playgama Bridge is not on the page — VITE_PLAYGAMA did not take" >&2
  exit 1
fi
if grep -qE 'yandex\.ru/games/sdk|ads/system/context\.js' "$STAGE/index.html"; then
  echo "! a Yandex SDK or the РСЯ loader is still in index.html" >&2
  exit 1
fi
# No external analytics on Playgama (technical requirements §3): the
# Metrica loader must have been compiled out, not merely left unused.
if grep -rqE 'mc\.yandex\.ru|googletagmanager|google-analytics' "$STAGE" --include='*.js' --include='*.html'; then
  echo "! the archive still carries an external analytics loader" >&2
  exit 1
fi
if grep -qE 'fonts\.(googleapis|gstatic)\.com' "$STAGE/index.html"; then
  echo "! index.html still pulls fonts from Google" >&2
  exit 1
fi
# Nothing in the archive may point at a site, a store or a domain of ours.
if grep -rilE 'runechess\.ru|apps\.apple\.com|rustore\.ru|play\.google\.com' "$STAGE" \
    --include='*.html' --include='*.js' --include='*.css' --include='*.svg' | grep -q .; then
  echo "! the archive still links out:" >&2
  grep -rilE 'runechess\.ru|apps\.apple\.com|rustore\.ru|play\.google\.com' "$STAGE" \
    --include='*.html' --include='*.js' --include='*.css' --include='*.svg' >&2
  exit 1
fi
if [[ ! -f "$STAGE/index.html" || ! -f "$STAGE/playgama-bridge-config.json" ]]; then
  echo "! index.html or playgama-bridge-config.json is missing at the archive root" >&2
  exit 1
fi

mkdir -p release-artifacts
rm -f "$OUT"
(cd "$STAGE" && zip -qr "$OLDPWD/$OUT" . -x '.*')

echo
echo "$OUT"
unzip -l "$OUT" | tail -1
du -h "$OUT" | cut -f1 | sed 's/^/size: /'
