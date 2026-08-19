# Alpha 21 — PWA installability fix

This build keeps the Alpha 20 business and sync logic unchanged and fixes the hosted PWA asset paths for the GitHub repository layout where icon files are stored in the repository root.

Changes:
- Manifest icon paths point to root-level icon PNG files.
- Apple touch icon points to the root-level 192px icon.
- Service worker cache paths point to root-level icons.
- Service worker cache version bumped to Alpha 21 so stale Alpha 20 assets are replaced.

After uploading these files to GitHub Pages, wait for deployment, then clear site data / remove any old home-screen shortcut and reopen the live HTTPS site before testing Install app again.
