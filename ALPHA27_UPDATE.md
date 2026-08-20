# Swati Mini Oil Mill App — Alpha 27

Focused follow-up on Alpha 26.

## Included
- Keeps Alpha 26 operator-selection, mobile Reports, and oil/grain print isolation fixes.
- Restores bill sharing controls for Oil and Grain previews.
- Adds PDF file generation from the same visible card layout instead of a separate simplified receipt template.
- Adds native file-share attempt for PDF/Excel with Android/iOS share sheet when the browser supports file sharing.
- Adds dedicated WhatsApp text share for bills.
- Converts CSV exports to real `.xlsx` files and presents Open/Share/Download actions.
- Adds safe fallback to download when the current browser cannot share a generated file directly.
- Adds automatic service-worker update check/reload behavior.

## Platform note
Browsers cannot force an arbitrary generated file directly into WhatsApp/Excel on every Android/iOS browser. Alpha 27 uses the native OS share sheet when supported and falls back safely when not supported. Installed PWA / Chrome / Safari should be preferred for testing.
