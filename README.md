# Swati Mini Oil Mill App — Alpha 43

Alpha 43 applies the confirmed Oil Mill job-work ownership flow: ₹120 per 15 kg oil output, proportional loose-oil charge, customer-owned oil, khol purchase/return split, mill-retained waste stock, automatic process loss, delivery status, and clearer bill/WhatsApp summaries. See `UI_ALPHA43_UPDATE.md`.

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
