# Swati App — UI Alpha 23

## Complete Grain / Pulse Sales

### Sale Types
Grain/Pulse company sales now supports:
- Processed Goods
- Waste / Reject

### Sale Entry
Each sale records:
- Date
- Customer
- Village
- Mobile
- Item
- Quantity
- Unit
- Rate
- Total
- Paid amount
- Outstanding
- Payment mode
- Notes

### Stock Integration
The selected item shows Available Stock before saving.
A sale cannot exceed available stock.

On save:
- the common Sales ledger is updated
- stock automatically reduces as Sale Out
- receivable/payment values are recorded
- Grain/Pulse stock and company-wide Stock Management refresh

### Customer Visibility
Recent Grain/Pulse sales customers are shown separately inside the Grain/Pulse Sales module.

### Units
Supported:
- kg
- TON = 1000 kg
- Mann = 20 kg
- Bag

Weight units normalize internally to kg.
