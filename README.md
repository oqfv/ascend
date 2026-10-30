# Ascend

A habit tracker that records real progress, not just ticks: partial progress, steps inside habits, weekly and monthly targets, schedules whose history never rewrites itself, and analytics computed from what you actually recorded.

## What's in it

- **Accounts**: username and password, unique usernames enforced by the database, hashed passwords, 30-day sessions, rate-limited sign-in, password change.
- **Habits**: checkbox, time, count or amount targets; every day, certain weekdays, every N days, N per week or N per month; several times a day; start and end dates; steps (sub-habits) with their own targets; pause, archive, restore, delete, reorder.
- **Today**: the day's checklist with partial progress, steps, streaks, undo, date navigation and quick add.
- **Calendar**: a month of days shaded by how much got done, telling unscheduled days apart from days with nothing done.
- **Reviews**: daily (with an optional private journal of mood, energy, sleep and notes), weekly and monthly reports, with rule-based insights.
- **Analytics**: completion trend with previous-period comparison, calendar heatmap, habit and category comparisons, weekly performance, weekly and monthly targets, streaks, and time spent. Filters for range, habit and category; every chart has a table view.
- **CSV**: import with a checked preview and duplicate handling (never overwrites), export of habits and of every recorded entry, and a template.

How every number is defined: [docs/METRICS.md](docs/METRICS.md).

## Stack

Next.js 15 (App Router) · TypeScript (strict) · Tailwind CSS 4 · shadcn/ui (Base UI) · PostgreSQL on Supabase · Prisma 6 · Better Auth · Zod · Recharts · React Hook Form · Vitest.

The core needs no AI service. Insights are deterministic rules over your own data.

## Run it locally

Requires Node.js 20+ and a PostgreSQL database (Supabase works as is).

```bash
npm install
cp .env.example .env      # then fill it in, see below
npm run dev               # http://localhost:3000
```

### Environment variables

| Name | What it is |
| --- | --- |
| `DATABASE_URL` | Pooled connection (Supabase transaction pooler, port 6543) with `?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | Direct or session connection (port 5432), used for migrations |
| `BETTER_AUTH_SECRET` | 32+ random bytes; different in every environment |
| `BETTER_AUTH_URL` | The app's public URL (`http://localhost:3000` locally) |

### Database setup

Migrations live in `prisma/migrations` and are plain SQL:

1. `0001_init`: tables, indexes and foreign keys.
2. `0002_security_and_checks`: turns on row level security for every table (so Supabase's public Data API can read nothing) and adds check constraints.
3. `0003_app_role`: grants for the app's own database role.

The app connects as a least-privilege role, not as `postgres`. Create it once per environment before applying `0003`:

```sql
CREATE ROLE ascend_app WITH LOGIN PASSWORD '<a long random password>' NOINHERIT;
```

Then apply the migrations in order, either with `npx prisma migrate deploy` (connecting as `postgres` through `DIRECT_URL`) or by running each `migration.sql` in the Supabase SQL editor. Point `DATABASE_URL` and `DIRECT_URL` at `ascend_app.<project-ref>` for the app itself.

## Tests and checks

```bash
npm test            # unit tests: scheduling, progress, targets, streaks, analytics, insights, CSV
npm run test:db     # database tests: unique usernames under concurrent sign-up, password hashing,
                    # data isolation between users, duplicate submissions, check constraints
npm run typecheck
npm run lint
npm run build
```

`test:db` uses the database in `.env`, creates throwaway `itest_` accounts and deletes them afterwards.

## Deploy (Vercel)

1. Create a Vercel project from this folder (`npx vercel`), or connect the Git repository.
2. Set the four environment variables for Production. `BETTER_AUTH_URL` is the production URL.
3. Deploy with `npx vercel --prod`. Functions run in Mumbai (`bom1`, set in `vercel.json`), next to the Supabase database in `ap-south-1`.

## Not built yet

These are designed for but not shipped in this version: routines, goals and milestones, the focus timer, achievements and XP, push or email reminders (needs a delivery service such as a scheduled function plus an email or push provider), social challenges, and PDF reports. Reminder times are stored and shown on Today; nothing is sent.
