#!/usr/bin/env bun
/// <reference types="bun-types" />
/**
 * Discord channel for Claude Code — listens on configured channels,
 * forwards messages via MCP notifications, replies via Discord API.
 *
 * Requires:
 *   - DISCORD_BOT_TOKEN environment variable
 *   - Bot added to the Discord server with Message Content Intent enabled
 *
 * State in ~/.claude/channels/discord/access.json, managed by the
 * /discord:access skill.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Client, GatewayIntentBits, TextChannel, Events } from "discord.js";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  renameSync,
} from "fs";
import { homedir } from "os";
import { join } from "path";

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
if (!BOT_TOKEN) {
  process.stderr.write(
    "discord channel: DISCORD_BOT_TOKEN not set.\n" +
      "  Set it in your environment or Claude Code settings.\n"
  );
  process.exit(1);
}

const STATE_DIR =
  process.env.DISCORD_STATE_DIR ??
  join(homedir(), ".claude", "channels", "discord");
const ACCESS_FILE = join(STATE_DIR, "access.json");

// Safety net — keep serving on unhandled errors.
process.on("unhandledRejection", (err) => {
  process.stderr.write(`discord channel: unhandled rejection: ${err}\n`);
});
process.on("uncaughtException", (err) => {
  process.stderr.write(`discord channel: uncaught exception: ${err}\n`);
});

// --- access control -----------------------------------------------------------

type Access = {
  /** Channel IDs (snowflakes) the bot listens on */
  allowedChannels: string[];
  /** User IDs allowed to trigger the bot (empty = all users in allowed channels) */
  allowedUsers: string[];
  /** Whether mentions are required in allowed channels */
  requireMention: boolean;
  /** Max text length per message chunk */
  textChunkLimit: number;
};

function defaultAccess(): Access {
  return {
    allowedChannels: [],
    allowedUsers: [],
    requireMention: false,
    textChunkLimit: 2000,
  };
}

function readAccessFile(): Access {
  try {
    const raw = readFileSync(ACCESS_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<Access>;
    return {
      allowedChannels: parsed.allowedChannels ?? [],
      allowedUsers: parsed.allowedUsers ?? [],
      requireMention: parsed.requireMention ?? false,
      textChunkLimit: Math.min(parsed.textChunkLimit ?? 2000, 2000),
    };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return defaultAccess();
    try {
      renameSync(ACCESS_FILE, `${ACCESS_FILE}.corrupt-${Date.now()}`);
    } catch {}
    process.stderr.write(
      "discord channel: access.json is corrupt, moved aside. Starting fresh.\n"
    );
    return defaultAccess();
  }
}

function saveAccess(a: Access): void {
  mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 });
  const tmp = ACCESS_FILE + ".tmp";
  writeFileSync(tmp, JSON.stringify(a, null, 2) + "\n", { mode: 0o600 });
  renameSync(tmp, ACCESS_FILE);
}

function loadAccess(): Access {
  return readAccessFile();
}

// Ensure access file exists with defaults on first run.
try {
  readFileSync(ACCESS_FILE);
} catch {
  saveAccess(defaultAccess());
}

// --- discord client -----------------------------------------------------------

const discord = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

let botUserId: string | null = null;

// Message history cache for chat_messages tool (last N per channel).
const HISTORY_LIMIT = 100;
const history = new Map<
  string,
  Array<{
    id: string;
    author: string;
    authorId: string;
    content: string;
    timestamp: string;
    attachments: string[];
  }>
>();

function addToHistory(
  channelId: string,
  msg: {
    id: string;
    author: string;
    authorId: string;
    content: string;
    timestamp: string;
    attachments: string[];
  }
): void {
  if (!history.has(channelId)) history.set(channelId, []);
  const buf = history.get(channelId)!;
  buf.push(msg);
  if (buf.length > HISTORY_LIMIT) buf.shift();
}

// --- mcp server ---------------------------------------------------------------

const mcp = new Server(
  { name: "discord", version: "1.0.0" },
  {
    capabilities: {
      tools: {},
      experimental: {
        "claude/channel": {},
      },
    },
    instructions: [
      "The sender reads Discord, not this session. Anything you want them to see must go through the reply tool — your transcript output never reaches their chat.",
      "",
      'Messages from Discord arrive as <channel source="discord" chat_id="CHANNEL_ID" message_id="MSG_ID" user="USERNAME" ts="ISO_TS">. Reply with the reply tool — pass chat_id back.',
      "",
      "Access is managed by editing ~/.claude/channels/discord/access.json. Add channel IDs to allowedChannels to listen on them.",
    ].join("\n"),
  }
);

mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "reply",
      description:
        "Reply on Discord. Pass chat_id (channel ID) from the inbound message.",
      inputSchema: {
        type: "object" as const,
        properties: {
          chat_id: {
            type: "string" as const,
            description: "Discord channel ID from the inbound message",
          },
          text: { type: "string" as const, description: "Message text to send" },
        },
        required: ["chat_id", "text"],
      },
    },
    {
      name: "chat_messages",
      description:
        "Fetch recent messages from a Discord channel. Returns messages from the in-memory buffer (since bot started).",
      inputSchema: {
        type: "object" as const,
        properties: {
          chat_id: {
            type: "string" as const,
            description: "Discord channel ID",
          },
          limit: {
            type: "number" as const,
            description: "Max messages to return (default 20)",
          },
        },
        required: ["chat_id"],
      },
    },
  ],
}));

