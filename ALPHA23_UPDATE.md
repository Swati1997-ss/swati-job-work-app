# Swati Job Work App — Alpha 23

## Device Operator Assignment Fix

Alpha 23 fixes the **Device & Audit → “આ ડિવાઇસ કોનું છે?”** operator-selection issue found in Alpha 22.

### Fixed
- `નિતેશભાઈ`, `દર્શન`, and `હેત` assignment buttons now respond reliably.
- Device setup modal is present in the DOM before `app.js` initializes.
- Operator button clicks use delegated event handling, so dynamically rendered buttons continue to work safely.
- Selected operator continues to be stored in this browser/device via the existing local-storage logic.
- Existing device assignment audit logging is preserved.
- Service-worker cache bumped to `swati-job-work-alpha23-v1` so installed/PWA users receive the fixed JavaScript instead of stale Alpha 22 assets.

### Preserved
- Existing oil job-work workflow
- Grain / pulse cleaning workflow
- Payments and settlement logic
- Batches / stock data
- Reports
- Operators and audit history
- Local-first storage
- Shared Google sync configuration and logic
- Existing PWA/icon assets

No business calculation rules were intentionally changed in Alpha 23.
