#!/bin/bash
# Renders assets/*.svg with headless Chrome, then resizes with macOS sips into every icon/splash slot
# of the iOS and Android projects (and the web app's own icons). Run after changing the icon.
set -euo pipefail
cd "$(dirname "$0")/.."
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
render(){ # svg size out [transparent]
  printf '<html><body style="margin:0;background:transparent">%s</body></html>' "$(cat "$1")" > "$TMP/p.html"
  local extra=(); [ "${4:-}" = transparent ] && extra=(--default-background-color=00000000)
  rm -f "$3"; exec 3>&2 2>/dev/null   # hide the shell's "Alarm clock" notice
  # Chrome sometimes keeps running after writing the screenshot, so cap each render at 25 seconds
  perl -e 'alarm 25; exec @ARGV' "$CHROME" --headless=new --disable-gpu --no-first-run --hide-scrollbars --user-data-dir="$TMP/chrome" \
    --window-size="$2,$2" --force-device-scale-factor=1 ${extra[@]+"${extra[@]}"} --screenshot="$3" "file://$TMP/p.html" >/dev/null 2>&1 || true
  exec 2>&3; [ -s "$3" ] || { echo "render failed: $1" >&2; exit 1; }
}
render assets/icon.svg 1024 "$TMP/icon.png"
render assets/icon-foreground.svg 1024 "$TMP/fg.png" transparent
render assets/splash.svg 2732 "$TMP/splash.png"
size(){ sips -z "$2" "$2" "$1" --out "$3" >/dev/null; }

# iOS: single 1024 icon (no transparency allowed) + splash
sips -s format png "$TMP/icon.png" --out ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png >/dev/null
for f in ios/App/App/Assets.xcassets/Splash.imageset/*.png; do cp "$TMP/splash.png" "$f"; done

# Android launcher icons
R=android/app/src/main/res
for pair in mdpi:48 hdpi:72 xhdpi:96 xxhdpi:144 xxxhdpi:192; do
  d=${pair%%:*}; px=${pair##*:}
  size "$TMP/icon.png" $px "$R/mipmap-$d/ic_launcher.png"
  size "$TMP/icon.png" $px "$R/mipmap-$d/ic_launcher_round.png"
  size "$TMP/fg.png" $((px*9/4)) "$R/mipmap-$d/ic_launcher_foreground.png"
done
# Android splash: scale the square splash to cover, then crop to each drawable's size
for f in $R/drawable*/splash.png; do
  w=$(sips -g pixelWidth "$f" | tail -1 | awk '{print $2}'); h=$(sips -g pixelHeight "$f" | tail -1 | awk '{print $2}')
  m=$(( w>h ? w : h )); size "$TMP/splash.png" $m "$TMP/s.png"; sips -c "$h" "$w" "$TMP/s.png" --out "$f" >/dev/null
done

# web app icons
size "$TMP/icon.png" 180 icon-180.png; size "$TMP/icon.png" 192 icon-192.png; size "$TMP/icon.png" 512 icon-512.png
echo "icons and splash screens updated"
