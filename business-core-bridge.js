(() => {
  'use strict';

  const MIGRATION_KEY = 'swati_core_migration_alpha37_v1';

  function safe(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch { return []; }
  }

  function migrate() {
    const core = window.SwatiCore;
    if (!core) return;

    // Normalize movement names written by older Alpha builds.
    const movementKey='swati_core_stock_movements_v1';
    const normalized=safe(movementKey).map(m=>({
      ...m,
      movementType:m.movementType==='production_consume'?'production_consumption':m.movementType==='production_output'?'production_in':m.movementType
    }));
    localStorage.setItem(movementKey,JSON.stringify(normalized));

    // Existing company raw purchases.
    safe('swati_company_raw_purchases_v1').forEach(x => {
      const exists = core.list('purchases').some(r => r.context?.notes === x.id);
      if (exists) return;

      core.addPurchase({
        date: x.date,
        party: x.supplier,
        itemId: 'oil.raw.groundnut',
        itemName: 'મગફળી',
        qty: x.qtyKg,
        unitName: 'kg',
        rate: x.rateKg,
        amount: x.total,
        paid: x.paid,
        context: {
          division: core.DIVISIONS.oil,
          unit: core.UNITS.production,
          activity: 'raw_material_purchase',
          sourceModule: 'alpha5_company',
          operator: x.operator || '',
          notes: x.id || ''
        }
      });
    });

    // Existing company production batches.
    safe('swati_company_production_batches_v1').forEach(x => {
      const exists = core.list('stockMovements').some(r => r.refId === x.id || r.context?.notes === x.id);
      if (exists) return;

      const ctx = {
        division: core.DIVISIONS.oil,
        unit: core.UNITS.production,
        activity: 'production_batch',
        sourceModule: 'alpha5_company',
        operator: x.operator || '',
        notes: x.batchNo || x.id || ''
      };

      core.addStockMovement({
        date: x.date, itemId: 'oil.raw.groundnut', itemName: 'મગફળી',
        qty: x.inputKg, unitName: 'kg',
        movementType: 'production_consumption',
        direction: 'out', refType: 'oil_production', refId: x.id,
        context: ctx
      });

      core.addStockMovement({
        date: x.date, itemId: 'oil.finished.oil', itemName: 'તેલ',
        qty: x.oilKg, unitName: 'kg',
        movementType: 'production_in',
        direction: 'in', refType: 'oil_production', refId: x.id,
        context: ctx
      });

      core.addStockMovement({
        date: x.date, itemId: 'oil.byproduct.khali', itemName: 'ખોળ',
        qty: x.khaliKg, unitName: 'kg',
        movementType: 'production_in',
        direction: 'in', refType: 'oil_production', refId: x.id,
        context: ctx
      });

      if (Number(x.tinCount||0) > 0) {
        core.addStockMovement({
          date: x.date, itemId: 'oil.packaging.filled_tin_15kg',
          itemName: '15 કિલો ભરેલું ટીન',
          qty: x.tinCount, unitName: 'tin',
          movementType: 'production_in',
          direction: 'in', refType: 'oil_production', refId: x.id,
          context: ctx
        });
      }
    });

    // Existing company sales.
    safe('swati_company_sales_v1').forEach(x => {
      const exists = core.list('sales').some(r => r.context?.notes === x.id);
      if (exists) return;

      core.addSale({
        date: x.date,
        party: x.customer,
        itemId: x.unit === 'tin' ? 'oil.packaging.filled_tin_15kg' : 'oil.finished.oil',
        itemName: x.unit === 'tin' ? '15 કિલો તેલ ટીન' : 'તેલ',
        qty: x.unit === 'tin' ? x.tinCount : x.kg,
        unitName: x.unit === 'tin' ? 'tin' : 'kg',
        rate: x.rate,
        amount: x.total,
        received: x.paid,
        paymentMode: x.method || 'cash',
        context: {
          division: core.DIVISIONS.oil,
          unit: core.UNITS.production,
          activity: 'finished_goods_sale',
          sourceModule: 'alpha5_company',
          operator: x.operator || '',
          notes: x.id || ''
        }
      });
    });

    // Repair zero-quantity sale movements and missing sale receipt ledgers from older builds.
    core.list('sales').forEach(s=>{
      const expected=core.toBaseQty(s.qty,s.unitName||'kg');
      const movement=core.list('stockMovements').find(m=>m.refType==='sale'&&m.refId===s.id);
      const oilContent=core.list('stockMovements').find(m=>m.refType==='sale_oil_content'&&m.refId===s.id);
      const receipt=[...safe('swati_core_cash_ledger_v1'),...safe('swati_core_bank_ledger_v1')].find(m=>m.refType==='sale_receipt'&&m.refId===s.id);
      if(Number(s.baseQty||0)!==expected || Number(movement?.qty||0)!==expected || (s.itemId==='oil.packaging.filled_tin_15kg'&&!oilContent) || (Number(s.received||0)>0&&!receipt)){
        core.updateSale(s.id,{...s,baseQty:expected,paymentMode:s.paymentMode||'cash'});
      }
    });

    localStorage.setItem(MIGRATION_KEY, '1');
  }

  window.addEventListener('DOMContentLoaded', migrate);
})();
