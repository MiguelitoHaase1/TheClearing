import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import type { FracturePlaneProposal } from "./fracture-planes.js";
import { analyzeFracturePlanes } from "./fracture-planes.js";
import { scaffoldWorkstreams } from "./scaffold-workstreams.js";

// ── Types ──────────────────────────────────────────────────────────────

export interface OnboardState {
  product: string;
  productDir: string;
  strategyPath: string;
  evalsPath: string;
  selectedPlane: string | null;
  botTokenSaved: boolean;
  botClientId: string | null;
  userPaired: boolean;
  channels: Record<string, string>; // slug → discord channel ID
  aliasCreated: boolean;
  completedSteps: string[];
}

export interface OnboardStep {
  id: string;
  title: string;
  automated: boolean;
  instruction?: string;
}

// ── State Management ───────────────────────────────────────────────────

export function stateFilePath(productDir: string): string {
  return join(productDir, "workstreams", ".onboard-state.json");
}

export function loadState(productDir: string): OnboardState | null {
  const path = stateFilePath(productDir);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8"));
}

export function saveState(state: OnboardState): void {
  const dir = join(state.productDir, "workstreams");
  mkdirSync(dir, { recursive: true });
  writeFileSync(stateFilePath(state.productDir), JSON.stringify(state, null, 2) + "\n");
}

export function newState(
  product: string,
  productDir: string,
  strategyPath: string,
  evalsPath: string,
): OnboardState {
  return {
    product,
    productDir: resolve(productDir),
    strategyPath: resolve(strategyPath),
    evalsPath: resolve(evalsPath),
    selectedPlane: null,
    botTokenSaved: false,
    botClientId: null,
    userPaired: false,
    channels: {},
    aliasCreated: false,
    completedSteps: [],
  };
}

// ── Step Definitions ───────────────────────────────────────────────────

export function getSteps(state: OnboardState): OnboardStep[] {
  return [
    {
      id: "create-bot",
      title: "Create Discord bot",
      automated: false,
      instruction: [
        "1. Go to https://discord.com/developers/applications",
        "2. Click 'New Application' → name it (e.g., your product name)",
        "3. Left sidebar → Bot → give it a username",
        "4. Scroll to 'Privileged Gateway Intents' → enable 'Message Content Intent' → Save",
        "5. Scroll up to Token → 'Reset Token' → copy the token",
      ].join("\n"),
    },
    {
      id: "save-token",
      title: "Save bot token",
      automated: true,
    },
    {
      id: "create-server",
      title: "Create Discord server",
      automated: false,
      instruction: [
        "1. In Discord, click '+' in the server list (left sidebar)",
        "2. 'Create My Own' → 'For me and my friends'",
        `3. Name it: "${state.product}"`,
      ].join("\n"),
    },
    {
      id: "invite-bot",
      title: "Invite bot to server",
      automated: false, // We generate the URL, user opens it
    },
    {
      id: "pair-bot",
      title: "Pair with bot",
      automated: false,
      instruction: [
        "1. Start Claude Code with Discord: claude --channels plugin:discord@claude-plugins-official",
        "2. In Discord, right-click the bot in the member list → Message",
        "3. Send any message — it replies with a pairing code",
        "4. In the Claude Code session: /discord:access pair <code>",
        "5. Once paired, exit that Claude Code session",
      ].join("\n"),
    },
    {
      id: "select-plane",
      title: "Run fracture plane analysis & select",
      automated: true,
    },
    {
      id: "scaffold",
      title: "Create workstream directories",
      automated: true,
    },
    {
      id: "create-channels",
      title: "Create Discord channels",
      automated: false, // We tell them exact names, they create in Discord
    },
    {
      id: "collect-ids",
      title: "Collect channel IDs",
      automated: false, // User right-clicks → Copy ID
    },
    {
      id: "register-channels",
      title: "Register channels in access config",
      automated: true,
    },
    {
      id: "create-alias",
      title: "Create startup alias",
      automated: true,
    },
  ];
}

export function pendingSteps(state: OnboardState): OnboardStep[] {
  const all = getSteps(state);
  return all.filter((s) => !state.completedSteps.includes(s.id));
}

export function markComplete(state: OnboardState, stepId: string): void {
  if (!state.completedSteps.includes(stepId)) {
    state.completedSteps.push(stepId);
  }
}

