(() => {
  'use strict';

  const KEYS = {
    purchases: 'swati_core_purchases_v1',
    sales: 'swati_core_sales_v1',
    expenses: 'swati_core_expenses_v1',
    stockMovements: 'swati_core_stock_movements_v1',
    transfers: 'swati_core_internal_transfers_v1',
    cashLedger: 'swati_core_cash_ledger_v1',
    bankLedger: 'swati_core_bank_ledger_v1',
    meta: 'swati_core_meta_v1',
    financeSettings: 'swati_core_finance_settings_v1',
    bankAccounts: 'swati_core_bank_accounts_v1',
    partyPayments: 'swati_core_party_payments_v1',
    usageMovements: 'swati_core_usage_movements_v1'
  };

  const DIVISIONS = { oil: 'oil_mill', grain: 'grain_pulse' };
  const UNITS = { jobwork: 'job_work', production: 'production' };

  const MOVEMENT_TYPES = {
    opening: 'opening',
    purchaseIn: 'purchase_in',
    productionConsume: 'production_consume',
    productionOutput: 'production_output',
    saleOut: 'sale_out',
    transferIn: 'transfer_in',
    transferOut: 'transfer_out',
    adjustmentIn: 'adjustment_in',
    adjustmentOut: 'adjustment_out'
  };

  const read = (key, fallback=[]) => {
    try {
      const v = JSON.parse(localStorage.getItem(key));
      return v ?? fallback;
    } catch {
      return fallback;
    }
  };

  const write = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
    return value;
  };

  const uid = (prefix='TX') =>
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

  const round2 = n =>
    Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

  const today = () => new Date().toISOString().slice(0,10);


  const WEIGHT_TO_KG = {
    kg: 1,
    ton: 1000,
    mann: 20
  };

  function toBaseQty(qty, unitName) {
    const q = Number(qty || 0);
    if (WEIGHT_TO_KG[unitName]) return round2(q * WEIGHT_TO_KG[unitName]);
    return round2(q);
  }

  function isWeightUnit(unitName) {
    return !!WEIGHT_TO_KG[unitName];
  }

  function getPartyKey(name='') {
    return String(name || '').trim().toLowerCase();
  }

  function partyLedger(party='') {
    const key = getPartyKey(party);
    const purchases = read(KEYS.purchases).filter(r => getPartyKey(r.party) === key);
    const payments = read(KEYS.partyPayments).filter(r => getPartyKey(r.party) === key);

    const purchaseTotal = round2(purchases.reduce((s,r)=>s+Number(r.amount||0),0));
    const paymentTotal = round2(payments.reduce((s,r)=>s+Number(r.amount||0),0));

    const net = round2(paymentTotal - purchaseTotal);
    return {
      party,
      purchaseTotal,
      paymentTotal,
      advance: net > 0 ? net : 0,
      payable: net < 0 ? Math.abs(net) : 0,
      balance: net
    };
  }

  function addPartyPayment(input={}) {
    const rows = read(KEYS.partyPayments);
    const row = {
      id: input.id || uid('PAY'),
      date: input.date || today(),
      party: input.party || '',
      amount: round2(input.amount),
      paymentMode: input.paymentMode || 'cash',
      refType: input.refType || 'party_payment',
      refId: input.refId || '',
      context: normalizeContext(input.context),
      createdAt: input.createdAt || new Date().toISOString()
    };
    rows.push(row);
    write(KEYS.partyPayments, rows);

    if (row.amount > 0) {
      addMoneyMovement({
        date: row.date,
        amount: row.amount,
        direction: 'out',
        mode: row.paymentMode,
        refType: row.refType,
        refId: row.id,
        title: `Party payment - ${row.party}`,
        context: row.context
      });
    }
    return row;
  }

  function addUsage(input={}) {
    const rows = read(KEYS.usageMovements);
    const row = {
      id: input.id || uid('USE'),
      date: input.date || today(),
      itemId: input.itemId || '',
      itemName: input.itemName || '',
      qty: round2(input.qty),
      baseQty: toBaseQty(input.qty, input.unitName || 'kg'),
      unitName: input.unitName || 'kg',
      context: normalizeContext(input.context),
      note: input.note || '',
      createdAt: input.createdAt || new Date().toISOString()
    };
    rows.push(row);
    write(KEYS.usageMovements, rows);

    addStockMovement({
      date: row.date,
      itemId: row.itemId,
      itemName: row.itemName,
      qty: row.baseQty,
      unitName: isWeightUnit(row.unitName) ? 'kg' : row.unitName,
      movementType: 'usage_consume',
      direction: 'out',
      refType: 'usage',
      refId: row.id,
      context: row.context
    });
    return row;
  }

  function getFinanceSettings() {
    return read(KEYS.financeSettings, {
      openingCash: 0,
      loanFacilities: []
    });
  }

  function saveFinanceSettings(settings={}) {
    const clean = {
      openingCash: round2(settings.openingCash),
      loanFacilities: Array.isArray(settings.loanFacilities) ? settings.loanFacilities : []
    };
    write(KEYS.financeSettings, clean);
    return clean;
  }

  function getBankAccounts() {
    return read(KEYS.bankAccounts, []);
  }

  function saveBankAccounts(accounts=[]) {
    write(KEYS.bankAccounts, accounts);
    return accounts;
  }

  function addBankAccount(input={}) {
    const rows = getBankAccounts();
    const row = {
      id: input.id || uid('BANK'),
      bankName: input.bankName || '',
      accountName: input.accountName || '',
      accountType: input.accountType || 'current',
      openingBalance: round2(input.openingBalance),
      currentBalance: round2(input.currentBalance ?? input.openingBalance),
      createdAt: input.createdAt || new Date().toISOString()
    };
    rows.push(row);
    saveBankAccounts(rows);
    return row;
  }

  const normalizeContext = (ctx={}) => ({
    division: ctx.division || '',
    unit: ctx.unit || '',
    activity: ctx.activity || '',
    costCenter: ctx.costCenter || '',
    sourceModule: ctx.sourceModule || '',
    operator: ctx.operator || '',
    notes: ctx.notes || ''
  });

  function addStockMovement(input={}) {
    const rows = read(KEYS.stockMovements);
    const row = {
      id: input.id || uid('STK'),
      date: input.date || today(),
      itemId: input.itemId || '',
      itemName: input.itemName || '',
      qty: round2(input.qty),
      unitName: input.unitName || 'kg',
      movementType: input.movementType || '',
      direction: input.direction === 'out' ? 'out' : 'in',
      refType: input.refType || '',
      refId: input.refId || '',
      unitCost: round2(input.unitCost),
      context: normalizeContext(input.context),
      createdAt: input.createdAt || new Date().toISOString()
    };
    rows.push(row);
    write(KEYS.stockMovements, rows);
    return row;
  }

  function addPurchase(input={}) {
    const rows = read(KEYS.purchases);
    const qty = round2(input.qty);
    const rate = round2(input.rate);
    const amount = round2(input.amount ?? qty * rate);
    const paid = round2(input.paid);
    const baseQty = toBaseQty(qty, input.unitName || 'kg');
    const row = {
      id: input.id || uid('PUR'),
      date: input.date || today(),
      party: input.party || '',
      itemId: input.itemId || '',
      itemName: input.itemName || '',
      qty,
      baseQty,
      unitName: input.unitName || 'kg',
      rate,
      amount,
      paid,
      outstanding: round2(Math.max(0, amount-paid)),
      advance: round2(Math.max(0, paid-amount)),
      context: normalizeContext(input.context),
      createdAt: input.createdAt || new Date().toISOString()
    };
    rows.push(row);
    write(KEYS.purchases, rows);

    if (row.paid > 0 && input.recordPartyPayment !== false) {
      addPartyPayment({
        date: row.date,
        party: row.party,
        amount: row.paid,
        paymentMode: input.paymentMode || 'cash',
        refType: 'purchase_payment',
        refId: row.id,
        context: row.context
      });
    }

    if (row.itemId && row.qty) {
      addStockMovement({
        date: row.date,
        itemId: row.itemId,
        itemName: row.itemName,
        qty: row.baseQty,
        unitName: isWeightUnit(row.unitName) ? 'kg' : row.unitName,
        movementType: MOVEMENT_TYPES.purchaseIn,
        direction: 'in',
        refType: 'purchase',
        refId: row.id,
        unitCost: row.rate,
        context: row.context
      });
    }
    return row;
  }

  function addSale(input={}) {
    const rows = read(KEYS.sales);
    const qty = round2(input.qty);
    const rate = round2(input.rate);
    const amount = round2(input.amount ?? qty * rate);
    const received = round2(input.received);
    const row = {
      id: input.id || uid('SALE'),
      date: input.date || today(),
      party: input.party || '',
      itemId: input.itemId || '',
      itemName: input.itemName || '',
      qty,
      unitName: input.unitName || 'kg',
      rate,
      amount,
      received,
      outstanding: round2(Math.max(0, amount-received)),
      context: normalizeContext(input.context),
      createdAt: input.createdAt || new Date().toISOString()
    };
    rows.push(row);
    write(KEYS.sales, rows);

    if (row.itemId && row.qty) {
      addStockMovement({
        date: row.date,
        itemId: row.itemId,
        itemName: row.itemName,
        qty: row.baseQty,
        unitName: isWeightUnit(row.unitName) ? 'kg' : row.unitName,
        movementType: MOVEMENT_TYPES.saleOut,
        direction: 'out',
        refType: 'sale',
        refId: row.id,
        context: row.context
      });
    }
    return row;
  }

  function addMoneyMovement(input={}) {
    const mode = input.mode === 'bank' ? 'bank' : 'cash';
    const key = mode === 'bank' ? KEYS.bankLedger : KEYS.cashLedger;
    const rows = read(key);
    const row = {
      id: input.id || uid(mode === 'bank' ? 'BNK' : 'CSH'),
      date: input.date || today(),
      amount: round2(input.amount),
      direction: input.direction === 'out' ? 'out' : 'in',
      refType: input.refType || '',
      refId: input.refId || '',
      title: input.title || '',
      context: normalizeContext(input.context),
      createdAt: input.createdAt || new Date().toISOString()
    };
    rows.push(row);
    write(key, rows);
    return row;
  }

  function addExpense(input={}) {
    const rows = read(KEYS.expenses);
    const row = {
      id: input.id || uid('EXP'),
      date: input.date || today(),
      category: input.category || 'other',
      title: input.title || '',
      amount: round2(input.amount),
      paymentMode: input.paymentMode || 'cash',
      party: input.party || '',
      context: normalizeContext(input.context),
      createdAt: input.createdAt || new Date().toISOString()
    };
    rows.push(row);
    write(KEYS.expenses, rows);

    if (row.amount > 0) {
      addMoneyMovement({
        date: row.date,
        amount: row.amount,
        direction: 'out',
        mode: row.paymentMode,
        refType: 'expense',
        refId: row.id,
        title: row.title || row.category,
        context: row.context
      });
    }
    return row;
  }

  function addInternalTransfer(input={}) {
    const rows = read(KEYS.transfers);
    const row = {
      id: input.id || uid('TRF'),
      date: input.date || today(),
      itemId: input.itemId || '',
      itemName: input.itemName || '',
      qty: round2(input.qty),
      unitName: input.unitName || 'kg',
      from: normalizeContext(input.from),
      to: normalizeContext(input.to),
      note: input.note || '',
      createdAt: input.createdAt || new Date().toISOString()
    };
    rows.push(row);
    write(KEYS.transfers, rows);

    addStockMovement({
      date: row.date, itemId: row.itemId, itemName: row.itemName,
      qty: row.qty, unitName: row.unitName,
      movementType: MOVEMENT_TYPES.transferOut, direction: 'out',
      refType: 'internal_transfer', refId: row.id, context: row.from
    });

    addStockMovement({
      date: row.date, itemId: row.itemId, itemName: row.itemName,
      qty: row.qty, unitName: row.unitName,
      movementType: MOVEMENT_TYPES.transferIn, direction: 'in',
      refType: 'internal_transfer', refId: row.id, context: row.to
    });

    return row;
  }

  function stockBalance(itemId, filter={}) {
    return round2(
      read(KEYS.stockMovements)
        .filter(r => r.itemId === itemId)
        .filter(r => !filter.division || r.context?.division === filter.division)
        .filter(r => !filter.unit || r.context?.unit === filter.unit)
        .reduce((sum,r) => sum + (r.direction === 'in' ? Number(r.qty||0) : -Number(r.qty||0)), 0)
    );
  }

  function stockSnapshot() {
    const map = new Map();
    read(KEYS.stockMovements).forEach(r => {
      const key = r.itemId || r.itemName || 'unknown';
      const x = map.get(key) || {
        itemId: r.itemId || '',
        itemName: r.itemName || '',
        unitName: r.unitName || '',
        inQty: 0,
        outQty: 0,
        balance: 0
      };
      if (r.direction === 'in') x.inQty += Number(r.qty||0);
      else x.outQty += Number(r.qty||0);
      x.balance = round2(x.inQty - x.outQty);
      map.set(key,x);
    });
    return [...map.values()].map(x => ({
      ...x,
      inQty: round2(x.inQty),
      outQty: round2(x.outQty),
      balance: round2(x.balance)
    }));
  }

  function moneyBalance(mode='cash') {
    const key = mode === 'bank' ? KEYS.bankLedger : KEYS.cashLedger;
    return round2(read(key).reduce(
      (sum,r) => sum + (r.direction === 'in' ? Number(r.amount||0) : -Number(r.amount||0)), 0
    ));
  }

  function financeSummary() {
    const p = read(KEYS.purchases);
    const s = read(KEYS.sales);
    const e = read(KEYS.expenses);
    const settings = getFinanceSettings();
    const banks = getBankAccounts();
    const bankOpening = round2(banks.reduce((a,r)=>a+Number(r.openingBalance||0),0));
    const bankLedgerFlow = moneyBalance('bank');
    const cashLedgerFlow = moneyBalance('cash');
    const cashBalance = round2(Number(settings.openingCash||0) + cashLedgerFlow);
    const bankBalance = round2(bankOpening + bankLedgerFlow);
    return {
      purchaseAmount: round2(p.reduce((a,r)=>a+Number(r.amount||0),0)),
      purchaseOutstanding: round2(p.reduce((a,r)=>a+Number(r.outstanding||0),0)),
      salesAmount: round2(s.reduce((a,r)=>a+Number(r.amount||0),0)),
      salesOutstanding: round2(s.reduce((a,r)=>a+Number(r.outstanding||0),0)),
      expensesAmount: round2(e.reduce((a,r)=>a+Number(r.amount||0),0)),
      cashBalance,
      bankBalance,
      liquidMoney: round2(cashBalance + bankBalance)
    };
  }

  function list(type) {
    return KEYS[type] ? read(KEYS[type]) : [];
  }

  if (!localStorage.getItem(KEYS.meta)) {
    write(KEYS.meta, {
      schemaVersion: 1,
      companyName: 'Swati Mini Oil Mill',
      createdAt: new Date().toISOString(),
      divisions: [
        { id: DIVISIONS.oil, name: 'તેલ મીલ' },
        { id: DIVISIONS.grain, name: 'અનાજ / કઠોળ' }
      ],
      units: [
        { id: UNITS.jobwork, name: 'મજૂરી કામ' },
        { id: UNITS.production, name: 'ઉત્પાદન / પ્રોસેસિંગ' }
      ]
    });
  }

  window.SwatiCore = {
    KEYS, DIVISIONS, UNITS, MOVEMENT_TYPES,
    addPurchase, addSale, addExpense,
    addStockMovement, addInternalTransfer, addMoneyMovement,
    stockBalance, stockSnapshot, moneyBalance, financeSummary, list,
    toBaseQty, isWeightUnit, partyLedger, addPartyPayment, addUsage,
    getFinanceSettings, saveFinanceSettings, getBankAccounts, saveBankAccounts, addBankAccount
  };
})();