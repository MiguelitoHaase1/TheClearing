# Build System — Blueprint for Project CLAUDE.md Files

> Copy this into a project's `.claude/CLAUDE.md` when using the build system pipeline. It tells agents where to find inputs and what methodology governs the work.

## Build System Pipeline

This project uses a 7-stage pipeline to go from product idea to continuously improving software. Each stage produces outputs that the next stage consumes. All outputs live in the project directory — never in generic shared folders.

### Stage Dependencies

```
1. /product-strategy   → strategy.md
2. /archetype-selection → archetype/boundaries.yaml, archetype/approach.yaml, archetype/prototype-*.html
3. /eval-creation      → evals.md, evals.json
4. /plan               → beads issues + plan-review.html
5. build-v1            → working codebase
6. add-ideas           → ideas.md
7. continuous-improvements → experiment logs, eval deltas
```

### File Layout

All pipeline outputs live in the **project root**:

```
[project-dir]/
  .claude/CLAUDE.md       ← this file
  strategy.md             ← Stage 1: vision, tenets, JTBDs, target users
  evals.md                ← Stage 3: human-readable behavioral evals
  evals.json              ← Stage 3: machine-readable eval contract
  archetype/              ← Stage 2: solution direction
    boundaries.yaml       ← no-gos, constraints, rabbit holes
    approach.yaml         ← selected approach, form factor, how-to-win
    prototype-*.html      ← clickable prototypes (optional reference)
  plan-review.html        ← Stage 4: reflection artifact before execution
  ideas.md                ← Stage 6: living document of hypotheses
  .beads/                 ← beads database (issue tracking)
  src/                    ← Stage 5: product source code
```

### Methodology

**Evals are the contract.** Every planning decision, every task, every implementation choice traces back to a behavioral eval on a 0-1 scale. If it doesn't move an eval, it doesn't belong in the plan.

**Sessions are the unit of execution.** Each task in the bead chain is completable in one agent session. The agent reads the task, executes, runs evals, closes it.

**Human-in-the-loop at checkpoints.** Agents execute autonomously between eval checkpoints. At each checkpoint, if eval scores diverge from targets, a replan bead is created for human review. Agents detect drift. Humans decide whether to replan.

**Adaptation boundaries govern agent autonomy.** Agents CAN split tasks, add evals, reorder within an epic. Agents CANNOT weaken evals, change scope, skip quality gates, or restructure the dependency graph.

### Quality Gate

Every task's "done when" includes: `typecheck && lint && test all pass`. No exceptions.

### Circuit Breakers

Every task includes:
- 3 test failures on the same error → stop, create STUCK bead
- Touching >5 files or modifying >3 → stop, create SPLIT bead
- Taking longer than estimated → stop, escalate

### Key Commands

```bash
bd ready           # Find available work
bd show <id>       # Read task context
bd update <id> --claim  # Claim work
bd close <id>      # Mark complete
bd list --status open   # See all open work
```
