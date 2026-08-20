# Swati Job Work App — Alpha 24 Combined Release

Alpha 24 combines the requested mobile, file, PDF, sync, security and PWA improvements into one release.

## Included
- Mobile-friendly Reports layout with card-style tables on small screens.
- Oil and Grain print/PDF paths separated so both bills are not printed together.
- One-page Gujarati PDF file generation for Oil and Grain bills.
- Native file sharing for PDF/Excel/backup files (Android/iOS where Web Share file support is available), with download fallback.
- Dedicated WhatsApp bill-summary sharing.
- Real `.xlsx` generation for the buttons previously labelled Excel (no external library required).
- File-ready popup with Open, Share and Download choices after export.
- Top-position polished notifications for save/sync/export/error/warning states.
- Sync-aware deletion tombstones so deletions can propagate to other devices after sync.
- Delete authorization using a user-set Admin Delete PIN stored as PBKDF2-SHA256 verifier instead of plain text.
- Delete audit metadata (operator/device/time) retained.
- Local data status: record count, last local save time and approximate local storage size.
- Local Backup and Local Snapshot now show a clear filename/action popup.
- PWA improvements for standalone installed-app behavior on Android and iOS.
- New v3 icon filenames to reduce stale installed-icon caching.
- Service-worker cache bumped to `swati-job-work-alpha24-v1`.

## Important shared-sync change
Deletion sync requires the Alpha 24 `google-apps-script.gs` code to be deployed as a new version of the existing Apps Script Web App. Keep the real existing WORKSPACE_KEY when updating the Apps Script deployment; the repository file intentionally contains a placeholder.

## Platform behavior
Android and iOS use the same core app/data flow. Install and file-opening dialogs are controlled by each OS/browser, so Alpha 24 uses native share/open APIs when available and safe fallbacks when the platform does not allow direct app launching.
