# Swati App — UI Alpha 39

Alpha 39 standardizes export and sharing actions across the app.

## Interface

- Stock Excel and Batch Excel now use an equal-width responsive action row.
- History exports, bill actions and invoice actions use the same mobile-friendly layout.
- Share, WhatsApp, download and print actions have clear visual priority.
- The unused `App પસંદ કરો` action has been removed everywhere.

## File sharing

- Excel exports open a simple two-action panel: share or download.
- PDF bills and invoices are prepared in advance so the native file-share sheet can open from one tap.
- PDF files can be sent through WhatsApp, Mail, Drive and other installed share targets.
- WhatsApp message actions open the saved customer's chat when a valid mobile number is available.
- Separate PDF download and print actions remain available.

## Platform note

Web apps cannot silently attach a file to a specific WhatsApp contact. `PDF શેર કરો` opens the device's secure native share sheet with the PDF attached; the user then selects WhatsApp and the customer. `WhatsApp મેસેજ` opens the saved customer's chat with bill text.
