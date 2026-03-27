# Continuous Improvements

One product, two skills. Given a V1, a living backlog of ideas/hypotheses, and a set of behavioral evals, continuously improve the product through structured experimentation.

## Architecture

This is a single product with two interaction modes (skills):

1. **`add-idea`** — Capture skill. Sparring partner for sharpening raw ideas into structured hypotheses. Appends graduated ideas to `ideas-backlog.md`.
2. **`run-improvements`** — Execution skill. Picks from the backlog, designs experiments, runs them, and measures eval deltas. Runs nightly as a cron job.

The bridge between them is `ideas-backlog.md` — the cold, structured layer that the execution engine consumes.

## Idea Capture Flow

The capture UX is conversational (Claude as sparring partner):

1. User triggers the `add-idea` skill with a raw idea or hypothesis
2. Claude pressure-tests it: What eval does this move? What's the expected delta? What could go wrong? Is there a simpler version to test first?
3. Through back-and-forth, the idea sharpens into a structured hypothesis block
4. At the user's command ("port it", "graduate", or similar), Claude synthesizes the discussion and appends a structured entry to `ideas-backlog.md`

### Structured Hypothesis Format

Each graduated idea in `ideas-backlog.md` follows this schema:

```markdown
## [Idea Title]
- **Status:** queued | in-experiment | shipped | rejected
- **Date added:** YYYY-MM-DD
- **Problem statement:** What's wrong or suboptimal today?
- **Proposed change:** What specifically would we do?
- **Target eval(s):** Which eval(s) should this move, and in which direction?
- **Expected delta:** Estimated improvement on 0-1 scale
- **Risks / counterarguments:** What was raised during sparring?
- **Experiment design:** Minimum viable test to validate or reject
- **Result:** (filled after experiment runs)
```

## Execution Flow

The `run-improvements` skill operates on a nightly cycle:

1. **Select** — Pick the highest-priority queued idea from `ideas-backlog.md` (priority = expected eval delta × confidence, adjusted for risk)
2. **Branch** — Create an isolated experiment branch
3. **Implement** — Execute the proposed change within adaptation boundaries
4. **Measure** — Run the full eval suite, capture before/after deltas
5. **Decide** — If eval delta meets or exceeds threshold → ship (merge). If neutral or negative → reject with learnings logged
6. **Update** — Mark the idea's status and fill in the result block in `ideas-backlog.md`

## Discord Integration (Future)

The `add-idea` skill is designed to eventually support async capture via Discord:

- Dedicated `#ideas-{product-name}` channel per product
- Ideas dropped as messages, discussion happens in threads
- Manual graduation via command (Shape 1): user triggers `/graduate` or tells Claude to port the thread
- Claude reads the thread, synthesizes into the structured hypothesis format, appends to `ideas-backlog.md`
- Path to semi-automation (Shape 2): auto-graduate based on signals (reaction thresholds, discussion depth, time elapsed) — only after evals and graduation criteria are trusted

## Design Decisions

- **One product, not two.** The value of capturing an idea is zero until it moves an eval. The value of continuous improvements is limited without human insight feeding it. They're one optimization loop: observe → hypothesize → experiment → measure.
- **Human as curator (for now).** The user decides when an idea is ready to graduate and which ideas are worth experiment cycles. This is the right bottleneck while evals are still being calibrated.
- **Evals are the single source of truth.** An idea that doesn't map to an eval doesn't enter the backlog. An experiment that doesn't move an eval gets rejected regardless of how clever it is.
- **ideas-backlog.md is the contract.** Both skills read/write to it. It's the pantry that the execution kitchen consumes. No side channels.

## File Layout

```
[project-dir]/
  ideas-backlog.md        ← living document of structured hypotheses
  experiment-log/         ← one file per experiment with before/after evals
  evals.md                ← human-readable behavioral evals (from Stage 3)
  evals.json              ← machine-readable eval contract (from Stage 3)
```
