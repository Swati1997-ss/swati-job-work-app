# Swati Mini Oil Mill App — Alpha 29

## File Share reliability fix

- Bill PDF is pre-generated while preview is open, so Share can run directly from the user tap.
- Native Android/iOS file Share is attempted without relying only on canShare().
- Share no longer silently downloads a file when sharing fails.
- If direct Share fails, the prepared-file popup remains available for an explicit second Share attempt or Download.
- Alpha 29 asset/cache versioning prevents stale Alpha 28 JavaScript from being reused.
