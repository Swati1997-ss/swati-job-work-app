# Swati Job Work App — Alpha 19 Shared Sync Setup

This connects all three mobiles to one company-owned Google Drive master copy while preserving offline/local work.

## Important safety
- Do NOT share the Gmail password, OTP, recovery code, or 2FA code with anyone.
- Use the dedicated company Google account only to own the Apps Script and Drive files.
- Alpha 19 uses a workspace key. It is suitable for controlled testing with 3 known devices, not a public internet app.

## Step 1 — Create Apps Script
1. Sign in to the dedicated company Google account.
2. Open script.google.com and create a New project.
3. Name it: `Swati Job Work Sync`.
4. Replace the default code with the full content of `google-apps-script.gs` from this folder.
5. In the first lines, replace `CHANGE_THIS_TO_A_LONG_RANDOM_SECRET` with a long random key (30+ characters).
6. Set Project Settings → Time zone → `(GMT+05:30) India Standard Time`.

## Step 2 — Deploy as Web App
1. Click Deploy → New deployment.
2. Select type: Web app.
3. Execute as: Me.
4. Who has access: Anyone (required because operators are not using the company Google login).
5. Deploy and approve Google permissions.
6. Copy the Web app URL. It should end in `/exec`.

## Step 3 — Configure the app
Open `sync-config.js` and set:

```js
window.SWATI_SYNC_CONFIG = {
  enabled: true,
  endpointUrl: 'PASTE_THE_WEB_APP_EXEC_URL_HERE',
  workspaceCode: 'swati-main',
  workspaceKey: 'PASTE_THE_SAME_LONG_RANDOM_SECRET_HERE',
  autoSync: true,
  autoSyncDelayMs: 3000
};
```

Use the same configured app files on all 3 mobiles.

## Step 4 — First-device master upload
On the device that currently has the most complete/test data:
1. Open Settings → Offline & Shared Sync.
2. Confirm Internet = Online and Shared Target = Google master configured.
3. Tap `Sync & Merge`.
4. After success, Google Drive will contain:
   - `Swati Job Work App/swati-master.json`
   - `Swati Job Work App/Daily Backups/swati-backup-YYYY-MM-DD.json`

## Step 5 — Second and third devices
1. Open the configured app.
2. Set/confirm the correct device operator.
3. Tap `Pull Latest` once.
4. The master transactions should appear.
5. Create one small test record and tap `Sync & Merge`.
6. On another device, tap `Pull Latest` and confirm that record appears.

## Conflict behavior in Alpha 19
- Different transaction IDs: both survive.
- Different payment IDs on the same transaction: payments are unioned, so one payment should not overwrite the other.
- Same transaction edited on two devices: the version with the latest `updatedAt` wins for normal fields.
- Audit entries are combined by unique ID.
- Settings/operators are treated as master-authoritative after the first master is created.

## Before real production use
We should add app-level operator PIN/login and stronger request authentication. Do not expose the configured app folder publicly.
