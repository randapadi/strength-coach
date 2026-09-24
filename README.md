# Strength Coach

A workout app for busy working parents and professionals. It builds a weekly plan from a short quiz (goals, household, work, schedule, gear, limitations), suggests everyday ways to move more, and adjusts from feedback after each session.

- **No server, no build step.** Plain HTML/JS. Plans are generated on the phone, and all data stays in the phone's local storage.
- **Works offline** once opened, and can be installed to the home screen (Add to Home Screen).

## Files
| File | What it does |
|---|---|
| `data.js` | Exercise library: movement pattern, gear, level 1–3, limitations each exercise is unsuitable for, dose, cues, video |
| `engine.js` | Plan generator: pure functions, `buildWeek`, `buildSession`, `applyFeedback` |
| `app.js` | Quiz, week view, workout player with timer, feedback screen, settings |
| `sw.js` | Offline cache; refreshes in the background so updates appear on next launch |
| `test.html` | Generator tests. Open in a browser; prints `ALL PASS` or failures |

## How plans are built
1. Goals decide each day's focus (lower body, upper body + posture, core + mobility, full body).
2. Each focus fills movement slots (squat, hinge, pull, …) with the best exercise the person's gear and limitations allow, at their level (never more than one level above it).
3. Rounds are sized to fill the minutes they picked; feet and posture finishers and cool-down stretches are added based on goals.
4. Feedback: "too easy/hard" overall moves reps and holds ±10%; per exercise it swaps to a harder/easier version or changes the dose; "caused pain" removes it. Three "about right" ratings in a row step the plan up.

## Daily moves
Every day has a walking goal (20 or 30 min, or none for people who already walk a lot or are on their feet at work) and four ideas from `MOVES` in `data.js`, matched to household (baby/toddler, kids, teens, none), work style and whether it's one of the person's workdays (asked in the quiz; Mon–Fri if unanswered). Parents always get kid-friendly ideas. Picks rotate daily. Video ideas link to YouTube searches.

## Check-ins
Sleep and hunger are logged per day (on the Daily moves tab or after a workout), only for today or earlier. After a poor night's sleep, the workout screen offers the 10-minute version. Settings shows 7-day trends.

## Creators
`CREATORS` in `data.js` lists 18 YouTube fitness creators (handles checked against their channel pages, Sept 2026), tagged by style, level, typical video length, gear and traits (low impact, quiet, pre/postnatal qualified, physical therapists, made for moms). `matchCreators` in `engine.js` ranks workout creators on goals, level, the day's length, gear, limitations, household and time slot, and returns up to three reasons each. Kid-friendly channels appear only for households with kids; physical-therapy channels only for knee, back, shoulder or neck limitations. "Find a video" searches the creator's channel for the day (for example "20 minute lower body"). Save, "Not for me" and "I did one today" are stored on the phone, along with how often each creator's link is opened, ready to sync once there's a server and user consent. The app is not affiliated with any creator.

## Calendar
Settings → "Add workouts to my calendar" downloads an `.ics` file (built by `calendarICS` in `engine.js`) with a weekly repeating event per training day, a 10-minute reminder, and the day's session length. Slot times: morning 6:30, midday 12:15, evening 18:00, after bedtime 20:30, otherwise 18:00. Event IDs are stable per install.

## App store version
The iOS and Android apps are the same web app wrapped with Capacitor 8 (`capacitor.config.json`, `android/`, `ios/`). `npm run build` copies the web files into `www/`; `npx cap sync` copies them into the native projects. Native-only features switch on when `Capacitor.isNativePlatform()` is true: local reminders before each workout and optional walk nudges (`reminderPlan` in `engine.js`), and outside links open in an in-app browser. Reminders use inexact alarms, so the app needs no exact-alarm permission.

- `npm run android:release` builds the signed Play bundle. The upload key is in `~/.strength-coach/` and its password in the macOS Keychain; never commit either.
- `npm run icons` regenerates icons and splash screens from `assets/*.svg`; `scripts/make-screenshots.sh` renders store screenshots into `store/screenshots/`.
- `store/GUIDE.md` has the account and submission steps; `store/LISTING.md` has the listing text.

General fitness guidance, not medical advice.
