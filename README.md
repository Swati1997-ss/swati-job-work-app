# Swati Mini Oil Mill App — Alpha 38

Alpha 38 keeps all Alpha 37 reliability fixes and introduces a cleaner, more compact interface. See `UI_ALPHA38_UPDATE.md` for the UI-copy changes and `UI_ALPHA37_UPDATE.md` for the repaired stock, finance, backup, sync, reporting and migration behavior.

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
