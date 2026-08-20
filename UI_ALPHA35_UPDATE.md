# Swati App — UI Alpha 35

## Edit Controls & Data Correction Stabilization

### Finance — priority fix
Finance now has working edit/update controls for:
- Opening Cash
- Bank Accounts
- Loan / Credit Facilities

Bank and Loan lists include visible Edit controls.
Forms switch to Update mode and provide Cancel Edit.

### Main operational edit controls
Visible Edit actions were added to:
- Purchases
- Expenses
- Usage / Consumption
- Oil Mill Company Sales
- Retail Sales
- Grain / Pulse Sales
- Staff Master
- Attendance

When edited, the original record is updated instead of creating a duplicate.

### Linked data safety
For core Purchase / Expense / Usage / Sale records, linked stock and money-ledger references are updated as part of the edit so quantity/finance views do not silently retain the old value.

### Existing edit systems
Oil/Grain Job Work and Oil Production/Batch keep their existing edit/history workflow.

### Scope note
Derived values such as Finance totals, Stock balances, Costing totals and Reports are not manually editable because they are calculated from source transactions.
