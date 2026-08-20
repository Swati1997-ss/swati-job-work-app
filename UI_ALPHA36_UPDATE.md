# Swati App — UI Alpha 36

## Grain/Pulse Sales — Customer-Origin Waste / Reject

### New Waste / Reject history panel
Under:

Grain / Pulse → Sales → Waste / Reject

the app now shows customer-origin bad/excess material that the company purchased during Grain/Pulse Job Work.

### Strict source rule
A row appears only when an existing saved Grain/Pulse Job Work History record has:
- Purchase / leftover enabled
- Purchased quantity greater than 0
- Purchase amount greater than 0

No fake, default, or automatically invented rows are created.

### Shown information
Each qualifying History entry shows:
- Customer
- Date
- Job Work bill number
- Village / Mobile
- Commodity
- Quantity purchased from customer
- Purchase rate
- Purchase amount

The panel also shows:
- Entry count
- Total purchased quantity
- Total purchase value

### Important
This Alpha adds visibility of existing History data inside the Waste / Reject sales view.
It does not duplicate the original History transaction.
