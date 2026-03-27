---
title: "Continuous Improvements"
vision: "Every product I build gets better on its own, every day. I spend my time having ideas and giving feedback. The system handles the rest."
where_to_play: "Solo builder (Michael) running 5-10 personal products, each with workstream-level continuous improvement loops, orchestrated via Discord and the build system pipeline."
principles: ["Autonomy over Control", "Seamless Entry, Enriched Output", "Cognitive Peace over Speed", "Learning Evals over Fixed Evals"]
jtbd_now: ["Capture ideas instantly", "Enrich ideas automatically", "Execute experiments on a heartbeat", "Review results with confidence"]
---

# Product Strategy: Continuous Improvements

**Author:** Michael Haase
**Date:** 2026-03-27
**Status:** Final

## Context

Continuous Improvements is the final stage of a 7-stage build system pipeline that takes a product from idea to continuously improving software. It sits alongside stage 6 (add-ideas) as a perpetual loop after V1 ships.

The build system is eval-centric. Every decision traces to a behavioral eval on a 0-1 scale. Agents execute autonomously between human checkpoints. The pipeline exists so that anyone can go from product idea to software that optimizes day after day — like Karpathy's AutoResearch applied to product development.

### What this product does

Given a shipped V1, a set of behavioral evals, and a living backlog of ideas, this product continuously improves the V1 through structured experimentation. One product, three interaction modes:

1. **Capture (add-idea)** — Conversational sparring skill. The user brings a raw idea. Claude pressure-tests it: Which eval does this move? What's the expected delta? What could go wrong? Through back-and-forth, the idea sharpens into a structured hypothesis and graduates to the backlog.

2. **Scout (weekly research)** — Agent-driven domain research. Scans the space around the downstream product — social media, forums, competitor releases, community signals. The agent does its own sparring: pressure-tests findings against the product's evals, estimates deltas, and surfaces 3-4 high-bar proposals per week as pre-structured hypotheses. Delivered via Discord for approve/reject/riff.

3. **Execute (run-improvements)** — Nightly automated experiments. Picks the highest-priority queued idea from the backlog, branches, implements the change within adaptation boundaries, runs the full eval suite, measures before/after deltas. Ships if evals improve. Rejects with learnings if they don't.

All three modes feed the same `ideas-backlog.md`. All three are gated by evals.

### Key design decisions

- **One product, not three.** Capture, scout, and execute are one optimization loop. The value of capturing an idea is zero until it moves an eval. The value of scouting is zero until a finding becomes a shipped experiment.
- **Human as curator.** Michael approves graduation and priority. The scout proposes; it doesn't act unilaterally.
- **Evals are the single source of truth.** No eval mapping = no backlog entry. No eval movement = experiment rejected.
- **ideas-backlog.md is the contract.** All three modes read/write to it. No side channels.
- **Solo builder.** Built for one person (Michael) triaging ideas in Discord. No multi-user coordination in V1.
- **High bar for proposals.** The scout surfaces only what clears a quality threshold — 3-4 experiments per week, not a firehose.

### Upstream dependencies

- A shipped V1 (from stage 5)
- Behavioral evals on 0-1 scale (from stage 3, `evals.md` / `evals.json`)
- The build system's adaptation boundaries (agents CAN split tasks, add evals, reorder; CANNOT weaken evals, change scope, skip quality gates)

## Scope & Vision

### Outcome statement

Six months from now, Michael has 5-10 products running. Each one improves without him touching the code. His day is spent having ideas, jotting them down in Discord, and reviewing how products evolved overnight. The system handles research, hypothesis validation, experimentation, and shipping. Products self-improve with increasing compute. The growing confidence leads to sharing the system with others.

### Product vision

Every product I build gets better on its own, every day. I spend my time having ideas and giving feedback. The system handles the rest.

### Where to play

- **User:** Solo builder (Michael) managing a personal product portfolio
- **Scope:** One product at a time in V1, but designed so more plug in without rework
- **Granularity:** Each product breaks into workstreams (JTBD-based or another natural fracture plane). Each workstream gets its own backlog, evals, scout, and experiment cadence.
- **Hierarchy:** Portfolio > Product > Workstream > Idea > Experiment
- **Channel:** Discord for async idea capture and scout proposals. CLI/skills for direct interaction.

