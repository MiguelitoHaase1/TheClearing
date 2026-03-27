---
name: discord:configure
description: Check Discord channel setup and review configuration
trigger: when user asks to configure Discord, check setup, or troubleshoot connection
---

# Discord Channel Configuration

## Prerequisites

1. **Discord Bot Token**: Create a bot at https://discord.com/developers/applications
   - New Application → Bot → Reset Token → Copy
   - Enable "Message Content Intent" under Privileged Gateway Intents
   - Set `DISCORD_BOT_TOKEN` in your environment

2. **Add bot to server**: Use OAuth2 URL Generator
   - Scopes: `bot`
   - Permissions: `Send Messages`, `Read Message History`, `View Channels`
   - Visit the generated URL to add bot to your server

3. **Get channel IDs**: Enable Developer Mode in Discord
   - Settings → Advanced → Developer Mode
   - Right-click channel → Copy Channel ID

## Setup Steps

```bash
# 1. Set the bot token
export DISCORD_BOT_TOKEN="your-token-here"

# 2. Add channel IDs to access.json
# Edit ~/.claude/channels/discord/access.json:
# { "allowedChannels": ["CHANNEL_ID"], ... }

# 3. Register as MCP server in Claude Code
claude mcp add discord -- bun run --cwd /path/to/discord-channel --shell=bun --silent start

# 4. Start Claude Code with the channel
claude --channels mcp:discord
```

## Troubleshooting

- **"DISCORD_BOT_TOKEN not set"**: Export the token or add to Claude Code MCP env config
- **Bot connects but no messages**: Check allowedChannels has the right channel IDs
- **"Missing Access" error**: Bot needs Message Content Intent enabled in Discord Developer Portal
- **Bot doesn't respond**: Check requireMention setting; if true, you must @mention the bot

## Diagnostics

Read and display:
- `~/.claude/channels/discord/access.json` (current config)
- Whether DISCORD_BOT_TOKEN is set (don't show the value)
- Bot connection status (check stderr logs)
