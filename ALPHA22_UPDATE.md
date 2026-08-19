# Alpha 22 — Versioned App Icon Refresh

This build changes the PWA icon asset filenames so browsers cannot keep reusing the previous cached icon files.

New icon assets:
- swati-icon-v2-192.png
- swati-icon-v2-512.png
- swati-icon-maskable-v2-192.png
- swati-icon-maskable-v2-512.png

Also updated:
- manifest.webmanifest icon paths
- index.html Apple touch icon
- service worker cache name and cached icon paths

The shared sync endpoint remains configured, but the private Workspace Key is not hardcoded.
