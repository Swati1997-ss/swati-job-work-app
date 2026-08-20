# Swati App — UI Alpha 27

## Invoice / Billing

### Unified bill source
Invoices can be created from saved:
- Oil Mill Job Work
- Grain / Pulse Job Work
- Oil Mill Company Sales
- Grain / Pulse Company Sales
- Retail Sales

### Invoice snapshot
When a bill is created, the invoice stores:
- Invoice number
- Date
- Customer
- Village
- Mobile
- Business source
- Item lines
- Total
- Paid
- Outstanding
- Notes

Existing source transactions are not duplicated or modified.

### Invoice numbering
Format:
INV-YYYY-0001

### Customer-facing output
Invoice preview is Gujarati/common business language and includes:
- Swati Mini Oil Mill branding
- Customer details
- Item table
- Total / Paid / Outstanding
- Notes

### Print / PDF
The app uses the browser's reliable Print flow.
The user can choose Save as PDF from the browser/system print dialog.

### WhatsApp
WhatsApp sharing is text-only.
No unreliable browser PDF attachment control is reintroduced.

### Saved invoices
Invoices can be reopened later for:
- Print / Save PDF
- WhatsApp text
- Copy bill text
