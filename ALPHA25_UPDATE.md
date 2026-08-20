# Alpha 25 — Stable Reset

This release intentionally returns the application to the Alpha 22 functional baseline.

## Purpose
- Remove the unsuccessful combined Alpha 24 feature set.
- Restore the known Alpha 22 application behavior and UI.
- Restart development using one feature/fix per Alpha and verify each release before continuing.

## Functional changes
None. The application source is the Alpha 22 baseline.

## Technical-only change
The service-worker cache name is bumped to `swati-job-work-alpha25-stable-reset-v1` so devices that previously loaded Alpha 24 receive the restored files instead of stale cached assets.

## Development workflow from here
Latest verified Alpha -> one controlled change -> ZIP -> deploy -> device test -> accept/reject -> next Alpha.
