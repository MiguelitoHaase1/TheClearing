---
title: "Continuous Improvements — Archetype Selection"
source_strategy: "strategy.md"
generated: "2026-03-27"
status: "Complete"
selected_archetype: "The Native Loop"
how_to_win: "The only system where a sentence in Discord becomes a tested, measured, shipped improvement by morning — with zero infrastructure outside Claude Code, Vercel, and Supabase."
architecture:
  frontend: "Next.js dashboard on Vercel — server-rendered, reads from Supabase"
  backend: "Claude Code (scheduled remote agent + Discord Channels) + Supabase Postgres"
  integrations:
    - "Discord (via Claude Code Channels — capture, sparring, scout proposals)"
    - "Claude Code /schedule (5am DK heartbeat — experiment execution)"
    - "Supabase (experiment results, eval deltas, workstream history)"
    - "Vercel (dashboard hosting)"
  data: "Supabase Postgres — experiment results, eval deltas, workstream metadata. Repo files for backlog, evals, goal.md."
boundaries:
  no_gos:
    - "No separate Discord bot deployment — Channels handles capture"
    - "No cross-product learning in V1 — each product loop is independent"
    - "No multi-user features — solo builder only"
    - "No real-time/continuous execution — heartbeats only (Cognitive Peace principle)"
    - "No custom web UI for idea capture — Discord is the capture surface"
    - "No duplication of evals in goal.md — evals live in one place, referenced not copied"
  rabbit_holes:
    - trap: "Building a rich dashboard before the loop works end-to-end"
      avoidance: "Get one workstream running with raw experiment logs first. Dashboard is polish, not foundation."
    - trap: "Over-engineering the Supabase schema before knowing what queries matter"
      avoidance: "Start with experiments + eval_deltas tables. Expand after 30 days of real data."
    - trap: "Trying to make goal.md machine-parseable"
      avoidance: "It's human prose. The agent reads it as context, not config. No YAML, no schema."
    - trap: "Defining workstreams too early in the pipeline (before V1 ships)"
      avoidance: "Workstream onboarding is the first step of this product, not an upstream stage."
  constraints:
    - "Claude Code Channels must support async Discord listening — if not, fall back to Chat SDK bot (Candidate 2)"
    - "Supabase free tier limits apply — sufficient for solo builder volume"
    - "Scheduled remote agent requires Claude Code Max or equivalent"
    - "Each workstream needs evals from pipeline stage 3 before the loop can run"
    - "Claude Code must support /schedule for cron triggers"
jtbd_mapping:
  - jtbd: "Capture ideas instantly"
    addressed_by: "Discord Channels — type a sentence in a workstream channel, Claude Code picks it up and opens a thread"
    fit: "strong"
  - jtbd: "Enrich ideas through conversation"
    addressed_by: "Sparring happens in the Discord thread. Claude Code asks 2-3 clarifying questions, maps to evals, structures as hypothesis, writes to ideas-backlog.md"
    fit: "strong"
  - jtbd: "Execute experiments on a heartbeat"
    addressed_by: "Scheduled remote agent at 5am DK. Enters workstream directory, reads goal.md for context, picks top hypothesis from backlog, runs Ralph Wiggum loop in worktree, writes results to Supabase"
    fit: "strong"
  - jtbd: "Review results with confidence"
    addressed_by: "Persistent Next.js dashboard on Vercel reading from Supabase. Filter by workstream, date range. Eval trend lines. Same URL every evening."
    fit: "strong"
alternatives:
  - name: "The Hybrid"
    reason_not_selected: "Chat SDK bot adds a separate always-on system to maintain — unnecessary if Channels works for async Discord capture"
  - name: "The Lean Loop"
    reason_not_selected: "No database means no data trail, no historical queries, no trend lines — misses the Review JTBD"
deployed_url: null
onboarding:
  workstream_definition: "First step when a user starts continuous improvement after V1. Agent analyzes product strategy, evals, codebase, and build history. Proposes 2-3 fracture planes (e.g., by JTBD, by user journey phase, by technical surface) with trade-offs. Builder picks or defines their own. Agent creates directory structure per workstream."
---

# Archetype Selection: Continuous Improvements

