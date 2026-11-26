# Project ARISE — Personal Leveling System

> A single-user, Solo-Leveling-styled operating system for one hunter: 12h of deep work, a calisthenics dungeon, parallel hackathon agents, and a DSA grind aimed at a lucrative SDE-1 offer.

**Status:** v1 core shipped (M1–M4) — see `README.md`. Dungeon, DSA arena, shadow lanes and the day heatmap are the v1.1 queue (§10).
**Owner:** you (solo dev, solo user)
**Docs:** this file = product + build plan. `docs/technical-spec.md` = stack, schema, timer engine, animation spec.

---

## 0. TL;DR

| Question | Answer |
|---|---|
| What is this? | A web app that runs your day as a game: morning check-in → timed work slots → workout dungeon → evening shutdown, with XP, levels, ranks, streaks and Solo-Leveling "System" UI animations. |
| Who uses it? | Exactly one person. No signup, no multi-tenant, no social. |
| Core loop | Check-in (07:30) → 4–5 timed slots → egg/hair-oil/tea reminders → workout dungeon → shutdown + journal (22:30) → midnight rollover scores the day and pays XP. |
| The one metric that matters | **XP earned today**. Everything else (problems solved, pomodoros, reps, applications) feeds it. |
| Build size | ~40 hours across 6 build days → usable MVP after build day 3. |
| Stack | Next.js 15 (App Router, TS) + Tailwind + Framer Motion + Prisma + Postgres (Neon) + PWA. Details in the tech spec. |

**The honest headline you need before anything else:** your schedule as written does not fit in a day. See §1.

---

## 1. Reality check on the 12–15 hour target

Your stated plan: 4 × 3h work slots + 1h YouTube = **13h of work**, plus cooking, 4 meals, 2 egg breaks, tea with Karthick, a workout, and 8h sleep.

Arithmetic on a 24h day:

```
24h
- 8h   sleep (23:00 → 07:00, non-negotiable, see §9)
- 3h   meals + cooking + bath + tea + transitions
- 1h   workout
= 12h  absolute ceiling for work
```

**12h is the ceiling. 14–15h is arithmetically impossible** with 8h sleep and a real workout, and trying for it is how the streak dies in week 2. So the plan below does this instead:

1. **Fits 12h of work (11h deep work + 1h learning) into the real day**, exactly, with zero slack invented.
2. Treats the 4×3h slot structure as a **credit system**, not a wall clock. You earn slot-minutes; slots that can't be scheduled become *debts* you can repay on hackathon days (§3.6). This is what makes "3+3+3+3" survivable.
3. Defines a **minimum viable day (6h)** so a bad day costs you 0 streak instead of everything.

If you disagree and genuinely want 14h, the only lever is sleep → 6h, which this document argues against and the app will not reward (§3.7).

---

## 2. Product thesis

You don't need another habit tracker. You need four specific things, and each maps to one module:

| Your problem | The module that solves it |
|---|---|
| "I forget what I'm supposed to be doing at 2pm, and drift." | **Timetable + Now Card** — always shows the current block, the next one, and a single button to start it. |
| "I start a pomodoro, tab-drift, and lose the hour." | **Slot runner** — a full-screen focus mode with per-slot timers, pomodoro rounds, and context-switch counting. |
| "I'm running Claude Code agents *while* doing DSA, and lose track of both." | **Dual-lane workspace** — one primary lane (you) + background lanes (shadow agents) with explicit states: dispatched / running / awaiting-input / merged. |
| "I can't tell if I'm actually getting closer to an SDE-1 offer." | **Status Window** — weekly scorecard: problems by pattern, cohort modules, applications by stage, projects shipped, XP trend. |

The Solo Leveling skin isn't decoration. It's a **feedback loop compressor**: XP number goes up the instant you finish a set or a pomodoro, which is the thing ordinary trackers fail to do.

---

## 3. The daily operating system

### 3.1 Canonical timetable (seeded on first run)

