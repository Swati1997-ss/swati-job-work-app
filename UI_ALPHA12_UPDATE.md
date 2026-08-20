# Swati App — UI Alpha 12

## Clean baseline correction

Alpha 12 is based on UI Alpha 11, but removes the forced business concept of:

- Main Purchase / Major Cost
- Extra Cost / Operating Cost

### What changes

Purchases and Expenses still remain separate modules because they are different workflows.

However, the app no longer hard-classifies raw-material purchases as a special “Main Purchase” cost class or all other expenses as “Extra Cost”.

Finance now uses neutral labels:
- Total Purchases
- Total Expenses

The transaction context now stores normal operational categories:
- purchase
- raw_material
- packaging
- machinery
- transportation
- labour
- salary
- electricity
- etc.

### What remains unchanged from Alpha 11

- TON = 1000 kg
- મણ = 20 kg
- Lot removed
- automatic quantity × rate
- Party Advance / Jama ledger
- 10-digit mobile hard limit
- shared company stock + Usage / Consumption
- duplicate page-title cleanup
- expanded Finance setup
- multiple bank accounts
- opening cash
- loan / credit visibility
- Oil + Khol batch scope
- Gujarati / English interface switch

This Alpha is intended to be the new clean baseline after the classification correction.
