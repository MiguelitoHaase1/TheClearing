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
import { scaffoldWorkstreams } from "./scaffold-workstreams.js";
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
