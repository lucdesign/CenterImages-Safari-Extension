# CenterImages — Safari Extension

**The best way to view images in Safari.**

CenterImages enhances Safari's handling of direct image URLs (JPG, PNG, GIF, TIFF, SVG). Instead of a plain image on a white background, you get a centered, styled viewer with contrast enhancement and adjustable background color.

## Features

- **Image centering** — images are centered on a configurable background
- **Fit to screen** — toggle between original size and window-fit
- **Auto levels** — automatic contrast enhancement via per-channel histogram analysis and LUT-based color correction
- **Background color** — drag up/down on the background to adjust brightness, or use the popup slider
- **Auto background color** — automatically samples the image border colors for a matching background
- **Help window** — inline usage instructions

## Installation (Developer Mode)

CenterImages 7 is a Safari Web Extension. Until it is distributed via the App Store, it runs in developer mode:

1. Download or clone this repository
2. Open Safari → Settings → Advanced → enable **"Show features for web developers"**
3. Open Safari → Develop → **"Allow unsigned extensions"**
4. Open Safari → Settings → Extensions → **"Add temporary extension..."**
5. Select the repository folder
6. Enable CenterImages in the extensions list and allow access to all websites

The extension resets on Safari restart — repeat steps 3–6 after each restart until a signed version is available.

## Usage

Open any direct image URL in Safari (a URL ending in .jpg, .png, .gif, .tiff, or .svg).

| Action | Effect |
|---|---|
| Click on image | Toggle original size / fit to window |
| Drag up/down on background | Adjust background brightness |
| Double-click on background | Toggle contrast enhancement (if image is low-contrast) |
| Popup → slider | Adjust background brightness |
| Popup → auto | Match background to image border color |
| Popup → Fit Screen | Toggle zoom |
| Popup → Enhance Contrast | Toggle auto levels |

## Technical Notes

### Safari Web Extension Migration (v6 → v7)

Version 7 is a complete rewrite of the extension wrapper. The original (2012) used Apple's proprietary `.safariextension` bundle format with the `safari.*` API, which Apple discontinued in 2021. Version 7 migrates to the standard WebExtension API (`browser.*`), compatible with Safari 14+.

**Key findings during migration:**

- `browser.tabs.sendMessage()` from a popup context to a content script is **silently broken** in Safari — messages are sent without error but never received
- The only reliable popup → content script channel is a **persistent port** (`browser.runtime.connect`) established by the content script and kept alive for the page lifetime
- `browser.storage.local` works correctly in both content scripts and popups and is used for settings persistence and live UI sync

### Architecture

```
popup (toolbar.js)
    ↓ browser.runtime.sendMessage
background (global.js)
    ↓ port.postMessage (persistent port)
content script (injected.js)
    ↓ browser.runtime.sendMessage / browser.storage.local
background → popup
```

## Version History

- **7.0.0** (2026) — Full migration to Safari Web Extension API, modern popup UI, dark mode support
- **6.0.4** (2012–2014) — Last release of the original `.safariextension` format

## License

© 2026 lucdesign — [luc.at](http://www.luc.at)
