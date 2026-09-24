# Strength Coach

A home workout app that builds a weekly plan from a short quiz and adjusts it from feedback after each session.

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

General fitness guidance, not medical advice.
