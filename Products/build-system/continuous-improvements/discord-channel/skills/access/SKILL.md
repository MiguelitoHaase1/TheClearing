---
name: discord:access
description: Manage Discord channel access — add/remove channels, set user filters
trigger: when user asks to configure Discord channel access, add channels, or manage the allowlist
---

# Discord Channel Access Management

Manage which Discord channels Claude Code listens on.

## Configuration File

`~/.claude/channels/discord/access.json`

```json
{
  "allowedChannels": ["CHANNEL_ID_1", "CHANNEL_ID_2"],
  "allowedUsers": [],
  "requireMention": false,
  "textChunkLimit": 2000
}
```

## Commands

### Add a channel
Read the current access.json, add the channel ID to `allowedChannels`, write it back.

### Remove a channel
Read the current access.json, remove the channel ID from `allowedChannels`, write it back.

### List channels
Read and display the current access.json.

### Set user filter
Add/remove Discord user IDs to `allowedUsers`. Empty array = all users in allowed channels.

### Toggle mention requirement
Set `requireMention` to true/false. When true, bot only responds to messages that @mention it.

## How to find a Discord channel ID

1. Enable Developer Mode in Discord (Settings → Advanced → Developer Mode)
2. Right-click the channel → Copy Channel ID

## Notes

- Changes take effect immediately (server re-reads access.json on every message)
- The server only forwards messages from allowedChannels — all other channels are ignored
- This skill edits the JSON file directly; it does NOT talk to the MCP server
