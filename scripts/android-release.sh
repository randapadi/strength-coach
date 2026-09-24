#!/bin/bash
# Builds the signed Android App Bundle for Google Play: android/app/build/outputs/bundle/release/app-release.aab
set -euo pipefail
cd "$(dirname "$0")/.."
export JAVA_HOME=${JAVA_HOME:-/opt/homebrew/opt/openjdk@21}
export ANDROID_HOME=${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}
export SC_KEYSTORE="$HOME/.strength-coach/upload-keystore.jks"
[ -f "$SC_KEYSTORE" ] || ./scripts/make-upload-key.sh
export SC_KEY_PASSWORD=$(security find-generic-password -s strength-coach-upload-key -a upload -w)
npm run build >/dev/null && npx cap sync android >/dev/null
(cd android && ./gradlew bundleRelease --console=plain -q)
echo "Built android/app/build/outputs/bundle/release/app-release.aab"
