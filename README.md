# ARISE — Personal Leveling System

A single-user, Solo-Leveling-styled operating system for one hunter: daily check-in, a timestamped
timetable, pomodoro slot runner, habit quests and an XP/level/rank engine.

Product plan: [`PLAN.md`](PLAN.md) · technical spec: [`docs/technical-spec.md`](docs/technical-spec.md)

## What exists (v1 core)

| Area | Status |
|---|---|
| Command Center — level, rank, XP bar, Now card, timetable, quests, attributes, last 7 days | ✅ |
| Morning check-in gate (sleep, energy, mood, weight, focus target, load) | ✅ |
| Evening shutdown (top 3 for tomorrow + journal) | ✅ |
| Timetable — 13 seeded blocks, per-day materialization, load switcher | ✅ |
| Slot runner — 50/10 + 25/5 pomodoro rounds, visible-time accounting, break tasks, +XP toasts, level-up overlay | ✅ |
| Habit quests with XP and honest un-tick (reverses the ledger) | ✅ |
| Workout dungeon, DSA arena, shadow-agent lanes, heatmap | ⬜ next |

## Run locally

```bash
npm install                 # postinstall runs `prisma generate`
cp .env.example .env        # then point DATABASE_URL at a Postgres database
npx prisma migrate dev      # create the schema
npm run db:seed             # hunter + habit definitions
npm run dev
```

Page endpoints: `/` (status, redirects to `/checkin` on a fresh day), `/checkin`, `/timetable`,
`/focus`, `/focus/[sessionId]`.

Scripts: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run db:migrate`, `npm run db:seed`,
`npm run db:studio`.

## Deploy to Vercel

1. Create a Postgres database — [Neon](https://neon.tech) works well (branching gives you a safe dev
   copy). Copy the pooled connection string.
2. Push this repo and import it in Vercel. Set `DATABASE_URL` (and `APP_TZ`, default
   `Asia/Kolkata`) in Project → Settings → Environment Variables.
3. Run migrations against the production database once:
   `DATABASE_URL="<prod-url>" npx prisma migrate deploy && DATABASE_URL="<prod-url>" npx prisma db seed`
4. The app has no auth — it is single-user. Before exposing it publicly, add one shared-password
   gate in `middleware.ts` (a cookie check is enough). Do not skip this: every Server Action is
   reachable by a direct POST and there is no user identity behind them.

## Notes on the engine

- **XP is an append-only ledger** (`XpLedger`), unique on `(reason, sourceId)` so a double-submitted
  form can never double-pay. `Hunter.totalXp` is a cached sum.
- **Timers derive from absolute timestamps.** A closed tab or a refresh reconstructs the correct
  remaining time instead of drifting; a round counts only when ≥80% of it was spent with the tab
  visible.
- **Days are local-calendar days** in `APP_TZ`, stored as `DATE`.
- **Blocks are materialized per day** from `DAY_TEMPLATE` in `lib/timetable.ts`, so editing one day
  never rewrites history.
