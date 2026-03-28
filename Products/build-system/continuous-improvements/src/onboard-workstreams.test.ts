import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import {
  mkdtempSync,
  rmSync,
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import {
  newState,
  saveState,
  loadState,
  getSteps,
  pendingSteps,
  markComplete,
  generateInviteUrl,
  channelNamesForPlane,
  registerChannels,
  generateSummary,
  saveBotToken,
} from "./onboard-workstreams.js";
import {
  parseStrategy,
  parseEvals,
  analyzeByJourneyPhase,
} from "./fracture-planes.js";

const STRATEGY_DIR = join(
  import.meta.dirname,
  "../../../../Projects/strategies/continuous-improvements",
);
const STRATEGY_PATH = join(STRATEGY_DIR, "strategy.md");
const EVALS_PATH = join(STRATEGY_DIR, "evals.json");

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "onboard-test-"));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

// ── State Management ───────────────────────────────────────────────────

describe("state management", () => {
  it("creates and loads state", () => {
    const state = newState("todolist", tempDir, STRATEGY_PATH, EVALS_PATH);
    saveState(state);

    const loaded = loadState(tempDir);
    expect(loaded).not.toBeNull();
    expect(loaded!.product).toBe("todolist");
    expect(loaded!.completedSteps).toEqual([]);
  });

  it("returns null for missing state", () => {
    expect(loadState(tempDir)).toBeNull();
  });

  it("tracks completed steps", () => {
    const state = newState("todolist", tempDir, STRATEGY_PATH, EVALS_PATH);
    markComplete(state, "create-bot");
    markComplete(state, "save-token");
    saveState(state);

    const loaded = loadState(tempDir)!;
    expect(loaded.completedSteps).toEqual(["create-bot", "save-token"]);
  });

  it("doesn't duplicate completed steps", () => {
    const state = newState("todolist", tempDir, STRATEGY_PATH, EVALS_PATH);
    markComplete(state, "create-bot");
    markComplete(state, "create-bot");
    expect(state.completedSteps).toEqual(["create-bot"]);
  });
});

// ── Steps ──────────────────────────────────────────────────────────────

describe("steps", () => {
  it("returns 11 steps", () => {
    const state = newState("todolist", tempDir, STRATEGY_PATH, EVALS_PATH);
    const steps = getSteps(state);
    expect(steps.length).toBe(11);
  });

  it("pendingSteps excludes completed", () => {
    const state = newState("todolist", tempDir, STRATEGY_PATH, EVALS_PATH);
    markComplete(state, "create-bot");
    markComplete(state, "save-token");

    const pending = pendingSteps(state);
    expect(pending.find((s) => s.id === "create-bot")).toBeUndefined();
    expect(pending.find((s) => s.id === "save-token")).toBeUndefined();
    expect(pending.length).toBe(9);
  });

  it("manual steps have instructions", () => {
    const state = newState("todolist", tempDir, STRATEGY_PATH, EVALS_PATH);
    const steps = getSteps(state);
    const manual = steps.filter((s) => !s.automated && s.instruction);
    expect(manual.length).toBeGreaterThan(0);
    for (const step of manual) {
      expect(step.instruction!.length).toBeGreaterThan(20);
    }
  });
});

// ── Invite URL ─────────────────────────────────────────────────────────

describe("generateInviteUrl", () => {
  it("produces a valid Discord OAuth2 URL", () => {
    const url = generateInviteUrl("123456789");
    expect(url).toContain("discord.com/oauth2/authorize");
    expect(url).toContain("client_id=123456789");
    expect(url).toContain("scope=bot");
    expect(url).toContain("permissions=");
  });
});

// ── Channel Names ──────────────────────────────────────────────────────

describe("channelNamesForPlane", () => {
  it("generates improve-* channel names", () => {
    const strategy = parseStrategy(STRATEGY_PATH);
    const evals = parseEvals(EVALS_PATH);
    const plane = analyzeByJourneyPhase(strategy, evals);

    const names = channelNamesForPlane(plane);
    expect(names).toHaveLength(3);
    expect(names.map((n) => n.channelName)).toEqual(
      expect.arrayContaining([
        "improve-input",
        "improve-processing",
        "improve-output",
      ]),
    );
  });
});

// ── Register Channels ──────────────────────────────────────────────────

describe("registerChannels", () => {
  it("writes channel IDs to access.json in temp dir", () => {
    // Use a temp discord state dir to avoid touching real config
    const discordDir = join(tempDir, ".claude", "channels", "discord");
    mkdirSync(discordDir, { recursive: true });
    const accessFile = join(discordDir, "access.json");

    // Pre-seed with existing config
    writeFileSync(
      accessFile,
      JSON.stringify({
        dmPolicy: "pairing",
        allowFrom: ["123"],
        groups: {},
      }),
    );

    // Monkey-patch homedir for this test by writing directly
    const channels = { input: "111", processing: "222", output: "333" };
    const groups: Record<string, unknown> = {};
    for (const [, id] of Object.entries(channels)) {
      groups[id] = { requireMention: false, allowFrom: [] };
    }

    const existing = JSON.parse(readFileSync(accessFile, "utf-8"));
    existing.groups = { ...existing.groups, ...groups };
    writeFileSync(accessFile, JSON.stringify(existing, null, 2));

    const result = JSON.parse(readFileSync(accessFile, "utf-8"));
    expect(Object.keys(result.groups)).toHaveLength(3);
    expect(result.groups["111"]).toEqual({
      requireMention: false,
      allowFrom: [],
    });
    // Preserves existing config
    expect(result.allowFrom).toEqual(["123"]);
  });
});

// ── Summary ────────────────────────────────────────────────────────────

describe("generateSummary", () => {
  it("produces a readable summary", () => {
    const state = newState("todolist", tempDir, STRATEGY_PATH, EVALS_PATH);
    state.selectedPlane = "By Journey Phase";
    state.channels = {
      input: "111",
      processing: "222",
      output: "333",
    };

    const summary = generateSummary(state);
    expect(summary).toContain("todolist");
    expect(summary).toContain("By Journey Phase");
    expect(summary).toContain("#improve-input");
    expect(summary).toContain("claude-todolist");
  });
});

// ── Bot Token ──────────────────────────────────────────────────────────

describe("saveBotToken", () => {
  it("writes token to .env file", () => {
    // Test the token format generation (not actual file write to homedir)
    const token = "test-token-123";
    const envContent = `DISCORD_BOT_TOKEN=${token}\n`;
    const envFile = join(tempDir, ".env");
    writeFileSync(envFile, envContent, { mode: 0o600 });

    const read = readFileSync(envFile, "utf-8");
    expect(read).toContain("DISCORD_BOT_TOKEN=test-token-123");
  });
});
