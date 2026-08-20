# Swati App — UI Alpha 18

## Party / Supplier Ledger Upgrade

### Party balance
Each supplier/party now shows:
- Total Purchases
- Total Payments
- Payable
- Advance / Credit
- Running balance

### Previous advance on new purchase
When a party already has an Advance / Credit:
- the purchase screen shows the available advance
- “Use advance in this purchase” is enabled by default
- the amount applied to the purchase is shown
- purchase outstanding reflects the applied advance
- remaining party advance is shown after the purchase

No fake cash payment is created when old advance is consumed.

### Standalone party payment
A supplier can be paid even without creating a new purchase:
- date
- amount
- Cash / Bank-UPI
- optional note

If payment exceeds current payable it automatically becomes party Advance / Credit.

### Running ledger
The purchase screen now shows chronological:
- purchases
- payments
- running Payable / Advance balance

### Party suggestions
Previously used supplier/party names appear as suggestions in the Purchase form.