### Scope decision

**Selected: Single loop, portfolio-ready, workstream-fractal (Option C + workstreams)**

Build the three-mode loop (capture, scout, execute) for one product. Design the interfaces — backlog format, experiment runner, scout configuration — so they're parameterized by product and workstream. A second product plugs in by pointing to its own evals and backlog. No portfolio dashboard, no cross-product learning, no multi-user coordination in V1.

The workstream dimension is critical. A product with five JTBDs shouldn't have one monolithic backlog. Each workstream gets focused scouting, focused experiments, focused eval tracking. The evening review rolls up.

## Tenets & Principles

### Facts

1. **One backlog is the single place for all ideas.** No fragmented channels, no side documents. Everything flows into `ideas-backlog.md` per workstream.
2. **Adding ideas must feel seamless.** A sentence in Discord is enough. The system does the structuring.
3. **External research feeds the backlog automatically.** Weekly domain scanning (last30days and deep research) generates proposals without human initiation.
4. **Ideas need inline sparring to avoid misunderstandings.** Raw ideas go wrong when implemented literally. Quick pressure-testing during capture catches bad assumptions.

### Assumptions

1. **Heartbeat-based execution protects cognitive load.** (Medium confidence) Fixed rhythms mean you know when to look and can be at ease between beats. If wrong: continuous execution might be fine if notifications are good enough.
2. **Morning execution (Denmark time) aligns with cheaper tokens and evening review.** (Medium confidence) Off-peak pricing + results ready by evening. If wrong: schedule around review preference instead.
3. **Cadence is TBD.** (Low confidence) Daily, every other day, or weekly are all plausible. Needs real-world calibration after first experiments run.
4. **Async Discord channels work for idea refinement.** (Medium confidence) Threaded conversations per idea, per workstream. If wrong: might need a richer interface.
5. **The system can reliably self-direct improvement without hand-holding.** (Medium confidence) Eval gaps + backlog priority should be enough signal for the system to pick the right experiment. If wrong: human override becomes a regular step.

### Beliefs

1. **The system should be self-directing.** Evals guide what to improve. The human curates (approve/reject) but does not plan the improvement agenda. This is a strategic commitment — the product is not useful if you have to tell it what to do.
2. **Ideas that don't map to evals are signals to reconsider evals, not reject ideas.** The eval suite is a living document. Good ideas teach you what you should be measuring. Fixed evals lead to blind spots.
3. **Seamless entry with enriched output.** Capture is fast — a sentence, a thought. The system then explores the problem space, structures the hypothesis, and adds substance through conversation. The sparring is welcome. The friction of getting started is not.

### Even Over Principles

1. **Autonomy over Control** — The system self-directs what to improve based on eval gaps and backlog priority. The builder reviews results, not plans. Even when it picks something you wouldn't have prioritized, trust the evals.
2. **Seamless Entry, Enriched Output** — A raw idea gets in with zero friction. The system then asks clarifying questions in the thread — a short conversation to sharpen the idea before structuring it as a hypothesis and mapping it to evals. Fast in, collaborative enrichment, rich out. Even over requiring structured input from the builder.
3. **Cognitive Peace over Speed** — Fixed heartbeats (nightly experiments, weekly scout reports) protect your attention. You know when to look. You can be at ease between beats. Even over shipping improvements faster.
4. **Learning Evals over Fixed Evals** — If a compelling idea doesn't map to an existing eval, that's a prompt to evolve the eval suite. Ideas reshape what we measure. Even over the simplicity of a stable eval set.

## Problem & Users

### The user

Michael Haase. Solo builder running 5-10 personal products simultaneously. Product manager who vibes code. Builds with agents, not by writing every line himself. Cares about outcomes, not process ceremony.

### The problem today

Ideas arrive during decompression — walks, meditation, exercise, afternoons when the brain lets go. Today these ideas go into Todoist. They sit there. They create cognitive debt: the nagging feeling that you need to go back, re-read, re-context, reprioritize. By the time you return to an idea, the spark has dimmed and the context is gone.

Worse: even when you do act on an idea, there's no systematic way to know if it helped. No before/after measurement. No way to know whether the change you made moved the needle or just felt productive.

