import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import {
  mkdtempSync,
  rmSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { scaffoldWorkstreams, claudeTemplate } from "./scaffold-workstreams.js";
import {
  parseStrategy,
  parseEvals,
  analyzeByJTBD,
  analyzeByJourneyPhase,
  analyzeByTechnicalSurface,
} from "./fracture-planes.js";

const STRATEGY_DIR = join(
  import.meta.dirname,
  "../../../../Projects/strategies/continuous-improvements",
);
const STRATEGY_PATH = join(STRATEGY_DIR, "strategy.md");
const EVALS_PATH = join(STRATEGY_DIR, "evals.json");

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "scaffold-test-"));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

// ── Dry Run Tests ──────────────────────────────────────────────────────

describe("scaffoldWorkstreams (dry run)", () => {
  it("returns a report without creating files", () => {
    const strategy = parseStrategy(STRATEGY_PATH);
    const evals = parseEvals(EVALS_PATH);
    const plane = analyzeByJTBD(strategy, evals);

    const report = scaffoldWorkstreams(plane, tempDir, { dryRun: true });

    expect(report.plane).toBe("By JTBD");
    expect(report.workstreams).toHaveLength(4);
    expect(existsSync(join(tempDir, "workstreams"))).toBe(false);
  });

  it("lists 3 files per workstream", () => {
    const strategy = parseStrategy(STRATEGY_PATH);
    const evals = parseEvals(EVALS_PATH);
    const plane = analyzeByJourneyPhase(strategy, evals);

    const report = scaffoldWorkstreams(plane, tempDir, { dryRun: true });

    for (const ws of report.workstreams) {
      expect(ws.files).toHaveLength(3);
      expect(ws.files.some((f) => f.endsWith("goal.md"))).toBe(true);
      expect(ws.files.some((f) => f.endsWith("ideas-backlog.md"))).toBe(true);
      expect(ws.files.some((f) => f.endsWith("CLAUDE.md"))).toBe(true);
    }
  });
});

// ── File Creation Tests ────────────────────────────────────────────────

describe("scaffoldWorkstreams (creates files)", () => {
  it("creates workstream directories with all files", () => {
    const strategy = parseStrategy(STRATEGY_PATH);
    const evals = parseEvals(EVALS_PATH);
    const plane = analyzeByJourneyPhase(strategy, evals);

    const report = scaffoldWorkstreams(plane, tempDir);

    expect(report.workstreams).toHaveLength(3);
    for (const ws of report.workstreams) {
      expect(existsSync(ws.directory)).toBe(true);
      for (const file of ws.files) {
        expect(existsSync(file)).toBe(true);
      }
      // experiment-log/ dir with .gitkeep
      const expLog = join(ws.directory, "experiment-log", ".gitkeep");
      expect(existsSync(expLog)).toBe(true);
    }
  });

  it("goal.md contains workstream name and JTBDs", () => {
    const strategy = parseStrategy(STRATEGY_PATH);
    const evals = parseEvals(EVALS_PATH);
    const plane = analyzeByJourneyPhase(strategy, evals);

    scaffoldWorkstreams(plane, tempDir);

    const inputGoal = readFileSync(
      join(tempDir, "workstreams", "input", "goal.md"),
      "utf-8",
    );
    expect(inputGoal).toContain("# Input");
    expect(inputGoal).toContain("Capture ideas instantly");
  });

  it("ideas-backlog.md contains the hypothesis template", () => {
    const strategy = parseStrategy(STRATEGY_PATH);
    const evals = parseEvals(EVALS_PATH);
    const plane = analyzeByTechnicalSurface(strategy, evals);

    scaffoldWorkstreams(plane, tempDir);

    const backlog = readFileSync(
      join(tempDir, "workstreams", "discord-capture", "ideas-backlog.md"),
      "utf-8",
    );
    expect(backlog).toContain("# Ideas Backlog");
    expect(backlog).toContain("**Status:** queued");
    expect(backlog).toContain("**Expected delta:**");
  });

  it("CLAUDE.md references eval IDs and goal.md", () => {
    const strategy = parseStrategy(STRATEGY_PATH);
    const evals = parseEvals(EVALS_PATH);
    const plane = analyzeByJTBD(strategy, evals);

    scaffoldWorkstreams(plane, tempDir);

    // Find the workstream that has eval-001
    const ws = plane.workstreams.find((w) => w.eval_ids.includes("eval-001"))!;
    const claude = readFileSync(
      join(tempDir, "workstreams", ws.slug, ".claude", "CLAUDE.md"),
      "utf-8",
    );
    expect(claude).toContain("eval-001");
    expect(claude).toContain("goal.md");
    expect(claude).toContain("ideas-backlog.md");
    expect(claude).toContain("evals");
  });

  it("does not overwrite existing files", () => {
    const strategy = parseStrategy(STRATEGY_PATH);
    const evals = parseEvals(EVALS_PATH);
    const plane = analyzeByJourneyPhase(strategy, evals);

    // First run
    scaffoldWorkstreams(plane, tempDir);

    // Modify a file
    const goalPath = join(tempDir, "workstreams", "input", "goal.md");
    const customContent = "# Custom goal content\n";
    writeFileSync(goalPath, customContent, "utf-8");

    // Second run — should not overwrite
    scaffoldWorkstreams(plane, tempDir);

    const afterContent = readFileSync(goalPath, "utf-8");
    expect(afterContent).toBe(customContent);
  });
});

