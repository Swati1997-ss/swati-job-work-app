# Swati App — UI Alpha 7

## Core Business Architecture Foundation

This is intentionally a foundation release rather than a large UI release.

### Common company-wide engines added
- Purchase
- Sale
- Expense
- Stock Movement
- Internal Transfer
- Cash Ledger
- Bank Ledger
- Finance Summary

### Transaction classification
Every future business transaction can carry:
- Division: Oil Mill / Grain-Pulse
- Unit: Job Work / Production-Processing
- Activity
- Cost Center
- Source Module
- Operator

### Internal Transfer
Materials can move between units without being treated as an external purchase or sale.

Example:
Oil Production empty tins -> Oil Job Work

The system records:
- Transfer Out from source
- Transfer In to destination

### Stock ledger rule
Opening
+ Purchase In
+ Production Output
+ Transfer In
+ Adjustment In
- Production Consumption
- Sale Out
- Transfer Out
- Adjustment Out
= Available Stock

### Existing Alpha 5/6 company data
A one-time migration bridge maps existing:
- raw groundnut purchases
- company oil production batches
- company oil sales

into the new common ledgers for future consolidated reports.

Existing visible screens and existing records remain available.

### Next
With this core in place, upcoming Alphas can add proper common screens for:
Purchases, Expenses, Internal Transfers, Finance, Grain Production, Staff/Attendance, and consolidated company reports.