**Source:** strategy.md
**Generated:** 2026-03-27
**Status:** Complete

---

## 1. Boundaries

### No-Gos

- **No separate Discord bot** — Claude Code Channels handles capture and sparring. No webhook server, no bot hosting, no Chat SDK deployment.
- **No cross-product learning** — Each product's improvement loop is independent. Portfolio-level insights are a Later concern.
- **No multi-user features** — Solo builder. One person captures ideas, reviews results, curates the backlog.
- **No real-time execution** — Heartbeats protect cognitive load (Cognitive Peace principle). Experiments run at 5am, results reviewed in evening.
- **No capture UI beyond Discord** — Discord is the capture surface. No web forms, no mobile app, no CLI capture command.
- **No duplication of evals** — Evals live in `evals.md` / `evals.json`. goal.md references direction, not metrics. CLAUDE.md points to evals, never contains them.

### Rabbit Holes

- **Dashboard before loop:** Building a polished review dashboard before a single experiment has run end-to-end. — **Avoid by:** Ship the loop with raw Supabase data first. Dashboard is iteration two.
- **Schema over-engineering:** Designing a perfect Supabase schema before knowing what queries matter. — **Avoid by:** Start with `experiments` and `eval_deltas` tables. Add tables after 30 days of real data.
- **Machine-readable goal.md:** Trying to add YAML frontmatter or structured fields to goal.md. — **Avoid by:** Keep it human prose. The agent reads it as context. No parsing, no schema.
- **Premature workstream definition:** Forcing workstream decisions during eval creation or planning. — **Avoid by:** Workstreams are defined when the user starts continuous improvement, not before.

### Constraints

- Claude Code Channels must support async Discord listening. Fallback: Chat SDK bot (Candidate 2).
- Scheduled remote agent requires Claude Code `/schedule` support.
- Each workstream needs behavioral evals from pipeline stage 3 before the loop can run.
- Supabase free tier is sufficient for solo builder volume.

---

## 2. Proposed Approach

### The Native Loop

**How to win:** The only system where a sentence in Discord becomes a tested, measured, shipped improvement by morning — with zero infrastructure outside Claude Code, Vercel, and Supabase.

**Core idea:** Everything runs inside Claude Code. Discord Channels for capture and sparring. A scheduled remote agent for the 5am experiment heartbeat. Supabase stores the data trail. A Next.js dashboard on Vercel provides the evening review surface. Three files per workstream govern the loop: `goal.md` (human direction), `.claude/CLAUDE.md` (agent wiring), and `ideas-backlog.md` (hypothesis queue). Evals are referenced, never copied.

### Architecture

- **Capture & Sparring:** Claude Code + Discord Channels. Ideas arrive as messages in workstream-specific Discord channels. Claude Code opens a thread, asks clarifying questions, maps to evals, structures the hypothesis, and appends to `ideas-backlog.md`.
- **Execution:** Claude Code `/schedule` trigger at 5am DK time. Agent enters workstream directory, reads `goal.md` for context, picks the top hypothesis from the backlog, enters a worktree, runs the Ralph Wiggum loop (implement → test → eval → fix → iterate), and writes results to Supabase. Ships if evals improve. Rejects with learnings if they don't.
- **Data:** Supabase Postgres. Tables for experiments, eval deltas, workstream metadata. Source of truth for the dashboard. Repo files (`ideas-backlog.md`, `goal.md`, `evals.md`) remain the source of truth for the loop itself.
- **Review:** Next.js on Vercel. Server-rendered dashboard reading from Supabase. Filter by workstream, date range. Eval trend lines over time. Same URL every evening.

### Workstream Onboarding

When a user starts continuous improvement after V1, this is the first thing that happens — before the first heartbeat can run.

1. **Agent analyzes the product.** Reads strategy, evals, codebase, and build history.
2. **Proposes 2-3 fracture planes.** Not just JTBDs as default. The agent thinks through genuinely different ways to slice the product:
   - By JTBD (maps to user needs)
   - By user journey phase (maps to lifecycle stage)
   - By technical surface (maps to system boundaries)
   - Or domain-specific cuts informed by what it learned during build
