#!/bin/bash
# Renders store screenshots of the app into store/screenshots/:
#   ios-N.png      1320 × 2868 (iPhone 6.9", App Store)
#   android-N.png  1080 × 2400 (phone, Google Play)
set -euo pipefail
cd "$(dirname "$0")/.."
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT=8791; python3 -m http.server $PORT >/dev/null 2>&1 & SRV=$!
TMP=$(mktemp -d); trap 'kill $SRV; rm -rf "$TMP"' EXIT; sleep 1
mkdir -p store/screenshots
shot(){ # name css-width css-height n
  local out="store/screenshots/$1-$4.png" W=$(( $2 > 500 ? $2 : 500 ))
  rm -f "$out"; exec 3>&2 2>/dev/null
  perl -e 'alarm 25; exec @ARGV' "$CHROME" --headless=new --disable-gpu --no-first-run --hide-scrollbars --user-data-dir="$TMP/c$1$4" \
    --window-size="$W,$3" --force-device-scale-factor=3 --virtual-time-budget=4000 --screenshot="$out" \
    "http://localhost:$PORT/scripts/shots.html?n=$4&w=$2&h=$3" >/dev/null 2>&1 || true
  exec 2>&3
  sips -c $(( $3*3 )) $(( $2*3 )) "$out" --out "$out" >/dev/null   # center crop; shots.html centers the phone frame
  echo "$out $(sips -g pixelWidth -g pixelHeight "$out" | tail -2 | awk '{print $2}' | paste -sd x -)"
}
for n in 1 2 3 4 5 6 7; do shot ios 440 956 $n; shot android 360 800 $n; done
