---
layout: default
title: ⏯️ Playback Control
parent: 🚀 Features
nav_order: 2
---

# ⏯️ Playback Control
{: .no_toc }

Control MusicBee playback directly from VS Code with intuitive playback buttons and commands.

---

<!-- markdownlint-disable-next-line MD022 -->
## Table of Contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Overview

Playback Control allows you to manage music playback without switching away from your editor. Control playback using buttons in the Now Playing View, VS Code commands, or keyboard shortcuts.

---

## Available Controls

### Play / Pause
Toggles between playing and pausing the current track.

- **Button**: ⏯️ Play/Pause button in the Now Playing View
- **Command**: `musicBeeRemote.playPause`
- **Keyboard Shortcut**: Can be configured in VS Code keyboard settings

### Previous Track
Skips to the previous track in the playlist.

- **Button**: ⏮️ Previous button in the Now Playing View
- **Command**: `musicBeeRemote.previous`
- **Keyboard Shortcut**: Can be configured in VS Code keyboard settings

### Next Track
Skips to the next track in the playlist.

- **Button**: ⏭️ Next button in the Now Playing View
- **Command**: `musicBeeRemote.next`
- **Keyboard Shortcut**: Can be configured in VS Code keyboard settings

---

## Using Commands

You can invoke playback controls using VS Code's Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

1. Open the Command Palette
2. Search for one of the commands below:
   - `MusicBee Remote: Play/Pause`
   - `MusicBee Remote: Next Track`
   - `MusicBee Remote: Previous Track`

---

## Keyboard Shortcuts

To set up custom keyboard shortcuts:

1. Open VS Code Keyboard Shortcuts (`Ctrl+K Ctrl+S` / `Cmd+K Cmd+S`)
2. Search for "musicBeeRemote"
3. Assign your preferred key combinations

**Example keybindings** (add to `keybindings.json`):

```json
[
  {
    "key": "alt+p",
    "command": "musicBeeRemote.playPause"
  },
  {
    "key": "alt+n",
    "command": "musicBeeRemote.next"
  },
  {
    "key": "alt+b",
    "command": "musicBeeRemote.previous"
  }
]
```

---

## Connection & Status

### Connecting to MusicBee
Playback control requires an active connection to your MusicBee instance.

- **Command**: `MusicBee Remote: Connect`
- **Automatic**: Connection is established automatically on extension startup if configured

### Disconnecting
Close the connection to MusicBee.

- **Command**: `MusicBee Remote: Disconnect`

### Refreshing Connection
Force a refresh of the connection status.

- **Command**: `MusicBee Remote: Refresh`

---

## Requirements

- ✅ MusicBee application running on your system
- ✅ MusicBee Remote Plugin installed and enabled
- ✅ Extension configured with correct host and port settings

---

## Troubleshooting

**Playback controls not responding?**
- Check that MusicBee is running and music is loaded
- Verify your connection using `MusicBee Remote: Connect`
- Try `MusicBee Remote: Refresh` to reset the connection
- Check your firewall settings

**Command not found?**
- Ensure the extension is properly installed
- Restart VS Code
- Check the Output panel for error messages
