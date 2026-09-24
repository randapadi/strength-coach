# Publishing Strength Coach to the App Store and Google Play

Everything in the code is ready. These steps need you, because they involve your company, payments and legal agreements.
Rough timeline: D-U-N-S number 1–2 weeks (start today), accounts 1–3 days after that, first reviews 1–3 days (Apple) and up to 7 days (Google).

## 0. Decide before the first upload (permanent)

1. **App name.** Search both stores to make sure it's free. Then tell me the name.
2. **App ID.** Reverse-domain, for example `com.yourcompany.strengthcoach`. It can never change after the first upload. I'll update `capacitor.config.json`, the Android and iOS projects in one step.
3. **Fill in `privacy.html`:** your company's legal name and a contact email. Both stores link to it.

## 1. Company paperwork (both stores need this)

1. Get a **D-U-N-S number** for your LLC (free): https://developer.apple.com/enroll/duns-lookup/ . Your company name and address must match your state registration exactly. Allow up to 2 weeks.
2. Have a **company website** on your own domain and a **company email** on that domain. Apple checks this during organization enrollment, and Google asks for a website.

## 2. Apple

### Accounts and tools
1. **Install Xcode** from the Mac App Store (about 15 GB), open it once and accept the license. Then run in Terminal:
   `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`
2. **Enroll in the Apple Developer Program as an organization** ($99/year): https://developer.apple.com/programs/enroll/ . Use the D-U-N-S number. You need to be the owner or have legal authority to sign for the company.
3. In **App Store Connect** (https://appstoreconnect.apple.com): Agreements, Tax and Banking → accept the Free Apps agreement.

### Create the app
1. **Certificates, Identifiers & Profiles → Identifiers → +** → App IDs → your app ID from step 0. No extra capabilities are needed: reminders are local notifications.
2. **App Store Connect → Apps → + New App:** platform iOS, name, primary language English (U.S.), bundle ID (pick the one you just made), SKU (any text, e.g. `strengthcoach-ios`).

### Build and upload (tell me when Xcode is installed; I can run most of this)
1. `cd ~/Code/strength-coach && npm run sync`
2. `npx cap open ios` opens the project in Xcode.
3. In Xcode: select the **App** target → **Signing & Capabilities** → check "Automatically manage signing" → Team = your company.
4. Choose **Any iOS Device (arm64)** as the destination → **Product → Archive** → **Distribute App → App Store Connect → Upload**.
5. Test it with **TestFlight** on your own iPhone before submitting.

### Fill in the listing
Use `store/LISTING.md`: description, keywords, screenshots, App Privacy = **Data Not Collected**, age rating 4+, category Health & Fitness, review notes. Then **Add for Review**.

## 3. Google Play

### Account
1. **Create a Play Console developer account as an organization** ($25 once): https://play.google.com/console/signup . Google also asks for the D-U-N-S number and verifies your identity and company. Organization accounts are not required to run the 12-tester, 14-day closed test that new personal accounts must complete.
2. Pay the fee and complete identity verification (a few days).

### Create the app
1. **Play Console → Create app:** name, default language, App (not game), Free.
2. Complete the **App content** section using `store/LISTING.md`: privacy policy URL, ads = no, data safety = no data collected, content rating questionnaire, target audience 18+, health apps declaration.

### Build and upload
1. Tell me when the account exists. I'll build the signed release bundle (`.aab`) with `npm run android:release`.
   The upload key lives outside the repo in `~/.strength-coach/`. **Back up that folder** (for example to your password manager). If it's lost, Google support can reset it, which takes a few days.
2. **Play Console → Testing → Internal testing → Create release** → upload `android/app/build/outputs/bundle/release/app-release.aab`. Accept **Play App Signing** (Google holds the final signing key).
3. Add yourself as an internal tester and install from the link to check it on your phone.
4. When it looks right: **Production → Create release** → promote the same build → **Send for review**.

## 4. After launch: updates

1. Change the web app files as usual (they still publish to GitHub Pages).
2. Bump the version in `package.json` and tell me; I update `versionCode`/`versionName` (Android) and the build number (iOS), then build and upload.
3. Later we can automate uploads from GitHub Actions (App Store Connect API key + Play service account), so a release is one command.

## What's already done in the code

- Capacitor 8 wrapper around the same web app, Android target SDK 36 (Google Play's requirement for new apps), iPhone-only, portrait.
- Local reminders before each workout plus optional walk nudges, rescheduled whenever the schedule changes.
- Works fully offline; fonts are bundled; no third-party requests except YouTube links the user taps, which open in an in-app browser.
- Icons and splash screens for both platforms (`scripts/make-icons.sh` regenerates them from `assets/*.svg`).
- Privacy policy page, listing text and data-safety answers that match what the app actually does.
