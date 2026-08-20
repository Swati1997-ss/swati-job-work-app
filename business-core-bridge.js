(() => {
  'use strict';

  const MIGRATION_KEY = 'swati_core_migration_alpha7_v1';

  function safe(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch { return []; }
  }

  function migrate() {
    const core = window.SwatiCore;
    if (!core || localStorage.getItem(MIGRATION_KEY) === '1') return;

    // Existing company raw purchases.
    safe('swati_company_raw_purchases_v1').forEach(x => {
      const exists = core.list('purchases').some(r =>
        r.context?.sourceModule === 'alpha5_company' &&
        r.context?.notes === x.id
      );
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
      const exists = core.list('stockMovements').some(r =>
        r.refType === 'production_batch' && r.refId === x.id
      );
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
        movementType: core.MOVEMENT_TYPES.productionConsume,
        direction: 'out', refType: 'production_batch', refId: x.id,
        context: ctx
      });

      core.addStockMovement({
        date: x.date, itemId: 'oil.finished.oil', itemName: 'તેલ',
        qty: x.oilKg, unitName: 'kg',
        movementType: core.MOVEMENT_TYPES.productionOutput,
        direction: 'in', refType: 'production_batch', refId: x.id,
        context: ctx
      });

      core.addStockMovement({
        date: x.date, itemId: 'oil.byproduct.khali', itemName: 'ખોળ',
        qty: x.khaliKg, unitName: 'kg',
        movementType: core.MOVEMENT_TYPES.productionOutput,
        direction: 'in', refType: 'production_batch', refId: x.id,
        context: ctx
      });

      if (Number(x.tinCount||0) > 0) {
        core.addStockMovement({
          date: x.date, itemId: 'oil.packaging.filled_tin_15kg',
          itemName: '15 કિલો ભરેલું ટીન',
          qty: x.tinCount, unitName: 'tin',
          movementType: core.MOVEMENT_TYPES.productionOutput,
          direction: 'in', refType: 'production_batch', refId: x.id,
          context: ctx
        });
      }
    });

    // Existing company sales.
    safe('swati_company_sales_v1').forEach(x => {
      const exists = core.list('sales').some(r =>
        r.context?.sourceModule === 'alpha5_company' &&
        r.context?.notes === x.id
      );
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

    localStorage.setItem(MIGRATION_KEY, '1');
  }

  window.addEventListener('DOMContentLoaded', migrate);
})();