| # | Time | Block | Type | Timer | Notes |
|---|---|---|---|---|---|
| — | 07:00–07:30 | Wake + bath + weigh-in | Ritual | 30m | Single weigh-in/week matters more than daily; log it anyway |
| — | 07:30–08:00 | Oats + seeds, plan the day | Ritual | 30m | **Check-in gate: Daily Quest is issued here** |
| 1 | 08:00–11:00 | **LeetCode — pure DSA** | Deep work | 3h = 3 × (50/10) | 10:00: 2 boiled eggs + **hair oil reminder** |
| 2 | 11:00–12:00 | **DDIA 40m + YouTube/tech 20m** | Learning | 1h = 2 × (25/5) | Sub-blocks, switchable |
| — | 12:00–13:15 | Cook chicken + lunch + Akshat investing | Meal | 75m | Passive learning, logged as `passive` |
| — | 13:15–14:00 | Reset (20m nap or walk) | Recovery | 45m | Skippable; nap is capped at 20m |
| 3 | 14:00–17:00 | **100x cohort** | Deep work | 3h = 3 × (50/10) | 16:30: 2 boiled eggs |
| — | 17:00–17:30 | **Workout block A** | Physical | 30m | Pull-up bank + push-ups (§3.5) |
| — | 17:30–18:00 | **Tea with Karthick** | Social | 30m | Protected. Not a work slot, not optional |
| 4 | 18:00–20:30 | **LeetCode ↔ Hackathon (dual lane)** | Deep work | 2.5h | 50m LeetCode / 50m hackathon, alternating |
| — | 20:30–21:00 | Dinner | Meal | 30m | |
| 5 | 21:00–22:30 | **100x cohort ↔ Hackathon (dual lane)** | Deep work | 1.5h | Agent dispatch window for overnight runs |
| — | 22:30–23:00 | **Workout block B** + journal + shutdown | Physical + ritual | 30m | Abs, squats, bridge, plank, skip rope; tomorrow's top 3 |
| — | 23:00 | Sleep | — | 8h | Hard floor |

**Accounting:** deep work 11h · learning 1h · physical 1h · rituals 1.5h · meals 2.75h · social 0.5h · sleep 8h = 24.0h exactly.

**Decisions I made for you here (change them in one place if you disagree):**

- **LeetCode is 08:00–11:00, not 08:00–12:00.** You gave 4 hours but only budgeted 3h per slot. The 11:00–12:00 hour is the only place DDIA fits, and DDIA at 1h/day for ~4 months finishes the book.
- **Slots 4 and 5 are halved** (2.5h + 1.5h = 4h) instead of 3h + 3h. That's where the day's 2 hours of fiction had to come from; dinner at 20:30 and sleep at 23:00 make 6h of evening work impossible. The **slot-debt system (§3.6)** lets you claw those hours back on hackathon-heavy days.
- **Workout is split into two 30-minute blocks**, because 50 pull-ups + 205 push-ups + 2000 skips + abs in one sitting is 60–75 minutes and would eat a slot. Block A is upper body, block B is core/conditioning.
- **Pull-ups use grease-the-groove**, not a single set: 5–8 reps at *every pomodoro break* (~8 breaks × 6 = ~48). You physically cannot do 50 clean pull-ups consecutively at a desk-job fitness level, and trying will wreck your elbows in week 1.

### 3.2 Slot anatomy

Every work slot is a container of **rounds**. Two timer profiles, both summing to a whole slot with no remainder:

| Profile | Round | Break | Rounds per 3h | Sum |
|---|---|---|---|---|
| `DEEP` (default) | 50m | 10m | 3 | 3×(50+10) = 180m |
| `CLASSIC` (option) | 25m | 5m | 6 | 6×(25+5) = 180m |
| `MICRO` (1h slot) | 25m | 5m | 2 | 60m |

Rules the runner enforces:

- A round only counts as **complete** if the tab was focused for ≥80% of the round (visibility API). This is what stops "pomodoro theatre".
- Breaks are **mandatory and timed** — this is when pull-up reps, eggs, hair oil, and water happen.
- Pausing >10 min auto-ends the round as `abandoned` and logs a context switch.
- Slots auto-advance the timetable, but never auto-start the next slot. You press start. Agency matters.

### 3.3 Check-in (morning)

A full-screen System alert opens at 07:30 and blocks the app until answered. Fields:

`sleepHours` · `sleepQuality 1–5` · `energy 1–5` · `mood 1–5` · `weightKg (optional)` · `focusTarget` (one sentence, free text) · `todayLoad` ∈ {MINIMUM, STANDARD, SPRINT}

`todayLoad` is the important one: it rescales the day's XP targets.

| Load | Work target | Slot rule | When |
|---|---|---|---|
| MINIMUM | 6h | 2 slots only, all habits still count, **streak safe** | sick, travel, burnt out |
| STANDARD | 11h | full timetable | default |
| SPRINT | 13h+ | pulls hours from the debt bank | hackathon deadline, interview week |

