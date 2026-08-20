# Swati App — UI Alpha 14

## Focused UI Fix Release

### 1. Pinch Zoom Disabled
- Mobile viewport is locked to 1x scale.
- user-scalable is disabled.
- gesture/pinch fallback prevention is included for mobile Safari/PWA.
- Responsive layout remains responsible for fitting different screen sizes.

### 2. Duplicate Page Titles Fixed
- The top app/page header is the single primary page title.
- Redundant same-name titles inside Home and menu-opened screens are removed.
- Example: Home should no longer show “મુખ્ય” twice.

### 3. Language Control Fixed
Settings now contains two explicit tappable buttons:
- ગુજરાતી
- English

The selected button is visibly highlighted.
Tapping a button immediately applies that interface language and saves it per device/operator.

### 4. Company Core Card Removed
The technical “Company Core / Core v1” card is no longer shown in Settings.
The underlying business-core engine remains internal and unchanged.

### Scope
This Alpha intentionally avoids adding new business modules. It is a clean testing build for the UI issues reported after Alpha 13.
