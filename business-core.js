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

    const transactions = [
      ...purchases.map(r=>({
        id:r.id,
        date:r.date,
        createdAt:r.createdAt||'',
        type:'purchase',
        title:r.itemName||'Purchase',
        amount:round2(r.amount||0),
        debit:round2(r.amount||0),
        credit:0,
        refId:r.id,
        note:r.context?.notes||'',
        advanceApplied:round2(r.advanceApplied||0)
      })),
      ...payments.map(r=>({
        id:r.id,
        date:r.date,
        createdAt:r.createdAt||'',
        type:'payment',
        title:r.refType==='purchase_payment'?'Purchase Payment':'Party Payment',
        amount:round2(r.amount||0),
        debit:0,
        credit:round2(r.amount||0),
        refId:r.refId||r.id,
        note:r.note||''
      }))
    ].sort((a,b)=>
      String(a.date||'').localeCompare(String(b.date||'')) ||
      String(a.createdAt||'').localeCompare(String(b.createdAt||''))
    );

    let running=0;
    transactions.forEach(t=>{
      running=round2(running + Number(t.credit||0) - Number(t.debit||0));
      t.runningBalance=running;
      t.balanceType=running>0?'advance':running<0?'payable':'settled';
    });

    return {
      party,
      purchaseTotal,
      paymentTotal,
      advance: net > 0 ? net : 0,
      payable: net < 0 ? Math.abs(net) : 0,
      balance: net,
      purchases,
      payments,
      transactions
    };
  }

  function listParties() {
    const map=new Map();
    read(KEYS.purchases).forEach(r=>{
      const name=String(r.party||'').trim();
      if(name) map.set(getPartyKey(name),name);
    });
    read(KEYS.partyPayments).forEach(r=>{
      const name=String(r.party||'').trim();
      if(name && !map.has(getPartyKey(name))) map.set(getPartyKey(name),name);
    });
    return [...map.values()].sort((a,b)=>a.localeCompare(b));
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
      note: input.note || '',
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
    const priorLedger = input.party ? partyLedger(input.party) : {advance:0};
    const priorAdvance = round2(priorLedger.advance||0);
    const usePartyAdvance = input.usePartyAdvance !== false;
    const advanceApplied = usePartyAdvance ? round2(Math.min(priorAdvance, amount)) : 0;
    const effectiveSettlement = round2(paid + advanceApplied);
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
      priorAdvance,
      advanceApplied,
      effectiveSettlement,
      outstanding: round2(Math.max(0, amount-effectiveSettlement)),
      advance: round2(Math.max(0, priorAdvance + paid - amount)),
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
    const purchases = read(KEYS.purchases);
    const sales = read(KEYS.sales);
    const movements = read(KEYS.stockMovements);
    const usages = read(KEYS.usageMovements);

    const map = new Map();

    function ensure(itemId,itemName,unitName){
      const id=itemId||itemName||'unknown';
      if(!map.has(id)){
        map.set(id,{
          itemId:id,
          itemName:itemName||id,
          unitName:unitName||'kg',
          openingQty:0,
          purchaseIn:0,
          productionIn:0,
          adjustmentIn:0,
          saleOut:0,
          productionConsumption:0,
          usageOut:0,
          adjustmentOut:0,
          inQty:0,
          outQty:0,
          balance:0
        });
      }
      return map.get(id);
    }

    purchases.forEach(r=>{
      const x=ensure(r.itemId,r.itemName,r.baseUnitName||r.unitName);
      x.purchaseIn=round2(x.purchaseIn+Number(r.baseQty??r.qty??0));
    });

    sales.forEach(r=>{
      const x=ensure(r.itemId,r.itemName,r.baseUnitName||r.unitName);
      x.saleOut=round2(x.saleOut+Number(r.baseQty??r.qty??0));
    });

    usages.forEach(r=>{
      const x=ensure(r.itemId,r.itemName,r.baseUnitName||r.unitName);
      x.usageOut=round2(x.usageOut+Number(r.baseQty??r.qty??0));
    });

    movements.forEach(r=>{
      const x=ensure(r.itemId,r.itemName,r.baseUnitName||r.unitName);
      const q=Number(r.baseQty??r.qty??0);
      const t=r.movementType||r.type||'';
      if(t==='opening_in') x.openingQty=round2(x.openingQty+q);
      else if(t==='production_in') x.productionIn=round2(x.productionIn+q);
      else if(t==='production_out' || t==='production_consumption') x.productionConsumption=round2(x.productionConsumption+q);
      else if(t==='adjustment_in') x.adjustmentIn=round2(x.adjustmentIn+q);
      else if(t==='adjustment_out') x.adjustmentOut=round2(x.adjustmentOut+q);
      else if(t==='sale_out') x.saleOut=round2(x.saleOut+q);
      else if(t==='usage_out') x.usageOut=round2(x.usageOut+q);
      else if(t==='purchase_in') x.purchaseIn=round2(x.purchaseIn+q);
    });

    const rows=[...map.values()].map(x=>{
      x.inQty=round2(x.openingQty+x.purchaseIn+x.productionIn+x.adjustmentIn);
      x.outQty=round2(x.saleOut+x.productionConsumption+x.usageOut+x.adjustmentOut);
      x.balance=round2(x.inQty-x.outQty);
      return x;
    });

    return rows.sort((a,b)=>String(a.itemName).localeCompare(String(b.itemName)));
  }

  function addStockAdjustment(input={}) {
    const qty=round2(input.qty);
    const unitName=input.unitName||'kg';
    const baseQty=toBaseQty(qty,unitName);
    return addStockMovement({
      date:input.date,
      itemId:input.itemId,
      itemName:input.itemName,
      qty,
      baseQty,
      unitName,
      baseUnitName:isWeightUnit(unitName)?'kg':unitName,
      movementType:input.direction==='out'?'adjustment_out':input.direction==='opening'?'opening_in':'adjustment_in',
      context:normalizeContext(input.context)
    });
  }

  function moneyBalance(mode='cash') {
    const key = mode === 'bank' ? KEYS.bankLedger : KEYS.cashLedger;
    return round2(read(key).reduce(
      (sum,r) => sum + (r.direction === 'in' ? Number(r.amount||0) : -Number(r.amount||0)), 0
    ));
  }


  function costingSummary() {
    const stock = stockSnapshot();
    const purchases = read(KEYS.purchases);
    const expenses = read(KEYS.expenses);
    const movements = read(KEYS.stockMovements);

    const rows = stock.map(s=>{
      const itemPurchases = purchases.filter(p=>p.itemId===s.itemId && Number(p.baseQty||p.qty||0)>0);
      const purchaseQty = itemPurchases.reduce((a,p)=>a+Number(p.baseQty||p.qty||0),0);
      const purchaseValue = itemPurchases.reduce((a,p)=>a+Number(p.amount||0),0);
      const avgPurchaseCost = purchaseQty>0 ? purchaseValue/purchaseQty : 0;

      const prodRefs = movements
        .filter(m=>m.itemId===s.itemId && m.movementType==='production_in')
        .map(m=>m.context?.notes)
        .filter(Boolean);

      const processingExpense = expenses
        .filter(e=>prodRefs.includes(e.context?.notes) || (e.context?.costCenter==='grain_production' && String(s.itemId||'').startsWith('grain.processed.')))
        .reduce((a,e)=>a+Number(e.amount||0),0);

      const productionQty = movements
        .filter(m=>m.itemId===s.itemId && m.movementType==='production_in')
        .reduce((a,m)=>a+Number(m.baseQty||m.qty||0),0);

      const processingCostPerUnit = productionQty>0 ? processingExpense/productionQty : 0;

      // Prefer purchase-based average for purchased/raw/packaging items.
      // Add processing expense to produced items where production output exists.
      let estimatedUnitCost = avgPurchaseCost;
      if(productionQty>0){
        estimatedUnitCost = processingCostPerUnit;
      }

      const stockValue = Math.max(0,Number(s.balance||0)) * Math.max(0,estimatedUnitCost||0);

      return {
        itemId:s.itemId,
        itemName:s.itemName,
        unitName:s.unitName,
        balance:Number(s.balance||0),
        purchaseQty:round2(purchaseQty),
        purchaseValue:round2(purchaseValue),
        avgPurchaseCost:round2(avgPurchaseCost),
        productionQty:round2(productionQty),
        processingExpense:round2(processingExpense),
        processingCostPerUnit:round2(processingCostPerUnit),
        estimatedUnitCost:round2(estimatedUnitCost),
        stockValue:round2(stockValue)
      };
    });

    const totalStockValue = round2(rows.reduce((a,r)=>a+r.stockValue,0));
    const totalPurchaseValue = round2(rows.reduce((a,r)=>a+r.purchaseValue,0));
    const totalProcessingExpense = round2(rows.reduce((a,r)=>a+r.processingExpense,0));

    return {
      rows,
      totalStockValue,
      totalPurchaseValue,
      totalProcessingExpense
    };
  }


  function ownerFinanceSnapshot() {
    const f = financeSummary();
    const costing = typeof costingSummary==='function' ? costingSummary() : {totalStockValue:0};
    const liquidMoney = round2(Number(f.cashBalance||0)+Number(f.bankBalance||0));
    const receivables = round2(Number(f.salesOutstanding||0));
    const payables = round2(Number(f.purchaseOutstanding||0));
    const stockValue = round2(Number(costing.totalStockValue||0));
    const ownedWorkingAssets = round2(liquidMoney + receivables + stockValue);
    const netWorkingPosition = round2(ownedWorkingAssets - payables);
    const loanUsed = round2(Number(f.loanUsed||0));
    const loanLimit = round2(Number(f.loanLimit||0));
    const loanAvailable = round2(Math.max(0,loanLimit-loanUsed));

    return {
      cash: round2(Number(f.cashBalance||0)),
      bank: round2(Number(f.bankBalance||0)),
      liquidMoney,
      receivables,
      payables,
      stockValue,
      ownedWorkingAssets,
      netWorkingPosition,
      loanLimit,
      loanUsed,
      loanAvailable
    };
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
    toBaseQty, isWeightUnit, partyLedger, listParties, addPartyPayment, addUsage,
    getFinanceSettings, saveFinanceSettings, getBankAccounts, saveBankAccounts, addBankAccount
  };
})();