// ── Automated Functions ────────────────────────────────────────────────

export function saveBotToken(token: string): void {
  const dir = join(homedir(), ".claude", "channels", "discord");
  mkdirSync(dir, { recursive: true });
  const envFile = join(dir, ".env");
  // Read existing, replace or append DISCORD_BOT_TOKEN
  let content = "";
  if (existsSync(envFile)) {
    content = readFileSync(envFile, "utf-8");
    content = content.replace(/^DISCORD_BOT_TOKEN=.*$/m, "").trim();
  }
  content = (content ? content + "\n" : "") + `DISCORD_BOT_TOKEN=${token}\n`;
  writeFileSync(envFile, content, { mode: 0o600 });
}

export function generateInviteUrl(clientId: string): string {
  // Permissions: View Channels (1024) + Send Messages (2048) + Send in Threads (274877906944)
  // + Read History (65536) + Attach Files (32768) + Add Reactions (64) + Create Threads (8589934592)
  // + Manage Messages (8192)
  const permissions = 1024 + 2048 + 65536 + 32768 + 64 + 8192 + 274877906944 + 8589934592;
  return `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=bot`;
}

export function channelNamesForPlane(
  plane: FracturePlaneProposal,
): Array<{ slug: string; channelName: string }> {
  return plane.workstreams.map((ws) => ({
    slug: ws.slug,
    channelName: `improve-${ws.slug}`,
  }));
}

export function runFracturePlaneAnalysis(
  strategyPath: string,
  evalsPath: string,
) {
  return analyzeFracturePlanes(strategyPath, evalsPath);
}

export function runScaffold(
  plane: FracturePlaneProposal,
  productDir: string,
  evalsRelPath: string,
) {
  return scaffoldWorkstreams(plane, productDir, { evalsRelPath });
}

export function registerChannels(
  channelMap: Record<string, string>,
  options: { requireMention?: boolean } = {},
): void {
  const accessFile = join(
    homedir(),
    ".claude",
    "channels",
    "discord",
    "access.json",
  );
  let access: Record<string, unknown> = {};
  if (existsSync(accessFile)) {
    access = JSON.parse(readFileSync(accessFile, "utf-8"));
  }

  const groups = (access.groups as Record<string, unknown>) ?? {};
  for (const [_slug, channelId] of Object.entries(channelMap)) {
    groups[channelId] = {
      requireMention: options.requireMention ?? false,
      allowFrom: [],
    };
  }
  access.groups = groups;

  mkdirSync(join(homedir(), ".claude", "channels", "discord"), {
    recursive: true,
  });
  writeFileSync(accessFile, JSON.stringify(access, null, 2) + "\n", {
    mode: 0o600,
  });
}

export function createAlias(product: string): { alias: string; command: string } {
  const alias = `claude-${product.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const command = "claude --channels plugin:discord@claude-plugins-official";
  const zshrc = join(homedir(), ".zshrc");

  // Check if alias already exists
  if (existsSync(zshrc)) {
    const content = readFileSync(zshrc, "utf-8");
    if (content.includes(`alias ${alias}=`)) {
      return { alias, command };
    }
  }

  appendFileSync(zshrc, `\nalias ${alias}="${command}"\n`);
  return { alias, command };
}

// ── Summary Generator ──────────────────────────────────────────────────

export function generateSummary(state: OnboardState): string {
  const plane = state.selectedPlane ?? "(not selected)";
  const channels = Object.entries(state.channels)
    .map(([slug, id]) => `  #improve-${slug} → ${id}`)
    .join("\n");
  const alias = `claude-${state.product.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return [
    `# Workstream Onboarding Complete: ${state.product}`,
    "",
    `## Fracture Plane: ${plane}`,
    "",
    "## Workstream Directories",
    `  ${state.productDir}/workstreams/`,
    "",
    "## Discord Channels",
    channels || "  (none registered)",
    "",
    "## Startup",
    `  Run: ${alias}`,
    `  Then send ideas in any #improve-* channel.`,
    "",
    "## Files Written",
    `  ${stateFilePath(state.productDir)}`,
    `  ~/.claude/channels/discord/access.json`,
    `  ~/.claude/channels/discord/.env`,
    `  ~/.zshrc (alias: ${alias})`,
  ].join("\n");
}
