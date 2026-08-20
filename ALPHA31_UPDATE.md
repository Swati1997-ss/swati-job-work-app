# Swati Job Work App — Alpha 31

## PDF Generation & Native File Sharing Fix

Alpha 31 focuses only on the bill PDF/share pipeline.

### Fixed
- Reworked bill-card capture so it uses resolved inline styles instead of copying the whole app stylesheet.
- Avoids unsupported global CSS/backdrop-filter rules that could make PDF generation fail on mobile browsers.
- Waits briefly for Gujarati/system fonts before capturing the bill card.
- Preserves the visible Oil or Grain card layout in the generated PDF.
- Validates that the generated PDF is non-empty before enabling sharing.
- Prepares the PDF in the background when the bill preview opens.
- The **ફાઇલ શેર** button is disabled while the PDF is being prepared, then re-enabled when ready.
- Native Android/iOS file sharing uses a real `.pdf` `File` object and the Web Share API.
- Download is no longer used as an automatic fallback when Share fails.
- If a PDF was not ready on the first tap, the app prepares it and clearly asks for one second tap so browser user-activation is preserved for the native share sheet.

### Preserved
- Alpha 30 UI cleanup
- Operator flow
- Reports layout
- Oil/Grain preview separation
- Existing WhatsApp text-share button
- Existing sync and business logic
