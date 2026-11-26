# ARISE — Technical Specification

Companion to `PLAN.md`. Everything here is implementation-ready: stack, schema, timer engine, XP service, animation spec, file layout.

---

## 1. Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15** (App Router, React 19, TypeScript, `strict`) | Server Actions + Route Handlers remove the API boilerplate; RSC keeps the dashboard fast. |
| Styling | **Tailwind CSS v4** + a small custom primitive set in `components/ui` | No component library. The System aesthetic is bespoke; shadcn would be fought more than used. |
| Animation | **Framer Motion** (state-driven, layout) + **GSAP** only for the level-up timeline | Motion covers 90% declaratively; the level-up needs a real timeline. |
| State | **Zustand** for the runner/timer; RSC + Server Actions for everything persisted | The timer is a hot local state machine — don't round-trip it. |
| DB | **Postgres on [Neon](https://neon.tech)** (serverless, branching for a dev DB) | `DATABASE_URL` env var; free tier is ample for one user. |
| ORM | **Prisma** | Migrations + typed queries; schema is the source of truth. |
| Charts | **Recharts** | Good enough, tiny, no canvas work. |
| Dates | **date-fns** + `date-fns-tz` | Store UTC, render in the user's zone; a day boundary that silently drifts will corrupt every streak. |
| Validation | **Zod** | Every Server Action input. |
| Sound | Web Audio API, 3 short generated tones (no asset files) | Avoids shipping audio. |
| PWA | `next-pwa`-style manual service worker + manifest | Installable, offline shell, notification support. |

**Deliberately absent:** auth, multi-tenancy, i18n, testing framework beyond Vitest for pure functions, CMS, analytics.

### Setup

```bash
npx create-next-app@latest arise --typescript --tailwind --app --eslint
cd arise
npm i @prisma/client zod zustand framer-motion gsap recharts date-fns date-fns-tz
npm i -D prisma vitest @types/node
npx prisma init
```

`.env`:
```
DATABASE_URL="postgresql://...@...neon.tech/arise?sslmode=require"
```

Single user → `hunter` is a singleton row created on first boot (`id = 'local'`). No session logic anywhere. If you later deploy to Vercel, put the whole app behind one password via `middleware.ts` + a cookie — 20 lines, not an auth system.

---

## 2. Repo layout

```
arise/
├─ prisma/
│  ├─ schema.prisma
│  └─ seed.ts                  # timetable, exercises, habits, patterns
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx            # shell, fonts, theme
│  │  ├─ page.tsx              # M1 Command Center
│  │  ├─ checkin/page.tsx      # M2 morning gate
│  │  ├─ timetable/page.tsx    # M3
│  │  ├─ focus/[sessionId]/page.tsx  # M4 slot runner (full screen)
│  │  ├─ dungeon/page.tsx      # M5
│  │  ├─ dsa/page.tsx          # M6
│  │  ├─ war-room/page.tsx     # M7
│  │  ├─ stats/page.tsx        # M8
│  │  ├─ settings/page.tsx     # M9
│  │  └─ api/
│  │     ├─ rollover/route.ts  # cron: close yesterday, pay XP, issue penalties
│  │     └─ export/route.ts
│  ├─ actions/                 # Server Actions, one file per module
│  │  ├─ checkin.ts  session.ts  workout.ts  dsa.ts
│  │  ├─ agent.ts    application.ts  habit.ts  day.ts
│  ├─ lib/
│  │  ├─ db.ts                 # prisma singleton
│  │  ├─ xp.ts                 # award() + level/rank/stat math
│  │  ├─ day.ts                # day-boundary + rollover
│  │  ├─ timer.ts              # pure timer math (unit-tested)
│  │  ├─ progression.ts        # workout auto-scaling
│  │  ├─ srs.ts                # spaced repetition for DSA revisits
│  │  └─ readiness.ts          # interview readiness score
│  ├─ components/
│  │  ├─ system/               # SystemWindow, SystemAlert, BracketFrame, Scanlines
│  │  ├─ anim/                 # the 6 signature moments
│  │  ├─ now-card.tsx  quest-board.tsx  lane-strip.tsx  xp-bar.tsx
│  │  └─ ui/                   # button, input, sheet, ring, stat-radar
│  ├─ stores/runner.ts         # zustand timer store
│  └─ styles/globals.css
├─ public/manifest.webmanifest  sw.js
└─ PLAN.md  IDEAS.md
```

---

## 3. Prisma schema

```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

model Hunter {
  id            String   @id @default("local")
  handle        String   @default("Hunter")
  level         Int      @default(1)
  totalXp       Int      @default(0)     // = sum(xpLedger.amount)  (cached for reads)
  freePoints    Int      @default(0)
  streak        Int      @default(0)
  bestStreak    Int      @default(0)
  slotDebt      Int      @default(0)     // minutes banked, cap 360
  reducedMotion Boolean  @default(false)
  stats         StatPoint[]
  days          DayLog[]
}

model StatPoint {
  id       String @id @default(cuid())
  hunterId String
  hunter   Hunter @relation(fields: [hunterId], references: [id])
  key      StatKey
  points   Int    @default(0)   // allocated points
  xp       Int    @default(0)   // xp feeding this stat
  @@unique([hunterId, key])
}

enum StatKey { STR INT AGI VIT PER }
enum Load { MINIMUM STANDARD SPRINT }

model DayLog {
  id           String    @id @default(cuid())
  hunterId     String
  hunter       Hunter    @relation(fields: [hunterId], references: [id])
  date         DateTime  @unique @db.Date        // local calendar date, stored as UTC midnight
  load         Load      @default(STANDARD)
  // check-in
  sleepHours   Float?
  sleepQuality Int?
  energy       Int?
  mood         Int?
  weightKg     Float?
  focusTarget  String?
  checkedInAt  DateTime?
  lateCheckIn  Boolean   @default(false)
  // shutdown
  shutdownAt   DateTime?
  journal      String?
  top3         Json?                              // string[]
  // scoring
  focusMinutes Int       @default(0)
  workTargetMin Int      @default(660)
  score        Int?                               // 0-100, computed at rollover
  penaltyIssued Boolean  @default(false)
  penaltyDone   Boolean  @default(false)
  closedAt     DateTime?
  xpTotal      Int       @default(0)
  blocks       Block[]
  sessions     SlotSession[]
  habitLogs    HabitLog[]
  problems     DsaProblem[]
  sets         ExerciseSet[]
  xp           XpLedger[]
}

model Block {
  id          String   @id @default(cuid())
  dayId       String
  day         DayLog   @relation(fields: [dayId], references: [id], onDelete: Cascade)
  order       Int
  title       String
  startMin    Int      // minutes from local midnight (480 = 08:00) — avoids TZ math in layout
  endMin      Int
  type        BlockType
  slotProfile SlotProfile?
  linkKind    LinkKind?   // which tracker this block feeds
  microTasks  Json?       // string[] shown during breaks
  isAdHoc     Boolean  @default(false)
}

enum BlockType { RITUAL DEEP_WORK LEARNING MEAL RECOVERY PHYSICAL SOCIAL SLEEP }
enum SlotProfile { DEEP CLASSIC MICRO NONE }
enum LinkKind { LEETCODE COHORT DDIA HACKATHON WORKOUT NONE }

model SlotSession {
  id         String   @id @default(cuid())
  dayId      String
  day        DayLog   @relation(fields: [dayId], references: [id], onDelete: Cascade)
  blockId    String?
  startedAt  DateTime
  endedAt    DateTime?
  targetMin  Int
  focusMin   Int      @default(0)   // sum of round focused ms / 60000
  switches   Int      @default(0)   // context switches
  rounds     Round[]
  agents     ShadowAgent[]
}

model Round {
  id          String   @id @default(cuid())
  sessionId   String
  session     SlotSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  index       Int
  kind        String   // "focus" | "break"
  plannedMs   Int
  startedAt   DateTime?
  endedAt     DateTime?
  focusedMs   Int      @default(0)   // time with document.visible === true
  status      RoundStatus @default(PENDING)
}
enum RoundStatus { PENDING RUNNING DONE ABANDONED }

model ExerciseDef {
  id           String @id @default(cuid())
  slug         String @unique
  name         String
  block        String         // "A" | "B" | "ANY" (grease-the-groove)
  targetReps   Int
  targetSets   Int
  perSide      Boolean @default(false)
  isTimeBased  Boolean @default(false)  // plank
  targetSecs   Int?
  xpPerSet     Int     @default(10)
  order        Int
  sets         ExerciseSet[]
}

model ExerciseSet {
  id        String   @id @default(cuid())
  dayId     String
  day       DayLog   @relation(fields: [dayId], references: [id], onDelete: Cascade)
  exerciseId String
  exercise  ExerciseDef @relation(fields: [exerciseId], references: [id])
  setIndex  Int
  reps      Int?
  seconds   Int?
  rpe       Int?      // 1-5
  doneAt    DateTime @default(now())
  @@unique([dayId, exerciseId, setIndex])
}

model HabitDef {
  id        String  @id @default(cuid())
  slug      String  @unique
  label     String
  atMin     Int?
  xp        Int     @default(20)
  core      Boolean @default(false)   // counts for streak
  requiresProof Boolean @default(false) // e.g. sleep needs confirm
  logs      HabitLog[]
}

model HabitLog {
  id       String   @id @default(cuid())
  dayId    String
  day      DayLog  @relation(fields: [dayId], references: [id], onDelete: Cascade)
  habitId  String
  habit    HabitDef @relation(fields: [habitId], references: [id])
  doneAt   DateTime @default(now())
  @@unique([dayId, habitId])
}

model Pattern {
  id       String @id @default(cuid())
  slug     String @unique
  name     String
  inTarget Boolean @default(true)   // part of the SDE-1 coverage target
  problems DsaProblem[]
}

model DsaProblem {
  id          String   @id @default(cuid())
  dayId       String?
  day         DayLog?  @relation(fields: [dayId], references: [id])
  title       String
  url         String?  @unique
  platform    String   @default("leetcode")
  difficulty  Difficulty
  timeMin     Int?
  hintLevel   Int      @default(0)   // 0-3
  solved      Boolean  @default(true)
  confidence  Int      @default(3)   // 1-5
  firstOfPattern Boolean @default(false)
  notes       String?
  createdAt   DateTime @default(now())
  revisits    Revisit[]
  patterns    PatternOnProblem[]
  @@index([createdAt])
}
enum Difficulty { EASY MEDIUM HARD }

model PatternOnProblem {
  problemId String
  patternId String
  problem   DsaProblem @relation(fields: [problemId], references: [id], onDelete: Cascade)
  pattern   Pattern    @relation(fields: [patternId], references: [id], onDelete: Cascade)
  @@id([problemId, patternId])
}

model Revisit {
  id        String @id @default(cuid())
  problemId String
  problem   DsaProblem @relation(fields: [problemId], references: [id], onDelete: Cascade)
  dueAt     DateTime
  step      Int      @default(0)   // index into [1,3,7,21,45] days
  doneAt    DateTime?
  @@index([dueAt, doneAt])
}

model CohortModule {
  id        String @id @default(cuid())
  title     String
  week      Int?
  status    String @default("todo")  // todo | in_progress | done
  minutes   Int    @default(0)
  notes     String?
  doneAt    DateTime?
}

model HackathonProject {
  id         String @id @default(cuid())
  name       String
  deadline   DateTime?
  phase      String @default("idea")  // idea | build | polish | submit
  repos      Json?                    // string[]
  checklist  Json?                    // {label, done}[]
  minutes    Int    @default(0)
  submittedAt DateTime?
  agents     ShadowAgent[]
}

model ShadowAgent {
  id         String @id @default(cuid())
  sessionId  String?
  session    SlotSession? @relation(fields: [sessionId], references: [id])
  projectId  String?
  project    HackathonProject? @relation(fields: [projectId], references: [id])
  label      String
  task       String
  workspace  String          // repo path / Claude Code workspace id
  state      AgentState @default(DISPATCHED)
  needsMe    Boolean   @default(false)
  dispatchedAt DateTime @default(now())
  closedAt   DateTime?
  events     Json?           // [{at, state, note}]
}
enum AgentState { DISPATCHED RUNNING AWAITING_INPUT REVIEW MERGED ABANDONED }

model Application {
  id        String @id @default(cuid())
  company   String
  role      String   @default("SDE-1")
  source    String?
  stage     AppStage @default(APPLIED)
  ctc       String?
  appliedAt DateTime @default(now())
  lastEventAt DateTime @default(now())
  notes     String?
  events    Json?    // [{at, from, to, note}]
}
enum AppStage { APPLIED OA INTERVIEW_1 INTERVIEW_2 HR OFFER REJECTED GHOSTED }

model XpLedger {
  id        String   @id @default(cuid())
  dayId     String?
  day       DayLog?  @relation(fields: [dayId], references: [id])
  amount    Int      // negative for penalties
  reason    String   // "round.done" | "dsa.hard" | "habit.sleep" | ...
  sourceId  String?
  stat      StatKey?
  createdAt DateTime @default(now())
  @@index([createdAt])
}
```

**Why `XpLedger` is append-only:** level, rank, stats, daily totals, and "why did I gain 143 XP at 21:04" are all reducible from it. Never `hunter.totalXp += n` as the only record — update the cached `totalXp` *and* append the row in the same transaction.

---

## 4. Timer engine (`lib/timer.ts` + `stores/runner.ts`)

The single most important correctness detail in the app. **Never count with `setInterval`.** Store absolute timestamps and derive everything.

```ts
export type RoundState = {
  id: string
  kind: 'focus' | 'break'
  plannedMs: number
  startedAt: number | null      // epoch ms
  pausedTotalMs: number
  pausedAt: number | null
  focusedMs: number             // accumulated visible time
  lastTickAt: number | null
}

export function remainingMs(r: RoundState, now: number) {
  if (!r.startedAt) return r.plannedMs
  const pausedNow = r.pausedAt ? now - r.pausedAt : 0
  const elapsed = now - r.startedAt - r.pausedTotalMs - pausedNow
  return Math.max(0, r.plannedMs - elapsed)
}
```

- **Tick** at 250ms purely for rendering (`requestAnimationFrame` is fine; the number is derived, not incremented).
- **Visibility accounting:** on `visibilitychange`, if hidden → record `hiddenAt`; if visible → add `now - hiddenAt` to `focusedMs`. Persist `focusedMs` on every visibility change and every round transition (survives crashes).
- **Focus ratio** = `focusedMs / (plannedMs - pausedTotalMs)`. Round counts as complete at ≥ 0.8.
- **Recovery:** on mount, if a round has `startedAt` and no `endedAt`, compute `remainingMs`. If ≤ 0, it finished while you were away → mark `DONE` (or `ABANDONED` if focus ratio < 0.8) and fire the alert retroactively.
- **Alerting:** while the tab is open, `Notification` + WebAudio tone. For closed-tab reliability, the service worker registers a `setTimeout`-based local alarm (works while the SW is alive) and the app falls back to an in-app banner on next open. Real closed-tab reliability needs Web Push + a subscription row — post-v1.
- **Context switch** counter increments on: primary → agent lane, primary → any other route while a round runs (via `beforeunload`/router events), or manual "I got distracted" flag.
- **Persist on every transition** via a Server Action (`actions/session.ts`): `startRound`, `pauseRound`, `endRound`, `abandonRound`.

Unit-test the pure functions in `lib/timer.ts`: pause math, negative elapsed, clock skew backwards, double pause.

---

## 5. XP service (`lib/xp.ts`)

```ts
const XP_TO_NEXT = (l: number) => Math.round(200 * Math.pow(l, 1.35))

export function levelFromXp(totalXp: number) {
  let level = 1, acc = 0
  while (acc + XP_TO_NEXT(level) <= totalXp) { acc += XP_TO_NEXT(level); level++ }
  return { level, into: totalXp - acc, needed: XP_TO_NEXT(level) }
}

export function rankOf(level: number) {
  if (level >= 100) return 'NATIONAL'
  if (level >= 70) return 'S'
  if (level >= 50) return 'A'
  if (level >= 35) return 'B'
  if (level >= 20) return 'C'
  if (level >= 10) return 'D'
  return 'E'
}

export async function award(tx, { hunter, amount, reason, sourceId, stat }) {
  const mult = Math.min(2, 1 + 0.02 * hunter.streak)
  const final = Math.round(amount * (amount > 0 ? mult : 1))
  await tx.xpLedger.create({ data: { amount: final, reason, sourceId, stat, dayId: ... } })
  await tx.hunter.update({
    where: { id: hunter.id },
    data: { totalXp: { increment: final }, ...(stat ? { } : {}) },
  })
  if (stat) await tx.statPoint.update({ where: {...}, data: { xp: { increment: Math.max(0, final) } } })
  return final
}
```

- `award` is **idempotent per `(reason, sourceId)`** — a unique index on that pair means a double-submitted form can't double-pay. Add `@@unique([reason, sourceId])` to `XpLedger` (nullable `sourceId` → use `''` sentinel so Postgres unique still applies).
- Level-up detection: compare before/after inside the same transaction; if crossed, return `{ leveledUp: true, newLevel, freePoints: 3 }` so the client can fire `LevelUp`.
- Stat value = `floor(sqrt(xp / 40)) + allocatedPoints`.

---

## 6. Day boundary & rollover (`lib/day.ts`, `/api/rollover`)

- A day is the **local** calendar date. Store `DayLog.date` as `Date` at local-midnight-in-UTC (`date-fns` `startOfDay` then normalize) and always query by that key. Every write goes through `getOrCreateDay(date)`.
- Rollover runs at **00:05 local** (Vercel Cron on `/api/rollover` if deployed; a `window` timer + on-open check if local). It must be **idempotent**: `if (day.closedAt) return`.
- Rollover computes: `focusMinutes` (sum of sessions), `score` (0–100 weighted: work target 50, habits 25, workout 15, sleep 10), streak update, penalty issuance, `xpTotal`, and **slot debt** (`credit = max(0, workTargetMin - focusMinutes)` capped at 360).
- Also runs `srs.ts` to materialize tomorrow's due revisits.

---

## 7. Server Actions surface

```
checkin.ts     morningCheckIn(input) / eveningShutdown(input) / setLoad(load)
session.ts     startSession(blockId) / startRound(sessionId,index) / pauseRound()
               endRound(roundId, focusedMs) / abandonRound(roundId) / logSwitch(sessionId)
workout.ts     logSet(exerciseSlug,setIndex,reps|seconds,rpe) / finishBlock(block, rpe)
               adjustProgression()
dsa.ts         logProblem(input) / markRevisitDone(id) / dueRevisits()
agent.ts       dispatchAgent(input) / transitionAgent(id,state,note) / closeAgent(id)
habit.ts       tick(habitSlug)
application.ts addApplication(input) / advanceStage(id,stage) / funnelStats()
day.ts         getToday() / getWeek() / recomputeScore(dayId)
```

Rules: every action takes a Zod-validated object, returns `{ ok, xpAwarded, leveledUp? , data }`, and wraps writes in `prisma.$transaction`. The client uses `useOptimistic` for checkboxes and revalidates the path.

---

## 8. Animation implementation

### Design tokens (`globals.css`)

```css
:root{
  --bg:#0A0E14; --panel:#11161F; --line:#1E2733;
  --system:#4DA3FF; --shadow:#8B5CF6; --danger:#FF3B4E;
  --ok:#2BD98A; --text:#D6E2F0; --muted:#6B7C93;
  --font-display:"Rajdhani",system-ui; --font-body:"Inter",system-ui;
  --grid: linear-gradient(#1E2733 1px, transparent 1px) 0 0/32px 32px,
          linear-gradient(90deg,#1E2733 1px, transparent 1px) 0 0/32px 32px;
}
```

Panel primitive = 1px `--line` border, 0 radius, corner brackets via two pseudo-elements, 2% noise overlay, optional scanline (`repeating-linear-gradient` at 3px, opacity .03).

### Motion presets (`components/anim/presets.ts`)

```ts
export const snap   = { type:'spring', stiffness:320, damping:26 } as const
export const smooth = { duration:0.28, ease:[0.22,1,0.36,1] } as const
export const slam   = { duration:0.42, ease:[0.16,1,0.3,1] } as const

export const windowIn = {
  hidden:{opacity:0,y:8,scaleY:0.96,filter:'blur(4px)'},
  show:{opacity:1,y:0,scaleY:1,filter:'blur(0px)',transition:{...snap}},
}
```

### The 6 signature moments

| # | Component | Timing | Implementation notes |
|---|---|---|---|
| 1 | `SystemBoot` | 700ms, cold load only | `AnimatePresence` on app shell; grid `opacity 0→1` (200ms), panels stagger `staggerChildren:0.06`, final 2-frame scale snap. Gate with `sessionStorage.booted`. |
| 2 | `QuestArrival` | 1.2s | Full-screen `fixed inset-0 bg-bg/85 backdrop-blur`. A 1px line scales `scaleX 0→1` (180ms) then splits `y ±12` revealing the alert. Text via a typing component (30 chars/s, monospace). WebAudio: two-tone chime (660→880Hz, 120ms each). Dismiss = click anywhere, but only after typing completes. |
| 3 | `LevelUp` | 1.6s | GSAP timeline: `stop-scroll` overlay → radial `box-shadow` shockwave from the level number → digits Odometr-roll (translateY) → rank letter `slam` with `x:[0,-2,2,0]` shake on `document.body` (transform only) → 3 stat-point chips pop with `snap`. Confetti is banned; particles instead. Respect `reducedMotion` → 400ms fade. |
| 4 | `SetComplete` | 280ms | Row `layout` collapse + check path draw (`pathLength` 0→1, 180ms) + `+10` floating `y:-18, opacity:1→0`. Must run at 60fps with 20 rows on screen: no blur filters here, no layout reads. |
| 5 | `PenaltyZone` | ambient | Fixed inset pseudo-element vignette `box-shadow: inset 0 0 120px var(--danger)`, `opacity [0.15,0.35,0.15]` 1.5s infinite. Countdown text uses `--danger` + 1s pulse. Never block input. |
| 6 | `ShadowExtract` | 900ms | 12 particles (violet divs) converge to the lane card's center (`x/y` spring), card `rotateY 0→180` with back face = `MERGED` state, then `flash:opacity .9→0`. |

### Ring / progress

`XPBar` and the round ring use SVG `strokeDasharray`/`strokeDashoffset` driven by a `useSpring` value — never width/height (layout) animation.

### Performance & accessibility rules

- Only `transform`, `opacity`, `filter` (sparingly) animate. No `top/left/width/height`.
- During a running round, suspend all non-essential motion (`MotionConfig reducedMotion="user"` + a global `motionPaused` flag) so the timer stays smooth.
- Every animation is rendered behind a `useReducedMotion()` check → instant state change + 120ms fade.
- Focus-visible rings on every interactive element; alerts are `role="alertdialog"` with focus trap and Esc handling.
- Color contrast: `--muted` on `--bg` must be ≥ 4.5:1 for text (bump to `#8496AD` if it fails).

---

## 9. PWA & notifications

`manifest.webmanifest`: `display: standalone`, `background_color #0A0E14`, `theme_color #4DA3FF`, 192/512 icons.
`sw.js`: cache the shell (`/`, offline fallback), intercept nothing else. Register in `layout.tsx` via a client component, after `load`.
Notification permission is requested **only** when you press "Start slot", never on first paint.
Audio: `AudioContext` may start suspended — resume on the first user gesture (the start button). Ship 3 generated tones (round end, level up, penalty), not files.

---

## 10. Testing (proportional, not exhaustive)

Vitest, pure functions only — that's where the bugs are:

1. `timer.ts` — remaining math across pause, clock skew, closed tab; focus ratio.
2. `xp.ts` — level curve monotonicity, exact boundary (level up at exactly `totalXp`), streak multiplier cap, negative amounts not multiplied.
3. `srs.ts` — revisit scheduling steps and due filtering.
4. `progression.ts` — 0.6 → 1.0 ramp, hard-session decay floor.
5. `day.ts` — rollover idempotency, local-midnight keying across DST.

No component tests, no E2E for v1. Manually verify: run one real day through the app; refresh mid-round; close the tab mid-round; export → wipe → import.

---

## 11. Seed data (`prisma/seed.ts`)

Must reproduce `PLAN.md §3.1` exactly — 13 blocks, `startMin`/`endMin` from local midnight (07:00 = 420 … 23:00 = 1380).

**Blocks:** the table in PLAN §3.1, with `microTasks` on deep-work slots:
- Slot 1 (08:00–11:00): `["2 boiled eggs","apply hair oil","6 pull-ups","water","20-ft look"]`
- Slot 3 (14:00–17:00): `["2 boiled eggs","6 pull-ups","water","stand 2 min"]`
- Slots 4/5: `["6 pull-ups","500 skips?","water","check agent status: read-only"]`

**Exercises** (order A: pull-up, push-up-normal, push-up-wide; B: push-up-diamond, crunches, side-crunches, squat, bridge, plank; ANY: skip-rope):

| slug | block | sets | reps | note |
|---|---|---|---|---|
| pullup | ANY | 8 | 6 | grease the groove, per-break |
| pushup-normal | A | 4 | 30 | |
| pushup-wide | A | 3 | 15 | |
| pushup-diamond | B | 2 | 20 | |
| crunch | B | 2 | 30 | |
| side-crunch | B | 2 | 20 | perSide |
| squat | B | 3 | 20 | |
| bridge | B | 3 | 15 | |
| plank | B | 3 | — | isTimeBased, 45s |
| skip-rope | B | 4 | 500 | |

Progression scales `reps` only, not `sets`.

**Habits:** `oats-seeds` (07:35, core) · `eggs-am` (10:00) · `hair-oil` (10:10) · `eggs-pm` (16:30) · `tea-karthick` (17:40) · `sleep-2300` (23:00, core, requiresProof) · `shutdown` (22:50, core).

**Patterns (14):** arrays, two-pointers, sliding-window, prefix-sum, binary-search, stack, queue, linked-list, trees, bst, graphs, backtracking, dp-1d, dp-2d, greedy, heap, trie, intervals, bit, strings, math. (`inTarget` true for all except math.)

---

## 12. Deployment

- **Local first** is the recommended v1: `npm run dev` + install the PWA on your phone over LAN. Zero cost, zero latency, no auth needed.
- If deploying: Vercel + Neon. Add `middleware.ts` basic-password gate, Vercel Cron `5 0 * * *` → `/api/rollover` (`CRON_SECRET` header check). Note the timezone: Vercel Cron runs in UTC, so the local-midnight rollover needs the offset baked in or a "compute which day to close" guard inside the handler (preferred — make the handler derive it).
- Backup: nightly `pg_dump` or one-click `GET /api/export` → JSON in your Drive.

---

## 13. Build order (dependency-correct)

```
schema + seed
  → db.ts + getOrCreateDay
  → xp.ts (award + level math)         ← everything depends on this
  → M1 Command Center (read-only)
  → M2 check-in (writes DayLog)
  → M3 timetable (Block CRUD, now-card)
  → lib/timer.ts + M4 runner           ← hardest 8h, do it while fresh
  → M5 workout (simple CRUD + XP)
  → M6 DSA (CRUD + srs)
  → M7 agents/dual-lane + debt bank
  → M8 analytics
  → animations (day 6 only)
  → PWA + export
```

If you only ever get through the first five arrows, you still have a working daily driver.
