# Swati App — UI Alpha 21

## Company-Wide Stock Management Upgrade

### New Stock Management module
Added a dedicated company-wide stock screen showing each item with:

- Opening Stock
- Purchase In
- Production In
- Adjustment In
- Production Consumption
- Sale Out
- Usage / Consumption
- Adjustment Out
- Available Stock

Formula:

Opening + Purchase + Production Output + Adjustment In
− Production Consumption − Sale − Usage − Adjustment Out
= Available Stock

### Opening / Adjustment entry
Manual stock control supports:
- Opening Stock
- Adjustment In
- Adjustment Out

Supported units:
- kg
- TON = 1000 kg
- Mann = 20 kg
- Tin
- Bag
- Piece

Weight units are normalized into kg internally.

### Company ownership model preserved
This module is company-wide.
It does not introduce Internal Transfer.
Division/unit usage continues to be handled through Usage / Consumption.

### Search and stock health
The screen includes:
- item search
- total stock item count
- positive-stock count
- zero/negative-stock count

This Alpha focuses on stock quantity/movement integrity.
Inventory valuation/costing remains the next roadmap stage.
