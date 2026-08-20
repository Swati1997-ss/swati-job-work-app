# Swati App — UI Alpha 32

## Invoice Print / Save PDF blank-page fix

- Fixed Android/Chrome printing a blank invoice.
- Printable invoice is now copied into a temporary top-level DOM container before `window.print()`.
- Print CSS hides the app but keeps that top-level invoice root visible.
- Added a two-frame render delay before opening print preview for mobile Chrome reliability.
- Temporary print DOM is cleaned after printing.
- Existing invoice preview, saved invoices, WhatsApp text and copy-text flows are unchanged.