3. **Builder picks or defines their own.** The agent explains trade-offs for each option: how it affects scouting, experiment scoping, and what "improvement" means.
4. **Agent creates the structure.** Per workstream: `goal.md`, `ideas-backlog.md`, `.claude/CLAUDE.md` wiring, `experiment-log/` directory.
5. **Builder writes initial goal.md for each workstream.** Or the agent drafts one for approval. Short, opinionated, human prose.
6. **First heartbeat can run.**

### File Structure (per product)

```
product/
  workstreams/
    [workstream-name]/
      goal.md                  ← human direction (monthly/bi-weekly)
      .claude/CLAUDE.md        ← agent wiring (points to goal.md, evals, backlog)
      ideas-backlog.md         ← structured hypotheses (the queue)
      experiment-log/          ← one file per experiment
  evals.md                     ← from pipeline stage 3 (never copied)
  evals.json                   ← machine-readable evals
  strategy.md                  ← from pipeline stage 1
```

### Three Files, Three Owners, Zero Duplication

| File | Owner | Purpose | Changes |
|------|-------|---------|---------|
| `goal.md` | Human | Strategic direction for this workstream. What to focus on, explore, avoid. | Monthly/bi-weekly |
| `.claude/CLAUDE.md` | System | Wiring. Points to goal.md, evals, backlog, boundaries. | Rarely |
| `evals.md` / `evals.json` | Pipeline | Behavioral evals on 0-1 scale. Single source of truth. | When evals evolve |

### JTBD Coverage

| Job | Fit | How Addressed |
|-----|-----|---------------|
| Capture ideas instantly | Strong | Discord Channels — type a sentence, Claude Code picks it up in a thread |
| Enrich through conversation | Strong | Sparring in Discord thread. Clarifying questions, eval mapping, hypothesis structuring. |
| Execute on heartbeat | Strong | Scheduled remote agent at 5am DK. Ralph Wiggum loop in worktree. Ships or rejects. |
| Review with confidence | Strong | Persistent Next.js dashboard on Vercel. Supabase backend. Filter by workstream. Eval trends. |

### Key Trade-offs

- **All-in on Claude Code** vs. **independent components.** If Claude Code Channels or `/schedule` breaks, the system breaks. The fallback (Chat SDK bot) is documented but not built.
- **Discord as sole capture surface** vs. **multi-channel capture.** Fast to build, but you can't capture from iMessage, Todoist, or a web form. Discord must be reachable when ideas strike.
- **Supabase as data layer** vs. **repo-only.** Adds a dependency, but enables the dashboard, trend lines, and historical queries that repo files can't provide.

### Why Not the Others

- **The Hybrid:** Chat SDK bot adds a separate always-on system. Unnecessary if Channels works for async Discord capture. More reliable, but more to build and maintain.
- **The Lean Loop:** No database means no data trail. No historical queries. No trend lines. Misses the Review JTBD. Good for a prototype sprint, not the real product.

---

## Appendix I: FAQ

### Viability

**Q: What's the ongoing cost?**
**A:** Supabase free tier for data. Vercel free/hobby tier for the dashboard. Claude Code Max for the scheduled agent and Channels. Token costs for 5am experiments scale with experiment complexity — a few dollars per day for typical changes.

**Q: What if Claude Code deprecates Channels or /schedule?**
**A:** Channels is the riskiest dependency. Fallback is a Chat SDK Discord bot (Candidate 2). For /schedule, fallback is a Vercel Cron Job triggering a Claude Code session via API.

### Desirability

**Q: Will capturing ideas in Discord actually feel seamless?**
**A:** Discord is already on the phone. A sentence in a channel is lower friction than Todoist. The sparring thread adds value immediately — you leave the conversation knowing the idea is understood. If Discord doesn't work, that's a validated signal to build something else.

**Q: What if the system picks the wrong experiment?**
**A:** Two safeguards. Evals gate every experiment — no improvement means automatic rejection. Evening review lets you flag systemic issues. The risk is wasted compute, not shipped regressions.

**Q: What if I don't open Discord for a week?**
**A:** The heartbeat still runs. It picks from the existing backlog. Scout proposals accumulate. When you return, everything is waiting — nothing is lost. Cognitive Peace principle at work.

### Usability

