# Swati Mini Oil Mill App — Alpha 45

Alpha 45 adds bag/mann/kg groundnut purchase with landed costing, editable purchases and batches, professional tin-plus-loose oil stock, source-wise Khol and tin ledgers, hidden ratio analytics, and Grain/Pulse-only Waste/Reject stock and sales. See `UI_ALPHA45_UPDATE.md`.

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
