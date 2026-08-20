# Swati App — UI Alpha 8

## Common Purchasing Module

Alpha 8 introduces the first shared operational module built on the Alpha 7 company core.

### One purchase system for both divisions
- Oil Mill
- Grain / Pulse

### Unit classification
- Job Work
- Production / Processing

### Dynamic purchase presets

Oil Mill — Production:
- Groundnut
- Empty 15 kg tins
- Jute bags
- Machinery / Parts
- Other

Oil Mill — Job Work:
- Empty 15 kg tins
- Jute bags
- Machinery / Parts
- Other

Grain / Pulse — Production:
- Grain / Pulse raw material
- Empty bags
- Machinery / Parts
- Other

Grain / Pulse — Job Work:
- Empty bags
- Machinery / Parts
- Other

### Purchase entry captures
- Date
- Supplier / Party
- Village / Mobile
- Item
- Category
- Quantity / Unit
- Rate
- Paid
- Outstanding
- Transportation
- Loading
- Unloading
- Notes

### Automatic linked effects
Saving a purchase:
1. Creates one core Purchase transaction.
2. Adds stock through the central Stock Movement ledger.
3. Creates linked expense entries for transport/loading/unloading when entered.
4. Preserves Division + Unit + Category + Operator tags.

### Purchase history
- Filter by Division
- Filter by Unit
- Search Supplier / Item
- Total purchase amount
- Total supplier outstanding
- Entry count

### Important scope
Khol purchase directly from an Oil Job Work farmer remains part of the dedicated Job Work transaction flow and is not duplicated as a separate generic purchase in this Alpha.
