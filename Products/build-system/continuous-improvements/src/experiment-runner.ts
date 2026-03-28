/**
 * Ralph Wiggum experiment runner — autonomous experiment loop.
 *
 * Given a workstream directory and a hypothesis from the backlog:
 * 1. Create a git worktree for isolation
 * 2. Implement the change
 * 3. Run tests + evals, measure before/after
 * 4. Ship (merge) or reject based on eval delta
 * 5. Log results
 *
 * This module provides the orchestration logic and types.
 * The actual implementation step is done by the Claude Code agent
 * following CLAUDE.md instructions — this module handles the
 * worktree lifecycle, hypothesis selection, and result recording.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";
import { execSync } from "node:child_process";

// ── Types ──────────────────────────────────────────────────────────────

export type HypothesisStatus = "queued" | "in-experiment" | "shipped" | "rejected";

export interface Hypothesis {
  title: string;
  status: HypothesisStatus;
  dateAdded: string;
  problemStatement: string;
  proposedChange: string;
  targetEvals: string;
  expectedDelta: string;
  risks: string;
  experimentDesign: string;
  result: string;
}

export interface ExperimentResult {
  hypothesis: string;
  workstream: string;
  status: "shipped" | "rejected" | "stuck";
  branch: string;
  startedAt: string;
  completedAt: string;
  evalDeltas: Array<{ evalId: string; before: number | null; after: number | null; delta: number | null }>;
  learnings: string;
  filesChanged: number;
}

export interface CircuitBreakerViolation {
  type: "same-error-limit" | "file-count-limit" | "timeout";
  message: string;
}

// ── Hypothesis Parsing ─────────────────────────────────────────────────

export function parseBacklog(backlogPath: string): Hypothesis[] {
  if (!existsSync(backlogPath)) return [];
  const content = readFileSync(backlogPath, "utf-8");

  const hypotheses: Hypothesis[] = [];
  // Split on ## headings (each hypothesis starts with ##)
  const sections = content.split(/^## /m).slice(1); // skip preamble

  for (const section of sections) {
    const lines = section.trim().split("\n");
    const title = lines[0]?.trim() ?? "";
    const body = lines.slice(1).join("\n");

    hypotheses.push({
      title,
      status: extractField(body, "Status") as HypothesisStatus || "queued",
      dateAdded: extractField(body, "Date added"),
      problemStatement: extractField(body, "Problem statement"),
      proposedChange: extractField(body, "Proposed change"),
      targetEvals: extractField(body, "Target eval\\(s\\)"),
      expectedDelta: extractField(body, "Expected delta"),
      risks: extractField(body, "Risks / counterarguments"),
      experimentDesign: extractField(body, "Experiment design"),
      result: extractField(body, "Result"),
    });
  }

  return hypotheses;
}

function extractField(text: string, label: string): string {
  const pattern = new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+?)(?:\\n|$)`, "i");
  const match = text.match(pattern);
  return match ? match[1].trim() : "";
}

export function pickTopHypothesis(hypotheses: Hypothesis[]): Hypothesis | null {
  const queued = hypotheses.filter((h) => h.status === "queued");
  if (queued.length === 0) return null;

  // Sort by expected delta (higher = more impactful = pick first)
  // Parse expected delta as a number if possible
  return queued.sort((a, b) => {
    const deltaA = parseFloat(a.expectedDelta) || 0;
    const deltaB = parseFloat(b.expectedDelta) || 0;
    return deltaB - deltaA;
  })[0];
}

// ── Backlog Updates ────────────────────────────────────────────────────

export function updateHypothesisStatus(
  backlogPath: string,
  title: string,
  newStatus: HypothesisStatus,
  result?: string,
): void {
  if (!existsSync(backlogPath)) return;
  let content = readFileSync(backlogPath, "utf-8");

  // Find the hypothesis section and update its status
  const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const statusPattern = new RegExp(
    `(## ${escapedTitle}[\\s\\S]*?\\*\\*Status:\\*\\*)\\s*\\S+`,
  );
  content = content.replace(statusPattern, `$1 ${newStatus}`);

  // Update result if provided
  if (result) {
    const resultPattern = new RegExp(
      `(## ${escapedTitle}[\\s\\S]*?\\*\\*Result:\\*\\*)\\s*(.*)`,
    );
    content = content.replace(resultPattern, `$1 ${result}`);
  }

  writeFileSync(backlogPath, content, "utf-8");
}

// ── Worktree Management ────────────────────────────────────────────────

export function createWorktree(
  repoRoot: string,
  branchName: string,
): { worktreePath: string; branch: string } {
  const worktreePath = join(repoRoot, ".worktrees", branchName);
  mkdirSync(join(repoRoot, ".worktrees"), { recursive: true });

  execSync(`git worktree add "${worktreePath}" -b "${branchName}"`, {
    cwd: repoRoot,
    stdio: "pipe",
  });

  return { worktreePath, branch: branchName };
}

export function removeWorktree(repoRoot: string, worktreePath: string): void {
  execSync(`git worktree remove "${worktreePath}" --force`, {
    cwd: repoRoot,
    stdio: "pipe",
  });
}

export function mergeWorktree(
  repoRoot: string,
  branch: string,
): void {
  execSync(`git merge "${branch}" --no-edit`, {
    cwd: repoRoot,
    stdio: "pipe",
  });
}

// ── Circuit Breakers ───────────────────────────────────────────────────

export function checkFileCount(worktreePath: string): CircuitBreakerViolation | null {
  try {
    const output = execSync("git diff --name-only HEAD", {
      cwd: worktreePath,
      encoding: "utf-8",
    });
    const files = output.trim().split("\n").filter(Boolean);
    if (files.length > 5) {
      return {
        type: "file-count-limit",
        message: `${files.length} files changed (limit: 5). Experiment too broad.`,
      };
    }
  } catch {
    // No changes yet — fine
  }
  return null;
}

// ── Experiment Log ─────────────────────────────────────────────────────

export function writeExperimentLog(
  logDir: string,
  result: ExperimentResult,
): string {
  mkdirSync(logDir, { recursive: true });
  const date = result.completedAt.slice(0, 10);
  const slug = result.hypothesis
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 40);
  const filename = `${date}-${slug}.md`;
  const filepath = join(logDir, filename);

  const deltas = result.evalDeltas
    .map(
      (d) =>
        `| ${d.evalId} | ${d.before ?? "—"} | ${d.after ?? "—"} | ${d.delta != null ? (d.delta > 0 ? "+" : "") + d.delta.toFixed(3) : "—"} |`,
    )
    .join("\n");

  const content = `# Experiment: ${result.hypothesis}

- **Workstream:** ${result.workstream}
- **Status:** ${result.status}
- **Branch:** ${result.branch}
- **Started:** ${result.startedAt}
- **Completed:** ${result.completedAt}
- **Files changed:** ${result.filesChanged}

## Eval Deltas

| Eval | Before | After | Delta |
|------|--------|-------|-------|
${deltas || "| (no evals measured) | | | |"}

## Learnings

${result.learnings || "(none recorded)"}
`;

  writeFileSync(filepath, content, "utf-8");
  return filepath;
}

// ── Branch Name Generator ──────────────────────────────────────────────

export function experimentBranch(workstream: string, hypothesis: string): string {
  const slug = hypothesis
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 30);
  const date = new Date().toISOString().slice(0, 10);
  return `experiment/${workstream}/${date}-${slug}`;
}
