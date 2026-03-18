---
layout: default
title: 📺 Now Playing View
parent: 🚀 Features
nav_order: 1
---

# 📺 Now Playing View
{: .no_toc }

The Now Playing View displays the currently playing track from MusicBee with rich metadata and album art.

---

<!-- markdownlint-disable-next-line MD022 -->
## Table of Contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Overview

The Now Playing View is a sidebar view that shows real-time information about the track currently playing in MusicBee. It updates automatically as the playlist progresses and provides quick access to essential playback controls.

---

## Features

### Album Art Display
- **Full album artwork** displayed prominently
- **Automatic updates** when the track changes
- **Fallback handling** for tracks without artwork

### Track Information
The view displays comprehensive track metadata:
- **Track Title** - Name of the current song
- **Artist** - Performing artist
- **Album** - Album name
- **Year** - Release year (when available)
- **Duration** - Total track length and current playback position
- **Progress Bar** - Visual indicator of playback progress

### Quick Controls
Access playback controls directly from the Now Playing View:
- ⏮️ **Previous** - Skip to the previous track
- ⏯️ **Play/Pause** - Toggle playback
- ⏭️ **Next** - Skip to the next track
- 🔁 **Repeat** - Toggle repeat mode
- 🔀 **Shuffle** - Cycle shuffle mode (off, on, Auto DJ)
- 📋 **Playlist Toggle** - Toggle the playlist control state indicator
- 🔊 **Volume** - Quick access to volume control
- ⭐ **Rating** - View and adjust track rating from the album-art overlay
- ❤️ **Favorite** - Mark track as favorite from the album-art overlay
- ⭐ **Mini View Rating** - Hover the mini rating star to expand to 5 stars; mini action buttons hide while rating and return when you mouse out or click a rating

---

## Appearance Customization

The Now Playing View supports multiple themes to match your preferences. See [Themes](../styling/themes.md) for available options.

**Popular Themes:**
- Material
- Dracula
- Cyberpunk 2077
- Matrix
- Grayscale
- And many more...

---

## Getting Started

1. Open the MusicBee Remote extension sidebar (look for the music note icon)
2. Ensure you're connected to your MusicBee instance
3. Start playing music in MusicBee
4. The Now Playing View will display automatically

---

## Tips & Tricks

- **Mini View Mode**: For a compact display, you can minimize the view height to show just the essential controls
- **Theme Switching**: Easily switch between themes through the extension settings to match your VS Code theme
- **Auto-Update**: The view refreshes automatically as you control playback from other applications

---

## Troubleshooting

**View not updating?**
- Verify your MusicBee connection is active
- Check that the MusicBee Remote Plugin is enabled
- Try clicking the Refresh button

**Album art not showing?**
- Ensure the track has embedded artwork
- Try a different track
- Check your MusicBee library metadata
