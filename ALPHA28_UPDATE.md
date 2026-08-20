# Swati Job Work App — Alpha 28

## Share controls + stale-cache recovery

Alpha 28 keeps the Alpha 27 bill sharing controls and fixes the situation where an older Alpha 26 page can remain visible after deployment.

### Included
- Oil bill preview: PDF file, File Share and WhatsApp controls.
- Grain/Pulse bill preview: PDF file, File Share and WhatsApp controls.
- Versioned CSS/JS/manifest asset URLs (`?v=alpha28`) to bypass stale browser/PWA assets.
- Service-worker cache bumped to `swati-job-work-alpha28-v1`.
- Same-origin app assets use network-first refresh while online, with cached fallback for offline use.

### Preserved
- Alpha 26 operator assignment fix.
- Alpha 26 report mobile layout fix.
- Alpha 26 Oil/Grain print separation.
- Alpha 27 PDF/file-sharing logic.

No business calculations were intentionally changed.
