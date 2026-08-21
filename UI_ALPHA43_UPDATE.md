# UI Alpha 43 Update

## Oil Mill job-work flow

- Labour is ₹120 for every 15 kg of oil produced. Loose oil is charged proportionally.
- Customer groundnut and produced oil remain customer-owned and never enter company oil stock.
- Oil can be recorded as full 15 kg tins plus loose kilograms.
- Khol records total production, mill purchase, and customer return separately.
- The default is that the mill purchases all khol; partial purchase and full customer return remain available.
- Measurable waste retained by the mill enters a separate company stock ledger.
- Process loss is calculated automatically as input minus oil, total khol, and retained waste; it is analysis only, not stock.
- New mill tins sold to a customer reduce empty-tin stock. Customer-owned tins do not affect company stock.
- Job status supports received, processing, ready, delivered, and settled. No signature step is used.

## Bill and data improvements

- Bill/PDF shows total khol, mill/customer split, retained waste, job status, and delivery date.
- WhatsApp fallback text is shorter and structured around the customer, outputs, settlement, and status.
- Oil Mill Excel export includes khol ownership, waste, loss, status, and delivery columns.
- Older records remain readable and are migrated as fully mill-purchased khol unless newer ownership fields exist.
