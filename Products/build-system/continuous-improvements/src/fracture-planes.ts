import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";

// ── Types ──────────────────────────────────────────────────────────────

export interface JTBD {
  title: string;
  when: string;
  want: string;
  so: string;
  functional: string;
  emotional: string;
  social: string;
}

export interface Strategy {
  title: string;
  vision: string;
  where_to_play: string;
  principles: string[];
  jtbd_now: string[];
  jtbds: JTBD[];
}

export interface BehavioralEval {
  id: string;
  jtbd: string;
  statement: string;
  target: number;
  measurement: string;
  grader: string;
}

export interface Evals {
  behavioral_evals: BehavioralEval[];
  leading_indicators: {
    primary: Array<{ id: string; name: string; jtbd_link: string }>;
    secondary: Array<{ id: string; name: string }>;
  };
  guardrails: Array<{ id: string; statement: string }>;
}

export interface Workstream {
  name: string;
  slug: string;
  description: string;
  jtbds: string[];
  eval_ids: string[];
}

export interface FracturePlaneProposal {
  name: string;
  slug: string;
  description: string;
  workstreams: Workstream[];
  rationale: string;
  trade_offs: { strengths: string[]; weaknesses: string[] };
}

export interface FracturePlaneAnalysis {
  source_strategy: string;
  generated: string;
  planes: FracturePlaneProposal[];
}

// ── Parsing ────────────────────────────────────────────────────────────

export function parseStrategy(path: string): Strategy {
  const raw = readFileSync(path, "utf-8");

  // Extract YAML frontmatter between --- markers
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) throw new Error("No YAML frontmatter found in strategy.md");
  const frontmatter = parseYaml(fmMatch[1]);

  // Extract JTBD blocks from the markdown body
  const body = raw.slice(fmMatch[0].length);
  const jtbds = parseJTBDs(body, frontmatter.jtbd_now);

  return {
    title: frontmatter.title,
    vision: frontmatter.vision,
    where_to_play: frontmatter.where_to_play,
    principles: frontmatter.principles,
    jtbd_now: frontmatter.jtbd_now,
    jtbds,
  };
}

function parseJTBDs(body: string, titles: string[]): JTBD[] {
  return titles.map((title) => {
    // Find the JTBD section by title
    const pattern = new RegExp(
      `\\*\\*JTBD \\d+: ${escapeRegex(title)}\\*\\*([\\s\\S]*?)(?=\\*\\*JTBD \\d+:|####|## |$)`,
    );
    const match = body.match(pattern);
    const section = match ? match[1] : "";

    return {
      title,
      when: extractField(section, "When"),
      want: extractField(section, "I want to|I want"),
      so: extractField(section, "So I can|So the"),
      functional: extractField(section, "Functional:"),
      emotional: extractField(section, "Emotional:"),
      social: extractField(section, "Social:"),
    };
  });
}

function extractField(text: string, label: string): string {
  const pattern = new RegExp(
    `(?:\\*\\*)?(?:${label})(?:\\*\\*)?\\s*(.+?)(?:\\n|$)`,
    "i",
  );
  const match = text.match(pattern);
  return match ? match[1].trim().replace(/^\*+|\*+$/g, "") : "";
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseEvals(path: string): Evals {
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw);
}

// ── Helpers ────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeJTBD(title: string): string {
  // Extract the verb + object core (e.g., "Capture ideas", "Enrich ideas")
  // to handle mismatches like "Enrich ideas automatically" vs "Enrich ideas through conversation"
  return title.toLowerCase().replace(/\s+/g, " ").trim();
}

function jtbdMatches(evalJTBD: string, strategyJTBD: string): boolean {
  const a = normalizeJTBD(evalJTBD);
  const b = normalizeJTBD(strategyJTBD);
  if (a === b) return true;
  // Match on first two words (verb + object) — covers "Capture ideas", "Enrich ideas", etc.
  const aWords = a.split(" ").slice(0, 2).join(" ");
  const bWords = b.split(" ").slice(0, 2).join(" ");
  return aWords === bWords;
}

function evalsForJTBDs(evals: Evals, jtbdTitles: string[]): string[] {
  return evals.behavioral_evals
    .filter((e) => jtbdTitles.some((title) => jtbdMatches(e.jtbd, title)))
    .map((e) => e.id);
}

// ── Fracture Plane Analyzers ───────────────────────────────────────────

export function analyzeByJTBD(
  strategy: Strategy,
  evals: Evals,
): FracturePlaneProposal {
  const workstreams: Workstream[] = strategy.jtbds.map((jtbd) => ({
    name: jtbd.title,
    slug: slugify(jtbd.title),
    description: `${jtbd.functional} ${jtbd.emotional}`.trim(),
    jtbds: [jtbd.title],
    eval_ids: evalsForJTBDs(evals, [jtbd.title]),
  }));

  return {
    name: "By JTBD",
    slug: "by-jtbd",
    description:
      "Each job-to-be-done becomes its own workstream with dedicated backlog, evals, and experiment cadence.",
    workstreams,
    rationale:
      "The most natural mapping. Each workstream owns exactly one user need and its corresponding eval. Scouting and experiments stay focused on a single outcome.",
    trade_offs: {
      strengths: [
        "Direct 1:1 eval mapping — clear accountability per workstream",
        "Easy to reason about what 'improvement' means for each stream",
        "Scouting targets a single user need per workstream",
      ],
      weaknesses: [
        `${workstreams.length} workstreams may be too many for a solo builder`,
        "Capture and Enrich are tightly coupled — separating them creates artificial boundaries",
        "Experiments that span multiple JTBDs have no natural home",
      ],
    },
  };
}

