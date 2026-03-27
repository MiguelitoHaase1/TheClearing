import { describe, it, expect } from "vitest";
import { join } from "node:path";
import {
  parseStrategy,
  parseEvals,
  analyzeByJTBD,
  analyzeByJourneyPhase,
  analyzeByTechnicalSurface,
  analyzeFracturePlanes,
} from "./fracture-planes.js";

const STRATEGY_DIR = join(
  import.meta.dirname,
  "../../../../Projects/strategies/continuous-improvements",
);
const STRATEGY_PATH = join(STRATEGY_DIR, "strategy.md");
const EVALS_PATH = join(STRATEGY_DIR, "evals.json");

// ── Parser Tests ───────────────────────────────────────────────────────

describe("parseStrategy", () => {
  it("extracts 4 NOW JTBDs from frontmatter", () => {
    const strategy = parseStrategy(STRATEGY_PATH);
    expect(strategy.jtbd_now).toHaveLength(4);
    expect(strategy.jtbd_now).toContain("Capture ideas instantly");
    // Frontmatter uses "automatically", body uses "through conversation" — both are valid
    const hasEnrich = strategy.jtbd_now.some((j: string) =>
      j.toLowerCase().includes("enrich"),
    );
    expect(hasEnrich).toBe(true);
    expect(strategy.jtbd_now).toContain("Execute experiments on a heartbeat");
    expect(strategy.jtbd_now).toContain("Review results with confidence");
  });

  it("extracts JTBD details from markdown body", () => {
    const strategy = parseStrategy(STRATEGY_PATH);
    expect(strategy.jtbds).toHaveLength(4);

    const capture = strategy.jtbds.find(
      (j) => j.title === "Capture ideas instantly",
    );
    expect(capture).toBeDefined();
    expect(capture!.functional).toBeTruthy();
    expect(capture!.emotional).toBeTruthy();
  });

  it("extracts vision and principles", () => {
    const strategy = parseStrategy(STRATEGY_PATH);
    expect(strategy.vision).toContain("Every product I build gets better");
    expect(strategy.principles).toHaveLength(4);
  });
});

describe("parseEvals", () => {
  it("loads 4 behavioral evals", () => {
    const evals = parseEvals(EVALS_PATH);
    expect(evals.behavioral_evals).toHaveLength(4);
  });

  it("each eval maps to a JTBD (fuzzy match)", () => {
    const evals = parseEvals(EVALS_PATH);
    const strategy = parseStrategy(STRATEGY_PATH);
    for (const eval_ of evals.behavioral_evals) {
      // Match on first two words to handle title variations
      const evalWords = eval_.jtbd.toLowerCase().split(" ").slice(0, 2).join(" ");
      const hasMatch = strategy.jtbd_now.some((j: string) =>
        j.toLowerCase().startsWith(evalWords),
      );
      expect(hasMatch).toBe(true);
    }
  });

  it("has leading indicators and guardrails", () => {
    const evals = parseEvals(EVALS_PATH);
    expect(evals.leading_indicators.primary.length).toBeGreaterThan(0);
    expect(evals.guardrails.length).toBeGreaterThan(0);
  });
});

// ── Fracture Plane Tests ───────────────────────────────────────────────

describe("analyzeByJTBD", () => {
  it("creates one workstream per JTBD", () => {
    const strategy = parseStrategy(STRATEGY_PATH);
    const evals = parseEvals(EVALS_PATH);
    const plane = analyzeByJTBD(strategy, evals);

    expect(plane.workstreams).toHaveLength(4);
    expect(plane.slug).toBe("by-jtbd");
  });

  it("maps every eval to exactly one workstream", () => {
    const strategy = parseStrategy(STRATEGY_PATH);
    const evals = parseEvals(EVALS_PATH);
    const plane = analyzeByJTBD(strategy, evals);

    const allEvalIds = plane.workstreams.flatMap((w) => w.eval_ids);
    const expectedIds = evals.behavioral_evals.map((e) => e.id);
    expect(allEvalIds.sort()).toEqual(expectedIds.sort());
  });

  it("has rationale and trade-offs", () => {
    const strategy = parseStrategy(STRATEGY_PATH);
    const evals = parseEvals(EVALS_PATH);
    const plane = analyzeByJTBD(strategy, evals);

    expect(plane.rationale).toBeTruthy();
    expect(plane.trade_offs.strengths.length).toBeGreaterThan(0);
    expect(plane.trade_offs.weaknesses.length).toBeGreaterThan(0);
  });
});

