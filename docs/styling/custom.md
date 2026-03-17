---
layout: default
title: "🎨 Custom Themes"
nav_order: 4
parent: "🎨 Styling"
---

<!-- markdownlint-disable-next-line MD025 MD022 -->
# Custom Themes
{: .no_toc }

<!-- markdownlint-disable-next-line MD022 -->
## Table of Contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Creating Custom Themes

To create a custom theme for the MusicBee Remote extension, you need to define a set of colors and styles in a JSON file. This file will specify the appearance of various UI elements in the extension.

### Steps to Create a Custom Theme

1. **Create a JSON File**: Start by creating a new JSON file in your workspace.
2. **Define Colors and Styles**: Specify the colors and styles for different UI components. For example:

   ```json
   {
     "background": "#1e1e1e",
     "foreground": "#d4d4d4",
     "button": {
       "background": "#007acc",
       "foreground": "#ffffff"
     }
   }
   ```

3. **Save and Apply**: Save the JSON file and apply it through the MusicBee Remote extension settings.

By following these steps, you can fully customize the look and feel of the MusicBee Remote extension to match your personal aesthetic or your existing Visual Studio Code theme.
