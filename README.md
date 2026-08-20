# Swati Mini Oil Mill App — Alpha 41

Alpha 41 focuses the operator home, connects every Groundnut Oil sale to Processing Unit stock, adds a practical Price & Profit planner, and turns Reports into a visual business-analysis screen. See `UI_ALPHA41_UPDATE.md`.

## Added
- Installable PWA manifest and app icons
- Stronger offline app-shell cache
- Android/iPhone install guidance inside Settings
- Shared Sync configuration can be saved inside each device instead of putting the private key in source files
- Existing Google Apps Script endpoint remains compatible
- Local-first data and Sync & Merge / Pull Latest remain unchanged

## Important
PWA installation and service workers require the app to be served over HTTPS (or localhost during development). Opening `index.html` directly with `file://` is still useful for local testing, but it cannot behave as a fully installed PWA.

The private workspace key should only be entered on trusted operator devices and should not be shared in screenshots/messages.