### 3.4 Check-in (evening / shutdown)

22:30–23:00. Three prompts, 3 minutes, no journaling essay:

1. Top 3 for tomorrow (pre-fills tomorrow's quest board).
2. One line: what actually happened today.
3. `sleepBy 23:00` confirmation → the only habit that gates tomorrow's streak.

### 3.5 The workout dungeon (your numbers, made runnable)

Targets from your spec, split so they're achievable:

| Movement | Your target | Prescribed split | Where |
|---|---|---|---|
| Pull-ups | 50 | **8 × 6** across pomodoro breaks (grease the groove) | Block A + all breaks |
| Push-ups normal | 40 × 3 = 120 | 4 × 30 | Block A |
| Push-ups diamond | 20 × 2 = 40 | 2 × 20 | Block B |
| Push-ups wide | 15 × 3 = 45 | 3 × 15 | Block A |
| Skip rope | 2000 | 4 × 500 | Block B + breaks |
| Crunches | 30 × 2 = 60 | 2 × 30 | Block B |
| Side crunches | 20 × 2 = 40 | 2 × 20/side | Block B |
| Squats | — (unspecified) | 3 × 20 | Block B |
| Bridge up | — (unspecified) | 3 × 15 | Block B |
| Plank | — (unspecified) | 3 × 45s | Block B |

**Volume check:** ~355 push/pull/core reps + 2000 skips/day. That is a real athlete's workload. The app therefore auto-scales: it prescribes `ceil(target × progression)` where `progression` starts at **0.6** and rises 5% per week-of-full-completion, capped at 1.0, and drops 10% if two consecutive sessions are marked `too hard`. You never see "50 pull-ups" on day one; you see "30" and it climbs. Your stated targets become the *level-10* version of the dungeon.

XP: 10 per completed set · +20 for completing all sets of a movement · +150 for a full dungeon clear · +100 for 2000 skips.

### 3.6 Dual-lane sessions and shadow agents

This is the feature that makes your "Claude Code in the background while I do DSA" workflow legible.

A session can have **1 primary lane + N background lanes**:

- **Primary lane** = you. Focused timer, counts toward XP and focus minutes. Only one at a time.
- **Background lane ("shadow")** = an agent. States: `dispatched → running → awaiting-input → review → merged/abandoned`. Carries a task note, target repo/workspace, and a `needsMe` flag.
- The app **counts context switches**: every time you leave the primary lane for a shadow lane, +1. Daily budget 6. Over budget costs XP (see §3.7) and the status window calls it out, because this is the actual killer of your 12h day.
- **Dispatch board** for the 21:00 slot: queue 1–3 tasks, mark them; they can keep running while you sleep (that's why `Sleep by 23:00` is tracked — overnight agents only get "credit" if you slept).

**Slot debt bank:** each day you get a debit of scheduled slot-minutes (660 on STANDARD). Unused minutes bank up to a cap of **360** (≈ one 6h day). Debt is spent on SPRINT days. This is how the 3+3+3+3 fiction coexists with a 24h clock: the hours exist, just not always on the same day.

### 3.7 Game mechanics — exact numbers

**XP awards**

| Action | XP |
|---|---|
| Pomodoro round completed | 25 |
| Slot completed (all rounds) | +100 |
| Daily check-in | 50 (+25 if before 07:45) |
| Evening shutdown | 60 |
| Habit: oats + seeds | 20 |
| Habit: 2 eggs at 10:00 | 20 |
| Habit: hair oil after egg break | 20 |
| Habit: 2 eggs at 16:30 | 20 |
| Habit: tea with Karthick | 15 |
| Habit: sleep by 23:00 | 80 |
| Exercise set | 10 |
| Movement fully completed | 20 |
| Dungeon clear | 150 |
| DSA: Easy / Medium / Hard | 30 / 60 / 120 |
| DSA: first-ever solve of a *new pattern* | +100 |
| DDIA chapter finished | 200 |
| Cohort module finished | 150 |
| Application sent | 40 |
| OA / interview stage advanced | 120 |
| Hackathon submitted | 400 |
| Weekly review completed | 200 |

**Levels.** `XP_to_next(L) = round(200 × L^1.35)`. At a realistic ~2,200 XP/day you hit L10 in ~6 days and L20 in ~3 weeks. Level-ups are the primary animation payoff, so early levels must come fast — they do.

**Ranks.** E (1–9) · D (10–19) · C (20–34) · B (35–49) · A (50–69) · S (70–99) · **National Level** (100+). Rank-up is a full-screen animation with a distinct sound and a stat-point grant.

**Stats** (Solo Leveling's five, re-purposed):

| Stat | Fed by |
|---|---|
| STR | workout volume, dungeon clears |
| INT | DSA XP, cohort XP, DDIA XP |
| AGI | applications sent, hackathon submissions, context-switch under budget |
| VIT | sleep, meals, habits, recovery blocks |
| PER | streaks, check-ins, shutdowns, weekly reviews |

Stat value = `floor(sqrt(statXP / 40))`. Each level-up grants **3 free points** to allocate.

**Streak.** +1 per day that hits `todayLoad`'s work target **and** the 3 core habits (sleep, oats, shutdown). Streak multiplier on all XP: `1 + 0.02 × streak`, capped at 2.0.

**Penalty quest.** If the day closes below target, the next morning issues a Penalty Quest before 10:00: `60 push-ups + 20 crunches + 1 Medium problem`. Complete it → keep streak, no XP loss. Skip it → streak resets to 0 and yesterday's XP is halved. **Hard rule: penalty quests may never reduce sleep, and may never exceed 1× the day's normal workout volume.** This app must not hurt you.

**Anti-pattern XP (negative):**

| Behaviour | Penalty |
|---|---|
| Context switches > 6 | −10 XP per extra switch |
| Round abandoned | −15 XP |
| Sleep after 00:00 | −100 XP and no overnight-agent credit |
| Phone scroll during a round (manual flag) | −20 XP |

---

## 4. Modules & acceptance criteria

Nine modules. Each one is "done" only when its criteria pass.

### M1 — Command Center (home)
The status window. Top strip: level, rank, XP bar, streak, today's score. Body: **Now Card** (current block, time left, one primary button), **Next Card**, **Quest Board** (today's items with checkboxes), **Lane Strip** (shadow agents + their states), **Today's Dungeon progress**.

- *Done when:* loads in <1s on local data, reflects a completed action within 200ms without a reload, and works at 375px width.

### M2 — Check-in
Morning gate + evening shutdown (§3.3, §3.4). Cannot be dismissed before answering. Re-entry edits are allowed, but re-editing after the day closes doesn't re-award XP.

- *Done when:* a missed morning check-in is recoverable until 12:00 (marked `late`, half XP), and the day rollover job correctly closes an unfinished day exactly once (idempotent).

### M3 — Timetable
The seeded plan, editable. Drag to reorder, drag edges to resize, add one-off blocks. Views: **today timeline**, **week grid**. Each block: start, end, type, slot profile, linked module (workout/DSA/cohort/hackathon), notes.

- *Done when:* edits propagate to the runner and the Now Card, resizing a slot recalculates rounds, and a block may link to more than one tracker.

### M4 — Slot runner + pomodoro
Full-screen focus mode. Per-slot timer with rounds, per-round start/pause/abandon, live progress ring, break countdown with the break's *assigned micro-task* (e.g. "6 pull-ups"), context-switch counter, dual-lane switcher for slots 4/5.

- *Done when:* the timer stays accurate across tab-close/reopen (reconstruction from timestamps, not interval counting), a mid-round refresh loses nothing, and audible + desktop-notification alerts fire at round end.

### M5 — Workout dungeon
Block A / Block B checklist with per-set rep entry, per-movement progress, auto-scaled targets, rest timer between sets, RPE 1–5 after each block, and a mini "damage dealt" animation per completed set.

- *Done when:* partial sets can be saved honestly (e.g. 30/40), progression adjusts after the session, and history shows volume per movement per week.

### M6 — DSA arena
Log a problem: name, link, platform, difficulty, patterns (multi-select from a fixed taxonomy), time taken, hint level (0–3), solved/unsolved, confidence 1–5. Auto-schedules a **revisit** via spaced repetition (1d → 3d → 7d → 21d). Shows pattern coverage radar vs. an SDE-1 target set.

- *Done when:* the revisit queue surfaces due problems in the Now Card, pattern radar renders 14 patterns, and a duplicate URL is detected.

### M7 — Hackathon war room
Projects with deadline, current phase (idea/build/polish/submit), linked repos, **shadow-agent dispatch queue**, time spent, and a submission checklist. Sprint mode pulls hours from the debt bank and shows a live countdown.

- *Done when:* agent states transition cleanly, a project's time totals reconcile with session records, and the checklist blocks "submitted" until required items are ticked.

### M8 — Status window (analytics)
Daily / weekly / monthly. Focus minutes heatmap by slot, XP sparkline, DSA-by-pattern and DSA-by-difficulty bars, workout volume trend, **application funnel** (applied → OA → interview → offer), context-switch trend, and an **Interview Readiness score** (weighted: problems 40%, patterns 20%, cohort 15%, projects 15%, applications 10%).

- *Done when:* every number is derived from stored events (no manual stats), and a week with no data renders an empty state, not NaN.

### M9 — Settings
Timer profiles, XP tuning (multipliers, penalties), penalty-quest on/off, notification permissions, export/import JSON, reduced-motion toggle, theme.

- *Done when:* a full export → wipe → import round-trips byte-identically.

---

## 5. UX & animation spec (short form; details in tech spec)

**Look:** dark slate/near-black base (`#0A0E14`), a single cold accent (`#4DA3FF`) for the System, violet (`#8B5CF6`) for shadow/agent lanes, danger red (`#FF3B4E`) for penalty. Typography: an angular display face for System text (Rajdhani / Orbitron) + Inter for data. Thin 1px borders, corner brackets, faint scanlines. No rounded-blob cards — this is a terminal, not a habit app.

**The System speaks in one voice:** monospace, terse, always bracketed — `[ SYSTEM ] Daily Quest has arrived.` Never chatty, never two sentences when one works.

**Signature moments (6, each a named component):**

1. `SystemBoot` — app open: black → grid fades in → windows stagger in (60ms apart) → status window snaps. 700ms total, only on cold load.
2. `QuestArrival` — check-in submit: full-screen dim, a horizontal line splits open, alert text types in at 30 chars/s, chime. 1.2s.
3. `LevelUp` — radial shockwave from the level number, digits roll, rank letter slams in with a 2-frame screen shake, 3 stat points pop. 1.6s.
4. `SetComplete` — each rep set: the row compresses to a check and a small "+10" floats up and fades. 280ms. Dozens per session, so it must be cheap and never block.
5. `PenaltyZone` — red vignette pulses at 1.5s period along screen edges, the countdown turns red, no full-screen takeover (you still need to work).
6. `ShadowExtract` — agent merged: violet particles converge into the lane card, it flips to `merged` state.

**Rules:** animate `transform`/`opacity` only; no animation longer than 1.6s; every animation has a `prefers-reduced-motion` fallback (instant state + one 120ms fade); nothing animates while a timer round is running except the ring and alerts.

---

## 6. Data model (summary)

11 core tables: `hunter` (singleton profile), `statPoint`, `dayLog`, `block` (timetable), `slotSession`, `round`, `exerciseDef`, `exerciseSet`, `habitDef`, `habitLog`, `dsaProblem`, `pattern`, `cohortModule`, `hackathonProject`, `shadowAgent`, `application`, `xpLedger`, `streak`, `journalEntry`.

Design rules: **`xpLedger` is append-only** — XP is never stored as a mutable counter, it's summed. Every award/penalty is a row with `reason`, `amount`, `sourceId`. This makes the status window, stat math, and "why am I level 12" all derivable and auditable. Full Prisma schema in `docs/technical-spec.md`.

---

## 7. Build plan — 6 build days, ~40 hours

Each day ends in something you can actually use that evening. No day is a refactor day.

| Day | Goal | Deliverable | Done when |
|---|---|---|---|
| **0. Setup** (2h) | Repo, Next 15 + TS + Tailwind, Prisma + Neon, shadcn-free custom UI kit, `/design` page with colors + type + the 6 animation primitives stubbed | app boots, one migration applied | `npm run dev` shows the status window with fake data |
| **1. Core data + Command Center** (7h) | Schema, seed (timetable, exercises, habits, patterns), XP ledger service, status window with real DB data, Now Card | you open the app and see today's real schedule | XP award creates a ledger row and the bar moves |
| **2. Check-in + timetable** (7h) | M2, M3 fully: morning gate, evening shutdown, timeline, edits, day rollover job | you run your real morning and evening through it | missed check-in recoverable until 12:00; rollover idempotent |
| **3. Slot runner** (8h) | M4: timestamp-based timer engine, rounds, breaks with micro-tasks, notifications, focus % tracking, context-switch counter | **usable MVP** — you can run a whole real day | timer survives refresh/close; a full 3h slot logs 3 rounds |
| **4. Dungeon + DSA** (7h) | M5, M6: set logging, progression scaling, DSA entry with patterns, spaced-repetition queue, pattern radar | you log a real workout and 3 real problems | revisit queue surfaces tomorrow's due problems in Now Card |
| **5. Shadow lanes + war room** (5h) | M7: agent states, dispatch queue, dual-lane sessions, slot debt bank, sprint mode | you dispatch an agent at 21:00 and see it in the morning | agent credits require a completed sleep habit |
| **6. Gamification + polish** (6h) | The 6 animations, level-up, rank-up, penalty quest, status window charts, PWA + notifications, export/import, reduced motion | it feels like the System | reduced-motion pass, a11y pass, 3 consecutive real days logged |

**Sequencing rule:** ship from day 3 and use it daily. Build days 4–6 with real data from your own days — every gamification number gets tuned by what actually happened (e.g. you'll discover the 25-XP pomodoro is too cheap or too expensive within 2 days).

**Explicitly cut from v1** (write them in `IDEAS.md`, don't build them):
social/leaderboards · mobile native app · AI coach · calendar sync · multi-user/auth · wearable import · streak freeze purchases · custom theme editor · sound library.

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| **Building becomes procrastination.** This is the #1 risk for someone optimising for an SDE-1 offer. | Hard cap: 40h total, 6 sessions, then feature freeze for 30 days. The app must earn its build cost by 3 real days of use. |
| **Over-gamification corrupts the point.** You optimise XP, not skill. | XP only pays for *verified* work (focus % ≥80, problems with a URL, sets with reps). Weekly review includes one "did this actually make me better" question. |
| **Manual logging decay.** Trackers die at week 3. | Zero-friction paths: Now Card has one-tap start; DSA form remembers last patterns; workout is a checklist not a form. Target <10s per entry. |
| **Streak anxiety.** Missing a day must not feel like failure. | MINIMUM load = streak-safe. Penalty quests capped and always safe. |
| **Timer spoofing by yourself.** Nobody's watching. | Focus % from visibility API + honest manual flags. Accept imperfection; this is a mirror, not a court. |
| **Scope creep on animation.** | The 6 moments are specified with durations. Day 6 is the only day animations get built. |

---

## 9. Operating manual — week 1

1. **Sleep is the stat that gates all others.** 23:00 lights out. If the day ran late, the app takes the XP hit, not your sleep.
2. **First action after 07:30 check-in: start slot 1, don't open anything else.** The window between check-in and slot 1 is where the day is lost.
3. **At every pomodoro break: 6 pull-ups, water, look at something 20 feet away.** Breaks are rep banks, not phone breaks.
4. **Slots 4/5: one lane at a time, 50 minutes each.** Dispatch the agent, then leave it. Six switches max.
5. **Log DSA honestly** — hint level 3 on a "solved" problem means you didn't solve it. The revisit queue depends on this honesty.
6. **Friday 21:00: weekly review, 20 minutes.** Applications sent? Patterns covered? Cohort modules? What broke? Adjust one thing only.
7. **If you miss a day, do only the MINIMUM day tomorrow.** Never "make up" a missed day by doubling — that's how the whole system ends.

---

## 10. Decisions (locked 26 Nov 2026)

| Question | Decision |
|---|---|
| LeetCode morning length | **3h** (08:00–11:00), as scheduled. The 11:00 hour stays DDIA + tech updates. |
| 100x cohort cadence | **As scheduled** — daily, slots 3 and 5. |
| Applications | **Reminders only.** Not a scheduled slot and not a timed session. They surface as quest-board items so they cost no calendar time, but they still pay XP. |
| Deployment | **Vercel** (+ a hosted Postgres, e.g. Neon). Single-user, no auth — gate it with one shared password in `middleware.ts`. |
| Day heatmap (blocks × colour) | **Deferred to v1.1.** `TYPE_COLOR` already assigns a colour per block type, so it is a rendering job, not a data one. |

### v1.1 backlog (in order)

1. Day heatmap — per-day block grid, and a month grid of focus intensity.
2. Workout dungeon (M5) with auto-progression.
3. DSA arena (M6) + spaced repetition queue + pattern radar.
4. Shadow-agent lanes + hackathon war room (M7).
5. Status window analytics (M8): application funnel, focus heatmap, readiness score.
6. PWA install + web push for round-end alerts when the tab is closed.
