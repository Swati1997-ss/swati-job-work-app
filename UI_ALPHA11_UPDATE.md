# Swati App — UI Alpha 11 Consolidation

This Alpha combines the most recent business clarifications before the next testing cycle.

## 1. Main Purchase vs Extra Cost
Main raw-material purchases remain in Purchasing:
- Groundnut
- Grain
- Pulses

Operating / Extra Cost remains in Expenses:
- Electricity
- Labour
- Salary
- Transportation
- Loading
- Unloading
- Cold Storage
- Machinery repair
- Maintenance
- Fuel
- similar costs

## 2. Units
Removed:
- Lot

Added:
- TON = 1000 kg
- મણ = 20 kg

Kept:
- kg
- tin
- bag
- piece

Weight purchases are converted internally to base kg for stock.

## 3. Automatic Purchase Calculation
Quantity × Rate calculates automatically.

## 4. Party Advance / Jama
Purchase payment can exceed the purchase amount.
Extra payment remains as Advance / Jama.
Party Ledger tracks:
- total purchases
- total payments
- payable
- advance

## 5. Mobile Validation
All tel/mobile inputs:
- digits only
- maximum 10 digits
- 11th digit is blocked

## 6. Shared Company Stock
Removed standalone Internal Transfer menu.
Added Usage / Consumption:
- company stock is common
- record where material was used by division/unit
- usage reduces consolidated company stock

## 7. Duplicate Page Titles
Drawer-driven screens use the top app header as the main title and avoid unnecessary repeated page headings.

## 8. Finance
Added:
- Opening cash
- Multiple bank accounts
- Account type
- Bank opening balances
- Liquid money
- Receivables
- Payables
- Estimated stock value
- Main Purchase total
- Extra Cost total
- Loan / credit facilities
- Sanctioned limit
- Used amount
- Available borrowing capacity

Loan/credit availability is kept separate from owned liquid money.

## 9. Batch Scope
Batch is reserved for Oil Mill company production:
One Production Run = one Batch = Oil + Khol.
Unrelated purchases, packaging, expenses, grain/pulse stock etc. are not batch-tracked.

## 10. Interface Language
Added exactly two interface options:
- Gujarati
- English

The switch is only for app interface text.
User-entered business data and customer-facing/generated bills/PDFs remain Gujarati/common business language.
