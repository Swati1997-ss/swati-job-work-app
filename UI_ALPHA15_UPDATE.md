# Swati App — UI Alpha 15

## Complete Bilingual Interface Pass

Alpha 15 builds on the working language buttons from Alpha 14.

### Interface modes
Settings -> Interface Language:
- ગુજરાતી
- English

The selected mode is saved per operator/device.

### English mode
A broad UI translation engine now translates operator-facing:
- navigation
- page headings
- form labels
- buttons
- helper text
- purchase screens
- expense screens
- finance screens
- stock/usage screens
- customer/report navigation
- settings
- common modal/control text
- common dynamic status labels

### Gujarati mode
Switching back restores the mapped interface wording to Gujarati.

### Business-output rule preserved
The translation engine deliberately skips customer-facing physical print cards / bill output areas.

Therefore:
- user-entered customer/party/business data is not auto-translated
- printed bills/cards/PDF business content remains Gujarati
- only operator-facing app interface changes language

### Notes
Dynamic business data such as names, villages, entered notes, transaction values and generated customer content remain untouched.
