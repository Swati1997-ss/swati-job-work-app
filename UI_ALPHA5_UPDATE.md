# Swati Job Work App — UI Alpha 5

## Company Production foundation
Oil Mill now has four separate options:
- મજૂરી કામ
- કંપની પ્રોડક્શન
- વેચાણ
- સ્ટોક

### Added
- Raw material purchase entry
- Separate raw groundnut stock
- Production batches
- Automatic batch numbers
- Oil / Khol / loss outputs
- Oil yield and Khol yield
- Input-output balance warning
- 15 kg tin packaging count
- Finished oil stock in kg
- Company sales by tin or kg
- Payment / outstanding capture
- Stock validation on company sales
- Recent purchases, production batches and sales

### Data separation
Company-owned data is kept separately from customer job-work data:
- swati_company_raw_purchases_v1
- swati_company_production_batches_v1
- swati_company_sales_v1

### Current stock rule
Oil stock master = kilograms.
15 kg tins = separate packaging count.

### Note
This Alpha creates the local production/stock/sales foundation. Shared-cloud sync for the new company-production collections will be added only after this local workflow is tested and approved.
