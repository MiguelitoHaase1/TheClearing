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

function claudeTemplate(ws: Workstream, evalsRelPath: string): string {
  const evalList = ws.eval_ids.map((id) => `- ${id}`).join("\n");
  return `# ${ws.name} — Agent Wiring

## Context

This workstream serves: ${ws.jtbds.join(", ")}.
Read \`goal.md\` in this directory for strategic direction.

## Files

- \`goal.md\` — Human direction for this workstream (read before every experiment)
- \`ideas-backlog.md\` — Hypothesis queue (pick the top queued entry)
- \`experiment-log/\` — One file per experiment with before/after evals

## Evals

Evals live in \`${evalsRelPath}\` (single source of truth — never copy here).
This workstream's relevant evals:

${evalList}

## Boundaries

- Do NOT modify evals — they are owned by the pipeline, not this workstream
- Do NOT modify goal.md — it is owned by the human
- DO read goal.md before selecting an experiment
- DO update ideas-backlog.md status after each experiment
- DO write experiment results to experiment-log/
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