describe("analyzeByJourneyPhase", () => {
  it("creates 3 workstreams (input, processing, output)", () => {
    const strategy = parseStrategy(STRATEGY_PATH);
    const evals = parseEvals(EVALS_PATH);
    const plane = analyzeByJourneyPhase(strategy, evals);

    expect(plane.workstreams).toHaveLength(3);
    expect(plane.workstreams.map((w) => w.slug)).toEqual(
      expect.arrayContaining(["input", "processing", "output"]),
    );
  });

  it("groups capture + enrich into input phase", () => {
    const strategy = parseStrategy(STRATEGY_PATH);
    const evals = parseEvals(EVALS_PATH);
    const plane = analyzeByJourneyPhase(strategy, evals);

    const input = plane.workstreams.find((w) => w.slug === "input")!;
    expect(input.jtbds).toHaveLength(2);
    expect(input.jtbds).toContain("Capture ideas instantly");
    const hasEnrich = input.jtbds.some((j: string) =>
      j.toLowerCase().includes("enrich"),
    );
    expect(hasEnrich).toBe(true);
  });

  it("maps every eval to exactly one workstream", () => {
    const strategy = parseStrategy(STRATEGY_PATH);
    const evals = parseEvals(EVALS_PATH);
    const plane = analyzeByJourneyPhase(strategy, evals);

    const allEvalIds = plane.workstreams.flatMap((w) => w.eval_ids);
    const expectedIds = evals.behavioral_evals.map((e) => e.id);
    expect(allEvalIds.sort()).toEqual(expectedIds.sort());
  });
});

describe("analyzeByTechnicalSurface", () => {
  it("creates 3 workstreams with system-boundary slugs", () => {
    const strategy = parseStrategy(STRATEGY_PATH);
    const evals = parseEvals(EVALS_PATH);
    const plane = analyzeByTechnicalSurface(strategy, evals);

    expect(plane.workstreams).toHaveLength(3);
    expect(plane.workstreams.map((w) => w.slug)).toEqual(
      expect.arrayContaining([
        "discord-capture",
        "execution-engine",
        "review-dashboard",
      ]),
    );
  });

  it("maps every eval to exactly one workstream", () => {
    const strategy = parseStrategy(STRATEGY_PATH);
    const evals = parseEvals(EVALS_PATH);
    const plane = analyzeByTechnicalSurface(strategy, evals);

    const allEvalIds = plane.workstreams.flatMap((w) => w.eval_ids);
    const expectedIds = evals.behavioral_evals.map((e) => e.id);
    expect(allEvalIds.sort()).toEqual(expectedIds.sort());
  });
});

// ── Integration Test ───────────────────────────────────────────────────

describe("analyzeFracturePlanes", () => {
  it("returns 3 proposals", () => {
    const result = analyzeFracturePlanes(STRATEGY_PATH, EVALS_PATH);
    expect(result.planes).toHaveLength(3);
  });

  it("every plane covers all NOW JTBDs", () => {
    const strategy = parseStrategy(STRATEGY_PATH);
    const result = analyzeFracturePlanes(STRATEGY_PATH, EVALS_PATH);

    for (const plane of result.planes) {
      const coveredJTBDs = plane.workstreams.flatMap((w) => w.jtbds);
      for (const jtbd of strategy.jtbd_now) {
        expect(coveredJTBDs).toContain(jtbd);
      }
    }
  });

  it("every plane covers all behavioral evals", () => {
    const evals = parseEvals(EVALS_PATH);
    const result = analyzeFracturePlanes(STRATEGY_PATH, EVALS_PATH);

    const expectedIds = evals.behavioral_evals.map((e) => e.id);
    for (const plane of result.planes) {
      const coveredEvals = plane.workstreams.flatMap((w) => w.eval_ids);
      expect(coveredEvals.sort()).toEqual(expectedIds.sort());
    }
  });

  it("all workstream slugs are filesystem-safe", () => {
    const result = analyzeFracturePlanes(STRATEGY_PATH, EVALS_PATH);
    const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

    for (const plane of result.planes) {
      expect(plane.slug).toMatch(slugPattern);
      for (const ws of plane.workstreams) {
        expect(ws.slug).toMatch(slugPattern);
      }
    }
  });

  it("planes are genuinely different (different workstream counts or names)", () => {
    const result = analyzeFracturePlanes(STRATEGY_PATH, EVALS_PATH);
    const signatures = result.planes.map((p) =>
      p.workstreams
        .map((w) => w.slug)
        .sort()
        .join(","),
    );

    const unique = new Set(signatures);
    expect(unique.size).toBe(result.planes.length);
  });
});
