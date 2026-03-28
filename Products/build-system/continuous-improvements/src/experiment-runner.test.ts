import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import {
  parseBacklog,
  pickTopHypothesis,
  updateHypothesisStatus,
  writeExperimentLog,
  experimentBranch,
} from "./experiment-runner.js";

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "runner-test-"));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

const SAMPLE_BACKLOG = `# Ideas Backlog

## Simplify welcome screen
- **Status:** queued
- **Date added:** 2026-03-27
- **Problem statement:** Welcome flow has 7 steps, users drop off at step 4
- **Proposed change:** Reduce to 3 steps with smarter defaults
- **Target eval(s):** eval-001
- **Expected delta:** 0.15
- **Risks / counterarguments:** Might lose configuration flexibility
- **Experiment design:** A/B test with 50% of new users
- **Result:**

## Add dark mode
- **Status:** queued
- **Date added:** 2026-03-26
- **Problem statement:** Users request dark mode frequently
- **Proposed change:** Add CSS custom properties for dark theme
- **Target eval(s):** eval-002
- **Expected delta:** 0.05
- **Risks / counterarguments:** Low eval impact, cosmetic change
- **Experiment design:** Ship to all, measure retention
- **Result:**

## Fix mobile layout
- **Status:** shipped
- **Date added:** 2026-03-25
- **Problem statement:** Buttons overflow on small screens
- **Proposed change:** Responsive grid
- **Target eval(s):** eval-001
- **Expected delta:** 0.10
- **Risks / counterarguments:** None significant
- **Experiment design:** Direct fix
- **Result:** Shipped, eval-001 improved by 0.08
`;

// ── Parsing ────────────────────────────────────────────────────────────

describe("parseBacklog", () => {
  it("parses hypotheses from backlog markdown", () => {
    const path = join(tempDir, "backlog.md");
    writeFileSync(path, SAMPLE_BACKLOG);

    const hypotheses = parseBacklog(path);
    expect(hypotheses).toHaveLength(3);
    expect(hypotheses[0].title).toBe("Simplify welcome screen");
    expect(hypotheses[0].status).toBe("queued");
    expect(hypotheses[0].expectedDelta).toBe("0.15");
  });

  it("returns empty array for missing file", () => {
    expect(parseBacklog(join(tempDir, "nonexistent.md"))).toEqual([]);
  });

  it("extracts all fields", () => {
    const path = join(tempDir, "backlog.md");
    writeFileSync(path, SAMPLE_BACKLOG);

    const h = parseBacklog(path)[0];
    expect(h.problemStatement).toContain("7 steps");
    expect(h.proposedChange).toContain("3 steps");
    expect(h.targetEvals).toBe("eval-001");
    expect(h.risks).toContain("flexibility");
    expect(h.experimentDesign).toContain("A/B");
  });
});

// ── Selection ──────────────────────────────────────────────────────────

describe("pickTopHypothesis", () => {
  it("picks the queued hypothesis with highest expected delta", () => {
    const path = join(tempDir, "backlog.md");
    writeFileSync(path, SAMPLE_BACKLOG);

    const hypotheses = parseBacklog(path);
    const top = pickTopHypothesis(hypotheses);

    expect(top).not.toBeNull();
    expect(top!.title).toBe("Simplify welcome screen");
    expect(top!.expectedDelta).toBe("0.15");
  });

  it("skips non-queued hypotheses", () => {
    const path = join(tempDir, "backlog.md");
    writeFileSync(path, SAMPLE_BACKLOG);

    const hypotheses = parseBacklog(path);
    const top = pickTopHypothesis(hypotheses);

    // "Fix mobile layout" has status=shipped, should not be picked
    expect(top!.title).not.toBe("Fix mobile layout");
  });

  it("returns null when no queued hypotheses", () => {
    const path = join(tempDir, "backlog.md");
    writeFileSync(
      path,
      "# Backlog\n\n## Done thing\n- **Status:** shipped\n- **Expected delta:** 0.5\n",
    );

    const hypotheses = parseBacklog(path);
    expect(pickTopHypothesis(hypotheses)).toBeNull();
  });
});

// ── Backlog Updates ────────────────────────────────────────────────────

describe("updateHypothesisStatus", () => {
  it("updates status of a specific hypothesis", () => {
    const path = join(tempDir, "backlog.md");
    writeFileSync(path, SAMPLE_BACKLOG);

    updateHypothesisStatus(path, "Simplify welcome screen", "in-experiment");

    const content = readFileSync(path, "utf-8");
    expect(content).toContain("**Status:** in-experiment");
    // Other hypotheses unchanged
    expect(content).toMatch(/## Add dark mode[\s\S]*?\*\*Status:\*\* queued/);
  });

  it("updates status and result together", () => {
    const path = join(tempDir, "backlog.md");
    writeFileSync(path, SAMPLE_BACKLOG);

    updateHypothesisStatus(
      path,
      "Simplify welcome screen",
      "shipped",
      "eval-001 improved by 0.12",
    );

    const content = readFileSync(path, "utf-8");
    expect(content).toContain("**Status:** shipped");
    expect(content).toContain("**Result:** eval-001 improved by 0.12");
  });
});

// ── Experiment Log ─────────────────────────────────────────────────────

describe("writeExperimentLog", () => {
  it("writes a markdown experiment log", () => {
    const logDir = join(tempDir, "experiment-log");

    const filepath = writeExperimentLog(logDir, {
      hypothesis: "Simplify welcome screen",
      workstream: "input",
      status: "shipped",
      branch: "experiment/input/2026-03-27-simplify",
      startedAt: "2026-03-27T03:00:00Z",
      completedAt: "2026-03-27T03:45:00Z",
      evalDeltas: [
        { evalId: "eval-001", before: 0.6, after: 0.72, delta: 0.12 },
      ],
      learnings: "Fewer steps = higher completion. Smart defaults worked.",
      filesChanged: 3,
    });

    const content = readFileSync(filepath, "utf-8");
    expect(content).toContain("# Experiment: Simplify welcome screen");
    expect(content).toContain("**Status:** shipped");
    expect(content).toContain("eval-001");
    expect(content).toContain("+0.120");
    expect(content).toContain("Smart defaults");
  });
});

// ── Branch Naming ──────────────────────────────────────────────────────

describe("experimentBranch", () => {
  it("generates a filesystem-safe branch name", () => {
    const branch = experimentBranch("input", "Simplify the welcome screen!");
    expect(branch).toMatch(/^experiment\/input\/\d{4}-\d{2}-\d{2}-simplify-the-welcome-screen/);
    expect(branch).not.toContain("!");
  });
});
