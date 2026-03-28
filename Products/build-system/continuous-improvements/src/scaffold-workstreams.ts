import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { FracturePlaneProposal, Workstream } from "./fracture-planes.js";

// ── Types ──────────────────────────────────────────────────────────────

export interface ScaffoldResult {
  workstream: string;
  slug: string;
  directory: string;
  files: string[];
}

export interface ScaffoldReport {
  plane: string;
  root: string;
  workstreams: ScaffoldResult[];
}

// ── Templates ──────────────────────────────────────────────────────────

function goalTemplate(ws: Workstream): string {
  const jtbdList = ws.jtbds.map((j) => `- ${j}`).join("\n");
  return `# ${ws.name}

${ws.description}

## Direction

<!-- Write your strategic direction for this workstream here.
     Keep it short, opinionated, and human. The agent reads this
     for context — it's prose, not config. Update monthly or
     when your thinking shifts. -->

## Jobs This Workstream Serves

${jtbdList}

## Focus Areas

<!-- What should experiments in this workstream prioritize?
     What should they avoid? What's the current hypothesis
     about where the biggest gains are? -->
`;
}

function backlogTemplate(): string {
  return `# Ideas Backlog

Structured hypotheses for this workstream. Each entry follows the schema below.
The execution engine picks from this queue based on expected eval delta.

<!-- Template for new entries:

## [Idea Title]
- **Status:** queued
- **Date added:** YYYY-MM-DD
- **Problem statement:** What's wrong or suboptimal today?
- **Proposed change:** What specifically would we do?
- **Target eval(s):** Which eval(s) should this move, and in which direction?
- **Expected delta:** Estimated improvement on 0-1 scale
- **Risks / counterarguments:** What was raised during sparring?
- **Experiment design:** Minimum viable test to validate or reject
- **Result:** (filled after experiment runs)

-->
`;
}