// ── Guard-001: Evals Referenced, Never Copied ──────────────────────────

describe("guard-001: CLAUDE.md must not contain eval content", () => {
  it("CLAUDE.md references eval IDs but not targets or measurements", () => {
    const strategy = parseStrategy(STRATEGY_PATH);
    const evals = parseEvals(EVALS_PATH);
    const plane = analyzeByJourneyPhase(strategy, evals);

    scaffoldWorkstreams(plane, tempDir);

    for (const ws of plane.workstreams) {
      const claudePath = join(
        tempDir,
        "workstreams",
        ws.slug,
        ".claude",
        "CLAUDE.md",
      );
      const content = readFileSync(claudePath, "utf-8");

      // Must contain eval IDs (reference)
      for (const evalId of ws.eval_ids) {
        expect(content).toContain(evalId);
      }

      // Must NOT contain eval targets, measurements, or scoring formulas
      for (const ev of evals.behavioral_evals) {
        expect(content).not.toContain(ev.measurement);
        expect(content).not.toContain(String(ev.target));
        expect(content).not.toContain(ev.statement);
      }
    }
  });

  it("goal.md does not contain eval content either", () => {
    const strategy = parseStrategy(STRATEGY_PATH);
    const evals = parseEvals(EVALS_PATH);
    const plane = analyzeByJTBD(strategy, evals);

    scaffoldWorkstreams(plane, tempDir);

    for (const ws of plane.workstreams) {
      const goalPath = join(tempDir, "workstreams", ws.slug, "goal.md");
      const content = readFileSync(goalPath, "utf-8");

      for (const ev of evals.behavioral_evals) {
        expect(content).not.toContain(ev.measurement);
        expect(content).not.toContain(String(ev.target));
      }
    }
  });
});

// ── CLAUDE.md Template Quality ─────────────────────────────────────────

describe("claudeTemplate quality", () => {
  it("includes experiment workflow steps", () => {
    const ws = {
      name: "Test",
      slug: "test",
      description: "Test workstream",
      jtbds: ["Test job"],
      eval_ids: ["eval-001"],
    };
    const content = claudeTemplate(ws, "../../evals.json");

    expect(content).toContain("## Experiment Workflow");
    expect(content).toContain("goal.md");
    expect(content).toContain("ideas-backlog.md");
    expect(content).toContain("experiment-log/");
  });

  it("includes adaptation boundaries", () => {
    const ws = {
      name: "Test",
      slug: "test",
      description: "Test workstream",
      jtbds: ["Test job"],
      eval_ids: ["eval-001"],
    };
    const content = claudeTemplate(ws, "../../evals.json");

    expect(content).toContain("## Adaptation Boundaries");
    expect(content).toContain("CAN do");
    expect(content).toContain("CANNOT do");
    expect(content).toContain("NEVER copy");
  });

  it("includes circuit breakers", () => {
    const ws = {
      name: "Test",
      slug: "test",
      description: "Test workstream",
      jtbds: ["Test job"],
      eval_ids: ["eval-001"],
    };
    const content = claudeTemplate(ws, "../../evals.json");

    expect(content).toContain("## Circuit Breakers");
  });
});

// ── Cross-Plane Consistency ────────────────────────────────────────────

describe("scaffoldWorkstreams (all planes)", () => {
  it("every plane produces valid directories with correct slug paths", () => {
    const strategy = parseStrategy(STRATEGY_PATH);
    const evals = parseEvals(EVALS_PATH);
    const planes = [
      analyzeByJTBD(strategy, evals),
      analyzeByJourneyPhase(strategy, evals),
      analyzeByTechnicalSurface(strategy, evals),
    ];

    for (const plane of planes) {
      const dir = mkdtempSync(join(tmpdir(), "scaffold-plane-"));
      try {
        const report = scaffoldWorkstreams(plane, dir);
        for (const ws of report.workstreams) {
          expect(ws.directory).toContain(ws.slug);
          expect(existsSync(ws.directory)).toBe(true);
        }
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  });
});
