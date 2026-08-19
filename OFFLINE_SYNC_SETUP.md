# Alpha 18 — Offline-first + Google backup bridge

## What already works without internet
- All job-work entries, customers, payments, stock, batches, reports and audit data continue to save in the browser on that device.
- Every important local data change creates/updates a pending sync item.
- The Settings → Offline & Sync panel shows Internet status, Pending Sync and Last Sync.
- A Local Snapshot can be downloaded at any time.

## Google backup bridge (optional at this Alpha)
1. Use the dedicated company Google account.
2. Open Google Apps Script and create a new project.
3. Paste the contents of `google-apps-script.gs`.
4. Deploy → New deployment → Web app.
5. Execute as: Me (company account).
6. Choose access appropriate for the company test and copy the Web App URL.
7. In `sync-config.js`, set `enabled: true` and paste the URL into `endpointUrl`.
8. Reopen the app. When online, pending local changes can sync automatically and by `Sync Now`.

Alpha 18 stores a latest backup file per device. It does NOT yet merge all three devices into one live master copy. That merge/conflict layer is the next synchronization stage.
