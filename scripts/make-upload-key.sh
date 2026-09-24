#!/bin/bash
# Creates the Google Play upload key once: ~/.strength-coach/upload-keystore.jks, with a random password
# stored in the macOS Keychain (service "strength-coach-upload-key"). Nothing sensitive goes in the repo.
# Back up the .jks file and the password (Keychain Access → search "strength-coach") somewhere safe.
set -euo pipefail
DIR="$HOME/.strength-coach"; KS="$DIR/upload-keystore.jks"
export JAVA_HOME=${JAVA_HOME:-/opt/homebrew/opt/openjdk@21}
if [ -f "$KS" ]; then echo "Upload key already exists: $KS"; exit 0; fi
mkdir -p "$DIR"; chmod 700 "$DIR"
PW=$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)
security add-generic-password -U -s strength-coach-upload-key -a upload -w "$PW"
"$JAVA_HOME/bin/keytool" -genkeypair -v -keystore "$KS" -alias upload -keyalg RSA -keysize 4096 -validity 10000 \
  -storepass "$PW" -keypass "$PW" -dname "CN=Strength Coach upload key" >/dev/null 2>&1
chmod 600 "$KS"
echo "Created $KS (password saved in Keychain as strength-coach-upload-key)"