export function claudeTemplate(ws: Workstream, evalsRelPath: string): string {
  const evalList = ws.eval_ids.map((id) => `- ${id}`).join("\n");
  return `# ${ws.name} — Agent Wiring

## Context

This workstream serves: ${ws.jtbds.join(", ")}.
Read \`goal.md\` in this directory for strategic direction before every session.

## Files

| File | Owner | Purpose |
|------|-------|---------|
| \`goal.md\` | Human | Strategic direction — read before every experiment |
| \`ideas-backlog.md\` | Shared | Hypothesis queue — pick top queued entry, update status after experiments |
| \`experiment-log/\` | Agent | One markdown file per experiment with before/after eval deltas |
| \`${evalsRelPath}\` | Pipeline | Behavioral evals (single source of truth — NEVER copy content here) |

## Evals

Eval definitions live in \`${evalsRelPath}\`. Reference them by ID only.
Do NOT paste eval targets, measurements, or scoring formulas into this file or goal.md.

This workstream's relevant eval IDs:

${evalList}

## Idea Capture (Discord Channel Messages)

When a message arrives from the Discord channel for this workstream:

1. **Acknowledge** — react or reply briefly to confirm you received the idea
2. **Identify** — treat every message as a potential idea unless it's clearly a question about the system itself
3. **Open a thread** — reply in-thread (use the reply tool with the message ID) to keep the conversation focused
4. **Tag** — the idea belongs to this workstream (the channel determines the workstream)
5. **Timestamp** — note when the idea arrived (from the message metadata)

Then immediately begin the sparring flow (below).

## Sparring Flow (Idea Enrichment)

After capturing an idea, enrich it through conversation in the thread:

1. **Read goal.md** first — understand this workstream's current strategic direction
2. **Ask 2-3 clarifying questions**, one at a time:
   - Which eval(s) would this move? (reference eval IDs from this workstream, read \`${evalsRelPath}\` for details)
   - What's the expected delta? How confident are you?
   - What could go wrong? Is there a simpler version to test first?
3. **Reference goal.md direction** — frame questions in terms of the workstream's focus areas
4. **Do NOT copy eval content** into the thread — reference eval IDs only (guard-001)
5. **Keep it conversational** — short messages, one question at a time, match the builder's energy
6. **Let the builder lead** — if they want to riff, riff. If they want to move fast, move fast.

The goal: the builder leaves the conversation knowing the idea is understood correctly.

## Hypothesis Graduation

When the builder signals completion ("graduate this", "port it", "add to backlog", or similar):

1. **Synthesize** the thread into a structured hypothesis with ALL required fields:
   - Problem statement (what's wrong or suboptimal today)
   - Proposed change (what specifically to do)
   - Target eval(s) (which eval IDs, by reference)
   - Expected delta (estimated improvement on 0-1 scale)
   - Risks / counterarguments (from the sparring)
   - Experiment design (minimum viable test)
2. **Show the draft** to the builder in the thread for approval
3. **Append** the approved hypothesis to \`ideas-backlog.md\` with status: queued
4. **Confirm** in the thread that it's been added

If the builder doesn't explicitly graduate, the idea stays in the thread — no pressure.

## Experiment Workflow (Execution Engine)

When running experiments (scheduled heartbeat, not during capture):

1. **Read** goal.md for current direction
2. **Select** the top queued hypothesis from ideas-backlog.md (priority = expected delta × confidence)
3. **Branch** into a git worktree for isolation
4. **Implement** the proposed change within adaptation boundaries
5. **Measure** run the eval suite, capture before/after deltas for this workstream's eval IDs
6. **Decide** if eval delta meets threshold → merge and ship. If neutral or negative → reject with learnings
7. **Update** mark the hypothesis status in ideas-backlog.md, write results to experiment-log/

## Adaptation Boundaries

**CAN do:**
- Split a hypothesis into smaller testable changes
- Reorder the backlog based on eval gap analysis
- Add new hypotheses discovered during experiments
- Propose new evals (via a hypothesis, not by modifying evals directly)

**CANNOT do:**
- Modify eval definitions, targets, or measurements (owned by the pipeline)
- Modify goal.md (owned by the human)
- Skip the eval measurement step
- Ship changes that regress any eval
- Touch files outside this workstream directory (except the shared evals file for reading)

## Circuit Breakers

- 3 test failures on the same error → STOP and report
- Touching >5 files in a single experiment → STOP (experiment too broad)
- Eval regression on any metric → reject the change, log learnings
`;
}

// ── Scaffolding ────────────────────────────────────────────────────────

export function scaffoldWorkstreams(
  plane: FracturePlaneProposal,
  rootDir: string,
  options: { evalsRelPath?: string; dryRun?: boolean } = {},
): ScaffoldReport {
  const { evalsRelPath = "../../evals.json", dryRun = false } = options;
  const workstreamsDir = join(rootDir, "workstreams");
  const results: ScaffoldResult[] = [];

  for (const ws of plane.workstreams) {
    const wsDir = join(workstreamsDir, ws.slug);
    const claudeDir = join(wsDir, ".claude");
    const experimentDir = join(wsDir, "experiment-log");

    const files: Array<{ path: string; content: string }> = [
      { path: join(wsDir, "goal.md"), content: goalTemplate(ws) },
      { path: join(wsDir, "ideas-backlog.md"), content: backlogTemplate() },
      {
        path: join(claudeDir, "CLAUDE.md"),
        content: claudeTemplate(ws, evalsRelPath),
      },
    ];

    if (!dryRun) {
      mkdirSync(wsDir, { recursive: true });
      mkdirSync(claudeDir, { recursive: true });
      mkdirSync(experimentDir, { recursive: true });

      for (const file of files) {
        if (!existsSync(file.path)) {
          writeFileSync(file.path, file.content, "utf-8");
        }
      }

      // Create .gitkeep in experiment-log so it's tracked
      const gitkeep = join(experimentDir, ".gitkeep");
      if (!existsSync(gitkeep)) {
        writeFileSync(gitkeep, "", "utf-8");
      }
    }

    results.push({
      workstream: ws.name,
      slug: ws.slug,
      directory: wsDir,
      files: files.map((f) => f.path),
    });
  }

  return {
    plane: plane.name,
    root: workstreamsDir,
    workstreams: results,
  };
}