export function analyzeByJourneyPhase(
  strategy: Strategy,
  evals: Evals,
): FracturePlaneProposal {
  // Group JTBDs by the builder's daily rhythm:
  // Input phase (afternoon/async): Capture + Enrich
  // Processing phase (5am heartbeat): Execute
  // Output phase (evening): Review
  const phases: Array<{
    name: string;
    slug: string;
    description: string;
    jtbdTitles: string[];
  }> = [
    {
      name: "Input",
      slug: "input",
      description:
        "Idea capture and enrichment — the builder's creative input during afternoons and async moments.",
      jtbdTitles: strategy.jtbd_now.filter(
        (j) =>
          j.toLowerCase().includes("capture") ||
          j.toLowerCase().includes("enrich"),
      ),
    },
    {
      name: "Processing",
      slug: "processing",
      description:
        "Experiment execution — the 5am heartbeat that turns hypotheses into measured changes.",
      jtbdTitles: strategy.jtbd_now.filter((j) =>
        j.toLowerCase().includes("execute"),
      ),
    },
    {
      name: "Output",
      slug: "output",
      description:
        "Results review — evening reflection on what improved and why.",
      jtbdTitles: strategy.jtbd_now.filter((j) =>
        j.toLowerCase().includes("review"),
      ),
    },
  ];

  const workstreams: Workstream[] = phases
    .filter((p) => p.jtbdTitles.length > 0)
    .map((phase) => ({
      name: phase.name,
      slug: phase.slug,
      description: phase.description,
      jtbds: phase.jtbdTitles,
      eval_ids: evalsForJTBDs(evals, phase.jtbdTitles),
    }));

  return {
    name: "By Journey Phase",
    slug: "by-journey-phase",
    description:
      "Group JTBDs by the builder's daily rhythm: input (afternoon), processing (5am), output (evening).",
    workstreams,
    rationale:
      "Mirrors the natural cadence described in the strategy. Each workstream maps to a distinct time of day and mental mode. Capture and Enrich stay together because they happen in the same creative window.",
    trade_offs: {
      strengths: [
        "Matches the builder's daily rhythm — each stream has a natural time slot",
        "Capture + Enrich stay together (they're one creative flow)",
        "3 workstreams is manageable for a solo builder",
      ],
      weaknesses: [
        "Processing has only 1 JTBD — experiments may feel under-scoped as a standalone stream",
        "Temporal grouping may not reflect technical dependencies",
        "Scouting doesn't map cleanly to a single phase",
      ],
    },
  };
}

export function analyzeByTechnicalSurface(
  strategy: Strategy,
  evals: Evals,
): FracturePlaneProposal {
  // Group by system boundary:
  // Discord Capture: Capture + Enrich (Discord Channels surface)
  // Execution Engine: Execute (Claude Code scheduled agent + worktree)
  // Review Dashboard: Review (Next.js + Supabase surface)
  const surfaces: Array<{
    name: string;
    slug: string;
    description: string;
    jtbdTitles: string[];
  }> = [
    {
      name: "Discord Capture",
      slug: "discord-capture",
      description:
        "Idea intake and sparring via Discord Channels — the conversational surface where raw ideas become structured hypotheses.",
      jtbdTitles: strategy.jtbd_now.filter(
        (j) =>
          j.toLowerCase().includes("capture") ||
          j.toLowerCase().includes("enrich"),
      ),
    },
    {
      name: "Execution Engine",
      slug: "execution-engine",
      description:
        "The automated experiment runner — scheduled agent, worktree isolation, eval measurement, ship-or-reject logic.",
      jtbdTitles: strategy.jtbd_now.filter((j) =>
        j.toLowerCase().includes("execute"),
      ),
    },
    {
      name: "Review Dashboard",
      slug: "review-dashboard",
      description:
        "The persistent review surface — Next.js on Vercel reading from Supabase, showing eval deltas and experiment history.",
      jtbdTitles: strategy.jtbd_now.filter((j) =>
        j.toLowerCase().includes("review"),
      ),
    },
  ];

  const workstreams: Workstream[] = surfaces
    .filter((s) => s.jtbdTitles.length > 0)
    .map((surface) => ({
      name: surface.name,
      slug: surface.slug,
      description: surface.description,
      jtbds: surface.jtbdTitles,
      eval_ids: evalsForJTBDs(evals, surface.jtbdTitles),
    }));

  return {
    name: "By Technical Surface",
    slug: "by-technical-surface",
    description:
      "Group by system boundary: Discord (capture), Claude Code agent (execution), Next.js + Supabase (review).",
    workstreams,
    rationale:
      "Each workstream maps to a distinct technical system. Changes within one stream rarely affect others. Enables parallel development and independent deployment.",
    trade_offs: {
      strengths: [
        "Clean system boundaries — changes in one stream don't break others",
        "Each stream has a clear technology stack to optimize",
        "Enables parallel development if the team grows",
      ],
      weaknesses: [
        "Cuts across user needs — a single user journey spans all 3 streams",
        "End-to-end improvements (idea → experiment → review) require coordinating across streams",
        "Technical grouping may miss user-experience insights that a JTBD lens would catch",
      ],
    },
  };
}

// ── Main Entry Point ───────────────────────────────────────────────────

export function analyzeFracturePlanes(
  strategyPath: string,
  evalsPath: string,
): FracturePlaneAnalysis {
  const strategy = parseStrategy(strategyPath);
  const evals = parseEvals(evalsPath);

  return {
    source_strategy: strategy.title,
    generated: new Date().toISOString().slice(0, 10),
    planes: [
      analyzeByJTBD(strategy, evals),
      analyzeByJourneyPhase(strategy, evals),
      analyzeByTechnicalSurface(strategy, evals),
    ],
  };
}
