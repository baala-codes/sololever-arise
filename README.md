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
| Day heatmap — every block in its colour + 12-week focus grid | ✅ |
| Workout dungeon — two floors a day, per-set logging, auto-scaling targets | ✅ |
| DSA arena — problem log, SM-2-lite review queue, pattern coverage | ✅ |
| War room — shadow-agent lanes (dispatch → review → merge) and hackathon projects with gated submission | ✅ |
| Report — SDE-1 readiness score, application funnel, DSA coverage | ✅ |
| PWA install + web push round-end alerts | ✅ |

## Run locally

```bash
npm install                 # postinstall runs `prisma generate`
cp .env.example .env        # then point DATABASE_URL at a Postgres database
npx web-push generate-vapid-keys   # paste both keys + a CRON_SECRET into .env
npx prisma migrate dev      # create the schema
npm run db:seed             # hunter + habit definitions
npm run dev
```

Page endpoints: `/` (status, redirects to `/checkin` on a fresh day), `/checkin`, `/timetable`,
`/focus`, `/focus/[sessionId]`, `/heatmap`, `/dungeon`, `/arena`, `/warroom`, `/report`.

Push endpoint: `POST /api/push/round-end` with `Authorization: Bearer $CRON_SECRET` — pings linked
devices when a round's planned time ran out while the tab was closed.

Scripts: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run db:migrate`, `npm run db:seed`,
`npm run db:studio`.

## Deploy to Vercel

1. Create a Postgres database — [Neon](https://neon.tech) works well (branching gives you a safe dev
   copy). Copy the pooled connection string.
2. Push this repo and import it in Vercel. Set `DATABASE_URL`, `APP_TZ` (default `Asia/Kolkata`),
   `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` and `CRON_SECRET` in
   Project → Settings → Environment Variables. Generate fresh VAPID keys for production.
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
- **The dungeon scales itself.** Starting a floor copies each exercise's current target into per-set
  rows; clearing every set pays 150 XP and raises each fully-hit exercise by its increment (up to a
  cap). Miss a set and that exercise stays where it is. Unlogged sets can be nudged ± before you
  commit, so the plan bends to the body.
- **Shadow lanes are a queue with states, not a chat.** A lane goes `DISPATCHED → RUNNING → REVIEW →
  MERGED`; merging pays 60 XP once per lane, dropping pays nothing. `FLAG ME` marks the ones that
  actually need your hands, which is the only reason to leave your own lane.
- **Hackathon submission is gated.** A project cannot be marked submitted until every checklist item
  is ticked; that pays 400 XP. Phase changes (idea/build/polish) are free.
- **Readiness is computed, never typed.** `lib/readiness.ts` scores problems (40), pattern coverage
  (20), cohort days with 60m+ on a 100x block (15), submitted projects (15) and applications sent
  (10). A `Problem` counts toward a pattern at 3+ solves.
- **The arena reschedules on recall, not on completion.** Grading a problem runs SM-2-lite: AGAIN →
  1 day and −0.2 ease, GOOD → interval × ease, EASY → interval × ease × 1.3 (ease capped 1.3–3.2,
  interval capped 180 days). First solve pays difficulty XP; repeat recalls pay 10–30.
