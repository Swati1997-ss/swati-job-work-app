(() => {
  'use strict';

  const STORAGE_TX = 'swati_oil_transactions_v1';
  const STORAGE_SETTINGS = 'swati_settings_v1';
  const STORAGE_BATCHES = 'swati_batches_v1';
  const STORAGE_OPERATORS = 'swati_operators_v1';
  const STORAGE_CURRENT_OPERATOR = 'swati_current_operator_v1';
  const STORAGE_DEVICE_ID = 'swati_device_id_v1';
  const STORAGE_AUDIT = 'swati_audit_v1';
  const ALL_DATA_KEYS=[
    STORAGE_TX,STORAGE_SETTINGS,STORAGE_BATCHES,STORAGE_OPERATORS,STORAGE_AUDIT,
    'swati_company_raw_purchases_v1','swati_company_production_batches_v1','swati_company_sales_v1',
    'swati_core_purchases_v1','swati_core_sales_v1','swati_core_expenses_v1','swati_core_stock_movements_v1',
    'swati_core_internal_transfers_v1','swati_core_cash_ledger_v1','swati_core_bank_ledger_v1','swati_core_meta_v1',
    'swati_core_finance_settings_v1','swati_core_bank_accounts_v1','swati_core_party_payments_v1','swati_core_usage_movements_v1',
    'swati_grain_company_production_v1','swati_grain_company_sales_v1','swati_retail_sales_v1','swati_invoices_v1',
    'swati_staff_master_v1','swati_staff_attendance_v1','swati_staff_payments_v1','swati_deleted_records_v1'
  ];
  const defaults = {
    tinKg: 15,
    jobRatePerTin: 100,
    kholRate: 6,
    newTinRate: 100,
    season: String(new Date().getFullYear()),
    prefix: 'JW',
    grainBaseKg: 20,
    grainBaseRate: 20,
    grainPurchaseRate: 0,
    grainPrefix: 'GK'
  };

  const DEFAULT_OPERATORS = ['નિતેશભાઈ','દર્શન','હેત'];
  function getOperators(){
    try {
      const rows=JSON.parse(localStorage.getItem(STORAGE_OPERATORS)||'[]').filter(Boolean);
      // Migrate the old Alpha default names automatically, while preserving any real custom names.
      const oldDefaults=['Admin','User 2','User 3'];
      if(rows.length===3 && rows.every((x,i)=>x===oldDefaults[i])){
        localStorage.setItem(STORAGE_OPERATORS, JSON.stringify(DEFAULT_OPERATORS));
        return DEFAULT_OPERATORS;
      }
      return rows.length?rows:DEFAULT_OPERATORS;
    } catch { return DEFAULT_OPERATORS; }
  }
  function setOperators(rows){ localStorage.setItem(STORAGE_OPERATORS, JSON.stringify(rows.filter(Boolean).slice(0,3))); notifyDataChanged('operators'); }
  function getAudit(){
    try { return JSON.parse(localStorage.getItem(STORAGE_AUDIT)||'[]'); } catch { return []; }
  }
  function setAudit(rows){ localStorage.setItem(STORAGE_AUDIT, JSON.stringify(rows.slice(-2000))); notifyDataChanged('audit'); }
  function addAudit(action, targetType, targetId, details=''){
    const rows=getAudit();
    rows.push({id:(crypto.randomUUID?crypto.randomUUID():`a-${Date.now()}-${Math.random()}`),action,targetType,targetId,details,operator:currentOperator()||'Unknown',deviceId:deviceId(),createdAt:new Date().toISOString()});
    setAudit(rows);
  }
  function auditFor(targetId){ return getAudit().filter(a=>a.targetId===targetId).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))); }
  function currentOperator(){
    const ops=getOperators(); const saved=localStorage.getItem(STORAGE_CURRENT_OPERATOR); return ops.includes(saved)?saved:'';
  }
  function deviceId(){
    let id=localStorage.getItem(STORAGE_DEVICE_ID);
    if(!id){ id=(crypto.randomUUID?crypto.randomUUID():`dev-${Date.now()}-${Math.random().toString(16).slice(2)}`); localStorage.setItem(STORAGE_DEVICE_ID,id); }
    return id;
  }
  function shortDeviceId(id=deviceId()){ return String(id||'').slice(0,8).toUpperCase(); }
  function ensureDeviceAssignment(){
    const op=currentOperator();
    if(op) return;
    const modal=$('deviceSetupModal'); if(!modal) return;
    const ops=getOperators();
    $('deviceOperatorButtons').innerHTML=ops.map(x=>`<button type="button" class="primary" data-assign-operator="${escapeAttr(x)}">${escapeHtml(x)}</button>`).join('');
    modal.hidden=false;
  }
  function assignDeviceOperator(name){
    if(!getOperators().includes(name)) return;
    localStorage.setItem(STORAGE_CURRENT_OPERATOR,name);
    addAudit('DEVICE_ASSIGN','system',deviceId(),`Operator: ${name}`);
    $('deviceSetupModal').hidden=true;
    renderOperatorUI();
    toast(`આ ડિવાઇસ ${name} માટે સેટ થયું`);
  }
  function renderOperatorUI(){
    const ops=getOperators();
    if($('operator1')) $('operator1').value=ops[0]||''; if($('operator2')) $('operator2').value=ops[1]||''; if($('operator3')) $('operator3').value=ops[2]||'';
    const activeOp=currentOperator()||'Not assigned';
    if($('deviceAssignedOperator')) $('deviceAssignedOperator').textContent=activeOp;
    if($('deviceAssignedId')) $('deviceAssignedId').textContent=shortDeviceId();
    if($('drawerOperatorName')) $('drawerOperatorName').textContent=activeOp;
    if($('drawerOperatorAvatar')) $('drawerOperatorAvatar').textContent=(activeOp&&activeOp!=='Not assigned'?activeOp.trim().charAt(0):'ઓ');
    if($('operatorModalName')) $('operatorModalName').textContent=activeOp;
    if($('operatorModalDevice')) $('operatorModalDevice').textContent=shortDeviceId();
    if($('operatorModalNetwork')) $('operatorModalNetwork').textContent=navigator.onLine?'Online':'Offline';
  }
  function resetDeviceAssignment(){
    const op=currentOperator();
    if(!confirm(`આ ડિવાઇસ હાલમાં ${op||'કોઈ Operator'} માટે સેટ છે. Assignment બદલવું છે?`)) return;
    if(!confirm('ફરી ખાતરી: આ પછી app ફરીથી પૂછશે કે આ ડિવાઇસ કોનું છે. ચાલુ રાખવું છે?')) return;
    addAudit('DEVICE_UNASSIGN','system',deviceId(),`Old operator: ${op||''}`);
    localStorage.removeItem(STORAGE_CURRENT_OPERATOR);
    renderOperatorUI(); ensureDeviceAssignment();
  }

  const $ = (id) => document.getElementById(id);
  const COMPANY_PURCHASES_KEY='swati_company_raw_purchases_v1';
  const COMPANY_BATCHES_KEY='swati_company_production_batches_v1';
  const COMPANY_SALES_KEY='swati_company_sales_v1';

  function getCompanyPurchases(){try{return JSON.parse(localStorage.getItem(COMPANY_PURCHASES_KEY)||'[]')}catch{return []}}
  function saveCompanyPurchases(rows){localStorage.setItem(COMPANY_PURCHASES_KEY,JSON.stringify(rows));notifyDataChanged('company_purchases');}
  function getCompanyBatches(){try{return JSON.parse(localStorage.getItem(COMPANY_BATCHES_KEY)||'[]')}catch{return []}}
  function saveCompanyBatches(rows){localStorage.setItem(COMPANY_BATCHES_KEY,JSON.stringify(rows));notifyDataChanged('company_production');}
  function getCompanySales(){try{return JSON.parse(localStorage.getItem(COMPANY_SALES_KEY)||'[]')}catch{return []}}
  function saveCompanySales(rows){localStorage.setItem(COMPANY_SALES_KEY,JSON.stringify(rows));notifyDataChanged('company_sales');}
  function companyUid(prefix){return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;}

  function companyStock(){
    const purchases=getCompanyPurchases(),batches=getCompanyBatches(),sales=getCompanySales();
    const rawPurchased=round2(purchases.reduce((s,x)=>s+Number(x.qtyKg||0),0));
    const rawUsed=round2(batches.reduce((s,x)=>s+Number(x.inputKg||0),0));
    const oilProduced=round2(batches.reduce((s,x)=>s+Number(x.oilKg||0),0));
    const tinsFilled=batches.reduce((s,x)=>s+Number(x.tinCount||0),0);
    const khaliProduced=round2(batches.reduce((s,x)=>s+Number(x.khaliKg||0),0));
    const oilSoldKg=round2(sales.filter(x=>(x.product||'oil')==='oil').reduce((s,x)=>s+Number(x.oilKg||0),0));
    const khaliSoldKg=round2(sales.filter(x=>x.product==='khol').reduce((s,x)=>s+Number(x.kg||0),0));
    const tinsSold=sales.reduce((s,x)=>s+Number(x.tinCount||0),0);
    return {
      rawPurchased,rawUsed,rawAvailable:round2(rawPurchased-rawUsed),
      oilProduced,oilSoldKg,oilAvailableKg:round2(oilProduced-oilSoldKg),
      tinsFilled,tinsSold,tinsAvailable:tinsFilled-tinsSold,
      khaliProduced,khaliSoldKg,khaliAvailable:round2(khaliProduced-khaliSoldKg)
    };
  }

  function nextProductionBatchNo(){
    const year=new Date().getFullYear();
    const list=getCompanyBatches().filter(x=>String(x.batchNo||'').startsWith(`PR-${year}-`));
    const max=list.reduce((m,x)=>Math.max(m,Number(String(x.batchNo).split('-').pop())||0),0);
    return `PR-${year}-${String(max+1).padStart(3,'0')}`;
  }

  function notifyDataChanged(dataset, action='update') {
    try { window.dispatchEvent(new CustomEvent('swati:data-changed',{detail:{dataset,action}})); } catch {}
  }
  function markDeleted(dataset,id){
    if(!dataset||!id) return;
    let rows=[];try{rows=JSON.parse(localStorage.getItem('swati_deleted_records_v1')||'[]')}catch{}
    rows=rows.filter(x=>!(x.dataset===dataset&&x.id===id));
    rows.push({dataset,id,deletedAt:new Date().toISOString(),deviceId:deviceId(),operator:currentOperator()});
    localStorage.setItem('swati_deleted_records_v1',JSON.stringify(rows.slice(-5000)));
    notifyDataChanged('deleted_records','delete');
  }
  const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  const num = (id) => Number($(id)?.value || 0);
  const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

  let settings = loadSettings();
  let deferredInstall = null;
  let lastSavedId = null;
  let lastSavedGrainId = null;
  let paymentTargetId = null;
  let editingBatchId = null;

  function loadSettings(){
    try { return {...defaults, ...JSON.parse(localStorage.getItem(STORAGE_SETTINGS) || '{}')}; }
    catch { return {...defaults}; }
  }
  function saveSettings(){ localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(settings)); notifyDataChanged('settings'); }

  function migrateRow(r){
    const legacyGroundnut = Number(r?.groundnutKg || 0);
    const incoming = {
      singGoglaKg: Number(r?.incoming?.singGoglaKg ?? legacyGroundnut ?? 0),
      danaFalaKg: Number(r?.incoming?.danaFalaKg ?? 0)
    };
    const netAbs = Math.abs(Number(r?.settlement?.net || 0));
    const legacyPaid = Number(r?.settlement?.paid || 0);
    const payments = Array.isArray(r.payments) ? r.payments : (legacyPaid > 0 ? [{
      id: crypto.randomUUID(),
      date: r.date || todayISO(),
      amount: legacyPaid,
      method: 'cash',
      note: 'Alpha 1 payment',
      createdAt: r.createdAt || new Date().toISOString()
    }] : []);
    const paidTotal = round2(payments.reduce((s,p)=>s+Number(p.amount||0),0));
    const remaining = round2(Math.max(0, netAbs - paidTotal));
    return {
      ...r,
      incoming,
      groundnutKg: round2(incoming.singGoglaKg + incoming.danaFalaKg),
      payments,
      settlement:{...(r.settlement||{}), paid:paidTotal, remaining}
    };
  }

  function getTx(){
    try { return JSON.parse(localStorage.getItem(STORAGE_TX) || '[]').map(migrateRow); }
    catch { return []; }
  }
  function setTx(rows){ localStorage.setItem(STORAGE_TX, JSON.stringify(rows)); notifyDataChanged('transactions'); }


  function getBatches(){
    try { return JSON.parse(localStorage.getItem(STORAGE_BATCHES) || '[]'); }
    catch { return []; }
  }
  function setBatches(rows){ localStorage.setItem(STORAGE_BATCHES, JSON.stringify(rows)); notifyDataChanged('batches'); }

  function sourceLots(){
    const lots=[];
    getTx().forEach(r=>{
      if(r.business==='oil' && Number(r.khol?.kg||0)>0){
        lots.push({id:`${r.id}:khol`,txId:r.id,date:r.date,material:'ખોળ',qty:Number(r.khol.kg||0),amount:Number(r.khol.amount||0),billNo:r.billNo,customer:r.customer?.name||''});
      }
      if(r.business==='grain' && r.grain?.purchaseEnabled && Number(r.grain?.purchaseKg||0)>0){
        const material=`${r.grain?.commodity||'અનાજ'} વધેલો માલ`;
        lots.push({id:`${r.id}:grain`,txId:r.id,date:r.date,material,qty:Number(r.grain.purchaseKg||0),amount:Number(r.grain.purchaseAmount||0),billNo:r.billNo,customer:r.customer?.name||''});
      }
    });
    return lots.sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  }

  function allocatedByLot(excludeBatchId=null){
    const map=new Map();
    getBatches().filter(b=>b.id!==excludeBatchId).forEach(b=>{
      (b.allocations||[]).forEach(a=>map.set(a.lotId,round2((map.get(a.lotId)||0)+Number(a.qty||0))));
    });
    return map;
  }

  function overdrawByMaterial(excludeBatchId=null){
    const map=new Map();
    getBatches().filter(b=>b.id!==excludeBatchId).forEach(b=>{
      const allocated=(b.allocations||[]).reduce((sum,a)=>sum+Number(a.qty||0),0);
      const shortage=Math.max(0,Number(b.qty||0)-allocated);
      if(shortage>0) map.set(b.material,round2((map.get(b.material)||0)+shortage));
    });
    return map;
  }

  function availableLots(excludeBatchId=null){
    const used=allocatedByLot(excludeBatchId);
    const deficits=overdrawByMaterial(excludeBatchId);
    return sourceLots().map(l=>{
      const allocated=Number(used.get(l.id)||0);
      let available=round2(Math.max(0,l.qty-allocated));
      const deficit=Number(deficits.get(l.material)||0);
      if(deficit>0 && available>0){
        const absorb=Math.min(deficit,available);
        available=round2(available-absorb);
        deficits.set(l.material,round2(deficit-absorb));
      }
      return {...l,allocated,available,unitCost:l.qty?l.amount/l.qty:0};
    });
  }

  function materialSummary(){
    const lots=sourceLots();
    const batches=getBatches();
    const map=new Map();
    lots.forEach(l=>{
      const x=map.get(l.material)||{material:l.material,purchasedKg:0,purchaseAmount:0,allocatedKg:0,availableKg:0};
      x.purchasedKg+=Number(l.qty||0); x.purchaseAmount+=Number(l.amount||0); map.set(l.material,x);
    });
    batches.forEach(b=>{
      const x=map.get(b.material)||{material:b.material,purchasedKg:0,purchaseAmount:0,allocatedKg:0,availableKg:0};
      x.allocatedKg+=Number(b.qty||0); map.set(b.material,x);
    });
    return [...map.values()].map(x=>({...x,purchasedKg:round2(x.purchasedKg),purchaseAmount:round2(x.purchaseAmount),allocatedKg:round2(x.allocatedKg),availableKg:round2(x.purchasedKg-x.allocatedKg)}));
  }

  function nextBatchNo(){
    let max=0; getBatches().forEach(b=>{const m=String(b.batchNo||'').match(/(\d+)$/);if(m)max=Math.max(max,Number(m[1]));});
    return `B-${settings.season || new Date().getFullYear()}-${String(max+1).padStart(3,'0')}`;
  }

  function selectedBatchLots(){
    const material=$('batchMaterial')?.value||''; const from=$('batchFromDate')?.value||''; const to=$('batchToDate')?.value||'';
    return availableLots(editingBatchId).filter(l=>l.material===material && (!from||l.date>=from) && (!to||l.date<=to) && l.available>0);
  }

  function allocateFIFO(lots, qty){
    let remaining=Number(qty||0), cost=0; const allocations=[];
    for(const l of lots){
      if(remaining<=0) break;
      const take=round2(Math.min(remaining,l.available));
      if(take<=0) continue;
      const lineCost=round2(take*l.unitCost);
      allocations.push({lotId:l.id,txId:l.txId,date:l.date,qty:take,unitCost:l.unitCost,cost:lineCost});
      cost=round2(cost+lineCost); remaining=round2(remaining-take);
    }
    return {allocations,cost,unfilled:remaining};
  }

  function refreshBatchMaterials(){
    const select=$('batchMaterial'); if(!select) return;
    const current=select.value;
    const mats=materialSummary().filter(x=>x.purchasedKg>0 || (editingBatchId && getBatches().find(b=>b.id===editingBatchId)?.material===x.material));
    select.innerHTML=mats.map(x=>`<option value="${escapeAttr(x.material)}">${escapeHtml(x.material)}</option>`).join('') || '<option value="">સ્ટોક ઉપલબ્ધ નથી</option>';
    if(mats.some(x=>x.material===current)) select.value=current;
  }

  function calculateBatch(){
    if(!$('batchMaterial')) return null;
    const lots=selectedBatchLots(); const available=round2(lots.reduce((s,l)=>s+l.available,0));
    let qty=round2(num('batchQty')); if(qty<0) qty=0;
    const allocation=allocateFIFO(lots,qty);
    const purchaseCost=allocation.cost; const extra=round2(num('batchProcessingCost')); const totalCost=round2(purchaseCost+extra); const sale=round2(num('batchSaleAmount')); const profit=round2(sale-totalCost);
    $('batchAvailability').textContent=`પસંદ કરેલા સમયગાળામાં ઉપલબ્ધ: ${available} કિલો${lots.length?` • ${lots.length} ખરીદી એન્ટ્રી`:''}`;
    $('batchPurchaseCost').textContent=money(purchaseCost); $('batchCostExtra').textContent=money(extra); $('batchTotalCost').textContent=money(totalCost); $('batchSaleValue').textContent=money(sale); $('batchProfit').textContent=money(Math.abs(profit));
    const box=$('batchProfitBox'); box.classList.remove('company-pays','customer-pays','settled');
    if(profit>0){box.classList.add('customer-pays');box.querySelector('span').textContent='Batch Profit';}
    else if(profit<0){box.classList.add('company-pays');box.querySelector('span').textContent='Batch Loss';}
    else {box.classList.add('settled');box.querySelector('span').textContent='Batch Profit / Loss';}
    return {lots,available,qty,allocation,purchaseCost,extra,totalCost,sale,profit};
  }

  function resetBatchForm(){
    if(!$('batchForm')) return; $('batchForm').reset(); editingBatchId=null; $('batchNo').value=nextBatchNo(); $('batchSaleDate').value=todayISO();
    const d=new Date(); const start=new Date(d.getFullYear(),d.getMonth(),1); const tz=start.getTimezoneOffset(); $('batchFromDate').value=new Date(start.getTime()-tz*60000).toISOString().slice(0,10); $('batchToDate').value=todayISO(); $('batchQty').value=0; $('batchProcessingCost').value=0; $('batchSaleAmount').value=0; refreshBatchMaterials(); calculateBatch();
  }

  function saveBatch(e){
    e.preventDefault(); const c=calculateBatch(); if(!c) return;
    if(!$('batchMaterial').value){toast('Batch માટે માલ ઉપલબ્ધ નથી');return;}
    if(c.qty<=0){toast('Batch જથ્થો નાખો');return;}
    const shortage=round2(Math.max(0,c.qty-c.available));
    if(shortage>0.001 || c.allocation.unfilled>0.001){
      const ok=confirm(`⚠️ સ્ટોક ચેતવણી\n\nઉપલબ્ધ સ્ટોક: ${c.available} કિલો\nદાખલ કરેલ વેચાણ: ${c.qty} કિલો\nવધુ જથ્થો: ${shortage} કિલો\n\nકદાચ કોઈ ખરીદી/સ્ટોક એન્ટ્રી બાકી છે. તેમ છતાં આ Batch સાચવવો છે?`);
      if(!ok) return;
    }
    const rows=getBatches(); const old=editingBatchId?rows.find(b=>b.id===editingBatchId):null;
    const rec={id:editingBatchId||crypto.randomUUID(),batchNo:$('batchNo').value,material:$('batchMaterial').value,fromDate:$('batchFromDate').value,toDate:$('batchToDate').value,saleDate:$('batchSaleDate').value,qty:c.qty,allocations:c.allocation.allocations,stockShortageKg:shortage,purchaseCost:c.purchaseCost,processingCost:c.extra,totalCost:c.totalCost,saleAmount:c.sale,profit:c.profit,note:$('batchNote').value.trim(),createdBy:old?.createdBy||currentOperator(),updatedBy:currentOperator(),deviceId:old?.deviceId||deviceId(),updatedDeviceId:deviceId(),createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
    const idx=rows.findIndex(b=>b.id===rec.id); if(idx>=0) rows[idx]=rec; else rows.push(rec); setBatches(rows);
    addAudit(old?'BATCH_UPDATE':'BATCH_CREATE','batch',rec.id,`${rec.batchNo} • ${rec.material} • ${rec.qty} કિલો`);
    toast('Batch સાચવાયો'); resetBatchForm(); renderStock();
  }

  function renderStock(){
    if(!$('stockBody')) return;
    const sum=materialSummary(); const purchased=sum.reduce((s,x)=>s+x.purchasedKg,0), allocated=sum.reduce((s,x)=>s+x.allocatedKg,0), available=sum.reduce((s,x)=>s+x.availableKg,0), profit=getBatches().reduce((s,b)=>s+Number(b.profit||0),0);
    $('stockPurchasedKg').textContent=`${round2(purchased)} કિલો`; $('stockAllocatedKg').textContent=`${round2(allocated)} કિલો`; $('stockAvailableKg').textContent=`${round2(available)} કિલો`; $('batchTotalProfit').textContent=money(profit);
    $('stockBody').innerHTML=sum.map(x=>`<tr><td>${escapeHtml(x.material)}</td><td>${x.purchasedKg} કિલો</td><td>${x.allocatedKg} કિલો</td><td><strong>${x.availableKg} કિલો${x.availableKg<0?' ⚠️':''}</strong></td><td>${money(x.purchaseAmount)}</td></tr>`).join('')||'<tr><td colspan="5">હજુ ખરીદેલ બાય-પ્રોડક્ટ સ્ટોક નથી.</td></tr>';
    const bs=getBatches().slice().reverse(); $('batchCountLabel').textContent=`${bs.length} Batch`;
    $('batchBody').innerHTML=bs.map(b=>`<tr><td>${escapeHtml(b.batchNo)}</td><td>${escapeHtml(b.material)}</td><td>${escapeHtml(b.fromDate)} થી ${escapeHtml(b.toDate)}</td><td>${Number(b.qty||0)} કિલો</td><td>${money(b.purchaseCost)}</td><td>${money(b.processingCost)}</td><td>${money(b.saleAmount)}</td><td><strong>${Number(b.profit||0)>=0?'Profit ':'Loss '}${money(Math.abs(Number(b.profit||0)))}</strong></td><td><button class="danger-btn small" data-delete-batch="${b.id}">કાઢો</button></td></tr>`).join('')||'<tr><td colspan="9">હજુ કોઈ Batch નથી.</td></tr>';
    refreshBatchMaterials(); calculateBatch();
  }

  function deleteBatch(id){
    const b=getBatches().find(x=>x.id===id); if(!b)return; if(!confirm(`${b.batchNo} કાઢવો છે? સ્ટોક પાછો ઉપલબ્ધ થઈ જશે.`))return; setBatches(getBatches().filter(x=>x.id!==id)); markDeleted(STORAGE_BATCHES,id); addAudit('BATCH_DELETE','batch',id,`${b.batchNo} • ${b.material} • ${b.qty} કિલો`); renderStock(); toast('Batch કાઢ્યો');
  }

  function todayISO(){
    const d = new Date();
    const tz = d.getTimezoneOffset();
    return new Date(d.getTime() - tz * 60000).toISOString().slice(0,10);
  }

  function nextBillNo(){
    const rows = getTx();
    const year = ( $('txDate')?.value || todayISO() ).slice(0,4);
    const same = rows.filter(r => r.business !== 'grain' && String(r.date || '').startsWith(year));
    let max = 0;
    same.forEach(r => {
      const m = String(r.billNo || '').match(/(\d+)$/);
      if (m) max = Math.max(max, Number(m[1]));
    });
    return `${settings.prefix}-${year}-${String(max + 1).padStart(4,'0')}`;
  }

  function nextGrainBillNo(){
    const rows = getTx();
    const year = ( $('grainTxDate')?.value || todayISO() ).slice(0,4);
    const same = rows.filter(r => r.business === 'grain' && String(r.date || '').startsWith(year));
    let max = 0;
    same.forEach(r => {
      const m = String(r.billNo || '').match(/(\d+)$/);
      if (m) max = Math.max(max, Number(m[1]));
    });
    return `${settings.grainPrefix}-${year}-${String(max + 1).padStart(4,'0')}`;
  }

  function oilOutputLabel(tins, extraKg){
    const parts = [];
    if (Number(tins)) parts.push(`${Number(tins)} ${Number(tins)===1?'ડબો':'ડબા'}`);
    if (Number(extraKg)) parts.push(`${Number(extraKg)} કિલો`);
    return parts.length ? parts.join(' + ') : '0';
  }

  function paymentTotal(r){ return round2((r.payments || []).reduce((s,p)=>s+Number(p.amount||0),0)); }
  function remainingFor(r){ return round2(Math.max(0, Math.abs(Number(r.settlement?.net||0)) - paymentTotal(r))); }

  function calculate(){
    const tins = num('oilTins');
    const extraKg = num('oilExtraKg');
    const totalOilKg = tins * settings.tinKg + extraKg;
    const exactPerKg = settings.jobRatePerTin / settings.tinKg;
    const job = round2(tins * settings.jobRatePerTin + extraKg * exactPerKg);

    const khol = round2(num('kholKg') * num('kholRate'));
    const tinSale = round2(num('newTinQty') * num('newTinRate'));
    const oilSale = $('oilSaleEnabled').checked ? round2(num('oilSaleQty') * num('oilSaleRate')) : 0;
    const sales = round2(tinSale + oilSale);
    const receivable = round2(job + sales);
    const payable = khol;
    const net = round2(receivable - payable);
    const initialPaid = round2(num('paidAmount'));
    const existing = lastSavedId ? getTx().find(r=>r.id===lastSavedId) : null;
    const historicalPaid = existing ? paymentTotal(existing) : 0;
    const effectivePaid = round2(Math.max(historicalPaid, initialPaid));
    const remaining = round2(Math.max(0, Math.abs(net) - effectivePaid));

    $('totalOilKg').textContent = `${round2(totalOilKg)} કિલો`;
    $('jobWorkAmount').textContent = money(job);
    $('kholAmount').textContent = money(khol);
    $('newTinAmount').textContent = money(tinSale);
    $('oilSaleAmount').textContent = money(oilSale);
    $('sumJob').textContent = money(job);
    $('sumSales').textContent = money(sales);
    $('totalReceivable').textContent = money(receivable);
    $('sumKhol').textContent = money(khol);
    $('totalPayable').textContent = money(payable);
    $('netAmount').textContent = money(Math.abs(net));

    const netBox = $('netBox');
    netBox.classList.remove('company-pays','customer-pays','settled');
    let netLabel = 'સરભર';
    if (net > 0){ netLabel = 'ખેડૂત પાસેથી લેવાના'; netBox.classList.add('customer-pays'); }
    else if (net < 0){ netLabel = 'ખેડૂતને આપવાના'; netBox.classList.add('company-pays'); }
    else { netLabel = 'સરભર પૂર્ણ'; netBox.classList.add('settled'); }
    $('netLabel').textContent = netLabel;

    $('remainingLabel').textContent = remaining > 0 ? `${netLabel} — બાકી` : 'બાકી';
    $('remainingAmount').textContent = money(remaining);

    return { tins, extraKg, totalOilKg:round2(totalOilKg), exactPerKg, job, khol, tinSale, oilSale, sales, receivable, payable, net, initialPaid, effectivePaid, remaining };
  }

  function currentRecord(){
    const c = calculate();
    const old = lastSavedId ? getTx().find(r=>r.id===lastSavedId) : null;
    let payments = old?.payments ? [...old.payments] : [];
    const oldPaid = paymentTotal(old || {payments:[]});
    if (!old && c.initialPaid > 0) {
      payments = [{
        id:crypto.randomUUID(), date:$('txDate').value, amount:c.initialPaid,
        method:$('paymentMethod').value, note:'', createdAt:new Date().toISOString()
      }];
    } else if (old && c.initialPaid > oldPaid) {
      payments.push({
        id:crypto.randomUUID(),
        date:$('txDate').value,
        amount:round2(c.initialPaid - oldPaid),
        method:$('paymentMethod').value,
        note:'',
        createdAt:new Date().toISOString()
      });
    }
    const paid = paymentTotal({payments});
    const remaining = round2(Math.max(0, Math.abs(c.net)-paid));

    return {
      id: lastSavedId || crypto.randomUUID(),
      billNo: $('billNo').value,
      date: $('txDate').value,
      business: 'oil',
      customer: {
        name: $('customerName').value.trim(),
        mobile: $('customerMobile').value.trim(),
        village: $('customerVillage').value.trim()
      },
      incoming: {
        singGoglaKg: num('singGoglaKg'),
        danaFalaKg: num('danaFalaKg')
      },
      groundnutKg: round2(num('singGoglaKg') + num('danaFalaKg')),
      oilOutput: { tins:c.tins, extraKg:c.extraKg, totalKg:c.totalOilKg },
      rates: {
        tinKg: settings.tinKg,
        jobRatePerTin: settings.jobRatePerTin,
        jobRatePerKgExact: c.exactPerKg,
        kholRate: num('kholRate'),
        newTinRate: num('newTinRate')
      },
      jobWorkAmount: c.job,
      khol: {kg:num('kholKg'), rate:num('kholRate'), amount:c.khol},
      newTin: {qty:num('newTinQty'), rate:num('newTinRate'), amount:c.tinSale},
      oilSale: {
        enabled:$('oilSaleEnabled').checked,
        unit:$('oilSaleUnit').value,
        qty:num('oilSaleQty'),
        rate:num('oilSaleRate'),
        amount:c.oilSale
      },
      settlement: {
        receivable:c.receivable,
        payable:c.payable,
        net:c.net,
        direction:c.net > 0 ? 'customer_to_company' : c.net < 0 ? 'company_to_customer' : 'settled',
        paid,
        remaining
      },
      payments,
      note:$('note').value.trim(),
      createdBy: old?.createdBy || currentOperator(),
      updatedBy: currentOperator(),
      deviceId: old?.deviceId || deviceId(),
      updatedDeviceId: deviceId(),
      createdAt: old?.createdAt || new Date().toISOString(),
      updatedAt:new Date().toISOString()
    };
  }

  function fillPreview(r){
    $('pSingGogla').textContent = r.incoming?.singGoglaKg ? `${r.incoming.singGoglaKg} કિલો` : '—';
    $('pDanaFala').textContent = r.incoming?.danaFalaKg ? `${r.incoming.danaFalaKg} કિલો` : '—';
    $('pOilOutput').textContent = oilOutputLabel(r.oilOutput.tins, r.oilOutput.extraKg);
    $('pKholQty').textContent = r.khol.kg ? `${r.khol.kg} કિલો` : '—';
    $('pName').textContent = r.customer.name || '—';
    $('pVillage').textContent = r.customer.village || '—';
    $('pDate').textContent = r.date || '—';
    $('pBill').textContent = r.billNo || '—';
    $('pJobQty').textContent = oilOutputLabel(r.oilOutput.tins, r.oilOutput.extraKg);
    $('pJobRate').textContent = `${money(r.rates.jobRatePerTin)} / ડબો`;
    $('pJobAmount').textContent = money(r.jobWorkAmount);
    $('pKholQty2').textContent = r.khol.kg ? `${r.khol.kg} કિલો` : '—';
    $('pKholRate').textContent = r.khol.kg ? `${money(r.khol.rate)}/કિલો` : '—';
    $('pKholAmount').textContent = r.khol.kg ? money(r.khol.amount) : '—';
    $('pTinQty').textContent = r.newTin.qty || '—';
    $('pTinRate').textContent = r.newTin.qty ? money(r.newTin.rate) : '—';
    $('pTinAmount').textContent = r.newTin.qty ? money(r.newTin.amount) : '—';
    $('pOilSaleQty').textContent = r.oilSale.enabled && r.oilSale.qty ? `${r.oilSale.qty} ${r.oilSale.unit}` : '—';
    $('pOilSaleRate').textContent = r.oilSale.enabled && r.oilSale.qty ? money(r.oilSale.rate) : '—';
    $('pOilSaleAmount').textContent = r.oilSale.enabled && r.oilSale.qty ? money(r.oilSale.amount) : '—';
    const label = r.settlement.net > 0 ? 'ખેડૂત પાસેથી લેવાના' : r.settlement.net < 0 ? 'ખેડૂતને આપવાના' : 'સરભર પૂર્ણ';
    $('pFinalLabel').textContent = label;
    $('pFinal').textContent = money(Math.abs(r.settlement.net));
    $('pPaid').textContent = money(paymentTotal(r));
    $('pRemaining').textContent = money(remainingFor(r));
  }

  function showPreview(){
    const r = currentRecord();
    if (!r.customer.name){ toast('ગ્રાહકનું નામ જરૂરી છે'); return; }
    if ((r.customer.mobile || '').length > 10){ toast('મોબાઇલ નંબર મહત્તમ 10 અંકનો રાખો'); return; }
    fillPreview(r);
    $('oilForm').style.display = 'none';
    $('printArea').classList.add('visible');
    clearPreparedBillPdf('oil');
    setTimeout(()=>prepareBillPdf('oil'),0);
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function hidePreview(){
    $('printArea').classList.remove('visible');
    $('oilForm').style.display = '';
  }

  function resetForm(){ hideOilAudit();
    $('oilForm').reset();
    lastSavedId = null;
    $('txDate').value = todayISO();
    $('billNo').value = nextBillNo();
    $('kholRate').value = settings.kholRate;
    $('newTinRate').value = settings.newTinRate;
    $('singGoglaKg').value = 0;
    $('danaFalaKg').value = 0;
    $('oilTins').value = 0;
    $('oilExtraKg').value = 0;
    $('kholKg').value = 0;
    $('newTinQty').value = 0;
    $('paidAmount').value = 0;
    $('paymentMethod').value = 'cash';
    $('oilSaleFields').classList.remove('enabled');
    $('customerMatchHint').textContent='';
    calculate();
  }

  function saveRecord(e){
    e.preventDefault();
    const r = currentRecord();
    if (!r.customer.name){ toast('ગ્રાહકનું નામ જરૂરી છે'); return; }
    if ((r.customer.mobile || '').length > 10){ toast('મોબાઇલ નંબર મહત્તમ 10 અંકનો રાખો'); return; }
    const rows = getTx();
    const idx = rows.findIndex(x => x.id === r.id);
    const wasExisting = idx >= 0;
    if (wasExisting) rows[idx] = r; else rows.push(r);
    setTx(rows);
    addAudit(wasExisting?'TX_UPDATE':'TX_CREATE','transaction',r.id,`${r.billNo} • ${r.customer?.name||''} • તેલ મિલ`);
    lastSavedId = r.id;
    $('paidAmount').value = paymentTotal(r);
    toast('મજૂરી કામ સાચવાયું');
    renderAll();
    fillPreview(r);
  }

  function calculateGrain(){
    const cleanKg = num('grainCleanKg');
    const badKg = num('grainBadKg');
    const totalKg = round2(cleanKg + badKg);
    const perKg = settings.grainBaseRate / settings.grainBaseKg;
    const job = round2(totalKg * perKg);

    if (!$('grainLeftoverEnabled').checked) {
      $('grainPurchaseKg').value = 0;
    } else if (!$('grainPurchaseKg').dataset.manual) {
      $('grainPurchaseKg').value = badKg;
    }
    const purchase = $('grainLeftoverEnabled').checked ? round2(num('grainPurchaseKg') * num('grainPurchaseRate')) : 0;
    const receivable = job;
    const payable = purchase;
    const net = round2(receivable - payable);
    const initialPaid = round2(num('grainPaidAmount'));
    const existing = lastSavedGrainId ? getTx().find(r=>r.id===lastSavedGrainId) : null;
    const historicalPaid = existing ? paymentTotal(existing) : 0;
    const effectivePaid = round2(Math.max(historicalPaid, initialPaid));
    const remaining = round2(Math.max(0, Math.abs(net)-effectivePaid));

    $('grainTotalKg').textContent = `${totalKg} કિલો`;
    $('grainJobAmount').textContent = money(job);
    $('grainPurchaseAmount').textContent = money(purchase);
    $('grainSumJob').textContent = money(job);
    $('grainReceivable').textContent = money(receivable);
    $('grainSumPurchase').textContent = money(purchase);
    $('grainPayable').textContent = money(payable);
    $('grainNetAmount').textContent = money(Math.abs(net));
    const box=$('grainNetBox'); box.classList.remove('company-pays','customer-pays','settled');
    let label='સરભર';
    if(net>0){label='ગ્રાહક પાસેથી લેવાના'; box.classList.add('customer-pays');}
    else if(net<0){label='ગ્રાહકને આપવાના'; box.classList.add('company-pays');}
    else {label='સરભર પૂર્ણ'; box.classList.add('settled');}
    $('grainNetLabel').textContent=label;
    $('grainRemainingLabel').textContent=remaining>0?`${label} — બાકી`:'બાકી';
    $('grainRemainingAmount').textContent=money(remaining);
    return {cleanKg,badKg,totalKg,perKg,job,purchase,receivable,payable,net,initialPaid,remaining};
  }

  function currentGrainRecord(){
    const c=calculateGrain();
    const old=lastSavedGrainId?getTx().find(r=>r.id===lastSavedGrainId):null;
    let payments=old?.payments?[...old.payments]:[];
    const oldPaid=paymentTotal(old||{payments:[]});
    if(!old && c.initialPaid>0){payments=[{id:crypto.randomUUID(),date:$('grainTxDate').value,amount:c.initialPaid,method:$('grainPaymentMethod').value,note:'',createdAt:new Date().toISOString()}];}
    else if(old && c.initialPaid>oldPaid){payments.push({id:crypto.randomUUID(),date:$('grainTxDate').value,amount:round2(c.initialPaid-oldPaid),method:$('grainPaymentMethod').value,note:'',createdAt:new Date().toISOString()});}
    const paid=paymentTotal({payments});
    const remaining=round2(Math.max(0,Math.abs(c.net)-paid));
    return {
      id:lastSavedGrainId||crypto.randomUUID(), billNo:$('grainBillNo').value, date:$('grainTxDate').value, business:'grain',
      customer:{name:$('grainCustomerName').value.trim(),mobile:$('grainCustomerMobile').value.trim(),village:$('grainCustomerVillage').value.trim()},
      grain:{commodity:$('grainCommodity').value,cleanKg:c.cleanKg,badKg:c.badKg,totalKg:c.totalKg,
        inputKg:c.totalKg,returnedKg:c.cleanKg,differenceKg:c.badKg,
        purchaseEnabled:$('grainLeftoverEnabled').checked,purchaseKg:num('grainPurchaseKg'),purchaseRate:num('grainPurchaseRate'),purchaseAmount:c.purchase},
      rates:{grainBaseKg:settings.grainBaseKg,grainBaseRate:settings.grainBaseRate,grainRatePerKgExact:c.perKg},
      jobWorkAmount:c.job,
      settlement:{receivable:c.receivable,payable:c.payable,net:c.net,direction:c.net>0?'customer_to_company':c.net<0?'company_to_customer':'settled',paid,remaining},
      payments,note:$('grainNote').value.trim(),createdBy:old?.createdBy||currentOperator(),updatedBy:currentOperator(),deviceId:old?.deviceId||deviceId(),updatedDeviceId:deviceId(),createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()
    };
  }

  function fillGrainPreview(r){
    $('gpName').textContent=r.customer?.name||'—'; $('gpVillage').textContent=r.customer?.village||'—'; $('gpDate').textContent=r.date||'—'; $('gpBill').textContent=r.billNo||'—';
    const cleanKg=Number(r.grain?.cleanKg ?? r.grain?.returnedKg ?? 0); const badKg=Number(r.grain?.badKg ?? r.grain?.differenceKg ?? 0); const totalKg=Number(r.grain?.totalKg ?? r.grain?.inputKg ?? (cleanKg+badKg));
    $('gpCommodity').textContent=r.grain?.commodity||'માલનો પ્રકાર'; $('gpTotalQty').textContent=`${totalKg} કિલો`; $('gpCleanQty').textContent=`${cleanKg} કિલો`; $('gpBadQty').textContent=`${badKg} કિલો`;
    $('gpJobRate').textContent=`${money(r.rates?.grainBaseRate||0)} / ${r.rates?.grainBaseKg||0} કિલો`; $('gpJobAmount').textContent=money(r.jobWorkAmount);
    $('gpPurchaseQty').textContent=r.grain?.purchaseEnabled?`${r.grain.purchaseKg||0} કિલો`:'—'; $('gpPurchaseRate').textContent=r.grain?.purchaseEnabled?`${money(r.grain.purchaseRate)}/કિલો`:'—'; $('gpPurchaseAmount').textContent=r.grain?.purchaseEnabled?money(r.grain.purchaseAmount):'—';
    const label=r.settlement.net>0?'ગ્રાહક પાસેથી લેવાના':r.settlement.net<0?'ગ્રાહકને આપવાના':'સરભર પૂર્ણ'; $('gpFinalLabel').textContent=label; $('gpFinal').textContent=money(Math.abs(r.settlement.net)); $('gpPaid').textContent=money(paymentTotal(r)); $('gpRemaining').textContent=money(remainingFor(r));
  }

  function showGrainPreview(){
    const r=currentGrainRecord(); if(!r.customer.name){toast('ગ્રાહકનું નામ જરૂરી છે');return;} if((r.customer.mobile||'').length>10){toast('મોબાઇલ નંબર મહત્તમ 10 અંકનો રાખો');return;}
    fillGrainPreview(r); $('grainForm').style.display='none'; $('grainPrintArea').classList.add('visible'); clearPreparedBillPdf('grain'); setTimeout(()=>prepareBillPdf('grain'),0); window.scrollTo({top:0,behavior:'smooth'});
  }
  function hideGrainPreview(){ $('grainPrintArea').classList.remove('visible'); $('grainForm').style.display=''; }

  function resetGrainForm(){ hideGrainAudit();
    $('grainForm').reset(); lastSavedGrainId=null; $('grainTxDate').value=todayISO(); $('grainBillNo').value=nextGrainBillNo(); $('grainCleanKg').value=0; $('grainBadKg').value=0; $('grainPurchaseKg').value=0; $('grainPurchaseRate').value=settings.grainPurchaseRate; $('grainPaidAmount').value=0; $('grainPaymentMethod').value='cash'; $('grainLeftoverFields').classList.remove('enabled'); $('grainPurchaseKg').dataset.manual=''; $('grainCustomerMatchHint').textContent=''; calculateGrain();
  }

  function saveGrainRecord(e){
    e.preventDefault(); const r=currentGrainRecord(); if(!r.customer.name){toast('ગ્રાહકનું નામ જરૂરી છે');return;} if((r.customer.mobile||'').length>10){toast('મોબાઇલ નંબર મહત્તમ 10 અંકનો રાખો');return;}
    const rows=getTx(); const idx=rows.findIndex(x=>x.id===r.id); const wasExisting=idx>=0; if(wasExisting) rows[idx]=r; else rows.push(r); setTx(rows); addAudit(wasExisting?'TX_UPDATE':'TX_CREATE','transaction',r.id,`${r.billNo} • ${r.customer?.name||''} • અનાજ / કઠોળ`); lastSavedGrainId=r.id; $('grainPaidAmount').value=paymentTotal(r); toast('અનાજ / કઠોળ મજૂરી કામ સાચવાયું'); renderAll(); fillGrainPreview(r);
  }

  function renderGrainCustomerSuggestions(){
    const q=$('grainCustomerName').value.trim().toLowerCase(); if(q.length<1){$('grainCustomerSuggestions').hidden=true;return;}
    const matches=getCustomers().filter(c=>[c.name,c.mobile,c.village].join(' ').toLowerCase().includes(q)).slice(0,6); if(!matches.length){$('grainCustomerSuggestions').hidden=true;return;}
    $('grainCustomerSuggestions').innerHTML=matches.map(c=>`<button type="button" data-grain-customer-key="${escapeAttr(c.key)}"><strong>${escapeHtml(c.name)}</strong><span>${escapeHtml(c.village||'')}${c.mobile?` • ${escapeHtml(c.mobile)}`:''}</span></button>`).join(''); $('grainCustomerSuggestions').hidden=false;
  }
  function selectGrainCustomer(key){
    const c=getCustomers().find(x=>x.key===key); if(!c)return; $('grainCustomerName').value=c.name; $('grainCustomerMobile').value=c.mobile||''; $('grainCustomerVillage').value=c.village||''; $('grainCustomerSuggestions').hidden=true; const due=round2(c.receivableOutstanding-c.payableOutstanding); $('grainCustomerMatchHint').textContent=`${c.count} જૂની એન્ટ્રી • છેલ્લી તારીખ ${c.lastDate||'—'}${due?` • નેટ જૂનું બાકી ${money(Math.abs(due))}`:''}`;
  }

  function editGrainRecord(r){
    lastSavedGrainId=r.id; $('grainCustomerName').value=r.customer?.name||''; $('grainCustomerMobile').value=r.customer?.mobile||''; $('grainCustomerVillage').value=r.customer?.village||''; $('grainTxDate').value=r.date||todayISO(); $('grainBillNo').value=r.billNo||'';
    $('grainCommodity').value=r.grain?.commodity||'મગ'; $('grainCleanKg').value=r.grain?.cleanKg ?? r.grain?.returnedKg ?? 0; $('grainBadKg').value=r.grain?.badKg ?? r.grain?.differenceKg ?? 0; $('grainLeftoverEnabled').checked=!!r.grain?.purchaseEnabled; $('grainLeftoverFields').classList.toggle('enabled',!!r.grain?.purchaseEnabled); $('grainPurchaseKg').value=r.grain?.purchaseKg||0; $('grainPurchaseKg').dataset.manual='1'; $('grainPurchaseRate').value=r.grain?.purchaseRate??settings.grainPurchaseRate; $('grainPaidAmount').value=paymentTotal(r); $('grainPaymentMethod').value='cash'; $('grainNote').value=r.note||''; calculateGrain(); showGrainAudit(r); showScreen('grain'); toast('જૂની અનાજ / કઠોળ એન્ટ્રી ખોલી');
  }

  function getCustomers(){
    const map = new Map();
    getTx().forEach(r=>{
      const mobile=(r.customer?.mobile||'').trim();
      const name=(r.customer?.name||'').trim();
      const village=(r.customer?.village||'').trim();
      const key = mobile ? `m:${mobile}` : `n:${name.toLowerCase()}|${village.toLowerCase()}`;
      if(!name) return;
      const prev=map.get(key) || {key,name,mobile,village,count:0,lastDate:'',receivableOutstanding:0,payableOutstanding:0,totalJob:0};
      prev.count++;
      if((r.date||'') > prev.lastDate) { prev.lastDate=r.date; prev.name=name; prev.mobile=mobile; prev.village=village; }
      const rem=remainingFor(r);
      if(r.settlement?.net>0) prev.receivableOutstanding+=rem;
      if(r.settlement?.net<0) prev.payableOutstanding+=rem;
      prev.totalJob+=Number(r.jobWorkAmount||0);
      map.set(key,prev);
    });
    return [...map.values()].sort((a,b)=>(b.lastDate||'').localeCompare(a.lastDate||''));
  }

  function renderCustomerSuggestions(){
    const q = $('customerName').value.trim().toLowerCase();
    if(q.length < 1){ $('customerSuggestions').hidden=true; return; }
    const matches=getCustomers().filter(c=>[c.name,c.mobile,c.village].join(' ').toLowerCase().includes(q)).slice(0,6);
    if(!matches.length){ $('customerSuggestions').hidden=true; return; }
    $('customerSuggestions').innerHTML=matches.map(c=>`<button type="button" data-customer-key="${escapeAttr(c.key)}"><strong>${escapeHtml(c.name)}</strong><span>${escapeHtml(c.village||'')}${c.mobile?` • ${escapeHtml(c.mobile)}`:''}</span></button>`).join('');
    $('customerSuggestions').hidden=false;
  }

  function selectCustomer(key){
    const c=getCustomers().find(x=>x.key===key);
    if(!c) return;
    $('customerName').value=c.name;
    $('customerMobile').value=c.mobile||'';
    $('customerVillage').value=c.village||'';
    $('customerSuggestions').hidden=true;
    const due = round2(c.receivableOutstanding - c.payableOutstanding);
    $('customerMatchHint').textContent = `${c.count} જૂની એન્ટ્રી • છેલ્લી તારીખ ${c.lastDate||'—'}${due?` • નેટ જૂનું બાકી ${money(Math.abs(due))}`:''}`;
  }


  function ownerTodayISO(){return todayISO();}

  function ownerTodaySalesTotal(){
    const today=ownerTodayISO();
    let total=0;
    getCompanySales().filter(r=>r.date===today).forEach(r=>total+=Number(r.total||0));
    getGrainSales().filter(r=>r.date===today).forEach(r=>total+=Number(r.total||0));
    getRetailSales().filter(r=>r.date===today).forEach(r=>total+=Number(r.total||0));
    return round2(total);
  }

  function ownerTodayPurchaseTotal(){
    if(!window.SwatiCore?.getPurchases) return 0;
    const today=ownerTodayISO();
    return round2(window.SwatiCore.getPurchases().filter(r=>r.date===today).reduce((s,r)=>s+Number(r.amount||0),0));
  }

  function ownerTodayExpenseTotal(){
    if(!window.SwatiCore?.getExpenses) return 0;
    const today=ownerTodayISO();
    return round2(window.SwatiCore.getExpenses().filter(r=>r.date===today).reduce((s,r)=>s+Number(r.amount||0),0));
  }

  function ownerTodayJobWorkTotal(){
    const today=ownerTodayISO();
    return round2(getTx().filter(r=>r.date===today).reduce((s,r)=>s+Number(r.jobWorkAmount||0),0));
  }

  function ownerProductionSnapshot(){
    const oilRows=getCompanyBatches();
    const grainRows=getGrainProductionRuns();
    return {
      oilKg:round2(oilRows.reduce((s,r)=>s+Number(r.oilKg||0),0)),
      kholKg:round2(oilRows.reduce((s,r)=>s+Number(r.khaliKg||r.kholKg||0),0)),
      grainGoodKg:round2(grainRows.reduce((s,r)=>s+Number(r.goodKg||0),0)),
      grainWasteKg:round2(grainRows.reduce((s,r)=>s+Number(r.wasteKg||0),0))
    };
  }

  function ownerAttentionItems(){
    const items=[];

    // Receivable/payable priority
    if(window.SwatiCore){
      const f=window.SwatiCore.financeSummary();
      const jobTx=getTx();
      const jobReceivable=round2(jobTx.filter(r=>r.settlement?.net>0).reduce((s,r)=>s+remainingFor(r),0));
      const jobPayable=round2(jobTx.filter(r=>r.settlement?.net<0).reduce((s,r)=>s+remainingFor(r),0));
      const receivable=round2(Number(f.salesOutstanding||0)+jobReceivable);
      const payable=round2(Number(f.purchaseOutstanding||0)+jobPayable);

      if(receivable>0) items.push({level:'info',title:'Receivables',text:`લેવાના બાકી ${money(receivable)}`,screen:'finance'});
      if(payable>0) items.push({level:'warn',title:'Payables',text:`આપવાના બાકી ${money(payable)}`,screen:'finance'});
    }

    // Low / negative stock
    if(window.SwatiCore?.stockSnapshot){
      const low=window.SwatiCore.stockSnapshot()
        .filter(r=>Number(r.balance)<=0)
        .slice(0,4);
      low.forEach(r=>items.push({
        level:'warn',
        title:r.itemName||r.itemId||'Stock',
        text:`Stock ${r.balance} ${r.unitName||''}`,
        screen:'stock-management'
      }));
    }

    // Salary outstanding
    if(typeof getStaff==='function'){
      const total=round2(getStaff().reduce((s,x)=>s+staffSalaryPosition(x).outstanding,0));
      if(total>0) items.push({level:'info',title:'Staff Salary',text:`Outstanding ${money(total)}`,screen:'staff'});
    }

    return items.slice(0,8);
  }

  function renderOwnerHomeDashboard(){
    if(!$('ownerHomeDashboard')) return;

    const today=ownerTodayISO();
    if($('ownerHomeDate')){
      const d=new Date(`${today}T00:00:00`);
      $('ownerHomeDate').textContent=d.toLocaleDateString('gu-IN',{day:'2-digit',month:'short',year:'numeric'});
    }

    if(window.SwatiCore){
      const f=window.SwatiCore.financeSummary();
      const costing=window.SwatiCore.costingSummary?window.SwatiCore.costingSummary():{totalStockValue:0};
      const jobTx=getTx();
      const jobReceivable=round2(jobTx.filter(r=>r.settlement?.net>0).reduce((s,r)=>s+remainingFor(r),0));
      const jobPayable=round2(jobTx.filter(r=>r.settlement?.net<0).reduce((s,r)=>s+remainingFor(r),0));
      const liquid=round2(Number(f.cashBalance||0)+Number(f.bankBalance||0));
      const receivable=round2(Number(f.salesOutstanding||0)+jobReceivable);
      const payable=round2(Number(f.purchaseOutstanding||0)+jobPayable);

      if($('ownerHomeLiquid')) $('ownerHomeLiquid').textContent=money(liquid);
      if($('ownerHomeReceivable')) $('ownerHomeReceivable').textContent=money(receivable);
      if($('ownerHomePayable')) $('ownerHomePayable').textContent=money(payable);
      if($('ownerHomeStockValue')) $('ownerHomeStockValue').textContent=money(costing.totalStockValue||0);
    }

    if($('ownerTodaySales')) $('ownerTodaySales').textContent=money(ownerTodaySalesTotal());
    if($('ownerTodayPurchases')) $('ownerTodayPurchases').textContent=money(ownerTodayPurchaseTotal());
    if($('ownerTodayExpenses')) $('ownerTodayExpenses').textContent=money(ownerTodayExpenseTotal());
    if($('ownerTodayJobWork')) $('ownerTodayJobWork').textContent=money(ownerTodayJobWorkTotal());

    const p=ownerProductionSnapshot();
    if($('ownerOilProduced')) $('ownerOilProduced').textContent=`${p.oilKg} kg`;
    if($('ownerKholProduced')) $('ownerKholProduced').textContent=`${p.kholKg} kg`;
    if($('ownerGrainProcessed')) $('ownerGrainProcessed').textContent=`${p.grainGoodKg} kg`;
    if($('ownerGrainWaste')) $('ownerGrainWaste').textContent=`${p.grainWasteKg} kg`;

    const attention=ownerAttentionItems();
    if($('ownerAttentionCount')) $('ownerAttentionCount').textContent=String(attention.length);
    if($('ownerAttentionList')){
      $('ownerAttentionList').innerHTML=attention.map(a=>`
        <button class="owner-attention-row ${a.level==='warn'?'attention-warn':'attention-info'}" type="button" data-owner-attention-go="${escapeAttr(a.screen)}">
          <span><strong>${escapeHtml(a.title)}</strong><small>${escapeHtml(a.text)}</small></span>
          <span>›</span>
        </button>`).join('')||'<div class="empty">હાલ કોઈ priority alert નથી.</div>';
    }
  }

  function renderDashboard(){
    const all=getTx();
    const today=todayISO();
    const rows=all.filter(r=>r.date===today);

    // Existing job-work summary.
    const todayJobAmount=round2(rows.reduce((s,r)=>s+Number(r.jobWorkAmount||0),0));
    const todayOutstandingAmount=round2(rows.reduce((s,r)=>s+remainingFor(r),0));

    if($('todayCount')) $('todayCount').textContent=rows.length;
    if($('todayJob')) $('todayJob').textContent=money(todayJobAmount);
    if($('todayKhol')) $('todayKhol').textContent=money(rows.reduce((s,r)=>s+Number(r.khol?.amount||0),0));
    if($('todayOutstanding')) $('todayOutstanding').textContent=money(todayOutstandingAmount);
    if($('allCustomers')) $('allCustomers').textContent=getCustomers().length;
    if($('allTxCount')) $('allTxCount').textContent=all.length;
    if($('allReceivableOutstanding')) $('allReceivableOutstanding').textContent=money(all.filter(r=>r.settlement?.net>0).reduce((s,r)=>s+remainingFor(r),0));
    if($('allPayableOutstanding')) $('allPayableOutstanding').textContent=money(all.filter(r=>r.settlement?.net<0).reduce((s,r)=>s+remainingFor(r),0));

    // New main-screen direct summaries.
    if($('todayJobWorkAmount')) $('todayJobWorkAmount').textContent=money(todayJobAmount);
    if($('todayJobWorkBills')) $('todayJobWorkBills').textContent=String(rows.length);

    const todayBatches=getCompanyBatches().filter(x=>x.date===today);
    const todayOil=round2(todayBatches.reduce((s,x)=>s+Number(x.oilKg||0),0));
    if($('todayProductionOilKg')) $('todayProductionOilKg').textContent=String(todayOil);
    if($('todayProductionBatches')) $('todayProductionBatches').textContent=String(todayBatches.length);

    const todaySales=getCompanySales().filter(x=>x.date===today);
    const todaySalesAmount=round2(todaySales.reduce((s,x)=>s+Number(x.total||0),0));
    if($('todayCompanySalesAmount')) $('todayCompanySalesAmount').textContent=money(todaySalesAmount);
    if($('todayCompanySalesCount')) $('todayCompanySalesCount').textContent=String(todaySales.length);

    const stock=companyStock();
    if($('homeOilStockKg')) $('homeOilStockKg').textContent=String(stock.oilAvailableKg);
    if($('homeTinStock')) $('homeTinStock').textContent=String(stock.tinsAvailable);
    if($('homeRawStockKg')) $('homeRawStockKg').textContent=String(stock.rawAvailable);
    if($('homeKholStockKg')) $('homeKholStockKg').textContent=String(stock.khaliAvailable);

    if($('homeTodayDate')){
      const d=new Date(`${today}T00:00:00`);
      $('homeTodayDate').textContent=d.toLocaleDateString('gu-IN',{day:'2-digit',month:'short',year:'numeric'});
    }
    renderOwnerHomeDashboard();
  }

  let selectedCustomerVillage='';
  let selectedCustomerKey='';
  let currentCustomerMode='oil-jobwork';


  function customerModeLabel(mode){
    return {
      'oil-jobwork':'તેલ મીલના મજૂરી કામના ગ્રાહકો',
      'grain-jobwork':'અનાજ / કઠોળ મજૂરી કામના ગ્રાહકો',
      'oil-retail':'તેલ રિટેલ ગ્રાહકો',
      'grain-retail':'અનાજ / કઠોળ રિટેલ ગ્રાહકો'
    }[mode]||'તેલ મીલના મજૂરી કામના ગ્રાહકો';
  }

  function jobWorkCustomersByBusiness(business){
    const map=new Map();
    getTx().filter(r=>(r.business||'oil')===business).forEach(r=>{
      const mobile=(r.customer?.mobile||'').trim();
      const name=(r.customer?.name||'').trim();
      const village=(r.customer?.village||'').trim();
      const key=mobile?`m:${mobile}`:`n:${name.toLowerCase()}|${village.toLowerCase()}`;
      if(!name) return;
      const prev=map.get(key)||{key,name,mobile,village,count:0,lastDate:'',receivableOutstanding:0,payableOutstanding:0,totalJob:0};
      prev.count++;
      if((r.date||'')>prev.lastDate){prev.lastDate=r.date;prev.name=name;prev.mobile=mobile;prev.village=village;}
      const rem=remainingFor(r);
      if(r.settlement?.net>0) prev.receivableOutstanding+=rem;
      if(r.settlement?.net<0) prev.payableOutstanding+=rem;
      prev.totalJob+=Number(r.jobWorkAmount||0);
      map.set(key,prev);
    });
    return [...map.values()].sort((a,b)=>(b.lastDate||'').localeCompare(a.lastDate||''));
  }

  function retailCustomersByBusiness(category){
    const map=new Map();
    getRetailSales().filter(r=>r.category===category).forEach(r=>{
      const name=(r.customer||'').trim();
      const mobile=(r.mobile||'').trim();
      const village=(r.village||'').trim();
      const key=mobile?`m:${mobile}`:`n:${name.toLowerCase()}|${village.toLowerCase()}`;
      if(!name) return;
      const prev=map.get(key)||{key,name,mobile,village,count:0,lastDate:'',receivableOutstanding:0,payableOutstanding:0,totalJob:0,totalSales:0};
      prev.count++;
      if((r.date||'')>prev.lastDate) prev.lastDate=r.date||'';
      prev.totalSales+=Number(r.total||0);
      prev.receivableOutstanding+=Number(r.outstanding||0);
      map.set(key,prev);
    });
    return [...map.values()].sort((a,b)=>(b.lastDate||'').localeCompare(a.lastDate||''));
  }

  function getCustomersForMode(){
    if(currentCustomerMode==='oil-jobwork') return jobWorkCustomersByBusiness('oil');
    if(currentCustomerMode==='grain-jobwork') return jobWorkCustomersByBusiness('grain');
    if(currentCustomerMode==='oil-retail') return retailCustomersByBusiness('oil');
    if(currentCustomerMode==='grain-retail') return retailCustomersByBusiness('grain');
    return [];
  }

  function setCustomerMode(mode,rerender=true){
    const valid=['oil-jobwork','grain-jobwork','oil-retail','grain-retail'];
    currentCustomerMode=valid.includes(mode)?mode:'oil-jobwork';
    selectedCustomerVillage='';
    selectedCustomerKey='';
    document.querySelectorAll('[data-customer-list-mode]').forEach(b=>b.classList.toggle('active',b.dataset.customerListMode===currentCustomerMode));
    if($('customerModeTitle')) $('customerModeTitle').textContent=customerModeLabel(currentCustomerMode);
    if($('customerVillageView')) $('customerVillageView').hidden=false;
    if($('customerListView')) $('customerListView').hidden=true;
    if($('customerDetailView')) $('customerDetailView').hidden=true;
    if(rerender) renderCustomers();
  }

  function customerVillageGroups(){
    const map=new Map();
    getCustomersForMode().forEach(c=>{
      const village=(c.village||'ગામ નથી').trim()||'ગામ નથી';
      const x=map.get(village)||{village,customers:[],count:0,totalJob:0,receivableOutstanding:0,payableOutstanding:0,lastDate:''};
      x.customers.push(c);
      x.count++;
      x.totalJob+=Number(c.totalJob||0);
      x.receivableOutstanding+=Number(c.receivableOutstanding||0);
      x.payableOutstanding+=Number(c.payableOutstanding||0);
      if((c.lastDate||'')>x.lastDate) x.lastDate=c.lastDate||'';
      map.set(village,x);
    });
    return [...map.values()].sort((a,b)=>a.village.localeCompare(b.village,'gu'));
  }

  function showCustomerVillageHome(){
    selectedCustomerVillage='';
    selectedCustomerKey='';
    $('customerVillageView').hidden=false;
    $('customerListView').hidden=true;
    $('customerDetailView').hidden=true;
    if($('customerSearch')) $('customerSearch').value='';
    renderCustomers();
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function showVillageCustomers(village){
    selectedCustomerVillage=village;
    selectedCustomerKey='';
    $('customerVillageView').hidden=true;
    $('customerListView').hidden=false;
    $('customerDetailView').hidden=true;
    $('customerSelectedVillage').textContent=village;
    if($('customerWithinVillageSearch')) $('customerWithinVillageSearch').value='';
    renderCustomers();
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function showCustomerDetail(key){
    const c=getCustomersForMode().find(x=>x.key===key);
    if(!c) return;
    selectedCustomerKey=key;
    $('customerVillageView').hidden=true;
    $('customerListView').hidden=true;
    $('customerDetailView').hidden=false;
    $('customerDetailName').textContent=c.name;

    if(currentCustomerMode.endsWith('-retail')){
      const category=currentCustomerMode.startsWith('oil-')?'oil':'grain';
      const tx=getRetailSales().filter(r=>{
        if(r.category!==category) return false;
        const mobile=(r.mobile||'').trim(),name=(r.customer||'').trim(),village=(r.village||'').trim();
        const rkey=mobile?`m:${mobile}`:`n:${name.toLowerCase()}|${village.toLowerCase()}`;
        return rkey===key;
      }).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
      $('customerDetailCard').innerHTML=`
        <div class="customer-detail-top"><div><span>ગામ</span><strong>${escapeHtml(c.village||'—')}</strong></div><div><span>મોબાઇલ</span><strong>${escapeHtml(c.mobile||'—')}</strong></div></div>
        <div class="customer-detail-stats">
          <div><span>કુલ વેચાણ એન્ટ્રી</span><strong>${c.count}</strong></div>
          <div><span>કુલ વેચાણ</span><strong>${money(c.totalSales||0)}</strong></div>
          <div><span>લેવાના બાકી</span><strong>${money(c.receivableOutstanding||0)}</strong></div>
          <div><span>પ્રકાર</span><strong>${category==='oil'?'તેલ રિટેલ':'અનાજ / કઠોળ રિટેલ'}</strong></div>
        </div>
        <div class="customer-detail-history"><h3>તાજેતરનું વેચાણ</h3>
          ${tx.slice(0,8).map(r=>`<div class="customer-tx-row"><span><strong>${escapeHtml(r.item||'—')}</strong><small>${escapeHtml(r.date||'—')} • ${r.qty||0} ${escapeHtml(r.unit||'')}</small></span><span><strong>${money(r.total||0)}</strong><small>બાકી ${money(r.outstanding||0)}</small></span></div>`).join('')||'<div class="empty">વેચાણ એન્ટ્રી નથી.</div>'}
        </div>`;
      return;
    }

    const business=currentCustomerMode==='grain-jobwork'?'grain':'oil';
    const tx=getTx().filter(r=>{
      if((r.business||'oil')!==business) return false;
      const mobile=(r.customer?.mobile||'').trim(),name=(r.customer?.name||'').trim(),village=(r.customer?.village||'').trim();
      const rkey=mobile?`m:${mobile}`:`n:${name.toLowerCase()}|${village.toLowerCase()}`;
      return rkey===key;
    }).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
    $('customerDetailCard').innerHTML=`
      <div class="customer-detail-top"><div><span>ગામ</span><strong>${escapeHtml(c.village||'—')}</strong></div><div><span>મોબાઇલ</span><strong>${escapeHtml(c.mobile||'—')}</strong></div></div>
      <div class="customer-detail-stats"><div><span>કુલ એન્ટ્રી</span><strong>${c.count}</strong></div><div><span>કુલ મજૂરી</span><strong>${money(c.totalJob)}</strong></div><div><span>લેવાના બાકી</span><strong>${money(c.receivableOutstanding)}</strong></div><div><span>આપવાના બાકી</span><strong>${money(c.payableOutstanding)}</strong></div></div>
      <div class="customer-detail-history"><h3>તાજેતરની એન્ટ્રીઓ</h3>
        ${tx.slice(0,8).map(r=>`<button type="button" class="customer-tx-row" data-customer-open-tx="${escapeAttr(r.id)}"><span><strong>${escapeHtml(r.billNo||'—')}</strong><small>${escapeHtml(r.date||'—')} • ${business==='grain'?'અનાજ / કઠોળ':'તેલ મીલ'}</small></span><span><strong>${money(r.jobWorkAmount||0)}</strong><small>બાકી ${money(remainingFor(r))}</small></span></button>`).join('')||'<div class="empty">એન્ટ્રી નથી.</div>'}
      </div>`;
  }

  function renderCustomers(){
    const modeRows=getCustomersForMode();
    if($('customerModeTitle')) $('customerModeTitle').textContent=customerModeLabel(currentCustomerMode);
    if($('customerModeCount')) $('customerModeCount').textContent=String(modeRows.length);
    const villageView=$('customerVillageView');
    if(villageView && !villageView.hidden){
      const q=($('customerSearch')?.value||'').trim().toLowerCase();
      const groups=customerVillageGroups().filter(v=>v.village.toLowerCase().includes(q));
      $('customerVillageCount').textContent=`${groups.length} ગામ`;
      $('customerVillageList').innerHTML=groups.map(v=>`
        <button type="button" class="village-card" data-open-village="${escapeAttr(v.village)}">
          <span class="village-card-icon">⌖</span>
          <span class="village-card-copy">
            <strong>${escapeHtml(v.village)}</strong>
            <small>${v.count} ગ્રાહકો • ${v.lastDate?`છેલ્લી ${escapeHtml(v.lastDate)} • `:''}મજૂરી ${money(v.totalJob)}</small>
          </span>
          <span class="village-card-due">
            <small>બાકી</small>
            <strong>${money(Math.abs(round2(v.receivableOutstanding-v.payableOutstanding)))}</strong>
          </span>
          <span class="village-card-arrow">›</span>
        </button>`).join('')||'<div class="empty">ગામ મળ્યું નથી.</div>';
      return;
    }

    if($('customerListView') && !$('customerListView').hidden){
      const q=($('customerWithinVillageSearch')?.value||'').trim().toLowerCase();
      const rows=getCustomersForMode().filter(c=>(c.village||'ગામ નથી')===selectedCustomerVillage)
        .filter(c=>[c.name,c.mobile].join(' ').toLowerCase().includes(q));
      $('customerCountLabel').textContent=`${rows.length} ગ્રાહકો`;
      $('customerList').innerHTML=rows.map(c=>`<button type="button" class="customer-card customer-card-button" data-open-customer="${escapeAttr(c.key)}">
        <span><strong>${escapeHtml(c.name)}</strong><span class="muted">${c.mobile?escapeHtml(c.mobile):'મોબાઇલ નથી'}</span><span class="customer-meta">${c.count} એન્ટ્રી • ${currentCustomerMode.endsWith('-retail')?`વેચાણ ${money(c.totalSales||0)}`:`મજૂરી ${money(c.totalJob||0)}`}</span></span>
        <span class="customer-due"><small>નેટ બાકી</small><strong>${money(Math.abs(round2(c.receivableOutstanding-c.payableOutstanding)))}</strong></span>
        <span class="customer-card-arrow">›</span>
      </button>`).join('')||'<div class="empty">ગ્રાહક મળ્યો નથી.</div>';
    }
  }


  function hydrateCompanyOperator(){
    if(!$('productionOperator')) return;
    const ops=getOperators();
    $('productionOperator').innerHTML=ops.map(x=>`<option value="${escapeAttr(x)}">${escapeHtml(x)}</option>`).join('');
    if(currentOperator()) $('productionOperator').value=currentOperator();
  }

  function rawPurchaseCalc(){
    const qty=Number($('rawQtyKg')?.value||0),rate=Number($('rawRateKg')?.value||0),paid=Number($('rawPaid')?.value||0);
    const total=round2(qty*rate),out=round2(Math.max(0,total-paid));
    if($('rawPurchaseTotal')) $('rawPurchaseTotal').textContent=money(total);
    if($('rawPurchaseOutstanding')) $('rawPurchaseOutstanding').textContent=money(out);
    return {total,out};
  }

  function productionCalc(){
    const input=Number($('productionInputKg')?.value||0),oil=Number($('productionOilKg')?.value||0),khali=Number($('productionKholKg')?.value||0),loss=Number($('productionLossKg')?.value||0);
    const balance=round2(input-oil-khali-loss);
    const oilYield=input?round2(oil/input*100):0,khaliYield=input?round2(khali/input*100):0;
    if($('productionOilYield')) $('productionOilYield').textContent=`${oilYield}%`;
    if($('productionKholYield')) $('productionKholYield').textContent=`${khaliYield}%`;
    if($('productionBalanceCheck')) $('productionBalanceCheck').textContent=`${balance} kg`;
    const warn=$('productionWarning');
    if(warn){
      const stock=companyStock(),msgs=[];
      if(input>stock.rawAvailable+0.001) msgs.push(`Raw stock કરતાં ${round2(input-stock.rawAvailable)} kg વધારે input છે.`);
      if(Math.abs(balance)>1) msgs.push(`Input અને outputમાં ${Math.abs(balance)} kgનો ફરક છે.`);
      warn.textContent=msgs.join(' ');
      warn.hidden=!msgs.length;
    }
    return {input,oil,khali,loss,balance,oilYield,khaliYield};
  }

  function companySaleCalc(){
    const product=$('companySaleProduct')?.value||'oil';
    const unit=$('companySaleUnit')?.value||'tin';
    const tinCount=Number($('companySaleTinCount')?.value||0),kg=Number($('companySaleKg')?.value||0);
    const qty=unit==='tin'?tinCount:kg;
    const oilKg=product==='oil'?(unit==='tin'?round2(tinCount*15):round2(kg)):0;
    const rate=Number($('companySaleRate')?.value||0),paid=Number($('companySalePaid')?.value||0);
    const total=round2(qty*rate),out=round2(Math.max(0,total-paid));
    if($('companySaleTotal')) $('companySaleTotal').textContent=money(total);
    if($('companySaleOutstanding')) $('companySaleOutstanding').textContent=money(out);
    const stock=companyStock(),warn=$('companySaleStockWarning');
    let bad=false,msg='';
    if(product==='khol'){
      bad=kg>stock.khaliAvailable+0.001;
      if(bad) msg=`સ્ટોકમાં માત્ર ${stock.khaliAvailable} kg ખોળ ઉપલબ્ધ છે.`;
    }else if(unit==='tin'){
      bad=tinCount>stock.tinsAvailable;
      if(bad) msg=`સ્ટોકમાં માત્ર ${stock.tinsAvailable} ટીન ઉપલબ્ધ છે.`;
    }else{
      bad=oilKg>stock.oilAvailableKg+0.001;
      if(bad) msg=`સ્ટોકમાં માત્ર ${stock.oilAvailableKg} kg તેલ ઉપલબ્ધ છે.`;
    }
    if(warn){warn.hidden=!bad;warn.textContent=msg;}
    return {product,unit,tinCount,kg,oilKg,qty,total,out,bad};
  }

  function renderCompanyProduction(){
    if($('rawPurchaseDate') && !$('rawPurchaseDate').value) $('rawPurchaseDate').value=todayISO();
    if($('productionDate') && !$('productionDate').value) $('productionDate').value=todayISO();
    if($('productionBatchNo') && !$('productionBatchNo').value) $('productionBatchNo').value=nextProductionBatchNo();
    hydrateCompanyOperator(); rawPurchaseCalc(); productionCalc();

    const purchases=getCompanyPurchases().slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,8);
    if($('rawPurchaseCount')) $('rawPurchaseCount').textContent=String(getCompanyPurchases().length);
    if($('rawPurchaseList')) $('rawPurchaseList').innerHTML=purchases.map(x=>`<div class="mini-list-row"><span><strong>${escapeHtml(x.supplier||'—')}</strong><small>${escapeHtml(x.date||'')} • ${escapeHtml(x.village||'')}</small></span><span><strong>${x.qtyKg} kg</strong><small>${money(x.total)}</small></span></div>`).join('')||'<div class="empty">હજુ ખરીદી નથી.</div>';

    const batches=getCompanyBatches().slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,8);
    if($('productionBatchCount')) $('productionBatchCount').textContent=String(getCompanyBatches().length);
    if($('productionBatchList')) $('productionBatchList').innerHTML=batches.map(x=>`<div class="mini-list-row"><span><strong>${escapeHtml(x.batchNo)}</strong><small>${escapeHtml(x.date)} • ${escapeHtml(x.operator||'')}</small></span><span><strong>${x.oilKg} kg oil</strong><small>${x.inputKg} kg input</small></span></div>`).join('')||'<div class="empty">હજુ બેચ નથી.</div>';
  }

  function renderCompanyStock(){
    const s=companyStock();
    if($('companyRawStockKg')) $('companyRawStockKg').textContent=`${s.rawAvailable} kg`;
    if($('companyRawStockMeta')) $('companyRawStockMeta').textContent=`ખરીદી ${s.rawPurchased} kg • વપરાશ ${s.rawUsed} kg`;
    if($('companyOilStockKg')) $('companyOilStockKg').textContent=`${s.oilAvailableKg} kg`;
    if($('companyOilStockMeta')) $('companyOilStockMeta').textContent=`પ્રોડક્શન ${s.oilProduced} kg • વેચાણ ${s.oilSoldKg} kg`;
    if($('companyTinStock')) $('companyTinStock').textContent=`${s.tinsAvailable} ટીન`;
    if($('companyTinStockMeta')) $('companyTinStockMeta').textContent=`ભરેલા ${s.tinsFilled} • વેચાયેલા ${s.tinsSold}`;
    if($('companyKholStockKg')) $('companyKholStockKg').textContent=`${s.khaliAvailable} kg`;
    if($('companyKholStockMeta')) $('companyKholStockMeta').textContent=`બન્યો ${s.khaliProduced} kg • વેચાણ ${s.khaliSoldKg||0} kg`;

    const rows=getCompanyBatches().slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    if($('companyProductionHistoryBody')) $('companyProductionHistoryBody').innerHTML=rows.map(x=>`<tr><td>${escapeHtml(x.date)}</td><td>${escapeHtml(x.batchNo)}</td><td>${x.inputKg} kg</td><td>${x.oilKg} kg</td><td>${x.khaliKg} kg</td><td>${x.lossKg} kg</td><td>${x.tinCount}</td></tr>`).join('')||'<tr><td colspan="7">હજુ ડેટા નથી.</td></tr>';
  }

  function renderCompanySales(){
    if($('companySaleDate') && !$('companySaleDate').value) $('companySaleDate').value=todayISO();
    companySaleCalc();
    const rows=getCompanySales().slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,10);
    if($('companySalesCount')) $('companySalesCount').textContent=String(getCompanySales().length);
    if($('companySalesList')) $('companySalesList').innerHTML=rows.map(x=>`<div class="mini-list-row"><span><strong>${escapeHtml(x.customer||'—')}</strong><small>${escapeHtml(x.date)} • ${escapeHtml(x.village||'')}</small></span><span class="row-actions"><strong>${money(x.total)}</strong><small>${x.unit==='tin'?`${x.tinCount} ટીન`:`${x.kg} kg`} • બાકી ${money(x.outstanding)}</small><button type="button" class="edit-chip" data-edit-company-sale="${escapeAttr(x.id)}">Edit / સુધારો</button></span></div>`).join('')||'<div class="empty">હજુ વેચાણ નથી.</div>';
  }


  const PURCHASE_PRESETS = {
    oil_mill: {
      production: [
        {name:'મગફળી',id:'oil.raw.groundnut',category:'raw_material',unit:'kg'},
        {name:'ખાલી 15 કિલો ટીન',id:'oil.packaging.empty_tin_15kg',category:'packaging',unit:'tin'},
        {name:'શણના કોથળા',id:'oil.packaging.jute_bag',category:'packaging',unit:'bag'},
        {name:'મશીનરી / Parts',id:'oil.machinery.parts',category:'machinery',unit:'piece'},
        {name:'અન્ય',id:'oil.other.purchase',category:'other',unit:'piece'}
      ],
      job_work: [
        {name:'ખાલી 15 કિલો ટીન',id:'oil.jobwork.empty_tin_15kg',category:'packaging',unit:'tin'},
        {name:'શણના કોથળા',id:'oil.jobwork.jute_bag',category:'packaging',unit:'bag'},
        {name:'મશીનરી / Parts',id:'oil.jobwork.machinery_parts',category:'machinery',unit:'piece'},
        {name:'અન્ય',id:'oil.jobwork.other',category:'other',unit:'piece'}
      ]
    },
    grain_pulse: {
      production: [
        {name:'અનાજ / કઠોળ',id:'grain.raw.material',category:'raw_material',unit:'kg'},
        {name:'ખાલી બેગ',id:'grain.packaging.empty_bag',category:'packaging',unit:'bag'},
        {name:'મશીનરી / Parts',id:'grain.machinery.parts',category:'machinery',unit:'piece'},
        {name:'અન્ય',id:'grain.other.purchase',category:'other',unit:'piece'}
      ],
      job_work: [
        {name:'ખાલી બેગ',id:'grain.jobwork.empty_bag',category:'packaging',unit:'bag'},
        {name:'મશીનરી / Parts',id:'grain.jobwork.machinery_parts',category:'machinery',unit:'piece'},
        {name:'અન્ય',id:'grain.jobwork.other',category:'other',unit:'piece'}
      ]
    }
  };

  let selectedPurchasePreset = null;

  function renderPurchasePresets(){
    const div=$('purchaseDivision')?.value||'oil_mill';
    const unit=$('purchaseUnit')?.value||'production';
    const rows=PURCHASE_PRESETS[div]?.[unit]||[];
    if(!$('purchasePresetItems')) return;
    $('purchasePresetItems').innerHTML=rows.map((x,i)=>`
      <button type="button" class="purchase-preset-btn ${selectedPurchasePreset?.id===x.id?'active':''}" data-purchase-preset="${i}">
        <span>${escapeHtml(x.name)}</span>
      </button>`).join('');
  }

  function selectPurchasePreset(index){
    const div=$('purchaseDivision')?.value||'oil_mill';
    const unit=$('purchaseUnit')?.value||'production';
    const x=PURCHASE_PRESETS[div]?.[unit]?.[Number(index)];
    if(!x) return;
    selectedPurchasePreset=x;
    $('purchaseItemName').value=x.name;
    $('purchaseCategory').value=x.category;
    $('purchaseQtyUnit').value=x.unit;
    renderPurchasePresets();
  }

  function purchaseCalc(){
    const qty=Number($('purchaseQty')?.value||0);
    const rate=Number($('purchaseRate')?.value||0);
    const paid=Number($('purchasePaid')?.value||0);
    const transport=Number($('purchaseTransport')?.value||0);
    const loading=Number($('purchaseLoading')?.value||0);
    const unloading=Number($('purchaseUnloading')?.value||0);
    const goods=round2(qty*rate);
    const extra=round2(transport+loading+unloading);
    const landed=round2(goods+extra);

    const partyName=$('purchaseParty')?.value.trim()||'';
    const ledger=(partyName && window.SwatiCore)?window.SwatiCore.partyLedger(partyName):{advance:0};
    const priorAdvance=round2(Number(ledger.advance||0));
    const useAdvance=!!$('purchaseUseAdvance')?.checked;
    const advanceApplied=useAdvance?round2(Math.min(priorAdvance,goods)):0;
    const effectiveSettlement=round2(paid+advanceApplied);
    const outstanding=round2(Math.max(0,goods-effectiveSettlement));
    const advance=round2(Math.max(0,priorAdvance+paid-goods));

    if($('purchaseGoodsTotal')) $('purchaseGoodsTotal').textContent=money(goods);
    if($('purchaseExtraTotal')) $('purchaseExtraTotal').textContent=money(extra);
    if($('purchaseLandedTotal')) $('purchaseLandedTotal').textContent=money(landed);
    if($('purchaseOutstanding')) $('purchaseOutstanding').textContent=money(outstanding);
    if($('purchaseAdvance')) $('purchaseAdvance').textContent=money(advance);

    if($('purchaseAdvanceUseCard')){
      $('purchaseAdvanceUseCard').hidden=priorAdvance<=0;
      $('purchasePriorAdvance').textContent=money(priorAdvance);
      $('purchaseAdvanceApplied').textContent=money(advanceApplied);
    }

    return {qty,rate,paid,transport,loading,unloading,goods,extra,landed,priorAdvance,useAdvance,advanceApplied,effectiveSettlement,outstanding,advance};
  }

  function purchaseDivisionLabel(v){
    return v==='grain_pulse'?'અનાજ / કઠોળ':'તેલ મીલ';
  }

  function purchaseUnitLabel(v){
    return v==='job_work'?'મજૂરી કામ':'ઉત્પાદન / પ્રોસેસિંગ';
  }

  function renderCorePurchases(){
    if(!$('purchaseEntryView')) return;
    if($('purchaseDate') && !$('purchaseDate').value) $('purchaseDate').value=todayISO();
    if($('partyPaymentDate') && !$('partyPaymentDate').value) $('partyPaymentDate').value=todayISO();
    if(!selectedPurchasePreset){
      const div=$('purchaseDivision')?.value||'oil_mill';
      const unit=$('purchaseUnit')?.value||'production';
      selectedPurchasePreset=PURCHASE_PRESETS[div]?.[unit]?.[0]||null;
      if(selectedPurchasePreset){
        $('purchaseItemName').value=selectedPurchasePreset.name;
        $('purchaseCategory').value=selectedPurchasePreset.category;
        $('purchaseQtyUnit').value=selectedPurchasePreset.unit;
      }
    }
    renderPurchasePresets();
    purchaseCalc();

    const rows=(window.SwatiCore?.list('purchases')||[]).slice().sort((a,b)=>
      String(b.date||'').localeCompare(String(a.date||'')) || String(b.createdAt||'').localeCompare(String(a.createdAt||''))
    );
    if($('purchaseRecentCount')) $('purchaseRecentCount').textContent=String(rows.length);
    if($('purchaseRecentList')) $('purchaseRecentList').innerHTML=rows.slice(0,8).map(r=>`
      <div class="mini-list-row purchase-mini-row">
        <span>
          <strong>${escapeHtml(r.itemName||'—')}</strong>
          <small>${escapeHtml(r.date||'')} • ${purchaseDivisionLabel(r.context?.division)} • ${purchaseUnitLabel(r.context?.unit)}</small>
        </span>
        <span>
          <strong>${money(r.amount||0)}</strong>
          <small>${r.qty||0} ${escapeHtml(r.unitName||'')} • બાકી ${money(r.outstanding||0)}</small>
        </span>
      </div>`).join('')||'<div class="empty">હજુ ખરીદી નથી.</div>';


    const partyName=$('purchaseParty')?.value.trim()||'';

    if($('purchasePartySuggestions') && window.SwatiCore?.listParties){
      $('purchasePartySuggestions').innerHTML=window.SwatiCore.listParties()
        .map(name=>`<option value="${escapeHtml(name)}"></option>`).join('');
    }

    if($('purchasePartyLedger')){
      if(partyName && window.SwatiCore){
        const pl=window.SwatiCore.partyLedger(partyName);
        $('purchasePartyLedger').hidden=false;
        $('purchasePartyLedgerName').textContent=partyName;
        $('partyPurchaseTotal').textContent=money(pl.purchaseTotal);
        $('partyPaymentTotal').textContent=money(pl.paymentTotal);
        $('partyPayable').textContent=money(pl.payable);
        $('partyAdvance').textContent=money(pl.advance);

        if($('partyBalanceBadge')){
          if(pl.payable>0){
            $('partyBalanceBadge').textContent=`Payable ${money(pl.payable)}`;
            $('partyBalanceBadge').className='module-badge due';
          }else if(pl.advance>0){
            $('partyBalanceBadge').textContent=`Advance ${money(pl.advance)}`;
            $('partyBalanceBadge').className='module-badge success';
          }else{
            $('partyBalanceBadge').textContent='Settled';
            $('partyBalanceBadge').className='module-badge blue';
          }
        }

        if($('partyLedgerTxnCount')) $('partyLedgerTxnCount').textContent=String(pl.transactions?.length||0);
        if($('partyLedgerTransactions')){
          const tx=(pl.transactions||[]).slice().reverse();
          $('partyLedgerTransactions').innerHTML=tx.map(t=>{
            const isPurchase=t.type==='purchase';
            const bal=Number(t.runningBalance||0);
            const balText=bal>0?`Advance ${money(bal)}`:bal<0?`Payable ${money(Math.abs(bal))}`:'Settled';
            return `<div class="party-ledger-row">
              <span>
                <strong>${isPurchase?'ખરીદી':'પેમેન્ટ'} • ${escapeHtml(t.title||'')}</strong>
                <small>${escapeHtml(t.date||'')}${t.note?` • ${escapeHtml(t.note)}`:''}</small>
              </span>
              <span class="${isPurchase?'ledger-debit':'ledger-credit'}">
                <strong>${isPurchase?'-':'+'}${money(t.amount||0)}</strong>
                <small>${balText}</small>
              </span>
            </div>`;
          }).join('')||'<div class="empty">આ Party માટે હજી transaction નથી.</div>';
        }
      } else {
        $('purchasePartyLedger').hidden=true;
      }
    }

    purchaseCalc();
    renderPurchaseHistory();
  }

  function renderPurchaseHistory(){
    if(!$('purchaseHistoryList')) return;
    const div=$('purchaseHistoryDivision')?.value||'all';
    const unit=$('purchaseHistoryUnit')?.value||'all';
    const q=($('purchaseHistorySearch')?.value||'').trim().toLowerCase();

    let rows=(window.SwatiCore?.list('purchases')||[]).slice();
    rows=rows.filter(r=>div==='all'||r.context?.division===div);
    rows=rows.filter(r=>unit==='all'||r.context?.unit===unit);
    rows=rows.filter(r=>!q||`${r.party||''} ${r.itemName||''}`.toLowerCase().includes(q));
    rows.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));

    const amount=round2(rows.reduce((s,r)=>s+Number(r.amount||0),0));
    const outstanding=round2(rows.reduce((s,r)=>s+Number(r.outstanding||0),0));

    $('purchaseHistoryAmount').textContent=money(amount);
    $('purchaseHistoryOutstanding').textContent=money(outstanding);
    $('purchaseHistoryCount').textContent=String(rows.length);

    $('purchaseHistoryList').innerHTML=rows.map(r=>`
      <div class="purchase-history-card">
        <div class="purchase-history-top">
          <span>
            <strong>${escapeHtml(r.itemName||'—')}</strong>
            <small>${escapeHtml(r.party||'Supplier નથી')} • ${escapeHtml(r.date||'')}</small>
          </span>
          <span class="purchase-history-amount">${money(r.amount||0)}</span>
        </div>
        <div class="purchase-history-tags">
          <span>${purchaseDivisionLabel(r.context?.division)}</span>
          <span>${purchaseUnitLabel(r.context?.unit)}</span>
          <span>${r.qty||0} ${escapeHtml(r.unitName||'')}</span>
          ${Number(r.outstanding||0)>0?`<span class="due">બાકી ${money(r.outstanding)}</span>`:''}
          <button type="button" class="edit-chip" data-edit-purchase="${escapeAttr(r.id)}">Edit / સુધારો</button>
        </div>
      </div>`).join('')||'<div class="empty">ખરીદી મળી નથી.</div>';
  }

  function resetPurchaseEntry(){
    $('corePurchaseForm')?.reset();
    if($('purchaseDate')) $('purchaseDate').value=todayISO();
    if($('purchaseDivision')) $('purchaseDivision').value='oil_mill';
    if($('purchaseUnit')) $('purchaseUnit').value='production';
    if($('purchasePaid')) $('purchasePaid').value='0';
    if($('purchaseUseAdvance')) $('purchaseUseAdvance').checked=true;
    if($('partyPaymentDate')) $('partyPaymentDate').value=todayISO();
    ['purchaseTransport','purchaseLoading','purchaseUnloading'].forEach(id=>{if($(id)) $(id).value='0';});
    selectedPurchasePreset=null;
    renderCorePurchases();
  }


  const EXPENSE_PRESETS = [
    {category:'electricity',label:'ઇલેક્ટ્રિસિટી'},
    {category:'daily_labour',label:'Daily Labour'},
    {category:'salary',label:'Salary'},
    {category:'transportation',label:'Transport'},
    {category:'loading',label:'Loading'},
    {category:'unloading',label:'Unloading'},
    {category:'cold_storage',label:'Cold Storage'},
    {category:'machinery_repair',label:'Repair'}
  ];

  function expenseDivisionLabel(v){
    if(v==='oil_mill') return 'તેલ મીલ';
    if(v==='grain_pulse') return 'અનાજ / કઠોળ';
    return 'આખી કંપની';
  }

  function expenseUnitLabel(v){
    if(v==='production') return 'ઉત્પાદન / પ્રોસેસિંગ';
    if(v==='job_work') return 'મજૂરી કામ';
    return 'Common';
  }

  function renderExpensePresets(){
    if(!$('expensePresetGrid')) return;
    $('expensePresetGrid').innerHTML=EXPENSE_PRESETS.map(x=>`
      <button type="button" class="expense-preset-btn" data-expense-preset="${escapeAttr(x.category)}">${escapeHtml(x.label)}</button>
    `).join('');
  }

  function renderExpenses(){
    if(!$('expenseEntryView')) return;
    if($('expenseDate') && !$('expenseDate').value) $('expenseDate').value=todayISO();
    renderExpensePresets();

    const rows=(window.SwatiCore?.list('expenses')||[]).slice().sort((a,b)=>
      String(b.date||'').localeCompare(String(a.date||'')) || String(b.createdAt||'').localeCompare(String(a.createdAt||''))
    );

    const today=todayISO();
    const month=today.slice(0,7);
    const todayTotal=round2(rows.filter(r=>r.date===today).reduce((s,r)=>s+Number(r.amount||0),0));
    const monthTotal=round2(rows.filter(r=>String(r.date||'').startsWith(month)).reduce((s,r)=>s+Number(r.amount||0),0));
    const allTotal=round2(rows.reduce((s,r)=>s+Number(r.amount||0),0));

    $('expenseTodayTotal').textContent=money(todayTotal);
    $('expenseMonthTotal').textContent=money(monthTotal);
    $('expenseAllTotal').textContent=money(allTotal);
    $('expenseRecentCount').textContent=String(rows.length);

    $('expenseRecentList').innerHTML=rows.slice(0,8).map(r=>`
      <div class="mini-list-row">
        <span>
          <strong>${escapeHtml(r.title||r.category||'ખર્ચ')}</strong>
          <small>${escapeHtml(r.date||'')} • ${expenseDivisionLabel(r.context?.division)} • ${expenseUnitLabel(r.context?.unit)}</small>
        </span>
        <span>
          <strong>${money(r.amount||0)}</strong>
          <small>${r.paymentMode==='bank'?'બેંક / UPI':'રોકડ'}</small>
        </span>
      </div>`).join('')||'<div class="empty">હજુ ખર્ચ નથી.</div>';

    renderExpenseHistory();
  }

  function renderExpenseHistory(){
    if(!$('expenseHistoryList')) return;
    const div=$('expenseHistoryDivision')?.value||'all';
    const unit=$('expenseHistoryUnit')?.value||'all';
    const cat=$('expenseHistoryCategory')?.value||'all';
    let rows=(window.SwatiCore?.list('expenses')||[]).slice();

    rows=rows.filter(r=>div==='all'||r.context?.division===div);
    rows=rows.filter(r=>unit==='all'||r.context?.unit===unit);
    rows=rows.filter(r=>cat==='all'||r.category===cat);
    rows.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));

    const total=round2(rows.reduce((s,r)=>s+Number(r.amount||0),0));
    $('expenseHistoryTotal').textContent=money(total);
    $('expenseHistoryCount').textContent=String(rows.length);
    $('expenseHistoryAverage').textContent=money(rows.length?round2(total/rows.length):0);

    $('expenseHistoryList').innerHTML=rows.map(r=>`
      <div class="purchase-history-card">
        <div class="purchase-history-top">
          <span><strong>${escapeHtml(r.title||r.category||'ખર્ચ')}</strong><small>${escapeHtml(r.date||'')} • ${escapeHtml(r.party||'')}</small></span>
          <span class="purchase-history-amount">${money(r.amount||0)}</span>
        </div>
        <div class="purchase-history-tags">
          <span>${expenseDivisionLabel(r.context?.division)}</span>
          <span>${expenseUnitLabel(r.context?.unit)}</span>
          <span>${escapeHtml(r.category||'other')}</span>
          <span>${r.paymentMode==='bank'?'બેંક / UPI':'રોકડ'}</span>
          <button type="button" class="edit-chip" data-edit-expense="${escapeAttr(r.id)}">Edit / સુધારો</button>
        </div>
      </div>`).join('')||'<div class="empty">ખર્ચ મળ્યો નથી.</div>';
  }




  function stockItemIdFromName(name){
    return String(name||'').trim().toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu,'_')
      .replace(/^_+|_+$/g,'')||`item_${Date.now()}`;
  }

  function renderStockManagement(){
    if(!window.SwatiCore || !$('stockMgmtList')) return;
    if($('stockAdjustmentDate') && !$('stockAdjustmentDate').value) $('stockAdjustmentDate').value=todayISO();

    const q=($('stockMgmtSearch')?.value||'').trim().toLowerCase();
    const rows=window.SwatiCore.stockSnapshot();
    const filtered=rows.filter(r=>[r.itemName,r.itemId,r.unitName].join(' ').toLowerCase().includes(q));

    if($('stockMgmtItemCount')) $('stockMgmtItemCount').textContent=String(rows.length);
    if($('stockMgmtPositiveCount')) $('stockMgmtPositiveCount').textContent=String(rows.filter(r=>Number(r.balance)>0).length);
    if($('stockMgmtLowCount')) $('stockMgmtLowCount').textContent=String(rows.filter(r=>Number(r.balance)<=0).length);

    $('stockMgmtList').innerHTML=filtered.map(r=>`
      <div class="stock-mgmt-card">
        <div class="stock-mgmt-head">
          <span>
            <strong>${escapeHtml(r.itemName||r.itemId||'Item')}</strong>
            <small>${escapeHtml(r.itemId||'')} • ${escapeHtml(r.unitName||'')}</small>
          </span>
          <strong class="${Number(r.balance)<0?'stock-negative':Number(r.balance)===0?'stock-zero':'stock-positive'}">${r.balance}</strong>
        </div>
        <div class="stock-movement-grid">
          <div><span>Opening</span><strong>${r.openingQty||0}</strong></div>
          <div><span>Purchase In</span><strong>${r.purchaseIn||0}</strong></div>
          <div><span>Production In</span><strong>${r.productionIn||0}</strong></div>
          <div><span>Adjustment In</span><strong>${r.adjustmentIn||0}</strong></div>
          <div><span>Production Use</span><strong>${r.productionConsumption||0}</strong></div>
          <div><span>Sale Out</span><strong>${r.saleOut||0}</strong></div>
          <div><span>Usage</span><strong>${r.usageOut||0}</strong></div>
          <div><span>Adjustment Out</span><strong>${r.adjustmentOut||0}</strong></div>
        </div>
        <div class="stock-mgmt-total">
          <span>Available Stock</span>
          <strong>${r.balance} ${escapeHtml(r.unitName||'')}</strong>
        </div>
      </div>`).join('')||'<div class="empty">હજુ stock movement નથી.</div>';
  }


  function renderCosting(){
    if(!window.SwatiCore?.costingSummary || !$('costingList')) return;
    const c=window.SwatiCore.costingSummary();
    const q=($('costingSearch')?.value||'').trim().toLowerCase();
    const rows=c.rows.filter(r=>[r.itemName,r.itemId,r.unitName].join(' ').toLowerCase().includes(q));

    if($('costingTotalStockValue')) $('costingTotalStockValue').textContent=money(c.totalStockValue||0);
    if($('costingTotalPurchaseValue')) $('costingTotalPurchaseValue').textContent=money(c.totalPurchaseValue||0);
    if($('costingTotalProcessingCost')) $('costingTotalProcessingCost').textContent=money(c.totalProcessingExpense||0);
    if($('costingMoneyTied')) $('costingMoneyTied').textContent=money(c.totalStockValue||0);

    $('costingList').innerHTML=rows.map(r=>`
      <div class="costing-card">
        <div class="costing-head">
          <span>
            <strong>${escapeHtml(r.itemName||r.itemId||'Item')}</strong>
            <small>${escapeHtml(r.itemId||'')} • ${escapeHtml(r.unitName||'')}</small>
          </span>
          <strong>${money(r.stockValue||0)}</strong>
        </div>

        <div class="costing-grid">
          <div><span>Available</span><strong>${r.balance}</strong></div>
          <div><span>Avg Purchase Cost</span><strong>${money(r.avgPurchaseCost||0)}</strong></div>
          <div><span>Processing Cost / Unit</span><strong>${money(r.processingCostPerUnit||0)}</strong></div>
          <div><span>Estimated Unit Cost</span><strong>${money(r.estimatedUnitCost||0)}</strong></div>
        </div>
      </div>`).join('')||'<div class="empty">Costing માટે હજી પૂરતો data નથી.</div>';
  }

  function renderFinance(){
    if(!window.SwatiCore) return;

    const f=window.SwatiCore.financeSummary();
    const owner=window.SwatiCore.ownerFinanceSnapshot
      ? window.SwatiCore.ownerFinanceSnapshot()
      : {
          cash:Number(f.cashBalance||0),
          bank:Number(f.bankBalance||0),
          liquidMoney:round2(Number(f.cashBalance||0)+Number(f.bankBalance||0)),
          receivables:Number(f.salesOutstanding||0),
          payables:Number(f.purchaseOutstanding||0),
          stockValue:window.SwatiCore?.costingSummary?window.SwatiCore.costingSummary().totalStockValue:0,
          ownedWorkingAssets:0,
          netWorkingPosition:0,
          loanLimit:Number(f.loanLimit||0),
          loanUsed:Number(f.loanUsed||0),
          loanAvailable:Number(f.loanAvailable||0)
        };

    const jobTx=getTx();
    const jobReceivable=round2(jobTx.filter(r=>r.settlement?.net>0).reduce((s,r)=>s+remainingFor(r),0));
    const jobPayable=round2(jobTx.filter(r=>r.settlement?.net<0).reduce((s,r)=>s+remainingFor(r),0));

    const totalReceivable=round2(Number(owner.receivables||0)+jobReceivable);
    const totalPayable=round2(Number(owner.payables||0)+jobPayable);
    const ownedWorkingAssets=round2(Number(owner.liquidMoney||0)+Number(owner.stockValue||0)+totalReceivable);
    const netWorkingPosition=round2(ownedWorkingAssets-totalPayable);

    if($('financeCashBalance')) $('financeCashBalance').textContent=money(owner.cash||0);
    if($('financeBankBalance')) $('financeBankBalance').textContent=money(owner.bank||0);
    if($('financeLiquid')) $('financeLiquid').textContent=money(owner.liquidMoney||0);
    if($('financeStockValue')) $('financeStockValue').textContent=money(owner.stockValue||0);
    if($('financeReceivable')) $('financeReceivable').textContent=money(totalReceivable);
    if($('financePayable')) $('financePayable').textContent=money(totalPayable);

    if($('financeOwnedWorkingAssets')) $('financeOwnedWorkingAssets').textContent=money(ownedWorkingAssets);
    if($('financePayablesForPosition')) $('financePayablesForPosition').textContent=money(totalPayable);
    if($('financeNetWorkingPosition')) {
      $('financeNetWorkingPosition').textContent=money(netWorkingPosition);
      $('financeNetWorkingPosition').classList.toggle('finance-negative',netWorkingPosition<0);
      $('financeNetWorkingPosition').classList.toggle('finance-positive',netWorkingPosition>=0);
    }

    if($('financeWhereStock')) $('financeWhereStock').textContent=money(owner.stockValue||0);
    if($('financeWhereReceivable')) $('financeWhereReceivable').textContent=money(totalReceivable);

    if($('financeLoanLimit')) $('financeLoanLimit').textContent=money(owner.loanLimit||0);
    if($('financeLoanUsed')) $('financeLoanUsed').textContent=money(owner.loanUsed||0);
    if($('financeLoanAvailable')) $('financeLoanAvailable').textContent=money(owner.loanAvailable||0);

    if($('financePurchaseTotal')) $('financePurchaseTotal').textContent=money(f.purchaseAmount||0);
    if($('financeExpenseTotal')) $('financeExpenseTotal').textContent=money(f.expensesAmount||0);
    if($('financeSalesOutstanding')) $('financeSalesOutstanding').textContent=money(totalReceivable);
    if($('financePurchaseOutstanding')) $('financePurchaseOutstanding').textContent=money(totalPayable);

    if($('financeBankList')){
      const banks=window.SwatiCore.getBankAccounts?window.SwatiCore.getBankAccounts():[];
      const rows=[
        {name:'Cash',balance:owner.cash||0},
        ...banks.map(b=>({name:b.name||b.bankName||'Bank',balance:Number(b.balance||b.openingBalance||0)}))
      ];
      $('financeBankList').innerHTML=rows.map(r=>`
        <div class="mini-list-row">
          <span><strong>${escapeHtml(r.name||'')}</strong><small>${r.name==='Cash'?'Physical cash':'Bank balance'}</small></span>
          <strong>${money(r.balance||0)}</strong>
        </div>`).join('')||'<div class="empty">હજુ cash/bank data નથી.</div>';
    }

    const settings=window.SwatiCore.getFinanceSettings?window.SwatiCore.getFinanceSettings():{openingCash:0,loanFacilities:[]};
    if($('financeOpeningCash') && document.activeElement!==$('financeOpeningCash')) $('financeOpeningCash').value=Number(settings.openingCash||0);

    const manageBanks=window.SwatiCore.getBankAccounts?window.SwatiCore.getBankAccounts():[];
    if($('financeBankManageList')){
      $('financeBankManageList').innerHTML=manageBanks.map(b=>`
        <div class="finance-manage-row">
          <span><strong>${escapeHtml(b.bankName||'Bank')}</strong><small>${escapeHtml(b.accountName||'')} • ${escapeHtml(b.accountType||'current')}</small></span>
          <span><strong>${money(b.openingBalance||0)}</strong><small>Opening Balance</small></span>
          <button type="button" class="ghost" data-edit-bank="${escapeAttr(b.id)}">Edit / સુધારો</button>
        </div>`).join('')||'<div class="empty">હજુ bank account ઉમેરેલ નથી.</div>';
    }

    const facilities=Array.isArray(settings.loanFacilities)?settings.loanFacilities:[];
    if($('financeLoanManageList')){
      $('financeLoanManageList').innerHTML=facilities.map(l=>`
        <div class="finance-manage-row">
          <span><strong>${escapeHtml(l.name||'Facility')}</strong><small>Used ${money(l.used||0)}</small></span>
          <span><strong>${money(l.sanctioned||0)}</strong><small>Sanctioned</small></span>
          <button type="button" class="ghost edit-chip" data-edit-loan="${escapeAttr(l.id)}">Edit / સુધારો</button>
        </div>`).join('')||'<div class="empty">હજુ loan / credit facility ઉમેરેલ નથી.</div>';
    }

  }



  function setEditMode(prefix,id,saveText){
    const idEl=$(`${prefix}EditId`); if(idEl) idEl.value=id||'';
    const save=$(`${prefix}SaveBtn`); if(save && saveText) save.textContent=saveText;
    const cancel=$(`${prefix}EditCancelBtn`); if(cancel) cancel.hidden=!id;
  }

  function clearEditMode(prefix,defaultText){
    const idEl=$(`${prefix}EditId`); if(idEl) idEl.value='';
    const save=$(`${prefix}SaveBtn`); if(save && defaultText) save.textContent=defaultText;
    const cancel=$(`${prefix}EditCancelBtn`); if(cancel) cancel.hidden=true;
  }

  function linkedCoreSaleBySourceId(sourceId){
    return (window.SwatiCore?.list('sales')||[]).find(s=>s.context?.notes===sourceId);
  }

  function renderUsage(){
    if($('usageDate') && !$('usageDate').value) $('usageDate').value=todayISO();
    const rows=(window.SwatiCore?.list('usageMovements')||[]).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
    if($('usageCount')) $('usageCount').textContent=String(rows.length);
    if($('usageRecentList')) $('usageRecentList').innerHTML=rows.slice(0,10).map(r=>`
      <div class="mini-list-row">
        <span>
          <strong>${escapeHtml(r.itemName||'—')}</strong>
          <small>${escapeHtml(r.date||'')} • ${expenseDivisionLabel(r.context?.division)} • ${expenseUnitLabel(r.context?.unit)}</small>
        </span>
        <span class="row-actions"><strong>${r.qty||0} ${escapeHtml(r.unitName||'')}</strong><button type="button" class="edit-chip" data-edit-usage="${escapeAttr(r.id)}">Edit / સુધારો</button></span>
      </div>`).join('')||'<div class="empty">હજુ usage નથી.</div>';
  }

  function estimateStockValue(){
    if(!window.SwatiCore) return 0;
    const purchases=window.SwatiCore.list('purchases')||[];
    const stock=window.SwatiCore.stockSnapshot()||[];
    let total=0;
    stock.forEach(s=>{
      const itemPurchases=purchases.filter(p=>p.itemId===s.itemId && Number(p.baseQty||p.qty||0)>0);
      const totalCost=itemPurchases.reduce((a,p)=>a+Number(p.amount||0),0);
      const totalQty=itemPurchases.reduce((a,p)=>a+Number(p.baseQty||p.qty||0),0);
      const avg=totalQty>0?totalCost/totalQty:0;
      total+=Math.max(0,Number(s.balance||0))*avg;
    });
    return round2(total);
  }


  function renderGrainStock(){
    if(!window.SwatiCore || !$('grainStockList')) return;
    const rows=window.SwatiCore.stockSnapshot()
      .filter(x=>String(x.itemId||'').startsWith('grain.') || String(x.itemName||'').includes('અનાજ') || String(x.itemName||'').includes('કઠોળ'));
    $('grainStockItemCount').textContent=String(rows.length);
    $('grainStockList').innerHTML=rows.map(x=>`
      <div class="finance-stock-row">
        <span><strong>${escapeHtml(x.itemName||x.itemId||'Item')}</strong><small>${escapeHtml(x.unitName||'')}</small></span>
        <span><strong>${x.balance}</strong><small>In ${x.inQty} • Out ${x.outQty}</small></span>
      </div>`).join('')||'<div class="empty">હજુ Grain/Pulse stock movement નથી.</div>';
  }


  const RETAIL_SALES_KEY='swati_retail_sales_v1';
  function getRetailSales(){try{return JSON.parse(localStorage.getItem(RETAIL_SALES_KEY)||'[]')}catch{return []}}
  function saveRetailSales(rows){localStorage.setItem(RETAIL_SALES_KEY,JSON.stringify(rows));notifyDataChanged('retail_sales');}
  function retailCalc(){
    const qty=Number($('retailQty')?.value||0),rate=Number($('retailRate')?.value||0),paid=Number($('retailPaid')?.value||0);
    const total=round2(qty*rate),out=round2(Math.max(0,total-paid));
    if($('retailTotal')) $('retailTotal').textContent=money(total);
    if($('retailOutstanding')) $('retailOutstanding').textContent=money(out);
    return {qty,rate,paid,total,out};
  }
  function renderRetailSales(){
    if($('retailSaleDate') && !$('retailSaleDate').value) $('retailSaleDate').value=todayISO();
    retailCalc();
    const rows=getRetailSales().slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
    if($('retailSalesCount')) $('retailSalesCount').textContent=String(rows.length);
    if($('retailSalesList')) $('retailSalesList').innerHTML=rows.slice(0,10).map(r=>`<div class="mini-list-row"><span><strong>${escapeHtml(r.item||'—')}</strong><small>${escapeHtml(r.date||'')} • ${escapeHtml(r.customer||'Retail')}</small></span><span class="row-actions"><strong>${money(r.total||0)}</strong><small>${r.qty||0} ${escapeHtml(r.unit||'')} • બાકી ${money(r.outstanding||0)}</small><button type="button" class="edit-chip" data-edit-retail="${escapeAttr(r.id)}">Edit / સુધારો</button></span></div>`).join('')||'<div class="empty">હજુ retail sale નથી.</div>';
    const map=new Map();
    rows.forEach(r=>{const k=(r.mobile||`${r.customer}|${r.village}`).trim().toLowerCase();if(!k)return;const x=map.get(k)||{name:r.customer||'',mobile:r.mobile||'',village:r.village||'',count:0,total:0};x.count++;x.total+=Number(r.total||0);map.set(k,x);});
    const customers=[...map.values()];
    if($('retailCustomerCount')) $('retailCustomerCount').textContent=String(customers.length);
    if($('retailCustomerList')) $('retailCustomerList').innerHTML=customers.map(c=>`<div class="mini-list-row"><span><strong>${escapeHtml(c.name||'—')}</strong><small>${escapeHtml(c.village||'')} • ${escapeHtml(c.mobile||'')}</small></span><span><strong>${money(c.total)}</strong><small>${c.count} sales</small></span></div>`).join('')||'<div class="empty">હજુ retail customer નથી.</div>';
  }


  const GRAIN_PRODUCTION_KEY='swati_grain_company_production_v1';

  function getGrainProductionRuns(){
    try{return JSON.parse(localStorage.getItem(GRAIN_PRODUCTION_KEY)||'[]')}catch{return []}
  }
  function saveGrainProductionRuns(rows){localStorage.setItem(GRAIN_PRODUCTION_KEY,JSON.stringify(rows));notifyDataChanged('grain_production');}

  function normalizeGrainWeight(qty,unit){
    const n=Number(qty||0);
    if(unit==='ton') return round2(n*1000);
    if(unit==='mann') return round2(n*20);
    return round2(n);
  }

  function grainStockItemId(name,type='raw'){
    const slug=String(name||'').trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'_').replace(/^_+|_+$/g,'');
    return `grain.${type}.${slug||Date.now()}`;
  }

  function grainBagItemId(name){
    const slug=String(name||'').trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'_').replace(/^_+|_+$/g,'');
    return `packaging.bag.${slug||Date.now()}`;
  }

  function grainRawStockAvailable(itemId,itemName){
    if(!window.SwatiCore) return 0;
    const rows=window.SwatiCore.stockSnapshot();
    const row=rows.find(r=>r.itemId===itemId) || rows.find(r=>String(r.itemName||'').trim().toLowerCase()===String(itemName||'').trim().toLowerCase());
    return round2(Number(row?.balance||0));
  }

  function grainProductionCalc(){
    const inputKg=normalizeGrainWeight($('grainProdInputQty')?.value,$('grainProdInputUnit')?.value);
    const goodKg=round2(Number($('grainProdGoodQty')?.value||0));
    const wasteKg=round2(Number($('grainProdWasteQty')?.value||0));
    const lossKg=round2(Number($('grainProdLossQty')?.value||0));
    const output=round2(goodKg+wasteKg+lossKg);
    const diff=round2(inputKg-output);
    const yieldPct=inputKg>0?round2(goodKg/inputKg*100):0;
    const totalCost=round2(
      Number($('grainProdLabourCost')?.value||0)+
      Number($('grainProdElectricityCost')?.value||0)+
      Number($('grainProdPackagingCost')?.value||0)+
      Number($('grainProdStorageCost')?.value||0)+
      Number($('grainProdOtherCost')?.value||0)
    );
    if($('grainProdInputSummary')) $('grainProdInputSummary').textContent=`${inputKg} kg`;
    if($('grainProdOutputSummary')) $('grainProdOutputSummary').textContent=`${output} kg`;
    if($('grainProdBalanceDiff')) $('grainProdBalanceDiff').textContent=`${diff} kg`;
    if($('grainProdYield')) $('grainProdYield').textContent=`${yieldPct}%`;
    if($('grainProdTotalCost')) $('grainProdTotalCost').textContent=money(totalCost);
    const warn=$('grainProdBalanceWarning');
    if(warn){
      const bad=Math.abs(diff)>0.05;
      warn.hidden=!bad;
      warn.textContent=bad?`Input અને Outputમાં ${diff} kg difference છે.`:'';
    }
    return {inputKg,goodKg,wasteKg,lossKg,diff,yieldPct,totalCost};
  }

  function renderGrainProduction(){
    if($('grainProdDate') && !$('grainProdDate').value) $('grainProdDate').value=todayISO();
    if($('grainProdOperator')){
      const ops=getOperators();
      $('grainProdOperator').innerHTML=ops.map(x=>`<option value="${escapeAttr(x)}">${escapeHtml(x)}</option>`).join('');
      if(currentOperator()) $('grainProdOperator').value=currentOperator();
    }
    if(window.SwatiCore){
      const stock=window.SwatiCore.stockSnapshot();
      if($('grainRawItemSuggestions')){
        $('grainRawItemSuggestions').innerHTML=stock
          .filter(r=>String(r.itemId||'').startsWith('grain.') || /wheat|moong|chana|ઘઉં|મગ|ચણા|અનાજ|કઠોળ/i.test(String(r.itemName||'')))
          .map(r=>`<option value="${escapeAttr(r.itemName||r.itemId)}"></option>`).join('');
      }
      if($('grainBagSuggestions')){
        $('grainBagSuggestions').innerHTML=stock.filter(r=>/bag|બેગ|કોથળ/i.test(String(r.itemName||'')))
          .map(r=>`<option value="${escapeAttr(r.itemName||r.itemId)}"></option>`).join('');
      }
    }
    const rawName=$('grainProdRawItem')?.value.trim()||'';
    const rawId=$('grainProdRawItemId')?.value.trim()||grainStockItemId(rawName,'raw');
    const avail=rawName?grainRawStockAvailable(rawId,rawName):0;
    if($('grainRawAvailable')) $('grainRawAvailable').textContent=`${avail} kg`;

    grainProductionCalc();
    const rows=getGrainProductionRuns().slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
    if($('grainProductionCount')) $('grainProductionCount').textContent=String(rows.length);
    if($('grainProductionList')) $('grainProductionList').innerHTML=rows.slice(0,12).map(r=>`
      <div class="mini-list-row">
        <span><strong>${escapeHtml(r.goodItem||'Processed')}</strong><small>${escapeHtml(r.date||'')} • ${escapeHtml(r.rawItem||'Raw')} ${r.inputKg||0} kg</small></span>
        <span><strong>${r.goodKg||0} kg</strong><small>Waste ${r.wasteKg||0} kg • Cost ${money(r.totalCost||0)}</small></span>
      </div>`).join('')||'<div class="empty">હજુ Grain/Pulse processing entry નથી.</div>';
  }


  const GRAIN_SALES_KEY='swati_grain_company_sales_v1';

  function getGrainSales(){
    try{return JSON.parse(localStorage.getItem(GRAIN_SALES_KEY)||'[]')}catch{return []}
  }

  function saveGrainSales(rows){
    localStorage.setItem(GRAIN_SALES_KEY,JSON.stringify(rows));
    notifyDataChanged('grain_sales');
  }

  function grainSaleBaseQty(){
    const qty=Number($('grainSaleQty')?.value||0);
    const unit=$('grainSaleUnit')?.value||'kg';
    return normalizeGrainWeight(qty,unit);
  }

  function grainSaleItemId(name,type){
    const slug=String(name||'').trim().toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu,'_')
      .replace(/^_+|_+$/g,'');
    return `grain.${type}.${slug||Date.now()}`;
  }

  function grainSaleAvailable(itemId,itemName){
    if(!window.SwatiCore) return 0;
    const rows=window.SwatiCore.stockSnapshot();
    const row=rows.find(r=>r.itemId===itemId) ||
      rows.find(r=>String(r.itemName||'').trim().toLowerCase()===String(itemName||'').trim().toLowerCase());
    return round2(Number(row?.balance||0));
  }

  function grainSaleCalc(){
    const qtyEntered=Number($('grainSaleQty')?.value||0);
    const unit=$('grainSaleUnit')?.value||'kg';
    const baseQty=grainSaleBaseQty();
    const rate=Number($('grainSaleRate')?.value||0);
    const paid=Number($('grainSalePaid')?.value||0);
    const total=round2(qtyEntered*rate);
    const outstanding=round2(Math.max(0,total-paid));

    const type=$('grainSaleType')?.value||'processed';
    const itemName=$('grainSaleItem')?.value.trim()||'';
    const itemId=$('grainSaleItemId')?.value.trim()||grainSaleItemId(itemName,type);
    const available=itemName?grainSaleAvailable(itemId,itemName):0;
    const bad=baseQty>available+0.001;

    if($('grainSaleTotal')) $('grainSaleTotal').textContent=money(total);
    if($('grainSaleOutstanding')) $('grainSaleOutstanding').textContent=money(outstanding);
    if($('grainSaleAvailableStock')) $('grainSaleAvailableStock').textContent=`${available} ${unit==='bag'?'bag':'kg'}`;

    const warn=$('grainSaleStockWarning');
    if(warn){
      warn.hidden=!bad;
      warn.textContent=bad?`Available stock માત્ર ${available} kg છે.`:'';
    }

    return {qtyEntered,unit,baseQty,rate,paid,total,outstanding,type,itemName,itemId,available,bad};
  }


  function grainCustomerWasteHistoryRows(){
    return getTx()
      .filter(r=>r.business==='grain')
      .filter(r=>r.grain?.purchaseEnabled===true)
      .filter(r=>Number(r.grain?.purchaseKg||0)>0)
      .filter(r=>Number(r.grain?.purchaseAmount||0)>0)
      .map(r=>({
        txId:r.id,
        date:r.date||'',
        billNo:r.billNo||'',
        customer:r.customer?.name||'',
        mobile:r.customer?.mobile||'',
        village:r.customer?.village||'',
        commodity:r.grain?.commodity||'અનાજ / કઠોળ',
        badKg:round2(Number(r.grain?.badKg ?? r.grain?.differenceKg ?? 0)),
        purchaseKg:round2(Number(r.grain?.purchaseKg||0)),
        purchaseRate:round2(Number(r.grain?.purchaseRate||0)),
        purchaseAmount:round2(Number(r.grain?.purchaseAmount||0)),
        updatedAt:r.updatedAt||r.createdAt||''
      }))
      .sort((a,b)=>
        String(b.date||'').localeCompare(String(a.date||'')) ||
        String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))
      );
  }

  function renderGrainCustomerWasteHistory(){
    const panel=$('grainCustomerWastePanel');
    if(!panel) return;

    const isWaste=($('grainSaleType')?.value||'processed')==='waste';
    panel.hidden=!isWaste;
    if(!isWaste) return;

    const rows=grainCustomerWasteHistoryRows();
    const totalKg=round2(rows.reduce((s,r)=>s+Number(r.purchaseKg||0),0));
    const totalValue=round2(rows.reduce((s,r)=>s+Number(r.purchaseAmount||0),0));

    if($('grainCustomerWasteCount')) $('grainCustomerWasteCount').textContent=String(rows.length);
    if($('grainCustomerWasteQty')) $('grainCustomerWasteQty').textContent=`${totalKg} kg`;
    if($('grainCustomerWasteValue')) $('grainCustomerWasteValue').textContent=money(totalValue);

    if($('grainCustomerWasteList')){
      $('grainCustomerWasteList').innerHTML=rows.map(r=>`
        <div class="customer-waste-row">
          <span>
            <strong>${escapeHtml(r.customer||'Customer')}</strong>
            <small>${escapeHtml(r.date||'')} • ${escapeHtml(r.billNo||'—')} • ${escapeHtml(r.commodity||'')}</small>
            <small>${escapeHtml(r.village||'')}${r.mobile?` • ${escapeHtml(r.mobile)}`:''}</small>
          </span>
          <span class="customer-waste-numbers">
            <strong>${r.purchaseKg} kg</strong>
            <small>${money(r.purchaseRate)}/kg • ${money(r.purchaseAmount)}</small>
            <small>History Entry</small>
          </span>
        </div>`).join('')||`
        <div class="empty">
          Grain/Pulse Job Work Historyમાં customer પાસેથી ખરીદેલ Waste / Rejectની કોઈ saved entry નથી.
        </div>`;
    }
  }

  function renderGrainSales(){
    if($('grainSaleDate') && !$('grainSaleDate').value) $('grainSaleDate').value=todayISO();

    if(window.SwatiCore && $('grainSaleItemSuggestions')){
      const type=$('grainSaleType')?.value||'processed';
      const rows=window.SwatiCore.stockSnapshot()
        .filter(r=>String(r.itemId||'').startsWith(type==='waste'?'grain.waste.':'grain.processed.'));
      $('grainSaleItemSuggestions').innerHTML=rows
        .filter(r=>Number(r.balance)>0)
        .map(r=>`<option value="${escapeAttr(r.itemName||r.itemId)}"></option>`).join('');
    }

    grainSaleCalc();

    const rows=getGrainSales().slice().sort((a,b)=>
      String(b.date||'').localeCompare(String(a.date||'')) ||
      String(b.createdAt||'').localeCompare(String(a.createdAt||''))
    );

    if($('grainSalesCount')) $('grainSalesCount').textContent=String(rows.length);
    if($('grainSalesList')) $('grainSalesList').innerHTML=rows.slice(0,12).map(r=>`
      <div class="mini-list-row">
        <span>
          <strong>${escapeHtml(r.itemName||'—')}</strong>
          <small>${escapeHtml(r.date||'')} • ${r.type==='waste'?'Waste / Reject':'Processed'} • ${escapeHtml(r.customer||'')}</small>
        </span>
        <span>
          <strong>${money(r.total||0)}</strong>
          <small>${r.qtyEntered||0} ${escapeHtml(r.unit||'')} • બાકી ${money(r.outstanding||0)}</small>
        </span>
      </div>`).join('')||'<div class="empty">હજુ Grain/Pulse sale નથી.</div>';

    const cmap=new Map();
    rows.forEach(r=>{
      const key=(r.mobile||`${r.customer}|${r.village}`).trim().toLowerCase();
      if(!key) return;
      const x=cmap.get(key)||{name:r.customer||'',mobile:r.mobile||'',village:r.village||'',count:0,total:0,outstanding:0};
      x.count+=1;
      x.total+=Number(r.total||0);
      x.outstanding+=Number(r.outstanding||0);
      cmap.set(key,x);
    });
    const customers=[...cmap.values()];
    if($('grainSalesCustomerCount')) $('grainSalesCustomerCount').textContent=String(customers.length);
    if($('grainSalesCustomerList')) $('grainSalesCustomerList').innerHTML=customers.map(c=>`
      <div class="mini-list-row">
        <span><strong>${escapeHtml(c.name||'—')}</strong><small>${escapeHtml(c.village||'')} • ${escapeHtml(c.mobile||'')}</small></span>
        <span><strong>${money(c.total)}</strong><small>${c.count} sales • બાકી ${money(c.outstanding)}</small></span>
      </div>`).join('')||'<div class="empty">હજુ Grain/Pulse sales customer નથી.</div>';
    renderGrainCustomerWasteHistory();
  }

  function renderHistory(){
    const q = ($('historySearch')?.value || '').trim().toLowerCase();
    const rows = getTx().slice().reverse().filter(r => {
      const extra=r.business==='grain'?[r.grain?.commodity]:[r.oilOutput?.tins,r.oilOutput?.extraKg];
      const hay = [r.billNo,r.customer?.name,r.customer?.mobile,r.customer?.village,...extra].join(' ').toLowerCase(); return hay.includes(q);
    });
    $('historyBody').innerHTML = rows.map(r => {
      const dir = r.settlement.net > 0 ? 'લેવાના' : r.settlement.net < 0 ? 'આપવાના' : 'પૂર્ણ'; const rem=remainingFor(r);
      const business=r.business==='grain'?'અનાજ/કઠોળ':'તેલ મિલ';
      const detail=r.business==='grain'?`${escapeHtml(r.grain?.commodity||'')} • ${Number(r.grain?.totalKg ?? r.grain?.inputKg ?? 0)} કિલો`:escapeHtml(oilOutputLabel(r.oilOutput?.tins||0,r.oilOutput?.extraKg||0));
      return `<tr><td>${escapeHtml(r.date||'')}</td><td>${escapeHtml(r.billNo||'')}</td><td>${business}</td><td>${escapeHtml(r.customer?.name||'')}${r.customer?.village?`<br><small>${escapeHtml(r.customer.village)}</small>`:''}</td><td>${detail}</td><td>${money(r.jobWorkAmount)}</td><td>${dir} ${money(Math.abs(r.settlement.net))}</td><td><strong>${money(rem)}</strong></td><td><div class="row-actions"><button class="ghost small" data-edit="${r.id}">ખોલો</button>${rem>0?`<button class="secondary small" data-pay="${r.id}">ચુકવણી</button>`:''}<button class="danger-btn small" data-delete="${r.id}">કાઢો</button></div></td></tr>`;
    }).join('') || '<tr><td colspan="9">હજુ કોઈ એન્ટ્રી નથી.</td></tr>';
  }

  function formatAuditTime(v){
    if(!v) return '—';
    try { return new Date(v).toLocaleString('en-IN'); } catch { return v; }
  }
  function showOilAudit(r){
    if(!$('oilAuditBox')) return; $('oilAuditBox').hidden=false;
    $('oilAuditCreatedBy').textContent=r.createdBy||'—'; $('oilAuditCreatedAt').textContent=formatAuditTime(r.createdAt); $('oilAuditUpdatedBy').textContent=r.updatedBy||r.createdBy||'—'; $('oilAuditDevice').textContent=shortDeviceId(r.updatedDeviceId||r.deviceId||''); if($('oilAuditActivity')) $('oilAuditActivity').textContent=auditFor(r.id).slice(0,5).map(a=>`${formatAuditTime(a.createdAt)} — ${a.action} — ${a.operator}`).join('\n')||'—';
  }
  function hideOilAudit(){ if($('oilAuditBox')) $('oilAuditBox').hidden=true; }
  function showGrainAudit(r){
    if(!$('grainAuditBox')) return; $('grainAuditBox').hidden=false;
    $('grainAuditCreatedBy').textContent=r.createdBy||'—'; $('grainAuditCreatedAt').textContent=formatAuditTime(r.createdAt); $('grainAuditUpdatedBy').textContent=r.updatedBy||r.createdBy||'—'; $('grainAuditDevice').textContent=shortDeviceId(r.updatedDeviceId||r.deviceId||''); if($('grainAuditActivity')) $('grainAuditActivity').textContent=auditFor(r.id).slice(0,5).map(a=>`${formatAuditTime(a.createdAt)} — ${a.action} — ${a.operator}`).join('\n')||'—';
  }
  function hideGrainAudit(){ if($('grainAuditBox')) $('grainAuditBox').hidden=true; }

  function editRecord(id){
    const r=getTx().find(x=>x.id===id); if(!r) return;
    if(r.business==='grain') return editGrainRecord(r);
    lastSavedId=r.id;
    $('customerName').value=r.customer?.name||'';
    $('customerMobile').value=r.customer?.mobile||'';
    $('customerVillage').value=r.customer?.village||'';
    $('txDate').value=r.date||todayISO();
    $('billNo').value=r.billNo||'';
    $('singGoglaKg').value=r.incoming?.singGoglaKg ?? r.groundnutKg ?? 0;
    $('danaFalaKg').value=r.incoming?.danaFalaKg ?? 0;
    $('oilTins').value=r.oilOutput?.tins||0;
    $('oilExtraKg').value=r.oilOutput?.extraKg||0;
    $('kholKg').value=r.khol?.kg||0;
    $('kholRate').value=r.khol?.rate ?? settings.kholRate;
    $('newTinQty').value=r.newTin?.qty||0;
    $('newTinRate').value=r.newTin?.rate ?? settings.newTinRate;
    $('oilSaleEnabled').checked=!!r.oilSale?.enabled;
    $('oilSaleFields').classList.toggle('enabled',!!r.oilSale?.enabled);
    $('oilSaleUnit').value=r.oilSale?.unit||'tin';
    $('oilSaleQty').value=r.oilSale?.qty||0;
    $('oilSaleRate').value=r.oilSale?.rate||0;
    $('paidAmount').value=paymentTotal(r);
    $('note').value=r.note||'';
    calculate();
    showOilAudit(r);
    showScreen('new-oil');
    toast('જૂની એન્ટ્રી ખોલી');
  }

  function deleteRecord(id){
    const r=getTx().find(x=>x.id===id); if(!r) return;
    if(!confirm(`${r.billNo} — ${r.customer?.name}\nઆ એન્ટ્રી કાઢવી છે?`)) return;
    addAudit('TX_DELETE','transaction',id,`${r.billNo} • ${r.customer?.name||''}`);
    setTx(getTx().filter(x=>x.id!==id));
    markDeleted(STORAGE_TX,id);
    if(lastSavedId===id) resetForm();
    if(lastSavedGrainId===id) resetGrainForm();
    renderAll();
    toast('એન્ટ્રી કાઢી');
  }

  function openPaymentModal(id){
    const r=getTx().find(x=>x.id===id); if(!r) return;
    paymentTargetId=id;
    $('paymentDate').value=todayISO();
    $('paymentAmount').value='';
    $('paymentNote').value='';
    $('paymentMethodModal').value='cash';
    const label=r.settlement.net>0?'ખેડૂત પાસેથી લેવાના':'ખેડૂતને આપવાના';
    $('paymentModalInfo').textContent=`${r.billNo} • ${r.customer.name} • ${label} બાકી ${money(remainingFor(r))}`;
    $('paymentModal').hidden=false;
  }

  function closePaymentModal(){ $('paymentModal').hidden=true; paymentTargetId=null; }

  function savePayment(){
    if(!paymentTargetId) return;
    const rows=getTx(); const idx=rows.findIndex(x=>x.id===paymentTargetId); if(idx<0) return;
    const r=rows[idx]; const amt=round2(num('paymentAmount'));
    const rem=remainingFor(r);
    if(amt<=0){ toast('રકમ નાખો'); return; }
    if(amt>rem+0.001){ toast(`બાકી રકમથી વધુ નહીં (${money(rem)})`); return; }
    r.payments=r.payments||[];
    r.payments.push({id:crypto.randomUUID(),date:$('paymentDate').value||todayISO(),amount:amt,method:$('paymentMethodModal').value,note:$('paymentNote').value.trim(),createdAt:new Date().toISOString()});
    r.settlement.paid=paymentTotal(r);
    r.settlement.remaining=remainingFor(r);
    r.updatedAt=new Date().toISOString();
    rows[idx]=r; setTx(rows);
    addAudit('PAYMENT_ADD','transaction',r.id,`${r.billNo} • ${money(amt)} • ${$('paymentMethodModal').value}`);
    closePaymentModal(); renderAll();
    if(lastSavedId===r.id) $('paidAmount').value=paymentTotal(r);
    if(lastSavedGrainId===r.id) $('grainPaidAmount').value=paymentTotal(r);
    toast('ચુકવણી સાચવાઈ');
  }

  function exportCSV(businessType){
    const rows=getTx().filter(r=>r.business===businessType);
    const directionText = r => r.settlement?.direction==='customer_to_company' ? 'ગ્રાહક પાસેથી લેવાના' : r.settlement?.direction==='company_to_customer' ? 'ગ્રાહકને આપવાના' : 'સરભર પૂર્ણ';
    const lines=[];

    if(businessType==='grain'){
      const header=['તારીખ','બિલ નંબર','ગ્રાહકનું નામ','મોબાઇલ નંબર','ગામ','માલનો પ્રકાર','સાફ થયેલ સારો માલ (કિલો)','ખરાબ / વધેલો માલ (કિલો)','કુલ સફાઈ વજન (કિલો)','ખરીદેલ વધેલો માલ (કિલો)','મજૂરી કામ','ખરીદી રકમ','કુલ લેવાના','કુલ આપવાના','અંતિમ રકમ','દિશા','ચૂકવેલ / મળેલ','બાકી','Entry By'];
      lines.push(header.join(','));
      for(const r of rows){
        const cleanKg = r.grain?.cleanKg ?? r.grain?.returnedKg ?? '';
        const badKg = r.grain?.badKg ?? r.grain?.differenceKg ?? '';
        const totalKg = r.grain?.totalKg ?? r.grain?.inputKg ?? '';
        const vals=[r.date,r.billNo,r.customer?.name,r.customer?.mobile,r.customer?.village,r.grain?.commodity||'',cleanKg,badKg,totalKg,r.grain?.purchaseKg||'',r.jobWorkAmount,r.grain?.purchaseAmount||0,r.settlement?.receivable,r.settlement?.payable,Math.abs(Number(r.settlement?.net||0)),directionText(r),paymentTotal(r),remainingFor(r),r.updatedBy||r.createdBy||''];
        lines.push(vals.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(','));
      }
      downloadBlob('\uFEFF'+lines.join('\n'),'text/csv;charset=utf-8',`સ્વાતિ-અનાજ-કઠોળ-${todayISO()}.csv`);
      return;
    }

    const header=['તારીખ','બિલ નંબર','ગ્રાહકનું નામ','મોબાઇલ નંબર','ગામ','સિંગ / ગોગળા (કિલો)','દાણા / ફાડા (કિલો)','તેલના ડબા','વધારાનું તેલ (કિલો)','મજૂરી કામ','ખોળ (કિલો)','ખોળનો ભાવ','ખોળ ખરીદી રકમ','નવા ડબા','તેલ વેચાણ રકમ','કુલ લેવાના','કુલ આપવાના','અંતિમ રકમ','દિશા','ચૂકવેલ / મળેલ','બાકી','Entry By'];
    lines.push(header.join(','));
    for(const r of rows){
      const vals=[r.date,r.billNo,r.customer?.name,r.customer?.mobile,r.customer?.village,r.groundnut?.singGoglaKg??r.groundnut?.weightKg??'',r.groundnut?.danaFadaKg??'',r.oilOutput?.tins||'',r.oilOutput?.extraKg||'',r.jobWorkAmount,r.khol?.kg||'',r.khol?.rate||'',r.khol?.amount||0,r.sales?.newTinQty||'',r.sales?.oilAmount||0,r.settlement?.receivable,r.settlement?.payable,Math.abs(Number(r.settlement?.net||0)),directionText(r),paymentTotal(r),remainingFor(r),r.updatedBy||r.createdBy||''];
      lines.push(vals.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(','));
    }
    downloadBlob('\uFEFF'+lines.join('\n'),'text/csv;charset=utf-8',`સ્વાતિ-તેલ-મિલ-${todayISO()}.csv`);
  }



  function csvCell(v){
    return `"${String(v ?? '').replaceAll('"','""')}"`;
  }

  function exportStockCSV(){
    const summary=materialSummary();
    const lots=availableLots();
    const lines=[];
    lines.push('સ્ટોક સારાંશ');
    lines.push(['માલ','કુલ ખરીદેલ (કિલો)','કુલ ખરીદી કિંમત','Batchમાં ગયેલ (કિલો)','ઉપલબ્ધ સ્ટોક (કિલો)'].map(csvCell).join(','));
    for(const x of summary){
      lines.push([x.material,x.purchasedKg,x.purchaseAmount,x.allocatedKg,x.availableKg].map(csvCell).join(','));
    }
    lines.push('');
    lines.push('સ્ટોકની વિગત');
    lines.push(['તારીખ','બિલ નંબર','ગ્રાહક','માલ','ખરીદેલ જથ્થો (કિલો)','ખરીદી કિંમત','Batchમાં ગયેલ (કિલો)','ઉપલબ્ધ (કિલો)'].map(csvCell).join(','));
    for(const l of lots){
      lines.push([l.date,l.billNo,l.customer,l.material,l.qty,l.amount,l.allocated,l.available].map(csvCell).join(','));
    }
    downloadBlob('\uFEFF'+lines.join('\n'),'text/csv;charset=utf-8',`સ્વાતિ-સ્ટોક-${todayISO()}.csv`);
  }

  function exportBatchCSV(){
    const rows=getBatches();
    const lines=[];
    const header=['Batch નંબર','માલ','સમયગાળો શરૂ','સમયગાળો અંત','વેચાણ તારીખ','જથ્થો (કિલો)','ખરીદી કિંમત','Processing / અન્ય ખર્ચ','કુલ Cost','વેચાણ રકમ','Profit / Loss','સ્ટોક Shortage (કિલો)','નોંધ','Entry By'];
    lines.push(header.map(csvCell).join(','));
    for(const b of rows){
      lines.push([b.batchNo,b.material,b.fromDate,b.toDate,b.saleDate,b.qty,b.purchaseCost,b.processingCost,b.totalCost,b.saleAmount,b.profit,b.stockShortageKg||0,b.note||'',b.updatedBy||b.createdBy||''].map(csvCell).join(','));
    }
    lines.push('');
    lines.push(['કુલ Batch',rows.length].map(csvCell).join(','));
    lines.push(['કુલ ખરીદી કિંમત',round2(rows.reduce((s,b)=>s+Number(b.purchaseCost||0),0))].map(csvCell).join(','));
    lines.push(['કુલ Processing / અન્ય ખર્ચ',round2(rows.reduce((s,b)=>s+Number(b.processingCost||0),0))].map(csvCell).join(','));
    lines.push(['કુલ વેચાણ',round2(rows.reduce((s,b)=>s+Number(b.saleAmount||0),0))].map(csvCell).join(','));
    lines.push(['કુલ Profit / Loss',round2(rows.reduce((s,b)=>s+Number(b.profit||0),0))].map(csvCell).join(','));
    downloadBlob('\uFEFF'+lines.join('\n'),'text/csv;charset=utf-8',`સ્વાતિ-Batch-${todayISO()}.csv`);
  }

  function reportRows(){
    const business=$('reportBusiness')?.value||'all';
    const from=$('reportFrom')?.value||'';
    const to=$('reportTo')?.value||'';
    return getTx().filter(r=>{
      const rb=r.business==='grain'?'grain':'oil';
      if(business!=='all' && rb!==business) return false;
      if(from && String(r.date||'')<from) return false;
      if(to && String(r.date||'')>to) return false;
      return true;
    }).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  }

  function reportParts(r){
    const isGrain=r.business==='grain';
    const purchase=isGrain?Number(r.grain?.purchaseAmount||0):Number(r.khol?.amount||0);
    const sales=isGrain?0:Number(r.sales?.total ?? ((r.newTin?.amount||0)+(r.oilSale?.amount||0)) ?? 0);
    return {purchase:round2(purchase),sales:round2(sales)};
  }


  const STAFF_KEY='swati_staff_master_v1';
  const STAFF_ATTENDANCE_KEY='swati_staff_attendance_v1';
  const STAFF_PAYMENT_KEY='swati_staff_payments_v1';

  function readLocalList(key){
    try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return []}
  }
  function writeLocalList(key,rows){localStorage.setItem(key,JSON.stringify(rows));notifyDataChanged(key);}

  function getStaff(){return readLocalList(STAFF_KEY).filter(x=>x.active!==false);}
  function getStaffAttendance(){return readLocalList(STAFF_ATTENDANCE_KEY);}
  function getStaffPayments(){return readLocalList(STAFF_PAYMENT_KEY);}

  function staffById(id){return getStaff().find(s=>s.id===id);}

  function staffAttendanceUnits(staffId){
    return getStaffAttendance().filter(a=>a.staffId===staffId).reduce((n,a)=>{
      if(a.status==='present') return n+1;
      if(a.status==='half') return n+0.5;
      return n;
    },0);
  }

  function staffEarnedSalary(staff){
    if(!staff) return 0;
    const rate=Number(staff.salaryRate||0);
    if(staff.salaryType==='monthly'){
      // Operational estimate: attendance units / 30 days.
      return round2(rate*(staffAttendanceUnits(staff.id)/30));
    }
    return round2(rate*staffAttendanceUnits(staff.id));
  }

  function staffPaymentTotals(staffId){
    const rows=getStaffPayments().filter(p=>p.staffId===staffId);
    const salaryPaid=round2(rows.filter(p=>p.type==='salary').reduce((s,p)=>s+Number(p.amount||0),0));
    const advancePaid=round2(rows.filter(p=>p.type==='advance').reduce((s,p)=>s+Number(p.amount||0),0));
    return {salaryPaid,advancePaid};
  }

  function staffSalaryPosition(staff){
    const earned=staffEarnedSalary(staff);
    const p=staffPaymentTotals(staff.id);
    const outstanding=round2(Math.max(0,earned-p.salaryPaid-p.advancePaid));
    return {...p,earned,outstanding};
  }

  function renderStaff(){
    const today=todayISO();
    if($('staffJoiningDate') && !$('staffJoiningDate').value) $('staffJoiningDate').value=today;
    if($('attendanceDate') && !$('attendanceDate').value) $('attendanceDate').value=today;
    if($('staffPaymentDate') && !$('staffPaymentDate').value) $('staffPaymentDate').value=today;

    const staff=getStaff();
    const attendance=getStaffAttendance();
    const payments=getStaffPayments();

    if($('attendanceStaff')){
      $('attendanceStaff').innerHTML=staff.map(s=>`<option value="${escapeAttr(s.id)}">${escapeHtml(s.name)}</option>`).join('');
    }
    if($('staffPaymentStaff')){
      $('staffPaymentStaff').innerHTML=staff.map(s=>`<option value="${escapeAttr(s.id)}">${escapeHtml(s.name)}</option>`).join('');
    }

    const presentToday=attendance.filter(a=>a.date===today && (a.status==='present'||a.status==='half')).length;
    const totalOutstanding=round2(staff.reduce((s,x)=>s+staffSalaryPosition(x).outstanding,0));
    const totalAdvance=round2(staff.reduce((s,x)=>s+staffPaymentTotals(x.id).advancePaid,0));

    if($('staffCount')) $('staffCount').textContent=String(staff.length);
    if($('staffPresentToday')) $('staffPresentToday').textContent=String(presentToday);
    if($('staffSalaryOutstanding')) $('staffSalaryOutstanding').textContent=money(totalOutstanding);
    if($('staffAdvanceTotal')) $('staffAdvanceTotal').textContent=money(totalAdvance);
    if($('staffListCount')) $('staffListCount').textContent=String(staff.length);

    if($('staffList')){
      $('staffList').innerHTML=staff.map(s=>{
        const pos=staffSalaryPosition(s);
        return `<div class="mini-list-row">
          <span>
            <strong>${escapeHtml(s.name||'')}</strong>
            <small>${escapeHtml(s.role||'')} • ${s.salaryType==='monthly'?'Monthly':'Daily'} ${money(s.salaryRate||0)}</small>
          </span>
          <span class="row-actions">
            <strong>${money(pos.outstanding)}</strong>
            <small>Outstanding</small>
            <button type="button" class="edit-chip" data-edit-staff="${escapeAttr(s.id)}">Edit / સુધારો</button>
          </span>
        </div>`;
      }).join('')||'<div class="empty">હજુ staff ઉમેરેલ નથી.</div>';
    }

    const attRows=attendance.slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
    if($('attendanceCount')) $('attendanceCount').textContent=String(attRows.length);
    if($('attendanceList')){
      $('attendanceList').innerHTML=attRows.slice(0,20).map(a=>{
        const s=staffById(a.staffId);
        return `<div class="mini-list-row">
          <span><strong>${escapeHtml(s?.name||'Staff')}</strong><small>${escapeHtml(a.date||'')} • ${a.status==='half'?'Half Day':a.status==='absent'?'Absent':'Present'}</small></span>
          <span class="row-actions"><small>${escapeHtml(a.note||'')}</small><button type="button" class="edit-chip" data-edit-attendance="${escapeAttr(a.id)}">Edit / સુધારો</button></span>
        </div>`;
      }).join('')||'<div class="empty">હજુ attendance entry નથી.</div>';
    }

    if($('staffSalarySummaryList')){
      $('staffSalarySummaryList').innerHTML=staff.map(s=>{
        const p=staffSalaryPosition(s);
        return `<div class="staff-salary-row">
          <span><strong>${escapeHtml(s.name)}</strong><small>${staffAttendanceUnits(s.id)} attendance units</small></span>
          <div><span>Earned</span><strong>${money(p.earned)}</strong></div>
          <div><span>Salary Paid</span><strong>${money(p.salaryPaid)}</strong></div>
          <div><span>Advance</span><strong>${money(p.advancePaid)}</strong></div>
          <div><span>Outstanding</span><strong>${money(p.outstanding)}</strong></div>
        </div>`;
      }).join('')||'<div class="empty">Salary summary માટે staff data નથી.</div>';
    }

    const payRows=payments.slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
    if($('staffPaymentCount')) $('staffPaymentCount').textContent=String(payRows.length);
    if($('staffPaymentList')){
      $('staffPaymentList').innerHTML=payRows.slice(0,20).map(p=>{
        const s=staffById(p.staffId);
        return `<div class="mini-list-row">
          <span><strong>${escapeHtml(s?.name||'Staff')}</strong><small>${escapeHtml(p.date||'')} • ${p.type==='advance'?'Advance':'Salary Paid'}</small></span>
          <strong>${money(p.amount||0)}</strong>
        </div>`;
      }).join('')||'<div class="empty">હજુ staff payment નથી.</div>';
    }
  }

  function setStaffTab(tab){
    document.querySelectorAll('[data-staff-tab]').forEach(b=>b.classList.toggle('active',b.dataset.staffTab===tab));
    if($('staffMasterPanel')) $('staffMasterPanel').hidden=tab!=='master';
    if($('staffAttendancePanel')) $('staffAttendancePanel').hidden=tab!=='attendance';
    if($('staffSalaryPanel')) $('staffSalaryPanel').hidden=tab!=='salary';
  }


  const INVOICE_KEY='swati_invoices_v1';
  let currentInvoice=null;
  let preparedInvoicePdf=null;
  let preparingInvoicePdf=null;

  function getInvoices(){
    try{return JSON.parse(localStorage.getItem(INVOICE_KEY)||'[]')}catch{return []}
  }
  function saveInvoices(rows){localStorage.setItem(INVOICE_KEY,JSON.stringify(rows));notifyDataChanged('invoices');}

  function nextInvoiceNo(){
    const year=new Date().getFullYear();
    const prefix=`INV-${year}-`;
    const max=getInvoices().filter(x=>String(x.invoiceNo||'').startsWith(prefix))
      .reduce((m,x)=>Math.max(m,Number(String(x.invoiceNo).split('-').pop())||0),0);
    return `${prefix}${String(max+1).padStart(4,'0')}`;
  }

  function invoiceSourceLabel(type){
    return {
      'oil-jobwork':'તેલ મીલ મજૂરી કામ',
      'grain-jobwork':'અનાજ / કઠોળ મજૂરી કામ',
      'oil-company-sale':'તેલ મીલ કંપની વેચાણ',
      'grain-company-sale':'અનાજ / કઠોળ કંપની વેચાણ',
      'retail':'રિટેલ વેચાણ'
    }[type]||type;
  }

  function invoiceItem(desc,qty='',rate=0,amount=0){
    return {description:desc,qty:String(qty||''),rate:round2(rate||0),amount:round2(amount||0)};
  }

  function invoiceSources(){
    const rows=[];

    // Job Work — Oil + Grain
    getTx().forEach(r=>{
      const business=r.business==='grain'?'grain':'oil';
      const type=business==='grain'?'grain-jobwork':'oil-jobwork';
      const items=[];
      if(Number(r.jobWorkAmount||0)>0){
        const qty=business==='grain'
          ? `${Number(r.grain?.totalKg||r.grain?.inputKg||0)} kg`
          : oilOutputLabel(r.oilOutput?.tins||0,r.oilOutput?.extraKg||0);
        const rate=business==='grain'
          ? Number(r.rates?.grainBaseRate||0)
          : Number(r.rates?.jobRatePerTin||0);
        items.push(invoiceItem('મજૂરી કામ',qty,rate,Number(r.jobWorkAmount||0)));
      }
      if(business==='oil'){
        if(Number(r.newTin?.amount||0)>0) items.push(invoiceItem('નવા ટીન',`${r.newTin.qty||0} નંગ`,r.newTin.rate,r.newTin.amount));
        if(Number(r.oilSale?.amount||0)>0) items.push(invoiceItem('તેલ વેચાણ',`${r.oilSale.qty||0} ${r.oilSale.unit||''}`,r.oilSale.rate,r.oilSale.amount));
        // Khol is payable to customer in job-work settlement, not a customer sale line.
      }

      const net=Number(r.settlement?.net||0);
      const billTotal=Math.max(0,net);
      const paid=net>0?paymentTotal(r):0;
      rows.push({
        sourceType:type,sourceId:r.id,date:r.date,billNo:r.billNo||'',
        customer:r.customer?.name||'',village:r.customer?.village||'',mobile:r.customer?.mobile||'',
        items,total:round2(billTotal),paid:round2(paid),outstanding:net>0?remainingFor(r):0,
        note:r.note||'',createdAt:r.createdAt||''
      });
    });

    // Oil Mill company sales
    getCompanySales().forEach(r=>{
      const product=(r.product||'oil')==='khol'?'ખોળ':'તેલ';
      const qty=r.unit==='tin'?`${r.tinCount||0} ટીન`:`${r.kg||r.oilKg||0} kg`;
      rows.push({
        sourceType:'oil-company-sale',sourceId:r.id,date:r.date,billNo:'',
        customer:r.customer||'',village:r.village||'',mobile:r.mobile||'',
        items:[invoiceItem(product,qty,r.rate,r.total)],
        total:round2(r.total||0),paid:round2(r.paid||0),outstanding:round2(r.outstanding||0),
        note:r.note||'',createdAt:r.createdAt||''
      });
    });

    // Grain company sales
    getGrainSales().forEach(r=>{
      rows.push({
        sourceType:'grain-company-sale',sourceId:r.id,date:r.date,billNo:'',
        customer:r.customer||'',village:r.village||'',mobile:r.mobile||'',
        items:[invoiceItem(r.itemName||'Grain/Pulse',`${r.qtyEntered||0} ${r.unit||''}`,r.rate,r.total)],
        total:round2(r.total||0),paid:round2(r.paid||0),outstanding:round2(r.outstanding||0),
        note:r.note||'',createdAt:r.createdAt||''
      });
    });

    // Retail sales
    getRetailSales().forEach(r=>{
      rows.push({
        sourceType:'retail',sourceId:r.id,date:r.date,billNo:'',
        customer:r.customer||'',village:r.village||'',mobile:r.mobile||'',
        items:[invoiceItem(r.item||'Retail Item',`${r.qty||0} ${r.unit||''}`,r.rate,r.total)],
        total:round2(r.total||0),paid:round2(r.paid||0),outstanding:round2(r.outstanding||0),
        note:r.note||'',createdAt:r.createdAt||''
      });
    });

    return rows.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')) || String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
  }

  function invoiceFromSource(source){
    const existing=getInvoices().find(x=>x.sourceType===source.sourceType && x.sourceId===source.sourceId);
    if(existing) return existing;
    return {
      id:`INVREC-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      invoiceNo:nextInvoiceNo(),
      sourceType:source.sourceType,
      sourceId:source.sourceId,
      sourceBillNo:source.billNo||'',
      date:source.date||todayISO(),
      customer:source.customer||'',
      village:source.village||'',
      mobile:source.mobile||'',
      items:source.items||[],
      total:round2(source.total||0),
      paid:round2(source.paid||0),
      outstanding:round2(source.outstanding||0),
      note:source.note||'',
      createdAt:new Date().toISOString(),
      operator:currentOperator()
    };
  }

  function saveInvoiceSnapshot(invoice){
    const rows=getInvoices();
    const i=rows.findIndex(x=>x.id===invoice.id || (x.sourceType===invoice.sourceType && x.sourceId===invoice.sourceId));
    const saved={...invoice,updatedAt:new Date().toISOString()};
    if(i>=0) rows[i]=saved; else rows.push(saved);
    saveInvoices(rows);
    return saved;
  }

  function fillInvoicePreview(inv){
    currentInvoice=inv;
    preparedInvoicePdf=null;
    preparingInvoicePdf=null;
    if($('invoicePreviewNo')) $('invoicePreviewNo').textContent=inv.invoiceNo||'—';
    if($('invNo')) $('invNo').textContent=inv.invoiceNo||'—';
    if($('invDate')) $('invDate').textContent=inv.date||'—';
    if($('invCustomer')) $('invCustomer').textContent=inv.customer||'—';
    if($('invVillage')) $('invVillage').textContent=inv.village||'—';
    if($('invMobile')) $('invMobile').textContent=inv.mobile||'—';
    if($('invSourceType')) $('invSourceType').textContent=invoiceSourceLabel(inv.sourceType);
    if($('invItemsBody')) $('invItemsBody').innerHTML=(inv.items||[]).map(i=>`
      <tr>
        <td>${escapeHtml(i.description||'—')}</td>
        <td>${escapeHtml(i.qty||'—')}</td>
        <td>${i.rate?money(i.rate):'—'}</td>
        <td>${money(i.amount||0)}</td>
      </tr>`).join('')||'<tr><td colspan="4">—</td></tr>';
    if($('invTotal')) $('invTotal').textContent=money(inv.total||0);
    if($('invPaid')) $('invPaid').textContent=money(inv.paid||0);
    if($('invOutstanding')) $('invOutstanding').textContent=money(inv.outstanding||0);
    if($('invNoteRow')){
      $('invNoteRow').hidden=!inv.note;
      if($('invNote')) $('invNote').textContent=inv.note||'';
    }
    if($('invoicePreviewPanel')) $('invoicePreviewPanel').hidden=false;
    setInvoicePdfState('preparing');
    setTimeout(()=>prepareInvoicePdf(inv),0);
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function invoiceText(inv){
    const lines=[
      '*સ્વાતિ મિની ઓઈલ મિલ*',
      '_Invoice / બિલ_',
      '',
      '━━━━━━━━━━━━',
      `*બિલ નં.:* ${inv.invoiceNo||'—'}`,
      `*તારીખ:* ${inv.date||'—'}`,
      `*ગ્રાહક:* ${inv.customer||'—'}`,
      `*ગામ:* ${inv.village||'—'}`,
      '━━━━━━━━━━━━'
    ];
    (inv.items||[]).forEach(i=>lines.push(`• ${i.description}: ${i.qty||''} × ${i.rate?money(i.rate):''} = *${money(i.amount||0)}*`));
    lines.push('━━━━━━━━━━━━',`*કુલ:* ${money(inv.total||0)}`,`*ચૂકવેલ:* ${money(inv.paid||0)}`,`*બાકી:* ${money(inv.outstanding||0)}`);
    if(inv.note) lines.push(`_નોંધ: ${inv.note}_`);
    lines.push('━━━━━━━━━━━━','આભાર 🙏');
    return lines.join('\n');
  }

  function printInvoice(inv){
    if(!inv) return;
    const card=$('invoicePreviewCard');
    if(!card){toast('Invoice preview મળ્યું નથી');return;}

    // Android/Chrome can print a blank page when the printable node is inside
    // a parent hidden by @media print. Create a temporary top-level print root.
    document.getElementById('invoicePrintRuntime')?.remove();
    const runtime=document.createElement('div');
    runtime.id='invoicePrintRuntime';
    runtime.className='invoice-print-runtime';
    runtime.setAttribute('aria-hidden','true');
    runtime.innerHTML=card.outerHTML;
    document.body.appendChild(runtime);
    document.body.classList.add('invoice-printing');

    let cleaned=false;
    const cleanup=()=>{
      if(cleaned) return;
      cleaned=true;
      document.body.classList.remove('invoice-printing');
      runtime.remove();
    };

    window.addEventListener('afterprint',cleanup,{once:true});

    // Give mobile Chrome one rendering frame before opening print preview.
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      window.print();
      // Fallback cleanup for browsers that do not fire afterprint reliably.
      setTimeout(cleanup,4000);
    }));
  }

  function invoicePdfName(inv){
    const no=String(inv?.invoiceNo||todayISO()).replace(/[^\p{L}\p{N}._-]+/gu,'-');
    return `સ્વાતિ-Invoice-${no}.pdf`;
  }

  function setInvoicePdfState(state){
    const shareBtn=$('invoiceSharePdfBtn'),downloadBtn=$('invoiceDownloadPdfBtn');
    if(state==='preparing'){
      if(shareBtn){shareBtn.disabled=true;shareBtn.textContent='PDF તૈયાર થઈ રહી છે…';}
      if(downloadBtn) downloadBtn.disabled=true;
      return;
    }
    if(shareBtn){shareBtn.disabled=false;shareBtn.textContent='PDF શેર કરો';}
    if(downloadBtn) downloadBtn.disabled=false;
  }

  async function prepareInvoicePdf(inv=currentInvoice){
    if(!inv||!window.SwatiFiles) return null;
    if(preparedInvoicePdf?.id===inv.id) return preparedInvoicePdf;
    if(preparingInvoicePdf) return preparingInvoicePdf;
    setInvoicePdfState('preparing');
    preparingInvoicePdf=(async()=>{
      try{
        const card=$('invoicePreviewCard');
        if(!card) throw new Error('Invoice preview was not found');
        const blob=await window.SwatiFiles.cardPdf(card,'invoice');
        const ready={id:inv.id,blob,name:invoicePdfName(inv),title:'સ્વાતિ Invoice',text:invoiceText(inv)};
        if(currentInvoice?.id===inv.id) preparedInvoicePdf=ready;
        return ready;
      }catch(e){
        console.error('Invoice PDF generation failed',e);
        toast('Invoice PDF બનાવવામાં સમસ્યા આવી');
        return null;
      }finally{
        preparingInvoicePdf=null;
        setInvoicePdfState('ready');
      }
    })();
    return preparingInvoicePdf;
  }

  function renderInvoices(){
    const filter=$('invoiceSourceFilter')?.value||'all';
    const q=($('invoiceSourceSearch')?.value||'').trim().toLowerCase();
    const sources=invoiceSources().filter(s=>(filter==='all'||s.sourceType===filter))
      .filter(s=>[s.customer,s.village,s.mobile,s.billNo,s.items?.map(i=>i.description).join(' ')].join(' ').toLowerCase().includes(q));

    const saved=getInvoices().slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));

    if($('invoiceSavedCount')) $('invoiceSavedCount').textContent=String(saved.length);
    if($('invoiceSavedListCount')) $('invoiceSavedListCount').textContent=String(saved.length);
    if($('invoiceTotalValue')) $('invoiceTotalValue').textContent=money(saved.reduce((s,x)=>s+Number(x.total||0),0));
    if($('invoiceOutstandingTotal')) $('invoiceOutstandingTotal').textContent=money(saved.reduce((s,x)=>s+Number(x.outstanding||0),0));

    if($('invoiceSourceList')){
      $('invoiceSourceList').innerHTML=sources.map(s=>{
        const existing=saved.find(x=>x.sourceType===s.sourceType && x.sourceId===s.sourceId);
        return `<div class="invoice-source-row">
          <span>
            <strong>${escapeHtml(s.customer||'Customer')}</strong>
            <small>${escapeHtml(s.date||'')} • ${escapeHtml(invoiceSourceLabel(s.sourceType))}${s.billNo?` • ${escapeHtml(s.billNo)}`:''}</small>
          </span>
          <span class="invoice-source-amount">
            <strong>${money(s.total||0)}</strong>
            <small>બાકી ${money(s.outstanding||0)}</small>
          </span>
          <button class="secondary invoice-create-btn" type="button" data-create-invoice="${escapeAttr(s.sourceType)}|${escapeAttr(s.sourceId)}">
            ${existing?'બિલ ખોલો':'બિલ બનાવો'}
          </button>
        </div>`;
      }).join('')||'<div class="empty">આ filterમાં billable transaction નથી.</div>';
    }

    if($('invoiceSavedList')){
      $('invoiceSavedList').innerHTML=saved.map(inv=>`
        <div class="invoice-source-row">
          <span>
            <strong>${escapeHtml(inv.invoiceNo||'—')} • ${escapeHtml(inv.customer||'Customer')}</strong>
            <small>${escapeHtml(inv.date||'')} • ${escapeHtml(invoiceSourceLabel(inv.sourceType))}</small>
          </span>
          <span class="invoice-source-amount">
            <strong>${money(inv.total||0)}</strong>
            <small>બાકી ${money(inv.outstanding||0)}</small>
          </span>
          <button class="secondary" type="button" data-open-invoice="${escapeAttr(inv.id)}">ખોલો</button>
        </div>`).join('')||'<div class="empty">હજુ invoice બનાવેલ નથી.</div>';
    }
  }

  function setInvoiceTab(tab){
    document.querySelectorAll('[data-invoice-tab]').forEach(b=>b.classList.toggle('active',b.dataset.invoiceTab===tab));
    if($('invoiceSourcePanel')) $('invoiceSourcePanel').hidden=tab!=='source';
    if($('invoiceSavedPanel')) $('invoiceSavedPanel').hidden=tab!=='saved';
    if($('invoicePreviewPanel')) $('invoicePreviewPanel').hidden=true;
  }


  let activeExpandedReport='';

  function reportDateInRange(date){
    const from=$('reportFromDate')?.value||'';
    const to=$('reportToDate')?.value||'';
    if(from && String(date||'')<from) return false;
    if(to && String(date||'')>to) return false;
    return true;
  }

  function reportSearchMatch(parts){
    const q=($('reportSearch')?.value||'').trim().toLowerCase();
    if(!q) return true;
    return parts.join(' ').toLowerCase().includes(q);
  }

  function setReportMetric(n,label,value,isMoney=false){
    if($(`reportMetric${n}Label`)) $(`reportMetric${n}Label`).textContent=label;
    if($(`reportMetric${n}`)) $(`reportMetric${n}`).textContent=isMoney?money(value||0):String(value??0);
  }

  function reportRow(title,meta,right,sub=''){
    return `<div class="report-expanded-row">
      <span><strong>${escapeHtml(title||'—')}</strong><small>${escapeHtml(meta||'')}</small></span>
      <span><strong>${right}</strong><small>${escapeHtml(sub||'')}</small></span>
    </div>`;
  }

  function salesReportData(){
    const rows=[];

    getCompanySales().forEach(r=>rows.push({
      date:r.date,type:'Oil Mill',title:r.customer||'Customer',
      meta:`${(r.product||'oil')==='khol'?'Khol':'Oil'} • ${r.unit||''}`,
      amount:Number(r.total||0),outstanding:Number(r.outstanding||0)
    }));

    getGrainSales().forEach(r=>rows.push({
      date:r.date,type:'Grain/Pulse',title:r.customer||'Customer',
      meta:`${r.itemName||'Item'} • ${r.type==='waste'?'Waste/Reject':'Processed'}`,
      amount:Number(r.total||0),outstanding:Number(r.outstanding||0)
    }));

    getRetailSales().forEach(r=>rows.push({
      date:r.date,type:'Retail',title:r.customer||'Customer',
      meta:`${r.item||'Item'} • ${r.category==='grain'?'Grain/Pulse':'Oil'}`,
      amount:Number(r.total||0),outstanding:Number(r.outstanding||0)
    }));

    return rows;
  }

  function purchaseReportData(){
    if(!window.SwatiCore) return [];
    return window.SwatiCore.getPurchases().map(r=>({
      date:r.date,title:r.party||'Supplier',meta:`${r.itemName||'Item'} • ${r.qty||0} ${r.unitName||''}`,
      amount:Number(r.amount||0),outstanding:Number(r.outstanding||0)
    }));
  }

  function expenseReportData(){
    if(!window.SwatiCore) return [];
    return window.SwatiCore.getExpenses().map(r=>({
      date:r.date,title:r.name||r.category||'Expense',meta:r.category||'',
      amount:Number(r.amount||0),outstanding:0
    }));
  }

  function jobWorkReportData(){
    return getTx().map(r=>({
      date:r.date,title:r.customer?.name||'Customer',
      meta:`${r.business==='grain'?'Grain/Pulse':'Oil Mill'} • ${r.billNo||''}`,
      amount:Number(r.jobWorkAmount||0),
      outstanding:r.settlement?.net>0?remainingFor(r):0,
      payable:r.settlement?.net<0?remainingFor(r):0
    }));
  }

  function productionReportData(){
    const rows=[];
    getCompanyBatches().forEach(r=>rows.push({
      date:r.date,title:r.batchNo||'Oil Batch',
      meta:`Oil ${r.oilKg||0} kg • Khol ${r.khaliKg||r.kholKg||0} kg`,
      amount:Number(r.totalCost||0),outstanding:0
    }));
    getGrainProductionRuns().forEach(r=>rows.push({
      date:r.date,title:r.goodItem||'Processed',
      meta:`${r.rawItem||'Raw'} ${r.inputKg||0} kg → ${r.goodKg||0} kg`,
      amount:Number(r.totalCost||0),outstanding:0
    }));
    return rows;
  }

  function stockReportData(){
    if(!window.SwatiCore) return [];
    const costing=window.SwatiCore.costingSummary?window.SwatiCore.costingSummary():{rows:[]};
    return costing.rows.map(r=>({
      date:'',
      title:r.itemName||r.itemId||'Item',
      meta:`Available ${r.balance} ${r.unitName||''} • Unit Cost ${money(r.estimatedUnitCost||0)}`,
      amount:Number(r.stockValue||0),
      outstanding:0,
      qty:Number(r.balance||0)
    }));
  }

  function partyReportData(){
    if(!window.SwatiCore) return [];
    const rows=[];
    const parties=window.SwatiCore.listParties?window.SwatiCore.listParties():[];
    parties.forEach(name=>{
      const p=window.SwatiCore.partyLedger(name);
      rows.push({
        date:'',
        title:name,
        meta:p.advance>0?`Advance ${money(p.advance)}`:'Supplier Ledger',
        amount:Number(p.purchaseTotal||0),
        outstanding:Number(p.payable||0)
      });
    });

    const cust=new Map();
    getTx().forEach(r=>{
      const name=r.customer?.name||'';
      if(!name) return;
      const x=cust.get(name)||{receivable:0,payable:0};
      const rem=remainingFor(r);
      if(r.settlement?.net>0) x.receivable+=rem;
      if(r.settlement?.net<0) x.payable+=rem;
      cust.set(name,x);
    });
    [...cust.entries()].forEach(([name,x])=>rows.push({
      date:'',title:name,meta:'Job Work Customer',
      amount:Number(x.receivable||0),outstanding:Number(x.receivable||0),payable:Number(x.payable||0)
    }));
    return rows;
  }

  function staffReportData(){
    return getStaff().map(s=>{
      const p=staffSalaryPosition(s);
      return {
        date:s.joiningDate||'',
        title:s.name,
        meta:`${s.role||''} • ${staffAttendanceUnits(s.id)} attendance units`,
        amount:Number(p.earned||0),
        outstanding:Number(p.outstanding||0),
        advance:Number(p.advancePaid||0)
      };
    });
  }

  function invoiceReportData(){
    return getInvoices().map(i=>({
      date:i.date,title:`${i.invoiceNo||'Invoice'} • ${i.customer||'Customer'}`,
      meta:invoiceSourceLabel(i.sourceType),
      amount:Number(i.total||0),outstanding:Number(i.outstanding||0)
    }));
  }

  function getExpandedReportData(type){
    if(type==='sales') return salesReportData();
    if(type==='purchases') return purchaseReportData();
    if(type==='expenses') return expenseReportData();
    if(type==='jobwork') return jobWorkReportData();
    if(type==='production') return productionReportData();
    if(type==='stock') return stockReportData();
    if(type==='parties') return partyReportData();
    if(type==='staff') return staffReportData();
    if(type==='invoices') return invoiceReportData();
    return [];
  }

  function expandedReportTitle(type){
    return {
      sales:'Sales Report',
      purchases:'Purchase Report',
      expenses:'Expense Report',
      jobwork:'Job Work Report',
      production:'Production Report',
      stock:'Stock Report',
      parties:'Receivable / Payable',
      staff:'Staff Report',
      invoices:'Invoice Report'
    }[type]||'Report';
  }

  function renderExpandedReport(){
    if(!activeExpandedReport || !$('reportExpandedList')) return;

    const raw=getExpandedReportData(activeExpandedReport);
    const rows=raw.filter(r=>reportDateInRange(r.date))
      .filter(r=>reportSearchMatch([r.title||'',r.meta||'',r.date||'']));

    const totalAmount=round2(rows.reduce((s,r)=>s+Number(r.amount||0),0));
    const totalOutstanding=round2(rows.reduce((s,r)=>s+Number(r.outstanding||0),0));
    const totalExtra=round2(rows.reduce((s,r)=>s+Number(r.payable||r.advance||r.qty||0),0));

    if($('reportDetailTitle')) $('reportDetailTitle').textContent=expandedReportTitle(activeExpandedReport);
    if($('reportTableTitle')) $('reportTableTitle').textContent=expandedReportTitle(activeExpandedReport);
    if($('reportRowCount')) $('reportRowCount').textContent=`${rows.length} rows`;

    setReportMetric(1,'Entries',rows.length,false);
    setReportMetric(2,activeExpandedReport==='stock'?'Stock Value':'Amount',totalAmount,true);
    setReportMetric(3,'Outstanding',totalOutstanding,true);

    let fourthLabel='Extra';
    if(activeExpandedReport==='stock') fourthLabel='Available Qty';
    else if(activeExpandedReport==='staff') fourthLabel='Advance';
    else if(activeExpandedReport==='parties') fourthLabel='Payable / Advance';
    else if(activeExpandedReport==='jobwork') fourthLabel='Payable';
    setReportMetric(4,fourthLabel,totalExtra,activeExpandedReport!=='stock');

    $('reportExpandedList').innerHTML=rows.map(r=>reportRow(
      r.title,
      `${r.date?`${r.date} • `:''}${r.meta||''}`,
      activeExpandedReport==='stock'?money(r.amount||0):money(r.amount||0),
      r.outstanding?`Outstanding ${money(r.outstanding)}`:(r.payable?`Payable ${money(r.payable)}`:'')
    )).join('')||'<div class="empty">આ filterમાં data નથી.</div>';
  }

  function openExpandedReport(type){
    activeExpandedReport=type;
    if($('reportHomeView')) $('reportHomeView').hidden=true;
    if($('reportDetailView')) $('reportDetailView').hidden=false;
    if($('reportFromDate')) $('reportFromDate').value='';
    if($('reportToDate')) $('reportToDate').value='';
    if($('reportSearch')) $('reportSearch').value='';
    renderExpandedReport();
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function showReportHome(){
    activeExpandedReport='';
    if($('reportHomeView')) $('reportHomeView').hidden=false;
    if($('reportDetailView')) $('reportDetailView').hidden=true;
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function setReportRange(range){
    const today=todayISO();
    if(range==='all'){
      $('reportFromDate').value='';
      $('reportToDate').value='';
    }else if(range==='today'){
      $('reportFromDate').value=today;
      $('reportToDate').value=today;
    }else{
      const d=new Date(`${today}T00:00:00`);
      d.setDate(d.getDate()-(Number(range)-1));
      $('reportFromDate').value=d.toISOString().slice(0,10);
      $('reportToDate').value=today;
    }
    renderExpandedReport();
  }

  function renderReports(){
    if(!$('reportHomeView')) return;
    if(activeExpandedReport) renderExpandedReport();
  }

  function setLegacyReportRange(kind){
    const d=new Date(); const iso=x=>{const z=x.getTimezoneOffset();return new Date(x.getTime()-z*60000).toISOString().slice(0,10)};
    let from=new Date(d),to=new Date(d);
    if(kind==='7days') from.setDate(d.getDate()-6);
    else if(kind==='month') from=new Date(d.getFullYear(),d.getMonth(),1);
    else if(kind==='season') { const y=Number(settings.season)||d.getFullYear(); from=new Date(y,0,1); to=new Date(y,11,31); }
    $('reportFrom').value=iso(from); $('reportTo').value=iso(to); renderReports();
  }

  function exportReportCSV(){
    const rows=reportRows(); const lines=[];
    lines.push(['તારીખ','વિભાગ','બિલ નંબર','ગ્રાહક','મોબાઇલ','ગામ','મજૂરી કામ','ખરીદી','વેચાણ','કુલ લેવાના','કુલ આપવાના','ચૂકવેલ / મળેલ','બાકી','Entry By'].map(csvCell).join(','));
    for(const r of rows){const p=reportParts(r);lines.push([r.date,r.business==='grain'?'અનાજ / કઠોળ':'તેલ મિલ',r.billNo,r.customer?.name,r.customer?.mobile,r.customer?.village,r.jobWorkAmount,p.purchase,p.sales,r.settlement?.receivable,r.settlement?.payable,paymentTotal(r),remainingFor(r),r.updatedBy||r.createdBy||''].map(csvCell).join(','));}
    lines.push('');
    lines.push(['કુલ ટ્રાન્ઝેક્શન',rows.length].map(csvCell).join(','));
    lines.push(['કુલ મજૂરી કામ',round2(rows.reduce((s,r)=>s+Number(r.jobWorkAmount||0),0))].map(csvCell).join(','));
    lines.push(['કુલ બાકી',round2(rows.reduce((s,r)=>s+remainingFor(r),0))].map(csvCell).join(','));
    const business=$('reportBusiness').value==='oil'?'તેલ-મિલ':$('reportBusiness').value==='grain'?'અનાજ-કઠોળ':'બધું';
    downloadBlob('\uFEFF'+lines.join('\n'),'text/csv;charset=utf-8',`સ્વાતિ-Report-${business}-${todayISO()}.csv`);
  }

  function exportBackup(){
    const data={};ALL_DATA_KEYS.forEach(key=>{try{data[key]=JSON.parse(localStorage.getItem(key)||'null')}catch{data[key]=null}});
    const payload={version:40,exportedAt:new Date().toISOString(),currentOperator:currentOperator(),deviceId:deviceId(),data};
    downloadBlob(JSON.stringify(payload,null,2),'application/json',`swati-job-work-backup-${todayISO()}.json`);
  }

  function restoreBackup(file){
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        const data=JSON.parse(reader.result);
        if(data.version>=37 && data.data && typeof data.data==='object'){
          ALL_DATA_KEYS.forEach(key=>{if(Object.prototype.hasOwnProperty.call(data.data,key)&&data.data[key]!==null)localStorage.setItem(key,JSON.stringify(data.data[key]))});
          settings=loadSettings();
        }else{
          if(!Array.isArray(data.transactions)) throw new Error('Invalid');
          if(data.settings){settings={...defaults,...data.settings};saveSettings();}
          setTx(data.transactions.map(migrateRow));
          if(Array.isArray(data.batches))setBatches(data.batches);if(Array.isArray(data.operators))setOperators(data.operators);if(Array.isArray(data.audit))setAudit(data.audit);
        }
        initSettingsForm();addAudit('BACKUP_RESTORE','system','restore',`Backup ${data.exportedAt||''}`);renderOperatorUI();
        resetForm(); resetBatchForm(); renderAll(); toast('Backup restore થયું');
      }catch{ toast('Backup file માન્ય નથી'); }
    };
    reader.readAsText(file);
  }

  function downloadBlob(content,type,name){
    if(type.includes('text/csv') && window.SwatiFiles){ window.SwatiFiles.presentCsvAsXlsx(content,name.replace(/\.csv$/i,'.xlsx')); return; }
    const blob = new Blob([content], {type});
    if(window.SwatiFiles){ window.SwatiFiles.presentBlob(blob,name,{title:'ફાઇલ તૈયાર છે'}); return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }

  function escapeHtml(s=''){ return String(s).replace(/[&<>'"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function escapeAttr(s=''){ return escapeHtml(s); }

  function toast(msg){
    const t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(t._timer); t._timer = setTimeout(()=>t.classList.remove('show'),2200);
  }

  const SCREEN_TITLES={
    home:'મુખ્ય',
    'new-oil':'તેલ મીલ',
    grain:'અનાજ / કઠોળ',
    'grain-production':'અનાજ / કઠોળ પ્રોડક્શન',
    'grain-sales':'અનાજ / કઠોળ વેચાણ',
    'grain-stock':'અનાજ / કઠોળ સ્ટોક',
    production:'કંપની પ્રોડક્શન',
    'company-sales':'કંપની વેચાણ',
    'company-stock':'કંપની સ્ટોક',
    purchases:'ખરીદી',
    customers:'ગ્રાહકો',
    'retail-sales':'રિટેલ વેચાણ',
    history:'હિસ્ટ્રી',
    stock:'સ્ટોક / Batch',
    usage:'વપરાશ',
    expenses:'ખર્ચ',
    'stock-management':'સ્ટોક મેનેજમેન્ટ',
    costing:'Costing / Valuation',
    finance:'ફાઇનાન્સ',
    invoices:'Invoice / Billing',
    staff:'Staff / Labour',
    reports:'રિપોર્ટ્સ',
    settings:'સેટિંગ્સ'
  };

  function closeAppDrawer(){
    const drawer=$('appDrawer'),backdrop=$('drawerBackdrop'),btn=$('drawerOpenBtn');
    if(drawer){drawer.classList.remove('open');drawer.setAttribute('aria-hidden','true');}
    if(backdrop) backdrop.hidden=true;
    if(btn) btn.setAttribute('aria-expanded','false');
    document.body.classList.remove('drawer-open');
  }

  function openAppDrawer(){
    const drawer=$('appDrawer'),backdrop=$('drawerBackdrop'),btn=$('drawerOpenBtn');
    if(drawer){drawer.classList.add('open');drawer.setAttribute('aria-hidden','false');}
    if(backdrop) backdrop.hidden=false;
    if(btn) btn.setAttribute('aria-expanded','true');
    document.body.classList.add('drawer-open');
  }

  function showScreenInternal(name){
    const target=$(`screen-${name}`);
    if(!target) return;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.screen === name));
    document.querySelectorAll('.drawer-link').forEach(t => t.classList.toggle('active', t.dataset.screen === name));
    document.querySelectorAll('[data-mobile-screen]').forEach(t => t.classList.toggle('active', t.dataset.mobileScreen === name));
    target.classList.add('active');
    const pageTitle=$('currentPageTitle');
    if(pageTitle) pageTitle.textContent=SCREEN_TITLES[name]||'સ્વાતિ';
    closeAppDrawer();
    hidePreview();
    hideGrainPreview();
    if (name === 'retail-sales') renderRetailSales();
    if (name === 'history') renderHistory();
    if (name === 'purchases') renderCorePurchases();
    if (name === 'customers') showCustomerVillageHome();
    if (name === 'home') renderDashboard();
    if (name === 'stock') renderStock();
    if (name === 'production') renderCompanyProduction();
    if (name === 'company-sales') renderCompanySales();
    if (name === 'company-stock') renderCompanyStock();
    if (name === 'grain-production') renderGrainProduction();
    if (name === 'grain-sales') renderGrainSales();
    if (name === 'grain-stock') renderGrainStock();
    if (name === 'usage') renderUsage();
    if (name === 'expenses') renderExpenses();
    if (name === 'stock-management') renderStockManagement();
    if (name === 'costing') renderCosting();
    if (name === 'finance') renderFinance();
    if (name === 'invoices') renderInvoices();
    if (name === 'staff') renderStaff();
    if (name === 'reports') { renderReports(); showReportHome(); }
    window.scrollTo({top:0,behavior:'smooth'});
  }

  const APP_HISTORY_KEY='swati_app_nav_history_v1';
  let appNavStack=['home'];
  let suppressHistoryPush=false;

  function activeScreenName(){
    const el=document.querySelector('.screen.active');
    return el?.id?.replace(/^screen-/,'')||'home';
  }

  function showScreen(name, options={}){
    const current=activeScreenName();
    const push=options.push!==false;
    if(push && current && current!==name){
      appNavStack.push(current);
      if(appNavStack.length>40) appNavStack=appNavStack.slice(-40);
      history.pushState({swati:true,screen:name},'',`#${name}`);
    } else if(options.replaceHistory){
      history.replaceState({swati:true,screen:name},'',`#${name}`);
    }
    showScreenInternal(name);
  }

  function goBackInsideApp(){
    if(appNavStack.length){
      const prev=appNavStack.pop();
      showScreen(prev,{push:false});
      history.replaceState({swati:true,screen:prev},'',`#${prev}`);
      return true;
    }
    const current=activeScreenName();
    if(current!=='home'){
      showScreen('home',{push:false});
      history.replaceState({swati:true,screen:'home'},'','#home');
      return true;
    }
    return false;
  }

  window.addEventListener('popstate',()=>{
    if(goBackInsideApp()) return;
  });

  document.addEventListener('DOMContentLoaded',()=>{
    const initial=location.hash.replace('#','');
    history.replaceState({swati:true,screen:initial||'home'},'',`#${initial||'home'}`);
  });



  function initSettingsForm(){
    $('settingTinKg').value = settings.tinKg;
    $('settingJobRate').value = settings.jobRatePerTin;
    $('settingKholRate').value = settings.kholRate;
    $('settingNewTinRate').value = settings.newTinRate;
    $('settingSeason').value = settings.season;
    $('settingPrefix').value = settings.prefix;
    $('settingGrainBaseKg').value = settings.grainBaseKg;
    $('settingGrainBaseRate').value = settings.grainBaseRate;
    $('settingGrainPurchaseRate').value = settings.grainPurchaseRate;
    $('settingGrainPrefix').value = settings.grainPrefix;
  }



  function cloudStatusRender(row=null){
    const c=window.SwatiCloud;
    if(!$('cloudStatus')) return;
    if(!c || !c.configured()){
      $('cloudStatus').textContent='Not configured — Local mode';
      $('cloudUser').textContent='—';
      $('cloudUpdatedAt').textContent='—';
      ['cloudLoginBtn','cloudPushBtn','cloudPullBtn','cloudLogoutBtn'].forEach(id=>{ if($(id)) $(id).disabled=true; });
      return;
    }
    const session=c.getSession();
    $('cloudStatus').textContent=session?.access_token?'Configured • Signed in':'Configured • Sign in required';
    $('cloudUser').textContent=session?.user?.email||'—';
    if(row?.updated_at) $('cloudUpdatedAt').textContent=formatAuditTime(row.updated_at);
    if($('cloudLoginBtn')) $('cloudLoginBtn').disabled=!!session?.access_token;
    if($('cloudPushBtn')) $('cloudPushBtn').disabled=!session?.access_token;
    if($('cloudPullBtn')) $('cloudPullBtn').disabled=!session?.access_token;
    if($('cloudLogoutBtn')) $('cloudLogoutBtn').disabled=!session?.access_token;
  }

  async function cloudLogin(){
    try{
      const email=$('cloudEmail').value.trim(), password=$('cloudPassword').value;
      if(!email||!password){toast('Email અને Password નાખો');return;}
      await window.SwatiCloud.login(email,password); $('cloudPassword').value=''; cloudStatusRender(); addAudit('CLOUD_LOGIN','system','cloud',email); toast('Cloud Sign In થયું');
    }catch(e){ toast(e.message||'Cloud login failed'); }
  }
  async function cloudPush(){
    if(!confirm('આ deviceનો હાલનો સંપૂર્ણ business data Cloudમાં master copy તરીકે મોકલવો છે?')) return;
    try{ await window.SwatiCloud.push(); addAudit('CLOUD_PUSH','system','cloud','Manual snapshot push'); const row=await window.SwatiCloud.pull(); cloudStatusRender(row); toast('Cloudમાં data મોકલાયો'); }
    catch(e){ toast(e.message||'Cloud push failed'); }
  }
  async function cloudPull(){
    if(!confirm('Cloudનો data આ deviceના local dataને replace કરશે. ચાલુ રાખવું છે?')) return;
    if(!confirm('ફરી ખાતરી: Pull કરતાં પહેલાં local JSON Backup રાખ્યો છે?')) return;
    try{ const row=await window.SwatiCloud.pull(); if(!row){toast('Cloudમાં હજી data નથી');return;} window.SwatiCloud.applySnapshot(row); localStorage.setItem(STORAGE_CURRENT_OPERATOR,currentOperator()||localStorage.getItem(STORAGE_CURRENT_OPERATOR)||''); location.reload(); }
    catch(e){ toast(e.message||'Cloud pull failed'); }
  }
  async function cloudLogout(){ try{await window.SwatiCloud.logout(); cloudStatusRender(); toast('Cloud Sign Out થયું');}catch(e){toast(e.message||'Sign out failed');} }

  function normalizeNumberInput(el){
    if (!el || el.type !== 'number') return;
    let value = String(el.value ?? '');
    if (value === '') return;

    // Keep valid decimal typing such as 0.5, but remove unnecessary leading zeroes:
    // 013 -> 13, 0007 -> 7, 01.25 -> 1.25, 000 -> 0.
    const sign = value.startsWith('-') ? '-' : '';
    if (sign) value = value.slice(1);
    const parts = value.split('.');
    let integer = parts[0] || '0';
    integer = integer.replace(/^0+(?=\d)/, '');
    if (integer === '') integer = '0';
    const normalized = sign + integer + (parts.length > 1 ? '.' + parts.slice(1).join('') : '');
    if (normalized !== el.value) el.value = normalized;
  }

  function enableNumberInputCleanup(){
    document.querySelectorAll('input[type="number"]').forEach(input => {
      input.addEventListener('input', () => normalizeNumberInput(input));
      input.addEventListener('change', () => normalizeNumberInput(input));
    });
  }

  function renderAll(){ renderDashboard(); renderHistory(); renderCustomers(); renderStock(); renderReports(); }

  window.addEventListener('swati:toast',(e)=>toast(e.detail||''));

  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click',()=>showScreen(b.dataset.screen)));
  document.querySelectorAll('.drawer-link').forEach(b => b.addEventListener('click',()=>showScreen(b.dataset.screen)));
  document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click',()=>{
    if(b.dataset.go==='customers' && b.dataset.customerMode) setCustomerMode(b.dataset.customerMode,false);
    showScreen(b.dataset.go);
  }));
  $('drawerOpenBtn')?.addEventListener('click',openAppDrawer);
  $('drawerCloseBtn')?.addEventListener('click',closeAppDrawer);
  $('drawerBackdrop')?.addEventListener('click',closeAppDrawer);
  $('oilMenuToggle')?.addEventListener('click',()=>{
    const menu=$('oilSubmenu'),btn=$('oilMenuToggle');
    const shouldOpen=!!menu?.hidden;
    if(menu) menu.hidden=!shouldOpen;
    btn.setAttribute('aria-expanded',shouldOpen?'true':'false');
    if(btn) btn.setAttribute('aria-expanded',String(shouldOpen));
  });
  document.querySelectorAll('.drawer-sublink').forEach(b=>b.addEventListener('click',()=>showScreen(b.dataset.screen)));
  $('grainMenuToggle')?.addEventListener('click',()=>{
    const menu=$('grainSubmenu'),btn=$('grainMenuToggle');
    const shouldOpen=!!menu?.hidden;
    if(menu) menu.hidden=!shouldOpen;
    btn.setAttribute('aria-expanded',shouldOpen?'true':'false');
    if(btn) btn.setAttribute('aria-expanded',String(shouldOpen));
  });


  $('headerHomeBtn')?.addEventListener('click',()=>showScreen('home'));
  $('drawerBrandHomeBtn')?.addEventListener('click',()=>showScreen('home'));

  $('drawerOperatorBtn')?.addEventListener('click',()=>{
    renderOperatorUI();
    if($('operatorDetailModal')) $('operatorDetailModal').hidden=false;
  });
  $('operatorDetailCloseBtn')?.addEventListener('click',()=>{ if($('operatorDetailModal')) $('operatorDetailModal').hidden=true; });
  $('operatorModalChangeBtn')?.addEventListener('click',()=>{
    if($('operatorDetailModal')) $('operatorDetailModal').hidden=true;
    resetDeviceAssignment();
  });

  $('customerVillageBackBtn')?.addEventListener('click',showCustomerVillageHome);
  $('customerDetailBackBtn')?.addEventListener('click',()=>showVillageCustomers(selectedCustomerVillage));
  $('customerWithinVillageSearch')?.addEventListener('input',renderCustomers);

  $('customerVillageList')?.addEventListener('click',(e)=>{
    const b=e.target.closest('[data-open-village]');
    if(b) showVillageCustomers(b.dataset.openVillage);
  });


  document.addEventListener('keydown',(e)=>{if(e.key==='Escape') closeAppDrawer();});

  document.querySelectorAll('[data-report-business-ui]').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('[data-report-business-ui]').forEach(x=>x.classList.remove('active'));
    btn.classList.add('active');
    if($('reportBusiness')) $('reportBusiness').value=btn.dataset.reportBusinessUi;
    renderReports();
    $('reportDetailArea')?.scrollIntoView({behavior:'smooth',block:'start'});
  }));

  const reportTargets={
    summary:{id:'reportSummaryBlock',title:'કુલ સારાંશ'},
    daily:{id:'reportDailyBlock',title:'દિવસ મુજબ સારાંશ'},
    customers:{id:'reportCustomerBlock',title:'ગ્રાહક સારાંશ'},
    villages:{id:'reportVillageBlock',title:'ગામ મુજબ સારાંશ'}
  };

  function showLegacyReportHome(){
    $('reportDetailArea').hidden=true;
    document.querySelector('.report-launch-list')?.removeAttribute('hidden');
    document.querySelector('.report-category-strip')?.removeAttribute('hidden');
    document.querySelector('.report-mobile-head')?.removeAttribute('hidden');
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function openReportSubpage(key){
    const target=reportTargets[key]||reportTargets.summary;
    renderReports();
    document.querySelector('.report-launch-list')?.setAttribute('hidden','');
    document.querySelector('.report-category-strip')?.setAttribute('hidden','');
    document.querySelector('.report-mobile-head')?.setAttribute('hidden','');
    const area=$('reportDetailArea');
    if(area) area.hidden=false;
    document.querySelectorAll('.report-subpage-block').forEach(el=>el.hidden=true);
    const el=$(target.id);
    if(el) el.hidden=false;
    if($('reportSubpageTitle')) $('reportSubpageTitle').textContent=target.title;
    window.scrollTo({top:0,behavior:'smooth'});
  }

  document.querySelectorAll('[data-report-open]').forEach(btn=>btn.addEventListener('click',()=>{
    openReportSubpage(btn.dataset.reportOpen);
  }));
  $('reportBackBtn')?.addEventListener('click',showReportHome);
  $('oilForm').addEventListener('input', ()=>{ clearPreparedBillPdf('oil'); calculate(); });
  $('customerMobile').addEventListener('input',()=>{
    const clean = $('customerMobile').value.replace(/\D/g,'').slice(0,10);
    if ($('customerMobile').value !== clean) $('customerMobile').value = clean;
  });
  $('oilForm').addEventListener('submit', saveRecord);
  $('previewBtn').addEventListener('click', showPreview);
  $('backToForm').addEventListener('click', hidePreview);
  function printOnly(kind){
    document.body.classList.remove('print-oil','print-grain');
    document.body.classList.add(kind==='grain'?'print-grain':'print-oil');
    const cleanup=()=>document.body.classList.remove('print-oil','print-grain');
    window.addEventListener('afterprint',cleanup,{once:true});
    window.print();
    setTimeout(cleanup,1500);
  }


  const preparedBillPdf={oil:null,grain:null};
  const preparingBillPdf={oil:null,grain:null};

  function shareButtonFor(business){
    return business==='grain' ? $('grainShareBtn') : $('oilShareBtn');
  }

  function setShareReadyState(business,state){
    const btn=shareButtonFor(business);
    if(!btn) return;
    if(state==='preparing'){
      btn.disabled=true;
      btn.textContent='PDF તૈયાર થઈ રહી છે…';
    }else if(state==='ready'){
      btn.disabled=false;
      btn.textContent='PDF શેર કરો';
    }else{
      btn.disabled=false;
      btn.textContent='PDF શેર કરો';
    }
  }

  function clearPreparedBillPdf(business){
    if(business){
      preparedBillPdf[business]=null;
      preparingBillPdf[business]=null;
      setShareReadyState(business,'idle');
    }else{
      preparedBillPdf.oil=null; preparedBillPdf.grain=null;
      preparingBillPdf.oil=null; preparingBillPdf.grain=null;
      setShareReadyState('oil','idle'); setShareReadyState('grain','idle');
    }
  }

  async function prepareBillPdf(business){
    if(preparedBillPdf[business]) return preparedBillPdf[business];
    if(preparingBillPdf[business]) return preparingBillPdf[business];
    setShareReadyState(business,'preparing');
    preparingBillPdf[business]=(async()=>{
      try{
        const r=business==='grain'?currentGrainRecord():currentRecord();
        if(!r.customer?.name || !window.SwatiFiles) return null;
        if(business==='grain'){ fillGrainPreview(r); $('grainPrintArea').classList.add('visible'); }
        else { fillPreview(r); $('printArea').classList.add('visible'); }
        const root=business==='grain'?$('grainPrintArea'):$('printArea');
        const card=root.querySelector('.physical-card');
        const name=`સ્વાતિ-${business==='grain'?'અનાજ-કઠોળ':'તેલ-મિલ'}-${r.billNo||todayISO()}.pdf`;
        const text=billShareText(r,business);
        const blob=await window.SwatiFiles.cardPdf(card,business);
        const ready={blob,name,text,title:'સ્વાતિ બિલ'};
        preparedBillPdf[business]=ready;
        setShareReadyState(business,'ready');
        return ready;
      }catch(e){
        console.error('Bill PDF pre-generation failed',e);
        setShareReadyState(business,'error');
        return null;
      }finally{
        preparingBillPdf[business]=null;
      }
    })();
    return preparingBillPdf[business];
  }

  function billShareText(r,business){
    const b=business==='grain'?'અનાજ / કઠોળ':'તેલ મિલ';
    return `*સ્વાતિ મિની ઓઇલ મિલ*\n_${b} મજૂરી બિલ_\n\n━━━━━━━━━━━━\n*બિલ નં.:* ${r?.billNo||'—'}\n*તારીખ:* ${r?.date||'—'}\n*ગ્રાહક:* ${r?.customer?.name||'—'}\n*ગામ:* ${r?.customer?.village||'—'}\n━━━━━━━━━━━━\n*કુલ મજૂરી:* ${money(r?.jobWorkAmount||0)}\n*ચૂકવેલ:* ${money(paymentTotal(r))}\n*બાકી:* ${money(remainingFor(r))}\n━━━━━━━━━━━━\nઆભાર 🙏`;
  }
  async function makeCardPdfAction(business,shareNow=false){
    try{
      const r=business==='grain'?currentGrainRecord():currentRecord();
      if(!r.customer?.name){toast('ગ્રાહકનું નામ જરૂરી છે');return;}
      if(!window.SwatiFiles){toast('File sharing module ઉપલબ્ધ નથી');return;}
      let ready=preparedBillPdf[business];
      if(!ready){
        toast('PDF તૈયાર થઈ રહી છે…');
        ready=await prepareBillPdf(business);
        if(!ready){toast('PDF બનાવવામાં સમસ્યા આવી');return;}
      }
      if(shareNow){
        await window.SwatiFiles.shareOrDownload(ready.blob,ready.name,ready.title,ready.text,r.customer?.mobile);
      }else window.SwatiFiles.download(ready.blob,ready.name);
    }catch(e){console.error(e);toast('PDF / Share બનાવવામાં સમસ્યા આવી');}
  }
  async function shareBillWhatsApp(business){
    const r=business==='grain'?currentGrainRecord():currentRecord(); if(!r.customer?.name){toast('ગ્રાહકનું નામ જરૂરી છે');return;}
    if(!window.SwatiFiles){window.open(`https://wa.me/?text=${encodeURIComponent(billShareText(r,business))}`,'_blank');return;}
    const ready=preparedBillPdf[business]||await prepareBillPdf(business);
    if(!ready){toast('PDF બનાવવામાં સમસ્યા આવી');return;}
    await window.SwatiFiles.shareOrDownload(ready.blob,ready.name,ready.title,ready.text,r.customer?.mobile);
  }

  $('printBtn').addEventListener('click', () => printOnly('oil'));
  $('oilPdfFileBtn')?.addEventListener('click',()=>makeCardPdfAction('oil',false));
  $('oilShareBtn')?.addEventListener('click',()=>makeCardPdfAction('oil',true));
  $('oilWhatsAppBtn')?.addEventListener('click',()=>shareBillWhatsApp('oil'));
  $('resetBtn').addEventListener('click', resetForm);
  $('historySearch').addEventListener('input', renderHistory);
  $('customerSearch').addEventListener('input', renderCustomers);
  $('exportOilBtn').addEventListener('click', ()=>exportCSV('oil'));
  $('exportGrainBtn').addEventListener('click', ()=>exportCSV('grain'));
  $('exportStockBtn')?.addEventListener('click', exportStockCSV);
  $('exportBatchBtn')?.addEventListener('click', exportBatchCSV);
  $('exportReportBtn')?.addEventListener('click', exportReportCSV);
  $('reportBusiness')?.addEventListener('change', renderReports);
  $('reportFrom')?.addEventListener('change', renderReports);
  $('reportTo')?.addEventListener('change', renderReports);
  document.querySelectorAll('[data-report-range]').forEach(b=>b.addEventListener('click',()=>setReportRange(b.dataset.reportRange)));
  $('backupBtn').addEventListener('click', exportBackup);
  $('restoreBtn').addEventListener('click',()=>$('restoreFile').click());
  $('restoreFile').addEventListener('change',()=>{ const f=$('restoreFile').files?.[0]; if(f) restoreBackup(f); $('restoreFile').value=''; });
  $('customerName').addEventListener('input',renderCustomerSuggestions);
  $('customerName').addEventListener('blur',()=>setTimeout(()=>$('customerSuggestions').hidden=true,180));
  $('customerSuggestions').addEventListener('click',(e)=>{ const b=e.target.closest('[data-customer-key]'); if(b) selectCustomer(b.dataset.customerKey); });
  $('customerList').addEventListener('click',(e)=>{
    const open=e.target.closest('[data-open-customer]');
    if(open){showCustomerDetail(open.dataset.openCustomer);return;}
    const bo=e.target.closest('[data-new-oil-for]');
    if(bo){selectCustomer(bo.dataset.newOilFor);showScreen('new-oil');return;}
    const bg=e.target.closest('[data-new-grain-for]');
    if(bg){selectGrainCustomer(bg.dataset.newGrainFor);showScreen('grain');}
  });

  $('customerDetailCard')?.addEventListener('click',(e)=>{
    const bo=e.target.closest('[data-new-oil-for]');
    if(bo){selectCustomer(bo.dataset.newOilFor);showScreen('new-oil');return;}
    const bg=e.target.closest('[data-new-grain-for]');
    if(bg){selectGrainCustomer(bg.dataset.newGrainFor);showScreen('grain');return;}
    const txBtn=e.target.closest('[data-customer-open-tx]');
    if(txBtn){
      const r=getTx().find(x=>x.id===txBtn.dataset.customerOpenTx);
      if(r){ if(r.business==='grain') editGrainRecord(r); else editRecord(r); }
    }
  });
  $('historyBody').addEventListener('click',(e)=>{
    const edit=e.target.closest('[data-edit]'); if(edit) return editRecord(edit.dataset.edit);
    const pay=e.target.closest('[data-pay]'); if(pay) return openPaymentModal(pay.dataset.pay);
    const del=e.target.closest('[data-delete]'); if(del) return deleteRecord(del.dataset.delete);
  });
  $('closePaymentModal').addEventListener('click',closePaymentModal);
  $('paymentModal').addEventListener('click',(e)=>{ if(e.target===$('paymentModal')) closePaymentModal(); });
  $('savePaymentBtn').addEventListener('click',savePayment);
  $('oilSaleEnabled').addEventListener('change',()=>{
    $('oilSaleFields').classList.toggle('enabled',$('oilSaleEnabled').checked); calculate();
  });
  $('grainForm').addEventListener('input',calculateGrain);
  $('grainForm').addEventListener('submit',saveGrainRecord);
  $('grainCustomerMobile').addEventListener('input',()=>{ const clean=$('grainCustomerMobile').value.replace(/\D/g,'').slice(0,10); if($('grainCustomerMobile').value!==clean)$('grainCustomerMobile').value=clean; });
  $('grainCustomerName').addEventListener('input',renderGrainCustomerSuggestions);
  $('grainCustomerName').addEventListener('blur',()=>setTimeout(()=>$('grainCustomerSuggestions').hidden=true,180));
  $('grainCustomerSuggestions').addEventListener('click',(e)=>{const b=e.target.closest('[data-grain-customer-key]'); if(b) selectGrainCustomer(b.dataset.grainCustomerKey);});
  $('grainLeftoverEnabled').addEventListener('change',()=>{ $('grainLeftoverFields').classList.toggle('enabled',$('grainLeftoverEnabled').checked); $('grainPurchaseKg').dataset.manual=''; calculateGrain(); });
  $('grainPurchaseKg').addEventListener('input',()=>{$('grainPurchaseKg').dataset.manual='1';});
  $('grainPreviewBtn').addEventListener('click',showGrainPreview); $('grainBackToForm').addEventListener('click',hideGrainPreview); $('grainPrintBtn').addEventListener('click',()=>printOnly('grain')); $('grainPdfFileBtn')?.addEventListener('click',()=>makeCardPdfAction('grain',false)); $('grainShareBtn')?.addEventListener('click',()=>makeCardPdfAction('grain',true)); $('grainWhatsAppBtn')?.addEventListener('click',()=>shareBillWhatsApp('grain')); $('grainResetBtn').addEventListener('click',resetGrainForm);
  $('grainTxDate').addEventListener('change',()=>{if(!lastSavedGrainId)$('grainBillNo').value=nextGrainBillNo();});
  $('batchForm').addEventListener('input',calculateBatch);
  $('batchForm').addEventListener('change',calculateBatch);
  $('batchForm').addEventListener('submit',saveBatch);
  $('batchResetBtn').addEventListener('click',resetBatchForm);
  $('batchBody').addEventListener('click',(e)=>{const b=e.target.closest('[data-delete-batch]');if(b)deleteBatch(b.dataset.deleteBatch);});
  document.addEventListener('click',(e)=>{const b=e.target.closest?.('[data-assign-operator]'); if(b) assignDeviceOperator(b.dataset.assignOperator);});

  $('txDate').addEventListener('change',()=>{ if(!lastSavedId) $('billNo').value = nextBillNo(); });
  $('resetDeviceAssignmentBtn')?.addEventListener('click',resetDeviceAssignment);
  $('saveOperatorsBtn')?.addEventListener('click',()=>{ const ops=[$('operator1').value.trim(),$('operator2').value.trim(),$('operator3').value.trim()].filter(Boolean); if(!ops.length){toast('ઓછામાં ઓછો એક Operator રાખો');return;} setOperators(ops); if(!ops.includes(localStorage.getItem(STORAGE_CURRENT_OPERATOR))) localStorage.removeItem(STORAGE_CURRENT_OPERATOR); renderOperatorUI(); ensureDeviceAssignment(); toast('Operators સાચવાયા'); });
  $('settingsForm').addEventListener('submit',(e)=>{
    e.preventDefault();
    settings = {
      tinKg:num('settingTinKg'), jobRatePerTin:num('settingJobRate'), kholRate:num('settingKholRate'), newTinRate:num('settingNewTinRate'),
      season:$('settingSeason').value.trim(), prefix:$('settingPrefix').value.trim() || 'JW',
      grainBaseKg:num('settingGrainBaseKg'), grainBaseRate:num('settingGrainBaseRate'), grainPurchaseRate:num('settingGrainPurchaseRate'), grainPrefix:$('settingGrainPrefix').value.trim() || 'GK'
    };
    saveSettings(); $('kholRate').value = settings.kholRate; $('newTinRate').value = settings.newTinRate; $('grainPurchaseRate').value=settings.grainPurchaseRate;
    if(!lastSavedId) $('billNo').value = nextBillNo(); if(!lastSavedGrainId) $('grainBillNo').value=nextGrainBillNo(); calculate(); calculateGrain(); toast('Settings સાચવાઈ');
  });

  window.addEventListener('beforeinstallprompt',(e)=>{
    e.preventDefault(); deferredInstall = e; $('installBtn').hidden = false;
  });
  $('installBtn').addEventListener('click', async ()=>{
    if(!deferredInstall) return; deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; $('installBtn').hidden = true;
  });

  const updateDrawerNetwork=()=>{
    const t=$('drawerNetworkText'),d=document.querySelector('.drawer-footer .status-indicator'),h=$('headerSyncDot');
    const online=navigator.onLine;
    if(t) t.textContent=online?'Online':'Offline';
    if(d) d.classList.toggle('offline',!online);
    if(h) h.classList.toggle('offline',!online);
  };
  window.addEventListener('online',updateDrawerNetwork);
  window.addEventListener('offline',updateDrawerNetwork);
  updateDrawerNetwork();


  ['rawQtyKg','rawRateKg','rawPaid'].forEach(id=>$(id)?.addEventListener('input',rawPurchaseCalc));
  ['productionInputKg','productionOilKg','productionKholKg','productionLossKg'].forEach(id=>$(id)?.addEventListener('input',productionCalc));
  ['companySaleTinCount','companySaleKg','companySaleRate','companySalePaid'].forEach(id=>$(id)?.addEventListener('input',companySaleCalc));

  $('companySaleUnit')?.addEventListener('change',()=>{
    const tin=$('companySaleUnit').value==='tin';
    $('companySaleTinField').hidden=!tin; $('companySaleKgField').hidden=tin; companySaleCalc();
  });

  $('rawPurchaseForm')?.addEventListener('submit',(e)=>{
    e.preventDefault();
    const qty=Number($('rawQtyKg').value||0),rate=Number($('rawRateKg').value||0),paid=Number($('rawPaid').value||0);
    if(qty<=0){toast('જથ્થો દાખલ કરો');return;}
    const {total,out}=rawPurchaseCalc();
    const rows=getCompanyPurchases();
    const rawRow={id:companyUid('RAW'),date:$('rawPurchaseDate').value||todayISO(),supplier:$('rawSupplier').value.trim(),village:$('rawVillage').value.trim(),mobile:$('rawMobile').value.trim(),material:$('rawMaterial').value,qtyKg:round2(qty),rateKg:round2(rate),total,paid:round2(paid),outstanding:out,note:$('rawNote').value.trim(),createdAt:new Date().toISOString(),operator:currentOperator()};
    rows.push(rawRow);
    saveCompanyPurchases(rows);
    window.SwatiCore?.addPurchase({date:rawRow.date,party:rawRow.supplier,itemId:`oil.raw.${rawRow.material||'groundnut'}`,itemName:rawRow.material||'મગફળી',qty:rawRow.qtyKg,unitName:'kg',rate:rawRow.rateKg,amount:rawRow.total,paid:rawRow.paid,paymentMode:'cash',context:{division:'oil_mill',unit:'production',activity:'raw_material_purchase',sourceModule:'oil_company',operator:rawRow.operator,notes:rawRow.id}});
    $('rawPurchaseForm').reset(); $('rawPurchaseDate').value=todayISO(); $('rawMaterial').value='groundnut'; $('rawPaid').value='0';
    rawPurchaseCalc(); renderCompanyProduction(); toast('કાચા માલની ખરીદી સાચવાઈ');
  });

  $('productionBatchForm')?.addEventListener('submit',(e)=>{
    e.preventDefault();
    const c=productionCalc(),stock=companyStock();
    if(c.input<=0){toast('Input કિલો દાખલ કરો');return;}
    if(c.input>stock.rawAvailable+0.001){toast('Raw stock પૂરતો નથી');return;}
    if(c.oil+c.khali+c.loss<=0){toast('Output દાખલ કરો');return;}
    const rows=getCompanyBatches();
    rows.push({id:companyUid('PR'),date:$('productionDate').value||todayISO(),batchNo:$('productionBatchNo').value||nextProductionBatchNo(),inputKg:round2(c.input),oilKg:round2(c.oil),khaliKg:round2(c.khali),lossKg:round2(c.loss),tinCount:Number($('productionTinCount').value||0),operator:$('productionOperator').value||currentOperator(),note:$('productionNote').value.trim(),oilYield:c.oilYield,khaliYield:c.khaliYield,createdAt:new Date().toISOString()});
    saveCompanyBatches(rows);
    const prodCtx={division:'oil_mill',unit:'production',activity:'production_batch',sourceModule:'oil_company',operator:rows[rows.length-1].operator,notes:rows[rows.length-1].id};
    const prodRow=rows[rows.length-1];
    window.SwatiCore?.addStockMovement({date:prodRow.date,itemId:'oil.raw.groundnut',itemName:'મગફળી',qty:prodRow.inputKg,unitName:'kg',movementType:'production_consumption',direction:'out',refType:'oil_production',refId:prodRow.id,context:prodCtx});
    window.SwatiCore?.addStockMovement({date:prodRow.date,itemId:'oil.finished.oil',itemName:'તેલ',qty:prodRow.oilKg,unitName:'kg',movementType:'production_in',direction:'in',refType:'oil_production',refId:prodRow.id,context:prodCtx});
    window.SwatiCore?.addStockMovement({date:prodRow.date,itemId:'oil.byproduct.khali',itemName:'ખોળ',qty:prodRow.khaliKg,unitName:'kg',movementType:'production_in',direction:'in',refType:'oil_production',refId:prodRow.id,context:prodCtx});
    if(prodRow.tinCount>0) window.SwatiCore?.addStockMovement({date:prodRow.date,itemId:'oil.packaging.filled_tin_15kg',itemName:'15 કિલો ભરેલું ટીન',qty:prodRow.tinCount,unitName:'tin',movementType:'production_in',direction:'in',refType:'oil_production',refId:prodRow.id,context:prodCtx});
    $('productionBatchForm').reset(); $('productionDate').value=todayISO(); $('productionBatchNo').value=nextProductionBatchNo(); $('productionLossKg').value='0'; $('productionTinCount').value='0';
    hydrateCompanyOperator(); productionCalc(); renderCompanyProduction(); toast('પ્રોડક્શન બેચ સાચવાયો');
  });

  $('companySaleForm')?.addEventListener('submit',(e)=>{
    e.preventDefault();
    const c=companySaleCalc();
    if(c.qty<=0){toast('વેચાણ જથ્થો દાખલ કરો');return;}
    if(c.bad){toast('સ્ટોક પૂરતો નથી');return;}
    const companySaleEditId=$('companySaleEditId')?.value||'';
    const rows=getCompanySales();
    const saleRow={id:companySaleEditId||companyUid('SALE'),date:$('companySaleDate').value||todayISO(),customer:$('companySaleCustomer').value.trim(),village:$('companySaleVillage').value.trim(),mobile:$('companySaleMobile').value.trim(),product:c.product,unit:c.unit,tinCount:c.product==='oil'?c.tinCount:0,kg:c.kg,oilKg:c.oilKg,rate:round2(Number($('companySaleRate').value||0)),total:c.total,paid:round2(Number($('companySalePaid').value||0)),outstanding:c.out,method:$('companySaleMethod').value,note:$('companySaleNote').value.trim(),createdAt:new Date().toISOString(),operator:currentOperator()};
    if(companySaleEditId){const i=rows.findIndex(x=>x.id===companySaleEditId);if(i>=0) rows[i]={...rows[i],...saleRow,updatedAt:new Date().toISOString()};}
    else rows.push(saleRow);
    saveCompanySales(rows);
    if(window.SwatiCore){
      const itemId=saleRow.product==='khol'?'oil.byproduct.khali':(saleRow.unit==='tin'?'oil.packaging.filled_tin_15kg':'oil.finished.oil');
      const salePayload={date:saleRow.date,party:saleRow.customer,itemId,itemName:saleRow.product==='khol'?'ખોળ':'તેલ',qty:saleRow.unit==='tin'?saleRow.tinCount:saleRow.kg,unitName:saleRow.unit,rate:saleRow.rate,amount:saleRow.total,received:saleRow.paid,paymentMode:saleRow.method,context:{division:'oil_mill',unit:'production',activity:'company_sale',sourceModule:'oil_company',operator:saleRow.operator,notes:saleRow.id}};
      const linked=companySaleEditId?linkedCoreSaleBySourceId(saleRow.id):null;
      if(linked) window.SwatiCore.updateSale(linked.id,salePayload); else window.SwatiCore.addSale(salePayload);
    }
    $('companySaleForm').reset();$('companySaleDate').value=todayISO();$('companySaleProduct').value='oil';
    document.querySelectorAll('[data-sale-product]').forEach(b=>b.classList.toggle('active',b.dataset.saleProduct==='oil'));
    $('companySaleUnit').value='tin';$('companySaleTinCount').value='0';$('companySaleKg').value='0';$('companySalePaid').value='0';
    $('companySaleTinField').hidden=false;$('companySaleKgField').hidden=true;companySaleCalc();clearEditMode('companySale','વેચાણ સાચવો');renderCompanySales();toast(companySaleEditId?'વેચાણ update થયું':'વેચાણ સાચવાયું');
  });


  $('purchaseDivision')?.addEventListener('change',()=>{
    selectedPurchasePreset=null;
    renderCorePurchases();
  });
  $('purchaseUnit')?.addEventListener('change',()=>{
    selectedPurchasePreset=null;
    renderCorePurchases();
  });
  $('purchasePresetItems')?.addEventListener('click',(e)=>{
    const b=e.target.closest('[data-purchase-preset]');
    if(b) selectPurchasePreset(b.dataset.purchasePreset);
  });

  ['purchaseQty','purchaseRate','purchasePaid','purchaseTransport','purchaseLoading','purchaseUnloading']
    .forEach(id=>$(id)?.addEventListener('input',purchaseCalc));

  $('purchaseHistoryToggle')?.addEventListener('click',()=>{
    $('purchaseEntryView').hidden=true;
    $('purchaseHistoryView').hidden=false;
    renderPurchaseHistory();
    window.scrollTo({top:0,behavior:'smooth'});
  });

  $('purchaseHistoryBack')?.addEventListener('click',()=>{
    $('purchaseHistoryView').hidden=true;
    $('purchaseEntryView').hidden=false;
    window.scrollTo({top:0,behavior:'smooth'});
  });

  ['purchaseHistoryDivision','purchaseHistoryUnit','purchaseHistorySearch']
    .forEach(id=>$(id)?.addEventListener(id==='purchaseHistorySearch'?'input':'change',renderPurchaseHistory));

  $('corePurchaseForm')?.addEventListener('submit',(e)=>{
    e.preventDefault();
    if(!window.SwatiCore){toast('Core system load થયું નથી');return;}

    const c=purchaseCalc();
    const itemName=$('purchaseItemName').value.trim();
    if(!itemName){toast('આઇટમનું નામ દાખલ કરો');return;}
    if(c.qty<=0){toast('જથ્થો દાખલ કરો');return;}

    const division=$('purchaseDivision').value;
    const unit=$('purchaseUnit').value;
    const category=$('purchaseCategory').value;
    const itemId=selectedPurchasePreset?.id || `${division}.${unit}.${category}.${itemName.toLowerCase().replace(/\s+/g,'_')}`;

    const purchaseEditId=$('purchaseEditId')?.value||'';
    const purchasePayload={
      date:$('purchaseDate').value||todayISO(),
      party:$('purchaseParty').value.trim(),
      itemId,
      itemName,
      qty:c.qty,
      unitName:$('purchaseQtyUnit').value,
      rate:c.rate,
      amount:c.goods,
      paid:c.paid,
      usePartyAdvance:c.useAdvance,
      paymentMode:$('purchasePaymentMode')?.value||'cash',
      context:{
        division,
        unit,
        activity:'purchase',
        costCenter:category,
        sourceModule:'common_purchase_alpha8',
        operator:currentOperator(),
        notes:$('purchaseNote').value.trim()
      }
    };
    const purchase=purchaseEditId && window.SwatiCore.updatePurchase
      ? window.SwatiCore.updatePurchase(purchaseEditId,purchasePayload)
      : window.SwatiCore.addPurchase(purchasePayload);

    const baseContext={
      division,
      unit,
      activity:'purchase_extra_cost',
      costCenter:'purchase_extra_cost',
      sourceModule:'common_purchase_alpha8',
      operator:currentOperator(),
      notes:purchase.id
    };

    const linkedCosts=(window.SwatiCore.list('expenses')||[]).filter(x=>x.context?.notes===purchase.id&&x.context?.costCenter==='purchase_extra_cost');
    [
      ['transportation','Transport',c.transport],
      ['loading','Loading',c.loading],
      ['unloading','Unloading',c.unloading]
    ].forEach(([category,label,amount])=>{
      const oldCost=linkedCosts.find(x=>x.category===category);
      const payload={date:purchase.date,category,title:`${label} - ${itemName}`,amount,paymentMode:oldCost?.paymentMode||'cash',party:$('purchaseParty').value.trim(),context:baseContext};
      if(amount>0){if(oldCost)window.SwatiCore.updateExpense(oldCost.id,payload);else window.SwatiCore.addExpense(payload);}
      else if(oldCost)window.SwatiCore.removeExpense(oldCost.id);
    });

    resetPurchaseEntry();
    clearEditMode('purchase','ખરીદી સાચવો');
    toast(purchaseEditId?'ખરીદી update થઈ':'ખરીદી સાચવાઈ');
  });



  $('purchaseUseAdvance')?.addEventListener('change',purchaseCalc);

  $('addPartyPaymentBtn')?.addEventListener('click',()=>{
    if(!window.SwatiCore){toast('Core system load થયું નથી');return;}
    const party=$('purchaseParty')?.value.trim()||'';
    const amount=round2(Number($('partyPaymentAmount')?.value||0));
    if(!party){toast('પહેલા Supplier / Party પસંદ કરો');return;}
    if(amount<=0){toast('ચુકવણી રકમ દાખલ કરો');return;}

    window.SwatiCore.addPartyPayment({
      date:$('partyPaymentDate')?.value||todayISO(),
      party,
      amount,
      paymentMode:$('partyPaymentMode')?.value||'cash',
      note:$('partyPaymentNote')?.value.trim()||'',
      refType:'party_payment',
      context:{
        division:$('purchaseDivision')?.value||'oil_mill',
        unit:$('purchaseUnit')?.value||'production',
        activity:'party_payment',
        sourceModule:'party_ledger_alpha18',
        operator:currentOperator()
      }
    });

    $('partyPaymentAmount').value='';
    $('partyPaymentNote').value='';
    renderCorePurchases();
    toast('Party payment / Advance ઉમેરાયું');
  });

  $('expensePresetGrid')?.addEventListener('click',(e)=>{
    const b=e.target.closest('[data-expense-preset]');
    if(!b) return;
    $('expenseCategory').value=b.dataset.expensePreset;
    if(!$('expenseTitle').value.trim()) $('expenseTitle').value=b.textContent.trim();
  });

  $('expenseHistoryToggle')?.addEventListener('click',()=>{
    $('expenseEntryView').hidden=true;
    $('expenseHistoryView').hidden=false;
    renderExpenseHistory();
    window.scrollTo({top:0,behavior:'smooth'});
  });

  $('expenseHistoryBack')?.addEventListener('click',()=>{
    $('expenseHistoryView').hidden=true;
    $('expenseEntryView').hidden=false;
    window.scrollTo({top:0,behavior:'smooth'});
  });

  ['expenseHistoryDivision','expenseHistoryUnit','expenseHistoryCategory']
    .forEach(id=>$(id)?.addEventListener('change',renderExpenseHistory));

  $('coreExpenseForm')?.addEventListener('submit',(e)=>{
    e.preventDefault();
    if(!window.SwatiCore){toast('Core system load થયું નથી');return;}
    const amount=Number($('expenseAmount').value||0);
    if(amount<=0){toast('ખર્ચની રકમ દાખલ કરો');return;}

    const division=$('expenseDivision').value;
    const unit=$('expenseUnit').value;
    const title=$('expenseTitle').value.trim() || $('expenseCategory').selectedOptions[0]?.textContent || 'ખર્ચ';

        const expenseEditId=$('expenseEditId')?.value||'';
    const expensePayload={
      date:$('expenseDate').value||todayISO(),
      category:$('expenseCategory').value,
      title,
      amount,
      paymentMode:$('expensePaymentMode').value,
      party:$('expenseParty').value.trim(),
      context:{
        division,
        unit,
        activity:'expense',
        costCenter:$('expenseCategory').value,
        sourceModule:'common_expense_alpha9',
        operator:currentOperator(),
        notes:[
          $('expenseNote').value.trim(),
          $('expensePeriodFrom').value&&`From ${$('expensePeriodFrom').value}`,
          $('expensePeriodTo').value&&`To ${$('expensePeriodTo').value}`
        ].filter(Boolean).join(' • ')
      }
    };
    if(expenseEditId && window.SwatiCore.updateExpense) window.SwatiCore.updateExpense(expenseEditId,expensePayload);
    else window.SwatiCore.addExpense(expensePayload);

    $('coreExpenseForm').reset();
    $('expenseDate').value=todayISO();
    $('expenseDivision').value='company';
    $('expenseUnit').value='common';
    $('expensePaymentMode').value='cash';
    renderExpenses();
    clearEditMode('expense','ખર્ચ સાચવો');toast(expenseEditId?'ખર્ચ update થયો':'ખર્ચ સાચવાયો');
  });




  function enforceMobileInputs(){
    document.querySelectorAll('input[inputmode="tel"], input[type="tel"]').forEach(input=>{
      input.setAttribute('maxlength','10');
      input.setAttribute('pattern','[0-9]{10}');
      input.addEventListener('input',()=>{
        input.value=input.value.replace(/\D/g,'').slice(0,10);
      });
    });
  }

  const UI_TEXT = {
    gu:{
      languageTitle:'ઇન્ટરફેસ ભાષા',
      languageHelp:'ફક્ત app interface બદલાશે; business data/PDF Gujaratiમાં જ રહેશે.',
      languageLabel:'ભાષા',
      home:'મુખ્ય',
      purchase:'ખરીદી',
      expense:'ખર્ચ',
      'stock-management':'સ્ટોક મેનેજમેન્ટ',
    costing:'Costing / Valuation',
    finance:'ફાઇનાન્સ',
      usage:'વપરાશ',
      customers:'ગ્રાહકો',
      'retail-sales':'રિટેલ વેચાણ',
    history:'હિસ્ટ્રી',
      invoices:'Invoice / Billing',
    staff:'Staff / Labour',
    reports:'રિપોર્ટ્સ',
      settings:'સેટિંગ્સ',
      sales:'વેચાણ',
      stock:'સ્ટોક',
      oilMenu:'તેલ મીલ',
      oilJobWork:'મજૂરી કામ',
      oilProduction:'કંપની પ્રોડક્શન',
      oilSales:'વેચાણ',
      oilStock:'સ્ટોક',
      grainMenu:'અનાજ / કઠોળ',
      grainJobWork:'મજૂરી કામ',
      grainProduction:'કંપની પ્રોડક્શન',
      grainSales:'વેચાણ',
      grainStock:'સ્ટોક',
      grainProdHelp:'કંપનીના અનાજ / કઠોળ processing માટેનું production workspace.',
      grainRawPurchaseHelp:'અનાજ / કઠોળ અને empty bags ખરીદો',
      grainUsageHelp:'Packaging / consumables usage નોંધો',
      grainStockHelp:'Raw / Processed / Waste stock જુઓ',
      grainSalesHelp:'Processed grain/pulse અને waste/by-product sales માટેનું workspace.',
      grainSalesFoundation:'આ screen Grain/Pulse sales માટે અલગ રાખવામાં આવી છે. Detailed sale-entry workflow next functional expansionમાં જોડાશે.'
    },
    en:{
      languageTitle:'Interface Language',
      languageHelp:'Only the app interface changes; business data and PDFs remain in Gujarati.',
      languageLabel:'Language',
      home:'Home',
      purchase:'Purchases',
      expense:'Expenses',
      finance:'Finance',
      usage:'Usage',
      customers:'Customers',
      history:'History',
      reports:'Reports',
      settings:'Settings',
      sales:'Sales',
      stock:'Stock',
      oilMenu:'Oil Mill',
      oilJobWork:'Job Work',
      oilProduction:'Company Production',
      oilSales:'Sales',
      oilStock:'Stock',
      grainMenu:'Grain / Pulse',
      grainJobWork:'Job Work',
      grainProduction:'Company Processing',
      grainSales:'Sales',
      grainStock:'Stock',
      grainProdHelp:'Workspace for company-owned grain and pulse processing.',
      grainRawPurchaseHelp:'Purchase grain, pulses and empty bags',
      grainUsageHelp:'Record packaging and consumable usage',
      grainStockHelp:'View raw, processed and waste stock',
      grainSalesHelp:'Workspace for processed grain/pulse and by-product sales.',
      grainSalesFoundation:'This screen is reserved for Grain/Pulse sales. The detailed sales-entry workflow will be added in the next functional expansion.'
    }
  };

  function applyInterfaceLanguage(lang){
    const l=lang==='en'?'en':'gu';
    localStorage.setItem('swati_interface_language_v1',l);
    const op=(typeof currentOperator==='function'?currentOperator():'')||'device';
    localStorage.setItem(`swati_interface_language_v1_${op}`,l);
    document.documentElement.lang=l==='en'?'en':'gu';

    document.querySelectorAll('[data-i18n]').forEach(el=>{
      const key=el.dataset.i18n;
      if(UI_TEXT[l][key]) el.textContent=UI_TEXT[l][key];
    });

    const translatedTitles={
      home:UI_TEXT[l].home,
      'new-oil':UI_TEXT[l].oilJobWork,
      production:UI_TEXT[l].oilProduction,
      'company-sales':UI_TEXT[l].oilSales,
      'company-stock':UI_TEXT[l].oilStock,
      grain:UI_TEXT[l].grainJobWork,
      'grain-production':UI_TEXT[l].grainProduction,
      'grain-sales':UI_TEXT[l].grainSales,
      'grain-stock':UI_TEXT[l].grainStock,
      purchases:UI_TEXT[l].purchase,
      usage:UI_TEXT[l].usage,
      expenses:UI_TEXT[l].expense,
      finance:UI_TEXT[l].finance,
      customers:UI_TEXT[l].customers,
      history:UI_TEXT[l].history,
      reports:UI_TEXT[l].reports,
      settings:UI_TEXT[l].settings
    };

    if(typeof screenTitles==='object'){
      Object.keys(translatedTitles).forEach(k=>screenTitles[k]=translatedTitles[k]);
    }

    const current=activeScreenName();
    if($('pageTitle') && translatedTitles[current]) $('pageTitle').textContent=translatedTitles[current];

    if($('interfaceLanguage')) $('interfaceLanguage').value=l;

    const guBtn=$('langGujaratiBtn');
    const enBtn=$('langEnglishBtn');
    guBtn?.classList.toggle('active',l==='gu');
    enBtn?.classList.toggle('active',l==='en');
    guBtn?.setAttribute('aria-pressed',String(l==='gu'));
    enBtn?.setAttribute('aria-pressed',String(l==='en'));

    if(window.SwatiI18n) window.SwatiI18n.setLanguage(l);
  }

  document.addEventListener('DOMContentLoaded',()=>{
    enforceMobileInputs();
    const op=(typeof currentOperator==='function'?currentOperator():'')||'device';
    applyInterfaceLanguage(localStorage.getItem(`swati_interface_language_v1_${op}`)||localStorage.getItem('swati_interface_language_v1')||'gu');
  });

  $('purchaseParty')?.addEventListener('input',()=>renderCorePurchases());
  $('purchaseParty')?.addEventListener('change',()=>renderCorePurchases());

  $('usageItemId')?.addEventListener('input',()=>{
    if(!$('usageStockInfo')) return;
    const itemId=$('usageItemId').value.trim();
    if(!itemId){$('usageStockInfo').hidden=true;return;}
    const available=window.SwatiCore?.stockBalance(itemId)||0;
    $('usageStockInfo').textContent=`Company stock available: ${available}`;
    $('usageStockInfo').hidden=false;
  });

  $('usageForm')?.addEventListener('submit',(e)=>{
    e.preventDefault();
    if(!window.SwatiCore){toast('Core system load થયું નથી');return;}
    const itemId=$('usageItemId').value.trim();
    const itemName=$('usageItemName').value.trim();
    const qty=Number($('usageQty').value||0);
    if(!itemId||!itemName){toast('આઇટમનું નામ અને Item ID દાખલ કરો');return;}
    if(qty<=0){toast('જથ્થો દાખલ કરો');return;}

    const unit=$('usageUnit').value;
    const baseQty=window.SwatiCore.toBaseQty(qty,unit);
    const available=window.SwatiCore.stockBalance(itemId);
    if(baseQty>available+0.001){toast(`Company stock માત્ર ${available} છે`);return;}

        const usageEditId=$('usageEditId')?.value||'';
    const usagePayload={
      date:$('usageDate').value||todayISO(),
      itemId,itemName,qty,unitName:unit,
      context:{
        division:$('usageDivision').value,
        unit:$('usageBusinessUnit').value,
        activity:'usage_consumption',
        costCenter:'usage',
        sourceModule:'usage_alpha11',
        operator:currentOperator()
      },
      note:$('usageNote').value.trim()
    };
    if(usageEditId && window.SwatiCore.updateUsage) window.SwatiCore.updateUsage(usageEditId,usagePayload);
    else window.SwatiCore.addUsage(usagePayload);

    $('usageForm').reset();
    $('usageDate').value=todayISO();
    renderUsage();
    clearEditMode('usage','વપરાશ સાચવો');toast(usageEditId?'વપરાશ update થયો':'વપરાશ સાચવાયો');
  });

  $('financeOpeningForm')?.addEventListener('submit',(e)=>{
    e.preventDefault();
    const settings=window.SwatiCore.getFinanceSettings();
    settings.openingCash=Number($('financeOpeningCash').value||0);
    window.SwatiCore.saveFinanceSettings(settings);
    renderFinance();
    toast('Opening cash સાચવાયું');
  });

  $('bankAccountForm')?.addEventListener('submit',(e)=>{
    e.preventDefault();
    const bankName=$('bankName').value.trim();
    if(!bankName){toast('Bank name દાખલ કરો');return;}
    const editId=$('bankEditId')?.value||'';
    const payload={
      bankName,
      accountName:$('bankAccountName').value.trim(),
      accountType:$('bankAccountType').value,
      openingBalance:Number($('bankOpeningBalance').value||0)
    };
    if(editId && window.SwatiCore.updateBankAccount){
      window.SwatiCore.updateBankAccount(editId,payload);
      toast('Bank account update થયું');
    }else{
      window.SwatiCore.addBankAccount(payload);
      toast('Bank account ઉમેરાયું');
    }
    $('bankAccountForm').reset();
    if($('bankEditId')) $('bankEditId').value='';
    if($('bankSaveBtn')) $('bankSaveBtn').textContent='Bank Account ઉમેરો';
    if($('bankEditCancelBtn')) $('bankEditCancelBtn').hidden=true;
    renderFinance();
  });

  $('loanFacilityForm')?.addEventListener('submit',(e)=>{
    e.preventDefault();
    const name=$('loanFacilityName').value.trim();
    const sanctioned=Number($('loanSanctioned').value||0);
    const used=Number($('loanUsed').value||0);
    if(!name||sanctioned<=0){toast('Facility અને sanctioned limit દાખલ કરો');return;}
    const settings=window.SwatiCore.getFinanceSettings();
    const facilities=Array.isArray(settings.loanFacilities)?settings.loanFacilities:[];
    const editId=$('loanEditId')?.value||'';
    if(editId){
      const i=facilities.findIndex(x=>x.id===editId);
      if(i>=0) facilities[i]={...facilities[i],name,sanctioned:round2(sanctioned),used:round2(used),updatedAt:new Date().toISOString()};
      toast('Loan / Credit update થયું');
    }else{
      facilities.push({id:`LOAN-${Date.now()}`,name,sanctioned:round2(sanctioned),used:round2(used)});
      toast('Loan / Credit facility ઉમેરાઈ');
    }
    settings.loanFacilities=facilities;
    window.SwatiCore.saveFinanceSettings(settings);
    $('loanFacilityForm').reset();
    clearEditMode('loan','Loan / Credit ઉમેરો');
    renderFinance();
  });



  document.querySelectorAll('[data-finance-setup-tab]').forEach(btn=>btn.addEventListener('click',()=>{
    const tab=btn.dataset.financeSetupTab;
    document.querySelectorAll('[data-finance-setup-tab]').forEach(b=>b.classList.toggle('active',b===btn));
    if($('financeSetupCashPanel')) $('financeSetupCashPanel').hidden=tab!=='cash';
    if($('financeSetupBanksPanel')) $('financeSetupBanksPanel').hidden=tab!=='banks';
    if($('financeSetupLoansPanel')) $('financeSetupLoansPanel').hidden=tab!=='loans';
  }));

  $('financeBankManageList')?.addEventListener('click',(e)=>{
    const btn=e.target.closest('[data-edit-bank]');
    if(!btn || !window.SwatiCore) return;
    const b=window.SwatiCore.getBankAccounts().find(x=>x.id===btn.dataset.editBank);
    if(!b) return;
    $('bankEditId').value=b.id;
    $('bankName').value=b.bankName||'';
    $('bankAccountName').value=b.accountName||'';
    $('bankAccountType').value=b.accountType||'current';
    $('bankOpeningBalance').value=Number(b.openingBalance||0);
    $('bankSaveBtn').textContent='Bank Account Update કરો';
    $('bankEditCancelBtn').hidden=false;
    window.scrollTo({top:$('bankAccountForm').getBoundingClientRect().top+window.scrollY-90,behavior:'smooth'});
  });

  $('bankEditCancelBtn')?.addEventListener('click',()=>{
    $('bankAccountForm').reset();
    $('bankEditId').value='';
    $('bankSaveBtn').textContent='Bank Account ઉમેરો';
    $('bankEditCancelBtn').hidden=true;
  });

  $('langGujaratiBtn')?.addEventListener('click',()=>applyInterfaceLanguage('gu'));
  $('langEnglishBtn')?.addEventListener('click',()=>applyInterfaceLanguage('en'));


  document.querySelectorAll('[data-sale-product]').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('[data-sale-product]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');$('companySaleProduct').value=btn.dataset.saleProduct;
    const khali=btn.dataset.saleProduct==='khol';
    $('companySaleUnit').value=khali?'kg':'tin';$('companySaleTinField').hidden=khali;$('companySaleKgField').hidden=!khali;companySaleCalc();
  }));
  document.querySelectorAll('[data-retail-category]').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('[data-retail-category]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');$('retailCategory').value=btn.dataset.retailCategory;
    if(btn.dataset.retailCategory==='oil'){$('retailItem').value='Groundnut Oil';$('retailUnit').value='tin';}
    else{$('retailItem').value='';$('retailUnit').value='kg';}
    renderRetailSales();
  }));
  ['retailQty','retailRate','retailPaid'].forEach(id=>$(id)?.addEventListener('input',retailCalc));
  $('retailSaleForm')?.addEventListener('submit',(e)=>{
    e.preventDefault();const c=retailCalc(),item=$('retailItem').value.trim();
    if(c.qty<=0){toast('જથ્થો દાખલ કરો');return;} if(!item){toast('આઇટમ દાખલ કરો');return;}
    const retailEditId=$('retailEditId')?.value||'';
    const row={id:retailEditId||`RTL-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,date:$('retailSaleDate').value||todayISO(),category:$('retailCategory').value||'oil',customer:$('retailCustomer').value.trim(),village:$('retailVillage').value.trim(),mobile:$('retailMobile').value.trim(),item,qty:round2(c.qty),unit:$('retailUnit').value,rate:round2(c.rate),total:c.total,paid:round2(c.paid),outstanding:c.out,paymentMode:$('retailPaymentMode').value,note:$('retailNote').value.trim(),operator:currentOperator(),createdAt:new Date().toISOString()};
    const rows=getRetailSales();if(retailEditId){const i=rows.findIndex(x=>x.id===retailEditId);if(i>=0) rows[i]={...rows[i],...row,updatedAt:new Date().toISOString()};}else rows.push(row);saveRetailSales(rows);
    if(window.SwatiCore){
      const itemId=row.category==='oil'?(row.unit==='tin'?'oil.packaging.filled_tin_15kg':'oil.finished.oil'):`grain.retail.${row.item.toLowerCase().replace(/\s+/g,'_')}`;
      const salePayload={date:row.date,party:row.customer,itemId,itemName:row.item,qty:row.qty,unitName:row.unit,rate:row.rate,amount:row.total,received:row.paid,paymentMode:row.paymentMode,context:{division:row.category==='oil'?'oil_mill':'grain_pulse',unit:'production',activity:'retail_sale',sourceModule:'retail_sales_alpha16',operator:row.operator,notes:row.id}};
      const linked=retailEditId?linkedCoreSaleBySourceId(row.id):null;
      if(linked && window.SwatiCore.updateSale) window.SwatiCore.updateSale(linked.id,salePayload); else if(!retailEditId) window.SwatiCore.addSale(salePayload);
    }
    $('retailSaleForm').reset();$('retailSaleDate').value=todayISO();$('retailCategory').value='oil';$('retailItem').value='Groundnut Oil';$('retailUnit').value='tin';$('retailPaid').value='0';
    document.querySelectorAll('[data-retail-category]').forEach(b=>b.classList.toggle('active',b.dataset.retailCategory==='oil'));
    renderRetailSales();toast('રિટેલ વેચાણ સાચવાયું');
  });

  document.querySelectorAll('[data-customer-list-mode]').forEach(btn=>btn.addEventListener('click',()=>{
    setCustomerMode(btn.dataset.customerListMode,true);
  }));


  $('stockMgmtSearch')?.addEventListener('input',renderStockManagement);

  $('stockAdjustmentForm')?.addEventListener('submit',(e)=>{
    e.preventDefault();
    if(!window.SwatiCore?.addStockAdjustment){toast('Stock system load થયું નથી');return;}

    const itemName=$('stockAdjustmentItem').value.trim();
    const qty=Number($('stockAdjustmentQty').value||0);
    if(!itemName){toast('આઇટમ દાખલ કરો');return;}
    if(qty<=0){toast('જથ્થો દાખલ કરો');return;}

    const itemId=$('stockAdjustmentItemId').value.trim()||stockItemIdFromName(itemName);
    const direction=$('stockAdjustmentDirection').value;

    window.SwatiCore.addStockAdjustment({
      date:$('stockAdjustmentDate').value||todayISO(),
      itemId,
      itemName,
      qty,
      unitName:$('stockAdjustmentUnit').value,
      direction,
      context:{
        division:'company',
        unit:'company',
        activity:direction==='opening'?'opening_stock':'stock_adjustment',
        sourceModule:'stock_management_alpha21',
        operator:currentOperator(),
        notes:$('stockAdjustmentNote').value.trim()
      }
    });

    const keepDate=$('stockAdjustmentDate').value;
    $('stockAdjustmentForm').reset();
    $('stockAdjustmentDate').value=keepDate||todayISO();
    $('stockAdjustmentDirection').value='opening';
    $('stockAdjustmentUnit').value='kg';
    renderStockManagement();
    toast('સ્ટોક સાચવાયો');
  });


  ['grainProdInputQty','grainProdInputUnit','grainProdGoodQty','grainProdWasteQty','grainProdLossQty',
   'grainProdLabourCost','grainProdElectricityCost','grainProdPackagingCost','grainProdStorageCost','grainProdOtherCost']
    .forEach(id=>$(id)?.addEventListener('input',grainProductionCalc));

  ['grainProdRawItem','grainProdRawItemId'].forEach(id=>$(id)?.addEventListener('input',()=>{
    const name=$('grainProdRawItem')?.value.trim()||'';
    const idv=$('grainProdRawItemId')?.value.trim()||grainStockItemId(name,'raw');
    if($('grainRawAvailable')) $('grainRawAvailable').textContent=`${name?grainRawStockAvailable(idv,name):0} kg`;
  }));

  $('grainProductionForm')?.addEventListener('submit',(e)=>{
    e.preventDefault();
    if(!window.SwatiCore){toast('Core system load થયું નથી');return;}

    const c=grainProductionCalc();
    const rawItem=$('grainProdRawItem').value.trim(),goodItem=$('grainProdGoodItem').value.trim();
    const wasteItem=$('grainProdWasteItem').value.trim(),bagItem=$('grainProdBagItem').value.trim();
    const bagQty=round2(Number($('grainProdBagQty').value||0));

    if(!rawItem){toast('કાચો માલ દાખલ કરો');return;}
    if(!goodItem){toast('Processed item દાખલ કરો');return;}
    if(c.inputKg<=0){toast('Input જથ્થો દાખલ કરો');return;}
    if(c.goodKg<=0){toast('સારો output દાખલ કરો');return;}
    if(Math.abs(c.diff)>0.05){toast('Input અને Output quantities balance કરો');return;}

    const rawItemId=$('grainProdRawItemId').value.trim()||grainStockItemId(rawItem,'raw');
    const goodItemId=$('grainProdGoodItemId').value.trim()||grainStockItemId(goodItem,'processed');
    const wasteItemId=wasteItem?grainStockItemId(wasteItem,'waste'):'';
    const available=grainRawStockAvailable(rawItemId,rawItem);
    if(c.inputKg>available+0.001){toast(`Raw stock માત્ર ${available} kg ઉપલબ્ધ છે`);return;}

    const row={
      id:`GPROD-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      date:$('grainProdDate').value||todayISO(),operator:$('grainProdOperator').value||currentOperator(),
      rawItem,rawItemId,inputKg:c.inputKg,inputUnit:$('grainProdInputUnit').value,
      goodItem,goodItemId,goodKg:c.goodKg,wasteItem,wasteItemId,wasteKg:c.wasteKg,lossKg:c.lossKg,
      bagItem,bagQty,labourCost:round2(Number($('grainProdLabourCost').value||0)),
      electricityCost:round2(Number($('grainProdElectricityCost').value||0)),
      packagingCost:round2(Number($('grainProdPackagingCost').value||0)),
      storageCost:round2(Number($('grainProdStorageCost').value||0)),
      otherCost:round2(Number($('grainProdOtherCost').value||0)),
      totalCost:c.totalCost,cleanYield:c.yieldPct,note:$('grainProdNote').value.trim(),createdAt:new Date().toISOString()
    };

    const ctx={division:'grain_pulse',unit:'production',activity:'grain_processing',sourceModule:'grain_production_alpha22',operator:row.operator,notes:row.id};

    window.SwatiCore.addStockMovement({date:row.date,itemId:row.rawItemId,itemName:row.rawItem,qty:row.inputKg,baseQty:row.inputKg,unitName:'kg',baseUnitName:'kg',movementType:'production_consumption',context:ctx});
    window.SwatiCore.addStockMovement({date:row.date,itemId:row.goodItemId,itemName:row.goodItem,qty:row.goodKg,baseQty:row.goodKg,unitName:'kg',baseUnitName:'kg',movementType:'production_in',context:ctx});

    if(row.wasteKg>0 && row.wasteItem){
      window.SwatiCore.addStockMovement({date:row.date,itemId:row.wasteItemId,itemName:row.wasteItem,qty:row.wasteKg,baseQty:row.wasteKg,unitName:'kg',baseUnitName:'kg',movementType:'production_in',context:{...ctx,activity:'grain_waste_output'}});
    }

    if(row.bagQty>0 && row.bagItem){
      window.SwatiCore.addUsage({date:row.date,itemId:grainBagItemId(row.bagItem),itemName:row.bagItem,qty:row.bagQty,unitName:'bag',context:{...ctx,activity:'packaging_usage'}});
    }

    const costs=[
      ['labour',row.labourCost,'Grain Processing Labour'],
      ['electricity',row.electricityCost,'Grain Processing Electricity'],
      ['packaging',row.packagingCost,'Grain Processing Packaging'],
      ['cold_storage',row.storageCost,'Grain Storage / Cold Storage'],
      ['other',row.otherCost,'Grain Processing Other']
    ];
    costs.filter(x=>x[1]>0).forEach(([category,amount,name])=>{
      window.SwatiCore.addExpense({date:row.date,category,name,amount,paymentMode:'cash',context:{...ctx,costCenter:'grain_production'}});
    });

    const rows=getGrainProductionRuns();rows.push(row);saveGrainProductionRuns(rows);
    const keepDate=row.date;
    $('grainProductionForm').reset();$('grainProdDate').value=keepDate;$('grainProdInputUnit').value='kg';
    $('grainProdWasteQty').value='0';$('grainProdLossQty').value='0';$('grainProdBagQty').value='0';
    ['grainProdLabourCost','grainProdElectricityCost','grainProdPackagingCost','grainProdStorageCost','grainProdOtherCost'].forEach(id=>$(id).value='0');
    renderGrainProduction();renderGrainStock();toast('Grain / Pulse Production સાચવાયું');
  });


  document.querySelectorAll('[data-grain-sale-type]').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('[data-grain-sale-type]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    $('grainSaleType').value=btn.dataset.grainSaleType;
    $('grainSaleItem').value='';
    $('grainSaleItemId').value='';
    renderGrainSales();
  }));

  ['grainSaleQty','grainSaleUnit','grainSaleRate','grainSalePaid','grainSaleItem','grainSaleItemId']
    .forEach(id=>$(id)?.addEventListener('input',grainSaleCalc));

  $('grainSaleForm')?.addEventListener('submit',(e)=>{
    e.preventDefault();
    if(!window.SwatiCore){toast('Core system load થયું નથી');return;}

    const c=grainSaleCalc();
    const customer=$('grainSaleCustomer').value.trim();
    const village=$('grainSaleVillage').value.trim();
    const mobile=$('grainSaleMobile').value.trim();

    if(!c.itemName){toast('વેચાણ item દાખલ કરો');return;}
    if(c.qtyEntered<=0){toast('જથ્થો દાખલ કરો');return;}
    if(c.rate<0){toast('ભાવ ચેક કરો');return;}
    if(c.bad){toast('સ્ટોક પૂરતો નથી');return;}

    const grainSaleEditId=$('grainSaleEditId')?.value||'';
    const row={
      id:grainSaleEditId||`GSALE-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      date:$('grainSaleDate').value||todayISO(),
      type:c.type,
      itemName:c.itemName,
      itemId:c.itemId,
      qtyEntered:round2(c.qtyEntered),
      unit:c.unit,
      baseQty:c.baseQty,
      rate:round2(c.rate),
      total:c.total,
      paid:round2(c.paid),
      outstanding:c.outstanding,
      customer,
      village,
      mobile,
      paymentMode:$('grainSalePaymentMode').value,
      note:$('grainSaleNote').value.trim(),
      operator:currentOperator(),
      createdAt:new Date().toISOString()
    };

    const rows=getGrainSales();
    if(grainSaleEditId){const i=rows.findIndex(x=>x.id===grainSaleEditId);if(i>=0) rows[i]={...rows[i],...row,updatedAt:new Date().toISOString()};}else rows.push(row);
    saveGrainSales(rows);

    const ctx={
      division:'grain_pulse',
      unit:'production',
      activity:row.type==='waste'?'grain_waste_sale':'grain_processed_sale',
      sourceModule:'grain_sales_alpha23',
      operator:row.operator,
      notes:row.id
    };

    // Common Sales ledger: handles stock Sale Out + receivable/payment
    const grainSalePayload={
      date:row.date,
      party:row.customer,
      itemId:row.itemId,
      itemName:row.itemName,
      qty:row.qtyEntered,
      baseQty:row.baseQty,
      unitName:row.unit,
      baseUnitName:'kg',
      rate:row.rate,
      amount:row.total,
      received:row.paid,
      paymentMode:row.paymentMode,
      context:ctx
    };
    const linked=grainSaleEditId?linkedCoreSaleBySourceId(row.id):null;
    if(linked && window.SwatiCore.updateSale) window.SwatiCore.updateSale(linked.id,grainSalePayload); else if(!grainSaleEditId) window.SwatiCore.addSale(grainSalePayload);

    $('grainSaleForm').reset();
    $('grainSaleDate').value=row.date;
    $('grainSaleType').value='processed';
    $('grainSaleUnit').value='kg';
    $('grainSalePaid').value='0';
    document.querySelectorAll('[data-grain-sale-type]').forEach(b=>b.classList.toggle('active',b.dataset.grainSaleType==='processed'));
    clearEditMode('grainSale','વેચાણ સાચવો');
    renderGrainSales();
    renderGrainStock();
    renderStockManagement();
    toast(grainSaleEditId?'Grain / Pulse વેચાણ update થયું':'Grain / Pulse વેચાણ સાચવાયું');
  });

  $('costingSearch')?.addEventListener('input',renderCosting);


  document.querySelectorAll('[data-staff-tab]').forEach(btn=>btn.addEventListener('click',()=>setStaffTab(btn.dataset.staffTab)));

  $('staffMasterForm')?.addEventListener('submit',(e)=>{
    e.preventDefault();
    const name=$('staffName').value.trim();
    if(!name){toast('Staff name દાખલ કરો');return;}
    const staffEditId=$('staffEditId')?.value||'';
    const rows=readLocalList(STAFF_KEY);
    const staffRow={
      id:staffEditId||`STAFF-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      name,
      mobile:$('staffMobile').value.trim(),
      role:$('staffRole').value.trim(),
      salaryType:$('staffSalaryType').value,
      salaryRate:round2(Number($('staffSalaryRate').value||0)),
      joiningDate:$('staffJoiningDate').value||todayISO(),
      note:$('staffNote').value.trim(),
      active:true,
      createdAt:staffEditId?(rows.find(x=>x.id===staffEditId)?.createdAt||new Date().toISOString()):new Date().toISOString()
    };
    if(staffEditId){const i=rows.findIndex(x=>x.id===staffEditId);if(i>=0) rows[i]={...rows[i],...staffRow,updatedAt:new Date().toISOString()};}else rows.push(staffRow);
    writeLocalList(STAFF_KEY,rows);
    $('staffMasterForm').reset();
    $('staffJoiningDate').value=todayISO();
    $('staffSalaryType').value='daily';
    clearEditMode('staff','Staff સાચવો');renderStaff();
    toast(staffEditId?'Staff update થયો':'Staff સાચવાયો');
  });

  $('staffAttendanceForm')?.addEventListener('submit',(e)=>{
    e.preventDefault();
    const staffId=$('attendanceStaff').value;
    if(!staffId){toast('Staff પસંદ કરો');return;}
    const date=$('attendanceDate').value||todayISO();
    const rows=readLocalList(STAFF_ATTENDANCE_KEY);
    const attendanceEditId=$('attendanceEditId')?.value||'';
    const existing=attendanceEditId?rows.findIndex(a=>a.id===attendanceEditId):rows.findIndex(a=>a.staffId===staffId && a.date===date);
    const row={
      id:existing>=0?rows[existing].id:`ATT-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      staffId,date,status:$('attendanceStatus').value,
      note:$('attendanceNote').value.trim(),updatedAt:new Date().toISOString()
    };
    if(existing>=0) rows[existing]=row; else rows.push(row);
    writeLocalList(STAFF_ATTENDANCE_KEY,rows);
    $('attendanceNote').value='';
    clearEditMode('attendance','Attendance સાચવો');renderStaff();
    toast(attendanceEditId?'Attendance update થયું':'Attendance સાચવાયું');
  });

  $('staffPaymentForm')?.addEventListener('submit',(e)=>{
    e.preventDefault();
    const staffId=$('staffPaymentStaff').value;
    const amount=round2(Number($('staffPaymentAmount').value||0));
    if(!staffId){toast('Staff પસંદ કરો');return;}
    if(amount<=0){toast('રકમ દાખલ કરો');return;}
    const staff=staffById(staffId);
    const type=$('staffPaymentType').value;
    const date=$('staffPaymentDate').value||todayISO();
    const paymentMode=$('staffPaymentMode').value;
    const note=$('staffPaymentNote').value.trim();

    const rows=readLocalList(STAFF_PAYMENT_KEY);
    rows.push({
      id:`SPAY-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      staffId,date,type,amount,paymentMode,note,createdAt:new Date().toISOString()
    });
    writeLocalList(STAFF_PAYMENT_KEY,rows);

    if(window.SwatiCore?.addExpense){
      window.SwatiCore.addExpense({
        date,
        category:type==='advance'?'staff_advance':'salary',
        name:type==='advance'?`Staff Advance - ${staff?.name||''}`:`Salary - ${staff?.name||''}`,
        amount,
        paymentMode,
        context:{
          division:'company',
          unit:'company',
          activity:type==='advance'?'staff_advance':'salary_payment',
          sourceModule:'staff_alpha26',
          operator:currentOperator(),
          notes:note
        }
      });
    }

    $('staffPaymentAmount').value='';
    $('staffPaymentNote').value='';
    renderStaff();
    toast(type==='advance'?'Staff Advance ઉમેરાયું':'Salary Payment ઉમેરાયું');
  });


  document.querySelectorAll('[data-invoice-tab]').forEach(btn=>btn.addEventListener('click',()=>setInvoiceTab(btn.dataset.invoiceTab)));
  $('invoiceSourceFilter')?.addEventListener('change',renderInvoices);
  $('invoiceSourceSearch')?.addEventListener('input',renderInvoices);

  $('invoiceSourceList')?.addEventListener('click',(e)=>{
    const btn=e.target.closest('[data-create-invoice]');
    if(!btn) return;
    const [type,id]=String(btn.dataset.createInvoice||'').split('|');
    const src=invoiceSources().find(s=>s.sourceType===type && s.sourceId===id);
    if(!src){toast('Transaction મળ્યો નથી');return;}
    const inv=saveInvoiceSnapshot(invoiceFromSource(src));
    renderInvoices();
    fillInvoicePreview(inv);
  });

  $('invoiceSavedList')?.addEventListener('click',(e)=>{
    const btn=e.target.closest('[data-open-invoice]');
    if(!btn) return;
    const inv=getInvoices().find(x=>x.id===btn.dataset.openInvoice);
    if(inv) fillInvoicePreview(inv);
  });

  $('invoiceClosePreview')?.addEventListener('click',()=>{
    currentInvoice=null;
    preparedInvoicePdf=null;
    preparingInvoicePdf=null;
    if($('invoicePreviewPanel')) $('invoicePreviewPanel').hidden=true;
  });

  $('invoicePrintBtn')?.addEventListener('click',()=>printInvoice(currentInvoice));

  $('invoiceSharePdfBtn')?.addEventListener('click',async()=>{
    if(!currentInvoice||!window.SwatiFiles) return;
    let ready=preparedInvoicePdf?.id===currentInvoice.id?preparedInvoicePdf:null;
    if(!ready){
      ready=await prepareInvoicePdf(currentInvoice);
      if(!ready) return;
    }
    await window.SwatiFiles.shareOrDownload(ready.blob,ready.name,ready.title,ready.text,currentInvoice.mobile);
  });

  $('invoiceDownloadPdfBtn')?.addEventListener('click',async()=>{
    if(!currentInvoice||!window.SwatiFiles) return;
    const ready=preparedInvoicePdf?.id===currentInvoice.id?preparedInvoicePdf:await prepareInvoicePdf(currentInvoice);
    if(ready) window.SwatiFiles.download(ready.blob,ready.name);
  });

  $('invoiceCopyBtn')?.addEventListener('click',async()=>{
    if(!currentInvoice) return;
    const text=invoiceText(currentInvoice);
    try{
      await navigator.clipboard.writeText(text);
      toast('Bill text copy થયું');
    }catch{
      toast('Copy ઉપલબ્ધ નથી');
    }
  });

  $('invoiceWhatsAppBtn')?.addEventListener('click',async()=>{
    if(!currentInvoice) return;
    const text=invoiceText(currentInvoice);
    if(!window.SwatiFiles){window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,'_blank','noopener');return;}
    const ready=preparedInvoicePdf?.id===currentInvoice.id?preparedInvoicePdf:await prepareInvoicePdf(currentInvoice);
    if(ready) await window.SwatiFiles.shareOrDownload(ready.blob,ready.name,ready.title,ready.text,currentInvoice.mobile);
  });

  document.querySelectorAll('[data-mobile-screen]').forEach(btn=>btn.addEventListener('click',()=>showScreen(btn.dataset.mobileScreen)));
  $('mobileMoreBtn')?.addEventListener('click',openAppDrawer);


  document.querySelectorAll('[data-report-type]').forEach(btn=>btn.addEventListener('click',()=>openExpandedReport(btn.dataset.reportType)));
  $('reportBackBtn')?.addEventListener('click',showReportHome);
  ['reportFromDate','reportToDate','reportSearch'].forEach(id=>$(id)?.addEventListener('input',renderExpandedReport));


  $('ownerHomeRefreshBtn')?.addEventListener('click',()=>{
    renderDashboard();
    toast('Dashboard refresh થયું');
  });

  $('ownerAttentionList')?.addEventListener('click',(e)=>{
    const btn=e.target.closest('[data-owner-attention-go]');
    if(btn) showScreen(btn.dataset.ownerAttentionGo);
  });


  // Alpha 35 — Edit controls
  $('financeLoanManageList')?.addEventListener('click',(e)=>{
    const btn=e.target.closest('[data-edit-loan]'); if(!btn) return;
    const settings=window.SwatiCore.getFinanceSettings();
    const l=(settings.loanFacilities||[]).find(x=>x.id===btn.dataset.editLoan); if(!l) return;
    $('loanEditId').value=l.id;$('loanFacilityName').value=l.name||'';$('loanSanctioned').value=l.sanctioned||0;$('loanUsed').value=l.used||0;
    setEditMode('loan',l.id,'Loan / Credit Update કરો');
    window.scrollTo({top:$('loanFacilityForm').getBoundingClientRect().top+window.scrollY-90,behavior:'smooth'});
  });
  $('loanEditCancelBtn')?.addEventListener('click',()=>{$('loanFacilityForm').reset();clearEditMode('loan','Loan / Credit ઉમેરો');});

  $('purchaseHistoryList')?.addEventListener('click',(e)=>{
    const btn=e.target.closest('[data-edit-purchase]'); if(!btn||!window.SwatiCore) return;
    const r=(window.SwatiCore.list('purchases')||[]).find(x=>x.id===btn.dataset.editPurchase); if(!r) return;
    $('purchaseHistoryView').hidden=true;$('purchaseEntryView').hidden=false;
    $('purchaseDivision').value=r.context?.division||'oil_mill';$('purchaseUnit').value=r.context?.unit||'production';
    $('purchaseDate').value=r.date||todayISO();$('purchaseParty').value=r.party||'';$('purchaseItemName').value=r.itemName||'';
    $('purchaseCategory').value=r.context?.costCenter||'other';$('purchaseQty').value=r.qty||0;$('purchaseQtyUnit').value=r.unitName||'kg';
    $('purchaseRate').value=r.rate||0;$('purchasePaid').value=r.paid||0;$('purchaseNote').value=r.context?.notes||'';
    const costs=(window.SwatiCore.list('expenses')||[]).filter(x=>x.context?.notes===r.id&&x.context?.costCenter==='purchase_extra_cost');
    $('purchaseTransport').value=costs.find(x=>x.category==='transportation')?.amount||0;
    $('purchaseLoading').value=costs.find(x=>x.category==='loading')?.amount||0;
    $('purchaseUnloading').value=costs.find(x=>x.category==='unloading')?.amount||0;
    setEditMode('purchase',r.id,'ખરીદી Update કરો');purchaseCalc();window.scrollTo({top:0,behavior:'smooth'});
  });
  $('purchaseEditCancelBtn')?.addEventListener('click',()=>{resetPurchaseEntry();clearEditMode('purchase','ખરીદી સાચવો');});

  $('expenseHistoryList')?.addEventListener('click',(e)=>{
    const btn=e.target.closest('[data-edit-expense]'); if(!btn||!window.SwatiCore) return;
    const r=(window.SwatiCore.list('expenses')||[]).find(x=>x.id===btn.dataset.editExpense); if(!r) return;
    if($('expenseHistoryView')) $('expenseHistoryView').hidden=true;if($('expenseEntryView')) $('expenseEntryView').hidden=false;
    $('expenseDate').value=r.date||todayISO();$('expenseDivision').value=r.context?.division||'oil_mill';$('expenseUnit').value=r.context?.unit||'production';
    $('expenseCategory').value=r.category||'other';$('expenseTitle').value=r.title||'';$('expenseAmount').value=r.amount||0;$('expensePaymentMode').value=r.paymentMode||'cash';
    if($('expenseParty')) $('expenseParty').value=r.party||''; if($('expenseNote')) $('expenseNote').value=r.context?.notes||'';
    setEditMode('expense',r.id,'ખર્ચ Update કરો');window.scrollTo({top:0,behavior:'smooth'});
  });
  $('expenseEditCancelBtn')?.addEventListener('click',()=>{$('coreExpenseForm')?.reset();clearEditMode('expense','ખર્ચ સાચવો');});

  $('usageRecentList')?.addEventListener('click',(e)=>{
    const btn=e.target.closest('[data-edit-usage]'); if(!btn||!window.SwatiCore) return;
    const r=(window.SwatiCore.list('usageMovements')||[]).find(x=>x.id===btn.dataset.editUsage); if(!r) return;
    $('usageDate').value=r.date||todayISO();$('usageItemName').value=r.itemName||'';$('usageItemId').value=r.itemId||'';$('usageQty').value=r.qty||0;
    $('usageUnit').value=r.unitName||'kg';$('usageDivision').value=r.context?.division||'oil_mill';$('usageBusinessUnit').value=r.context?.unit||'job_work';$('usageNote').value=r.note||'';
    setEditMode('usage',r.id,'વપરાશ Update કરો');window.scrollTo({top:0,behavior:'smooth'});
  });
  $('usageEditCancelBtn')?.addEventListener('click',()=>{$('usageForm')?.reset();clearEditMode('usage','વપરાશ સાચવો');renderUsage();});

  $('companySalesList')?.addEventListener('click',(e)=>{
    const btn=e.target.closest('[data-edit-company-sale]'); if(!btn) return;
    const r=getCompanySales().find(x=>x.id===btn.dataset.editCompanySale); if(!r) return;
    $('companySaleDate').value=r.date||todayISO();$('companySaleCustomer').value=r.customer||'';$('companySaleVillage').value=r.village||'';$('companySaleMobile').value=r.mobile||'';
    $('companySaleProduct').value=r.product||'oil';$('companySaleUnit').value=r.unit||'tin';$('companySaleTinCount').value=r.tinCount||0;$('companySaleKg').value=r.kg||0;
    $('companySaleRate').value=r.rate||0;$('companySalePaid').value=r.paid||0;$('companySaleMethod').value=r.method||'cash';$('companySaleNote').value=r.note||'';
    document.querySelectorAll('[data-sale-product]').forEach(b=>b.classList.toggle('active',b.dataset.saleProduct===(r.product||'oil')));
    $('companySaleTinField').hidden=(r.product||'oil')!=='oil'||r.unit!=='tin';$('companySaleKgField').hidden=(r.product||'oil')==='oil'&&r.unit==='tin';
    setEditMode('companySale',r.id,'વેચાણ Update કરો');companySaleCalc();window.scrollTo({top:0,behavior:'smooth'});
  });
  $('companySaleEditCancelBtn')?.addEventListener('click',()=>{$('companySaleForm')?.reset();clearEditMode('companySale','વેચાણ સાચવો');renderCompanySales();});

  $('retailSalesList')?.addEventListener('click',(e)=>{
    const btn=e.target.closest('[data-edit-retail]'); if(!btn) return;
    const r=getRetailSales().find(x=>x.id===btn.dataset.editRetail); if(!r) return;
    $('retailSaleDate').value=r.date||todayISO();$('retailCategory').value=r.category||'oil';$('retailCustomer').value=r.customer||'';$('retailVillage').value=r.village||'';$('retailMobile').value=r.mobile||'';
    $('retailItem').value=r.item||'';$('retailQty').value=r.qty||0;$('retailUnit').value=r.unit||'kg';$('retailRate').value=r.rate||0;$('retailPaid').value=r.paid||0;$('retailPaymentMode').value=r.paymentMode||'cash';$('retailNote').value=r.note||'';
    document.querySelectorAll('[data-retail-category]').forEach(b=>b.classList.toggle('active',b.dataset.retailCategory===(r.category||'oil')));
    setEditMode('retail',r.id,'વેચાણ Update કરો');retailCalc();window.scrollTo({top:0,behavior:'smooth'});
  });
  $('retailEditCancelBtn')?.addEventListener('click',()=>{$('retailSaleForm')?.reset();clearEditMode('retail','વેચાણ સાચવો');renderRetailSales();});

  $('grainSalesList')?.addEventListener('click',(e)=>{
    const btn=e.target.closest('[data-edit-grain-sale]'); if(!btn) return;
    const r=getGrainSales().find(x=>x.id===btn.dataset.editGrainSale); if(!r) return;
    $('grainSaleDate').value=r.date||todayISO();$('grainSaleType').value=r.type||'processed';$('grainSaleCustomer').value=r.customer||'';$('grainSaleVillage').value=r.village||'';$('grainSaleMobile').value=r.mobile||'';
    $('grainSaleItem').value=r.itemName||'';$('grainSaleItemId').value=r.itemId||'';$('grainSaleQty').value=r.qtyEntered||0;$('grainSaleUnit').value=r.unit||'kg';
    $('grainSaleRate').value=r.rate||0;$('grainSalePaid').value=r.paid||0;$('grainSalePaymentMode').value=r.paymentMode||'cash';$('grainSaleNote').value=r.note||'';
    document.querySelectorAll('[data-grain-sale-type]').forEach(b=>b.classList.toggle('active',b.dataset.grainSaleType===(r.type||'processed')));
    setEditMode('grainSale',r.id,'વેચાણ Update કરો');grainSaleCalc();window.scrollTo({top:0,behavior:'smooth'});
  });
  $('grainSaleEditCancelBtn')?.addEventListener('click',()=>{$('grainSaleForm')?.reset();clearEditMode('grainSale','વેચાણ સાચવો');renderGrainSales();});

  $('staffList')?.addEventListener('click',(e)=>{
    const btn=e.target.closest('[data-edit-staff]'); if(!btn) return;
    const r=getStaff().find(x=>x.id===btn.dataset.editStaff); if(!r) return;
    $('staffName').value=r.name||'';$('staffMobile').value=r.mobile||'';$('staffRole').value=r.role||'';$('staffSalaryType').value=r.salaryType||'daily';
    $('staffSalaryRate').value=r.salaryRate||0;$('staffJoiningDate').value=r.joiningDate||todayISO();$('staffNote').value=r.note||'';
    setEditMode('staff',r.id,'Staff Update કરો');window.scrollTo({top:0,behavior:'smooth'});
  });
  $('staffEditCancelBtn')?.addEventListener('click',()=>{$('staffMasterForm')?.reset();clearEditMode('staff','Staff સાચવો');renderStaff();});

  $('attendanceList')?.addEventListener('click',(e)=>{
    const btn=e.target.closest('[data-edit-attendance]'); if(!btn) return;
    const r=getStaffAttendance().find(x=>x.id===btn.dataset.editAttendance); if(!r) return;
    $('attendanceDate').value=r.date||todayISO();$('attendanceStaff').value=r.staffId||'';$('attendanceStatus').value=r.status||'present';$('attendanceNote').value=r.note||'';
    setEditMode('attendance',r.id,'Attendance Update કરો');window.scrollTo({top:0,behavior:'smooth'});
  });
  $('attendanceEditCancelBtn')?.addEventListener('click',()=>{$('staffAttendanceForm')?.reset();clearEditMode('attendance','Attendance સાચવો');renderStaff();});

  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js').catch(()=>{});

  enableNumberInputCleanup();
  initSettingsForm();
  renderOperatorUI();
  deviceId();
  ensureDeviceAssignment();
  resetForm();
  resetGrainForm();
  resetBatchForm();
  if($('reportFrom') && $('reportTo')) setReportRange('month');
  renderAll();
})();
