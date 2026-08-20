# Swati App — UI Alpha 13

## 1. Grain / Pulse Drawer Structure
The Grain / Pulse menu now matches the Oil Mill navigation pattern.

Submenu:
- Job Work
- Company Processing / Production
- Sales
- Stock

The Grain/Pulse business logic remains separate from Oil Mill rules.

## 2. In-App Back Navigation
The app now keeps an internal screen history.

Example:
Screen 1 -> Screen 2 -> Screen 3 -> Screen 4

Back:
4 -> 3 -> 2 -> 1 -> Home

The PWA/browser Back button is intercepted while app navigation history exists, so it does not immediately close/exit the app.

## 3. Gujarati / English Interface
The interface language selector now works as a distinct mode:
- Gujarati mode -> operator-facing interface text in Gujarati
- English mode -> operator-facing interface text in English

The selection is persisted per operator/device where possible.

Business data and customer-facing/generated outputs remain in Gujarati/common business language.

## 4. Grain Screens
Added dedicated Grain/Pulse shells for:
- Company Processing
- Sales
- Stock

The stock view reads from the common company stock ledger while filtering Grain/Pulse items.

Note:
Detailed Grain/Pulse sales-entry logic is still reserved for a later functional Alpha; Alpha 13 establishes correct navigation and module separation first.
