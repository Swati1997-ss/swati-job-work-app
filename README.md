# Swati Mini Oil Mill App — Alpha 48

Alpha 48 improves the mobile header and Gujarati home, adds staff જમા–ઉધાર and Finance Assets, adds graphical views to every report, compacts Finance/Settings, replaces Customers with Purchase in the bottom bar, and runs shared Sync & Pull every two minutes. See `UI_ALPHA48_UPDATE.md`.

## Added
- Installable PWA manifest and app icons
- Stronger offline app-shell cache
- The unused Install App card is removed from Settings
- Shared Sync configuration can be saved inside each device instead of putting the private key in source files
- Existing Google Apps Script endpoint remains compatible
- Local-first data and Sync & Merge / Pull Latest remain unchanged

## Important
PWA installation and service workers require the app to be served over HTTPS (or localhost during development). Opening `index.html` directly with `file://` is still useful for local testing, but it cannot behave as a fully installed PWA.

The private workspace key should only be entered on trusted operator devices and should not be shared in screenshots/messages.
