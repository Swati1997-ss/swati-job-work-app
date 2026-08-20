# Swati App — UI Alpha 10

## Internal Transfer
Added company-internal stock transfer between:
- Oil Mill Job Work
- Oil Mill Production
- Grain/Pulse Job Work
- Grain/Pulse Production

Transfer creates:
- stock out from source unit
- stock in to destination unit
- no external sale/purchase

Source-stock validation prevents transferring more than available quantity.

## Owner Finance Snapshot
Added owner-level finance screen showing:
- Cash Balance
- Bank Balance
- Receivable
- Payable
- Total Sales
- Total Purchases
- Total Expenses
- Net Operating Flow
- Liquid Money
- Stock Movement Snapshot

Job-work receivable/payable is combined with core purchase/sale outstanding for owner visibility.

Note:
Stock value in rupees is not yet calculated in Alpha 10; this screen currently shows quantity-level stock snapshot. Inventory valuation will come after costing rules are finalized.