**Q: How do I know which Discord channel maps to which workstream?**
**A:** One channel per workstream. Named `#improve-[workstream-name]`. The CLAUDE.md wiring tells the agent which channel maps to which backlog.

**Q: What does the evening review look like?**
**A:** A persistent URL on Vercel. Server-rendered dashboard showing: which experiments ran today, eval deltas (before/after), shipped vs. rejected, workstream filter, and trend lines over time. Same URL, fresh data.

**Q: How do I write a good goal.md?**
**A:** Short. Opinionated. Human prose. "Focus on reducing onboarding friction. I think the welcome flow is too long. Explore whether fewer steps with smarter defaults beats the current wizard. Don't touch the payment flow." The agent reads it for direction, not config.

### Feasibility

**Q: Can Claude Code Channels listen on Discord asynchronously?**
**A:** This is the key technical risk. If Channels supports persistent listening on Discord (not just session-scoped), the architecture works as designed. If not, fall back to Chat SDK bot. Validate early.

**Q: How does the Ralph Wiggum loop work in practice?**
**A:** Scheduled agent enters the workstream directory. Reads the top hypothesis from `ideas-backlog.md`. Enters a git worktree. Implements the change. Runs tests. Runs evals. If tests fail, fixes and retries (up to 3 attempts per error). If evals improve, merges and writes results to Supabase. If evals don't improve, rejects and logs learnings. Circuit breakers: 3 failures on same error → stop. Touching >5 files → stop. Taking longer than estimated → stop.

**Q: What does the Supabase schema look like?**
**A:** Start minimal. Two tables: `experiments` (id, workstream, hypothesis, status, started_at, completed_at, branch) and `eval_deltas` (experiment_id, eval_name, before, after, delta). Expand after 30 days.

---

## Appendix II: Solution Alternatives

### Candidate 1: The Native Loop (Selected)

**Core idea:** Everything runs inside Claude Code. Discord Channels for capture/sparring. Scheduled remote agent for execution. Supabase for data trail. Next.js dashboard on Vercel.
**Lineage:** A2 (Claude Code + Discord Channels) + B1 (scheduled remote agent) + C2 (server-rendered dashboard)
**Architecture:** Claude Code (agent) / Supabase Postgres (data) / Next.js on Vercel (dashboard) / Discord Channels (capture)
**JTBD coverage:** Strong on all four Now JTBDs
**Key differentiator:** Zero infrastructure outside Claude Code + Vercel + Supabase. The agent IS the product.
**Trade-offs:** Depends on Claude Code Channels reliability. Single point of failure on Claude Code platform.
**Status:** Selected — leanest version that delivers all four JTBDs with a data trail.

### Candidate 2: The Hybrid

**Core idea:** Chat SDK Discord bot for capture/sparring. Scheduled remote agent for execution. Same Supabase + dashboard stack.
**Lineage:** A1 (Chat SDK) + B1 (scheduled remote agent) + C2 (server-rendered dashboard)
**Architecture:** Chat SDK bot on Vercel Functions (capture) / Claude Code (execution) / Supabase (data) / Next.js on Vercel (dashboard)
**JTBD coverage:** Strong on all four Now JTBDs
**Key differentiator:** Bot is always-on, production-grade. Capture never depends on Claude Code session availability.
**Trade-offs:** Two systems to maintain. Bot needs separate hosting. More code, more reliability.
**Status:** Not selected — fallback if Channels doesn't support async Discord listening.

### Candidate 3: The Lean Loop

**Core idea:** Claude Code Channels for capture. Scheduled agent for execution. Generated HTML dashboard (like Morning Brew). No database — results as structured markdown in repo.
**Lineage:** A2 (Channels) + B1 (scheduled agent) + C3 (generated HTML)
**Architecture:** Claude Code (everything) / Repo files (data) / Static HTML on Vercel (dashboard)
**JTBD coverage:** Strong on Capture, Enrich, Execute. Partial on Review (no filtering, no trends).
**Key differentiator:** Absolute minimum infrastructure. Everything is files.
**Trade-offs:** No historical queries. No trend lines. No data trail. Misses the Review JTBD.
**Status:** Not selected — too lean for the data trail requirement.
