# MusicBee Remote

A Visual Studio Code extension to control MusicBee remotely.

## Table of Contents

- [Installation](#installation)
- [Documentation](https://camalot.github.io/vscode-musicbee-remote/)
- [Requirements](#requirements)
- [Features](#features)
- [Extension Settings](#extension-settings)
- [Credits](#credits)

![Now Playing View](https://raw.githubusercontent.com/camalot/vscode-musicbee-remote/develop/docs/assets/images/themes/nowplaying-theme-default.png)
![Now Playing Mini View](https://raw.githubusercontent.com/camalot/vscode-musicbee-remote/develop/docs/assets/images/themes/nowplaying-theme-default-mini.png)
![Now Playing Dracula View](https://raw.githubusercontent.com/camalot/vscode-musicbee-remote/develop/docs/assets/images/themes/nowplaying-theme-dracula.png)

---

## Installation

<!-- markdownlint-disable MD041 -->
### From Visual Studio Code Marketplace

1. Open Visual Studio Code
2. Go to the Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for **"MusicBee Remote"**
4. Click **Install**

[→ Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=darthminos.musicbee-remote)

### From Open VSX Registry

For editors that use the Open VSX Registry (e.g., Cursor, VSCodium):

1. Open your editor
2. Go to the Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for **"MusicBee Remote"**
4. Click **Install**

[→ Open VSX Registry](https://open-vsx.org/extension/darthminos/musicbee-remote)

### From Command Line

Choose the command based on your editor

``` shell
code --install-extension darthminos.musicbee-remote
```

``` shell
cursor --install-extension darthminos.musicbee-remote
```

``` shell
codium --install-extension darthminos.musicbee-remote
```

``` shell
antigravity --install-extension darthminos.musicbee-remote
```

``` shell
kiro --install-extension darthminos.musicbee-remote
```

``` shell
windsurf --install-extension darthminos.musicbee-remote
```

---

## Requirements

- [MusicBee](https://getmusicbee.com/) installed on your system
- [MusicBee Remote](https://getmusicbee.com/addons/plugins/75/musicbee-remote-plugin/) API enabled

---

## Features

- View the currently playing track
- Control playback (play, pause, next, previous)
- Toggle repeat mode
- Toggle shuffle mode (off, on, Auto DJ)
- Toggle playlist panel indicator
- Mute and unmute audio
- Adjust volume
- View and set track rating
- Mark tracks as favorite
- In mini view, hover the rating star to expand all 5 stars; mini action buttons slide out while rating and return on mouse-out or rating click
- Display album art and track information
- Independent theme support
- Built-in themes including Ubuntu, Gogh, Dracula, Breeze, Hotdog, Grayscale, Cyberpunk2077, Tron, Matrix, Fairy Floss Dark, Grass, Harper, Horizon Bright, Horizon Dark, and Material

---

## Extension Settings

If you do not use the default host and port, you can configure them in your VS Code settings:

- `musicBeeRemote.host`: The host address of the MusicBee Remote API.
- `musicBeeRemote.port`: The port of the MusicBee Remote API.
- `musicBeeRemote.clientName`: The name of the client connecting to the MusicBee Remote API.
- `musicBeeRemote.theme`: The theme to use for the MusicBee Remote view.

---

## Credits

- [MusicBee](https://getmusicbee.com/) by [Steven Mayall](https://getmusicbee.com/)
- [MusicBeeRemote/mbrc-plugin](https://github.com/musicbeeremote/mbrc-plugin) by [Konstantinos Paparas (kelsos)](https://github.com/kelsos)
- [MusicBeeRemote/mbrc](https://github.com/musicbeeremote/mbrc) by [Konstantinos Paparas (kelsos)](https://github.com/kelsos)
- MusicBee [icon](https://icons8.com/icon/79908/musicbee) by [Icons8](https://icons8.com)

---

<!-- markdownlint-disable MD041 MD033 -->
<a href="https://github.com/camalot/vscode-musicbee-remote/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=camalot/vscode-musicbee-remote" alt="Contributors: Made with contrib.rocks" class="mt-4" />
</a>

Made with [contrib.rocks](https://contrib.rocks).

---

<!-- markdownlint-disable MD036 -->

**Made with ❤️ for the Visual Studio Code community**

<!-- markdownlint-enable MD036 -->
