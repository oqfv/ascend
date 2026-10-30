# Metric definitions

Every number in Ascend comes from the functions in `src/lib/domain/`, and those functions follow these definitions. Tests in `src/lib/domain/domain.test.ts` pin them down.

## Days and time zones

- A **day** is a calendar day in the user's own timezone (Settings → Timezone). "Today" is computed from that timezone on every request, never from the server clock.
- Entries are stored against a calendar date, not a timestamp, so changing timezone never moves an entry to another day.

## Schedules and history

- A habit's schedule and target live in **versions**. Editing the schedule, target, or the "steps decide completion" rule writes a new version that takes effect **from the day of the edit**. Earlier days keep being judged by the version that applied to them.
- **Pausing** writes a paused version from today; paused days are not scheduled. **Archiving** stops scheduling from the archive day. **Restoring** turns the archived stretch into a paused stretch, so it never counts as missed.
- A sub-habit whose target or required flag changes is retired that day and replaced; its earlier entries stay attached to the old definition. Removing a sub-habit with history retires it instead of deleting it.
- Recorded values are never rewritten by any of these changes.

## Occurrences

- **Day-based habits** (every day, certain weekdays, every N days) have occurrences on scheduled days: one per day, or several with "times a day".
- **Periodic habits** (N per week, N per month) have no daily occurrences. Their target belongs to the week or month. Any active day in the period can be logged.
- An occurrence is **eligible** when its day is today or earlier. Future occurrences are scheduled but never eligible, never missed.

## Completion of one occurrence

- **Own target**: progress = recorded value ÷ target, capped at 100%. Complete when value ≥ target. A checkbox has a target of 1.
- **Steps decide** (the default when a habit has required steps): progress = the average of each required step's capped progress; complete only when every required step meets its target. Optional steps never affect completion.
- Status: **complete**; **partial** (progress above 0, not complete); **missed** (a past day with no progress); **pending** (today, no progress yet); **future**.

The recorded value is always kept as entered (45 minutes against a 30-minute target stays 45), only the progress ratio is capped.

## Completion rate

- **Completion rate** = completed eligible occurrences ÷ eligible occurrences × 100. Partial occurrences count as not completed.
- **Rate with partial credit** = sum of capped progress over eligible occurrences ÷ eligible occurrences × 100. Shown separately, never mixed with the completion rate.
- When nothing was eligible, the rate is **unavailable** (shown as "–"), not 0%.
- Daily completion charts and day totals include day-based habits only. Weekly and monthly targets are reported in their own chart.

## Weekly and monthly targets

- **Target progress** = amount recorded in the period ÷ target × 100, capped at 100%. For session targets each day whose occurrence is complete counts as one session.
- A period is judged by the version in force on its last active day up to today.
- If a habit was active for only part of a period (started mid-month, paused), the target is **prorated** by active days, rounded up for sessions and counts.
- Status: **completed** as soon as the target is met; **missed** only after the period has ended short of it; otherwise **in progress**.
- In per-habit rates, a periodic habit contributes one unit per period that has ended (or been met).

## Streaks

- Day-based: consecutive **scheduled** days on which every occurrence was complete. Days the habit isn't scheduled are skipped, never counted as breaks. Today does not break a streak until it is over.
- Periodic: consecutive weeks or months whose target was met. The running period counts once met and never breaks a streak while it is still running.
- **Longest streak** is the longest such run in the habit's history (the Today screen looks back 400 days and shows "365+" beyond that).

## Days and periods

- A **fully completed day** has at least one eligible occurrence and every eligible occurrence complete.
- **Period-over-period change** compares with the equivalent period immediately before (the previous 30 days for a 30-day range). It is shown in percentage points, and only when the previous period had eligible occurrences; otherwise it is unavailable.
- **Best day** in a monthly review is the weekday with the highest completion rate over that month.

## Time spent

- Only minutes recorded on duration habits or duration steps. A ticked checkbox adds no time.
- **Per session** = total minutes ÷ occurrences with recorded time.

## Insights

Insights are sentences built by fixed rules in `src/lib/domain/insights.ts` from the numbers above. Each names its period and its figures, and none appears with fewer than 5 eligible occurrences behind it. Mood, sleep and energy are never presented as causes.