mcp.setRequestHandler(CallToolRequestSchema, async (req) => {
  const args = (req.params.arguments ?? {}) as Record<string, unknown>;
  try {
    switch (req.params.name) {
      case "reply": {
        const channelId = args.chat_id as string;
        const text = args.text as string;
        const access = loadAccess();

        if (!access.allowedChannels.includes(channelId)) {
          throw new Error(
            `channel ${channelId} is not in allowedChannels — add it to ~/.claude/channels/discord/access.json`
          );
        }

        const channel = await discord.channels.fetch(channelId);
        if (!channel || !(channel instanceof TextChannel)) {
          throw new Error(`channel ${channelId} is not a text channel`);
        }

        // Discord has a 2000 char limit per message.
        const limit = Math.min(access.textChunkLimit, 2000);
        const chunks = chunkText(text, limit);
        let sent = 0;

        for (const c of chunks) {
          await channel.send(c);
          sent++;
        }

        return {
          content: [
            {
              type: "text" as const,
              text: sent === 1 ? "sent" : `sent ${sent} parts`,
            },
          ],
        };
      }
      case "chat_messages": {
        const channelId = args.chat_id as string;
        const limit = (args.limit as number) ?? 20;
        const access = loadAccess();

        if (!access.allowedChannels.includes(channelId)) {
          throw new Error(
            `channel ${channelId} is not in allowedChannels`
          );
        }

        const buf = history.get(channelId) ?? [];
        const msgs = buf.slice(-limit);
        if (msgs.length === 0) {
          return { content: [{ type: "text" as const, text: "(no messages)" }] };
        }

        const out = msgs
          .map((m) => {
            const atts = m.attachments.length
              ? ` +${m.attachments.length}att`
              : "";
            return `[${m.timestamp}] ${m.author}: ${m.content}  (id: ${m.id}${atts})`;
          })
          .join("\n");

        return { content: [{ type: "text" as const, text: out }] };
      }
      default:
        return {
          content: [
            { type: "text" as const, text: `unknown tool: ${req.params.name}` },
          ],
          isError: true,
        };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      content: [
        { type: "text" as const, text: `${req.params.name} failed: ${msg}` },
      ],
      isError: true,
    };
  }
});

// --- message handling ---------------------------------------------------------

function chunkText(text: string, limit: number): string[] {
  if (text.length <= limit) return [text];
  const out: string[] = [];
  let rest = text;
  while (rest.length > limit) {
    const nl = rest.lastIndexOf("\n", limit);
    const sp = rest.lastIndexOf(" ", limit);
    const cut = nl > limit / 2 ? nl : sp > 0 ? sp : limit;
    out.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^\n+/, "");
  }
  if (rest) out.push(rest);
  return out;
}

discord.on(Events.MessageCreate, (message) => {
  // Ignore own messages.
  if (message.author.id === botUserId) return;
  // Ignore bot messages.
  if (message.author.bot) return;

  const access = loadAccess();
  const channelId = message.channelId;

  // Only process messages from allowed channels.
  if (!access.allowedChannels.includes(channelId)) return;

  // User filter (empty = all users).
  if (
    access.allowedUsers.length > 0 &&
    !access.allowedUsers.includes(message.author.id)
  ) {
    return;
  }

  // Mention filter.
  if (access.requireMention && botUserId) {
    const mentioned = message.mentions.users.has(botUserId);
    if (!mentioned) return;
  }

  const content = message.content || "(empty)";
  const attachments = message.attachments.map((a) => a.url);

  // Add to history buffer.
  addToHistory(channelId, {
    id: message.id,
    author: message.author.username,
    authorId: message.author.id,
    content,
    timestamp: message.createdAt.toISOString(),
    attachments,
  });

  // Forward to Claude Code via MCP notification.
  void mcp.notification({
    method: "notifications/claude/channel",
    params: {
      content: attachments.length > 0 ? `${content} [${attachments.length} attachment(s)]` : content,
      meta: {
        chat_id: channelId,
        message_id: message.id,
        user: message.author.username,
        ts: message.createdAt.toISOString(),
      },
    },
  });
});

discord.on(Events.ClientReady, (client) => {
  botUserId = client.user.id;
  const access = loadAccess();
  process.stderr.write(
    `discord channel: connected as ${client.user.tag}\n` +
      `  watching ${access.allowedChannels.length} channel(s)\n`
  );
});

discord.on(Events.Error, (err) => {
  process.stderr.write(`discord channel: client error: ${err}\n`);
});

// --- startup ------------------------------------------------------------------

await mcp.connect(new StdioServerTransport());

// Shutdown on stdin close (Claude Code exits).
let shuttingDown = false;
function shutdown(): void {
  if (shuttingDown) return;
  shuttingDown = true;
  process.stderr.write("discord channel: shutting down\n");
  discord.destroy();
  process.exit(0);
}
process.stdin.on("end", shutdown);
process.stdin.on("close", shutdown);
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Connect to Discord.
await discord.login(BOT_TOKEN);
