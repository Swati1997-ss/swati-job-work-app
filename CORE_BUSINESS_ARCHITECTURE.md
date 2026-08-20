# Swati Company Core Architecture v1

## Company
One combined company / owner.

## Divisions
- Oil Mill
- Grain / Pulse

## Units within each division
- Job Work
- Production / Processing

## Shared business engines
- Purchasing
- Selling
- Expenses
- Stock Ledger
- Internal Transfers
- Cash / Bank Ledger
- Finance Summary

## Principle
A real business event should be entered once and affect all linked areas automatically.

Examples:
- Purchase -> stock + payable
- Production -> raw stock down + finished/by-product stock up
- Sale -> stock down + receivable/payment
- Expense -> expense + cash/bank impact
- Internal transfer -> source stock down + destination stock up

## Goal
Keep daily usage simple while preserving enough structure for owner-level control, consolidated finance, and future reporting.
