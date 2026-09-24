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
Every day has a walking goal (20 or 30 min, or none for people who already walk a lot or are on their feet at work) and four ideas from `MOVES` in `data.js`, matched to household (baby/toddler, kids, teens, none), work style and workday vs. weekend. Parents always get kid-friendly ideas. Picks rotate daily. Video ideas link to YouTube searches.

## Check-ins
Sleep and hunger are logged per day (on the Daily moves tab or after a workout), only for today or earlier. After a poor night's sleep, the workout screen offers the 10-minute version. Settings shows 7-day trends.

General fitness guidance, not medical advice.