The gap: ideas flow freely, but nothing connects them to measurable improvement. The pipeline from "I had a thought" to "the product is better" is manual, lossy, and exhausting.

### The daily rhythm

| Time | Activity | What the system does |
|------|----------|---------------------|
| **5am** | Heartbeat starts | Experiment runner picks the top hypothesis, branches, implements, runs eval suite. Human-in-the-loop requests land as Discord notifications. |
| **Morning** | Day begins | Handle any human-in-the-loop requests from overnight run. Tokens are cheaper (US asleep). |
| **Afternoon** | Ideas arrive | Capture via Discord — a sentence is enough. System immediately sparring-enriches: maps to evals, estimates delta, structures as hypothesis. |
| **Async** | Refinement | Threaded Discord conversations per idea. System adds substance. Builder riffs when inspired. |
| **Evening** | Reflection | Review experiment results: before/after eval deltas. See what improved. Approve/reject scout proposals. Feel the product getting better. |
| **Weekly** | Scout report | Agent-driven domain research delivers 3-4 pre-sparred proposals via Discord. Approve, reject, or riff. |

### Jobs to be done

#### NOW — Core loop

**JTBD 1: Capture ideas instantly**
- *When* an idea arrives during a walk or meditation
- *I want to* capture it with a sentence in Discord
- *So I can* let go of it knowing it won't be lost or create cognitive debt
- **Functional:** Idea is recorded, timestamped, and associated with the right product/workstream
- **Emotional:** Relief. The idea is safe. I can go back to my walk.
- **Social:** I feel like a builder who has a system, not someone drowning in notes.

**JTBD 2: Enrich ideas through conversation**
- *When* a raw idea has been captured
- *I want* the system to ask me clarifying questions right there in the thread, then structure the idea as a hypothesis mapped to evals
- *So I can* know it's been understood correctly without revisiting it later
- **Functional:** System asks 2-3 sharpening questions, then produces a structured hypothesis with eval mapping and expected delta
- **Emotional:** Confidence. I shaped the idea together with the system. It understood what I meant.
- **Social:** My ideas are rigorous because I refined them, not just because a machine processed them.

**JTBD 3: Execute experiments on a heartbeat**
- *When* a validated hypothesis sits in the backlog
- *I want it* implemented and measured automatically starting at 5am
- *So I can* wake up to a better product without touching code
- **Functional:** Branch, implement, run eval suite, measure before/after delta, ship or reject
- **Emotional:** Excitement. The product improved while I slept.
- **Social:** I'm someone whose products get better every day.

**JTBD 4: Review results with confidence**
- *When* experiments have run
- *I want to* see clear before/after eval deltas during evening reflection
- *So I can* feel the product getting better and know exactly why
- **Functional:** Dashboard or Discord summary showing experiment results, eval deltas, and learnings
- **Emotional:** Satisfaction. Visible progress without manual effort.
- **Social:** I can show others what changed and why.

#### LATER — Enrichment layer

**JTBD 5: Stay informed without research**
- *When* the domain around my product evolves
- *I want to* receive curated, pre-sparred proposals from automated research
- *So I can* respond to market changes without manual scanning
- **Functional:** Weekly scout report with 3-4 high-bar ideas, pre-validated against evals
- **Emotional:** Awareness without effort. The world is being watched.
- **Social:** My products respond to real signals, not just my own intuition.

**JTBD 6: Evolve evals as you learn**
- *When* an idea reveals a blind spot in the eval suite
- *I want to* update what we measure
- *So the* improvement loop targets what actually matters, not what I assumed at launch
- **Functional:** Add, modify, or retire evals. Re-run baselines. Update the eval contract.
- **Emotional:** Growth. My understanding of the product deepens over time.
- **Social:** My measurement sophistication increases with the product.

#### NEVER (for V1)

- **Cross-product learning.** Tempting but premature. Each product improves in its own loop first.
- **Multi-user coordination.** Explicitly out of scope. Solo builder only.
- **Real-time execution.** Conflicts with Cognitive Peace principle. Heartbeats, not streams.

---

## Appendix I: Decision Log

