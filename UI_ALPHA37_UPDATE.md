# Swati App — UI Alpha 37

## Data Integrity & Reliability Stabilization

This build repairs the cross-module correctness defects found in the Alpha 36 audit.

### Corrected
- Purchases, sales and usage are counted exactly once in stock.
- Sale quantities use a normalized base quantity and immediately reduce available stock.
- Cash/Bank receives sale payments and includes Job Work payment direction.
- Oil company purchases, production and sales post into the shared core on every new entry.
- Older Oil production movement names are normalized and old zero-quantity sale movements are repaired.
- Owner receivables/payables include Oil and Grain/Pulse Job Work balances.
- Loan used/outstanding is treated as a liability in Net Working Position.
- Purchase edits preserve supplier advances and payment mode.
- Transport/loading/unloading costs remain linked and update with their purchase.
- Produced-goods costing includes raw-material value plus batch-linked processing expenses.
- Reports navigation and quick date filters no longer call obsolete duplicate handlers.
- Backup/restore and Shared Sync include every current business dataset.
- Sync tombstones prevent deleted Job Work records and batches from reappearing.
- PWA cache/build identity is Alpha 37 and a favicon is supplied.

### Deployment requirement
Replace the Apps Script with the included Alpha 37 `google-apps-script.gs` and redeploy it before relying on multi-device sync. Existing Alpha 19 server code cannot merge the expanded dataset.

