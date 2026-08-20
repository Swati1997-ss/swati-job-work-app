# Swati Job Work App — UI Alpha 4

## Fresh Testing Data Reset

This release creates a clean local testing state on each device/browser the first time UI Alpha 4 opens.

### Cleared once
- All Oil / Grain transactions and bills
- Derived customer history (customers will therefore start empty)
- Batches / stock history generated from old transactions
- Audit history
- Pending sync queue
- Previous sync timestamps / master timestamp

### Preserved
- App settings and rates
- Operators: નિતેશભાઈ, દર્શન, હેત (or the operator list already saved)
- Current device operator assignment
- Device ID
- Existing shared-sync endpoint / workspace credentials

### Sync safety
Auto Sync is paused on first Alpha 4 launch so old Google master data cannot immediately refill the clean test device.

Before using Shared Sync again for the fresh test dataset, the existing cloud/master dataset should also be reset or moved to a new clean workspace. Otherwise Pull Latest / Sync may bring old records back.

### One-time behavior
The reset runs only once per device for UI Alpha 4. New test records created afterward are not automatically deleted.