| Decision | Alternatives Considered | Rationale | Date |
|----------|------------------------|-----------|------|
| Three-mode optimization loop (capture, scout, execute) | Capture-only, execute-only, separate products | One optimization loop — each mode's value depends on the others. A captured idea is worthless until it ships. Scouting is worthless until findings become experiments. | 2026-03-27 |
| Single loop, portfolio-ready, workstream-fractal | Single-product only, portfolio-aware from day one, idea-flow-first, execution-first | Must work for one product first. But interfaces parameterized by product + workstream so a second plugs in without rework. Workstream granularity prevents monolithic backlogs. | 2026-03-27 |
| Four Even Over principles | Five originally proposed — dropped "Eval Movement over Cleverness" | Replaced with "Learning Evals over Fixed Evals." Original was too rigid — sometimes the right move is to evolve what we measure, not reject ideas that don't fit current evals. | 2026-03-27 |
| 5am DK heartbeat for experiment execution | Overnight, evening, continuous | Morning start = cheaper tokens (US asleep), results ready for evening review, human-in-the-loop requests land during the builder's working day. | 2026-03-27 |
| Discord as async interface | Slack, custom web UI, CLI-only | Already used. Threaded conversations map naturally to per-idea sparring. Channels map to products/workstreams. Low friction for mobile capture. | 2026-03-27 |
| Human as curator (approve/reject), not director (choose agenda) | Full autonomy, full human control | The system self-directs based on evals. Human curates at checkpoints. Too much control defeats the purpose; too much autonomy risks runaway changes. | 2026-03-27 |

## Appendix II: FAQ

**Why just one product in V1 if you're running 5-10?**
The loop has to work reliably for one before it scales. But the interfaces — backlog format, experiment runner, scout config — are parameterized by product and workstream. Adding a second product is plugging in a new config, not rebuilding the system.

**Why not run experiments continuously instead of on a heartbeat?**
Cognitive Peace over Speed. Fixed rhythms mean you know when to look and can be at ease between beats. Continuous execution creates ambient anxiety — "is something running? Should I check?" A 5am heartbeat with evening review matches the builder's natural daily rhythm.

**What if the system picks the wrong experiment?**
Two safeguards. First, every experiment runs against the eval suite — if evals don't improve, the change is rejected automatically. Second, the builder reviews results every evening and can flag systemic issues. The risk is wasted compute, not shipped regressions.

**What if an idea doesn't map to any existing eval?**
That's a feature, not a bug. Learning Evals over Fixed Evals. If a compelling idea doesn't map to an eval, that's a signal to evolve the eval suite. The eval contract is a living document. Ideas teach you what to measure.

**Why Discord and not a custom UI?**
Seamless Entry over Structured Intake. Discord is already on the phone. A sentence in a channel is lower friction than opening an app, navigating to a form, and filling fields. The system handles structuring. If Discord becomes a bottleneck, that's a validated signal to build something better — not an assumption to act on now.

## Appendix III: Assumptions and Beliefs

### Facts
1. One backlog per workstream is the single place for all ideas (design decision)
2. Adding ideas must feel seamless — a sentence is enough (validated by current Todoist pain)
3. External research feeds the backlog automatically (weekly domain scanning)
4. Ideas need inline sparring to avoid misunderstandings (learned from implementing raw ideas)

### Assumptions to validate
1. Heartbeat-based execution protects cognitive load — **validate by:** running two weeks of daily heartbeats and checking whether the builder feels at ease between beats (medium confidence, high impact if wrong)
2. 5am DK execution aligns with cheaper tokens and evening review — **validate by:** comparing token costs at 5am vs. other times, and checking whether results are consistently ready by 6pm (medium confidence, low impact if wrong)
3. Cadence TBD — **validate by:** starting daily, then experimenting with every-other-day and weekly to find the natural rhythm (low confidence, medium impact)
4. Async Discord channels work for idea refinement — **validate by:** running 20 idea threads and checking completion rate and quality (medium confidence, high impact if wrong)
5. System can reliably self-direct improvement — **validate by:** tracking human override frequency over 30 days; if >30% of experiments need manual redirection, the assumption fails (medium confidence, high impact if wrong)

### Strategic beliefs (committed without validation)
1. The system should be self-directing — the product is not useful if you have to tell it what to do
2. Ideas that don't map to evals signal eval gaps — fixed evals lead to blind spots
3. Seamless entry with enriched output — the sparring is welcome, the friction of getting started is not
