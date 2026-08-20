(() => {
  'use strict';

  const STORAGE_TX = 'swati_oil_transactions_v1';
  const STORAGE_SETTINGS = 'swati_settings_v1';
  const STORAGE_BATCHES = 'swati_batches_v1';
  const STORAGE_OPERATORS = 'swati_operators_v1';
  const STORAGE_CURRENT_OPERATOR = 'swati_current_operator_v1';
  const STORAGE_DEVICE_ID = 'swati_device_id_v1';
  const STORAGE_AUDIT = 'swati_audit_v1';
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
  function saveCompanyPurchases(rows){localStorage.setItem(COMPANY_PURCHASES_KEY,JSON.stringify(rows));}
  function getCompanyBatches(){try{return JSON.parse(localStorage.getItem(COMPANY_BATCHES_KEY)||'[]')}catch{return []}}
  function saveCompanyBatches(rows){localStorage.setItem(COMPANY_BATCHES_KEY,JSON.stringify(rows));}
  function getCompanySales(){try{return JSON.parse(localStorage.getItem(COMPANY_SALES_KEY)||'[]')}catch{return []}}
  function saveCompanySales(rows){localStorage.setItem(COMPANY_SALES_KEY,JSON.stringify(rows));}
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
    const b=getBatches().find(x=>x.id===id); if(!b)return; if(!confirm(`${b.batchNo} કાઢવો છે? સ્ટોક પાછો ઉપલબ્ધ થઈ જશે.`))return; setBatches(getBatches().filter(x=>x.id!==id)); addAudit('BATCH_DELETE','batch',id,`${b.batchNo} • ${b.material} • ${b.qty} કિલો`); renderStock(); toast('Batch કાઢ્યો');
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
    if($('companySalesList')) $('companySalesList').innerHTML=rows.map(x=>`<div class="mini-list-row"><span><strong>${escapeHtml(x.customer||'—')}</strong><small>${escapeHtml(x.date)} • ${escapeHtml(x.village||'')}</small></span><span><strong>${money(x.total)}</strong><small>${x.unit==='tin'?`${x.tinCount} ટીન`:`${x.kg} kg`} • બાકી ${money(x.outstanding)}</small></span></div>`).join('')||'<div class="empty">હજુ વેચાણ નથી.</div>';
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
        </div>
      </div>`).join('')||'<div class="empty">ખર્ચ મળ્યો નથી.</div>';
  }



  function renderFinance(){
    if(!window.SwatiCore) return;
    const f=window.SwatiCore.financeSummary();
    const jobTx=getTx();
    const jobReceivable=round2(jobTx.filter(r=>r.settlement?.net>0).reduce((s,r)=>s+remainingFor(r),0));
    const jobPayable=round2(jobTx.filter(r=>r.settlement?.net<0).reduce((s,r)=>s+remainingFor(r),0));
    const receivable=round2(f.salesOutstanding+jobReceivable);
    const payable=round2(f.purchaseOutstanding+jobPayable);
    const stockValue=estimateStockValue();

    $('financeCashBalance').textContent=money(f.cashBalance);
    $('financeBankBalance').textContent=money(f.bankBalance);
    $('financeLiquid').textContent=money(f.liquidMoney||round2(f.cashBalance+f.bankBalance));
    $('financeReceivable').textContent=money(receivable);
    $('financePayable').textContent=money(payable);
    $('financePurchases').textContent=money(f.purchaseAmount);
    $('financeExpenses').textContent=money(f.expensesAmount);
    $('financeStockValue').textContent=money(stockValue);

    const settings=window.SwatiCore.getFinanceSettings();
    if($('financeOpeningCash')) $('financeOpeningCash').value=Number(settings.openingCash||0)||'';

    const banks=window.SwatiCore.getBankAccounts();
    $('financeBankCount').textContent=String(banks.length);
    $('financeBankList').innerHTML=banks.map(b=>`
      <div class="finance-stock-row">
        <span><strong>${escapeHtml(b.bankName||'Bank')}</strong><small>${escapeHtml(b.accountType||'')} • ${escapeHtml(b.accountName||'')}</small></span>
        <span><strong>${money(b.openingBalance||0)}</strong><small>Opening</small></span>
      </div>`).join('')||'<div class="empty">હજુ bank account નથી.</div>';

    const facilities=Array.isArray(settings.loanFacilities)?settings.loanFacilities:[];
    const available=round2(facilities.reduce((s,x)=>s+Math.max(0,Number(x.sanctioned||0)-Number(x.used||0)),0));
    $('financeBorrowingAvailable').textContent=money(available);
    $('financeLoanList').innerHTML=facilities.map(x=>`
      <div class="finance-stock-row">
        <span><strong>${escapeHtml(x.name||'Facility')}</strong><small>Limit ${money(x.sanctioned||0)}</small></span>
        <span><strong>${money(Math.max(0,Number(x.sanctioned||0)-Number(x.used||0)))}</strong><small>Available • Used ${money(x.used||0)}</small></span>
      </div>`).join('')||'<div class="empty">કોઈ loan/credit facility નથી.</div>';

    const stock=window.SwatiCore.stockSnapshot();
    $('financeStockItemCount').textContent=`${stock.length} Items`;
    $('financeStockList').innerHTML=stock.map(x=>`
      <div class="finance-stock-row">
        <span><strong>${escapeHtml(x.itemName||x.itemId||'Item')}</strong><small>${escapeHtml(x.unitName||'')}</small></span>
        <span><strong>${x.balance}</strong><small>In ${x.inQty} • Out ${x.outQty}</small></span>
      </div>`).join('')||'<div class="empty">હજુ stock movement નથી.</div>';
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
        <span><strong>${r.qty||0} ${escapeHtml(r.unitName||'')}</strong></span>
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
  function saveRetailSales(rows){localStorage.setItem(RETAIL_SALES_KEY,JSON.stringify(rows));}
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
    if($('retailSalesList')) $('retailSalesList').innerHTML=rows.slice(0,10).map(r=>`<div class="mini-list-row"><span><strong>${escapeHtml(r.item||'—')}</strong><small>${escapeHtml(r.date||'')} • ${escapeHtml(r.customer||'Retail')}</small></span><span><strong>${money(r.total||0)}</strong><small>${r.qty||0} ${escapeHtml(r.unit||'')} • બાકી ${money(r.outstanding||0)}</small></span></div>`).join('')||'<div class="empty">હજુ retail sale નથી.</div>';
    const map=new Map();
    rows.forEach(r=>{const k=(r.mobile||`${r.customer}|${r.village}`).trim().toLowerCase();if(!k)return;const x=map.get(k)||{name:r.customer||'',mobile:r.mobile||'',village:r.village||'',count:0,total:0};x.count++;x.total+=Number(r.total||0);map.set(k,x);});
    const customers=[...map.values()];
    if($('retailCustomerCount')) $('retailCustomerCount').textContent=String(customers.length);
    if($('retailCustomerList')) $('retailCustomerList').innerHTML=customers.map(c=>`<div class="mini-list-row"><span><strong>${escapeHtml(c.name||'—')}</strong><small>${escapeHtml(c.village||'')} • ${escapeHtml(c.mobile||'')}</small></span><span><strong>${money(c.total)}</strong><small>${c.count} sales</small></span></div>`).join('')||'<div class="empty">હજુ retail customer નથી.</div>';
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

  function renderReports(){
    if(!$('reportTxCount')) return;
    const rows=reportRows();
    let job=0,purchase=0,sales=0,receivable=0,payable=0,paid=0,outstanding=0;
    rows.forEach(r=>{
      const p=reportParts(r); job+=Number(r.jobWorkAmount||0); purchase+=p.purchase; sales+=p.sales;
      receivable+=Number(r.settlement?.receivable||0); payable+=Number(r.settlement?.payable||0);
      paid+=paymentTotal(r); outstanding+=remainingFor(r);
    });
    $('reportTxCount').textContent=rows.length;
    $('reportJobTotal').textContent=money(job);
    $('reportPurchaseTotal').textContent=money(purchase);
    $('reportSalesTotal').textContent=money(sales);
    $('reportReceivable').textContent=money(receivable);
    $('reportPayable').textContent=money(payable);
    $('reportPaid').textContent=money(paid);
    $('reportOutstanding').textContent=money(outstanding);
    const from=$('reportFrom').value||'શરૂઆત'; const to=$('reportTo').value||'આજ';
    $('reportPeriodLabel').textContent=`${from} થી ${to}`;

    const daily=new Map();
    rows.forEach(r=>{
      const d=r.date||'—', p=reportParts(r), x=daily.get(d)||{count:0,job:0,purchase:0,sales:0,outstanding:0};
      x.count++; x.job+=Number(r.jobWorkAmount||0); x.purchase+=p.purchase; x.sales+=p.sales; x.outstanding+=remainingFor(r); daily.set(d,x);
    });
    $('reportDailyBody').innerHTML=[...daily.entries()].sort((a,b)=>b[0].localeCompare(a[0])).map(([d,x])=>`<tr><td data-label="તારીખ">${escapeHtml(d)}</td><td data-label="બિલ">${x.count}</td><td data-label="મજૂરી">${money(x.job)}</td><td data-label="ખરીદી">${money(x.purchase)}</td><td data-label="વેચાણ">${money(x.sales)}</td><td data-label="બાકી">${money(x.outstanding)}</td></tr>`).join('')||'<tr class="report-empty"><td colspan="6">આ સમયગાળામાં કોઈ એન્ટ્રી નથી.</td></tr>';

    const customers=new Map();
    rows.forEach(r=>{
      const name=r.customer?.name||'—', village=r.customer?.village||'', key=(r.customer?.mobile||'')||`${name}|${village}`;
      const x=customers.get(key)||{name,village,count:0,job:0}; x.count++; x.job+=Number(r.jobWorkAmount||0); customers.set(key,x);
    });
    $('reportCustomerBody').innerHTML=[...customers.values()].sort((a,b)=>b.job-a.job).slice(0,15).map(x=>`<tr><td data-label="ગ્રાહક">${escapeHtml(x.name)}</td><td data-label="ગામ">${escapeHtml(x.village)}</td><td data-label="ટ્રાન્ઝેક્શન">${x.count}</td><td data-label="મજૂરી">${money(x.job)}</td></tr>`).join('')||'<tr class="report-empty"><td colspan="4">ડેટા નથી.</td></tr>';

    const villages=new Map();
    rows.forEach(r=>{
      const v=(r.customer?.village||'ગામ નથી').trim()||'ગામ નથી'; const x=villages.get(v)||{customers:new Set(),count:0,job:0,outstanding:0};
      x.customers.add((r.customer?.mobile||'')||r.customer?.name||r.id); x.count++; x.job+=Number(r.jobWorkAmount||0); x.outstanding+=remainingFor(r); villages.set(v,x);
    });
    $('reportVillageBody').innerHTML=[...villages.entries()].sort((a,b)=>b[1].job-a[1].job).map(([v,x])=>`<tr><td data-label="ગામ">${escapeHtml(v)}</td><td data-label="ગ્રાહકો">${x.customers.size}</td><td data-label="ટ્રાન્ઝેક્શન">${x.count}</td><td data-label="મજૂરી કામ">${money(x.job)}</td><td data-label="બાકી">${money(x.outstanding)}</td></tr>`).join('')||'<tr class="report-empty"><td colspan="5">ડેટા નથી.</td></tr>';
  }

  function setReportRange(kind){
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
    const payload={version:4,exportedAt:new Date().toISOString(),settings,operators:getOperators(),currentOperator:currentOperator(),deviceId:deviceId(),transactions:getTx(),batches:getBatches(),audit:getAudit()};
    downloadBlob(JSON.stringify(payload,null,2),'application/json',`swati-job-work-backup-${todayISO()}.json`);
  }

  function restoreBackup(file){
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        const data=JSON.parse(reader.result);
        if(!Array.isArray(data.transactions)) throw new Error('Invalid');
        if(data.settings){ settings={...defaults,...data.settings}; saveSettings(); initSettingsForm(); }
        setTx(data.transactions.map(migrateRow));
        if(Array.isArray(data.batches)) setBatches(data.batches); if(Array.isArray(data.operators)) setOperators(data.operators); if(Array.isArray(data.audit)) setAudit(data.audit); addAudit('BACKUP_RESTORE','system','restore',`Backup ${data.exportedAt||''}`); renderOperatorUI();
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
    finance:'ફાઇનાન્સ',
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
    if (name === 'usage') renderUsage();
    if (name === 'expenses') renderExpenses();
    if (name === 'finance') renderFinance();
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
    if(btn) btn.setAttribute('aria-expanded',String(shouldOpen));
  });
  document.querySelectorAll('.drawer-sublink').forEach(b=>b.addEventListener('click',()=>showScreen(b.dataset.screen)));
  $('grainMenuToggle')?.addEventListener('click',()=>{
    const menu=$('grainSubmenu'),btn=$('grainMenuToggle');
    const shouldOpen=!!menu?.hidden;
    if(menu) menu.hidden=!shouldOpen;
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

  function showReportHome(){
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
      btn.textContent='ફાઇલ શેર';
    }else{
      btn.disabled=false;
      btn.textContent='ફાઇલ શેર';
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
    return `સ્વાતિ મિની ઓઇલ મિલ\n${b}\nબિલ: ${r?.billNo||'—'}\nતારીખ: ${r?.date||'—'}\nગ્રાહક: ${r?.customer?.name||'—'}\nગામ: ${r?.customer?.village||'—'}\nમજૂરી: ${money(r?.jobWorkAmount||0)}\nબાકી: ${money(remainingFor(r))}`;
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
        if(shareNow){
          // The PDF had to be generated after this tap, so browser user-activation may be gone.
          // Do not trigger a false download. Ask for one clean second tap now that the file is ready.
          toast('PDF તૈયાર છે — હવે “ફાઇલ શેર” ફરી દબાવો');
          return;
        }
      }
      if(shareNow){
        const ok=await window.SwatiFiles.share(ready.blob,ready.name,ready.title,ready.text);
        if(!ok){
          window.SwatiFiles.presentBlob(ready.blob,ready.name,{
            title:'PDF શેર માટે તૈયાર છે',
            text:ready.text,
            hint:'તમારો browser file-share સપોર્ટ કરે તો “શેર કરો”થી native Share menu ખુલશે. Download માત્ર અલગ buttonથી જ થશે.'
          });
        }
      }else{
        window.SwatiFiles.presentBlob(ready.blob,ready.name,{title:'PDF તૈયાર છે',text:ready.text});
      }
    }catch(e){console.error(e);toast('PDF / Share બનાવવામાં સમસ્યા આવી');}
  }
  function shareBillWhatsApp(business){
    const r=business==='grain'?currentGrainRecord():currentRecord(); if(!r.customer?.name){toast('ગ્રાહકનું નામ જરૂરી છે');return;}
    if(window.SwatiFiles) window.SwatiFiles.whatsappText(billShareText(r,business)); else window.open(`https://wa.me/?text=${encodeURIComponent(billShareText(r,business))}`,'_blank');
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
    rows.push({id:companyUid('RAW'),date:$('rawPurchaseDate').value||todayISO(),supplier:$('rawSupplier').value.trim(),village:$('rawVillage').value.trim(),mobile:$('rawMobile').value.trim(),material:$('rawMaterial').value,qtyKg:round2(qty),rateKg:round2(rate),total,paid:round2(paid),outstanding:out,note:$('rawNote').value.trim(),createdAt:new Date().toISOString(),operator:currentOperator()});
    saveCompanyPurchases(rows);
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
    $('productionBatchForm').reset(); $('productionDate').value=todayISO(); $('productionBatchNo').value=nextProductionBatchNo(); $('productionLossKg').value='0'; $('productionTinCount').value='0';
    hydrateCompanyOperator(); productionCalc(); renderCompanyProduction(); toast('પ્રોડક્શન બેચ સાચવાયો');
  });

  $('companySaleForm')?.addEventListener('submit',(e)=>{
    e.preventDefault();
    const c=companySaleCalc();
    if(c.qty<=0){toast('વેચાણ જથ્થો દાખલ કરો');return;}
    if(c.bad){toast('સ્ટોક પૂરતો નથી');return;}
    const rows=getCompanySales();
    rows.push({id:companyUid('SALE'),date:$('companySaleDate').value||todayISO(),customer:$('companySaleCustomer').value.trim(),village:$('companySaleVillage').value.trim(),mobile:$('companySaleMobile').value.trim(),product:c.product,unit:c.unit,tinCount:c.product==='oil'?c.tinCount:0,kg:c.kg,oilKg:c.oilKg,rate:round2(Number($('companySaleRate').value||0)),total:c.total,paid:round2(Number($('companySalePaid').value||0)),outstanding:c.out,method:$('companySaleMethod').value,note:$('companySaleNote').value.trim(),createdAt:new Date().toISOString(),operator:currentOperator()});
    saveCompanySales(rows);
    $('companySaleForm').reset();$('companySaleDate').value=todayISO();$('companySaleProduct').value='oil';
    document.querySelectorAll('[data-sale-product]').forEach(b=>b.classList.toggle('active',b.dataset.saleProduct==='oil'));
    $('companySaleUnit').value='tin';$('companySaleTinCount').value='0';$('companySaleKg').value='0';$('companySalePaid').value='0';
    $('companySaleTinField').hidden=false;$('companySaleKgField').hidden=true;companySaleCalc();renderCompanySales();toast('વેચાણ સાચવાયું');
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

    const purchase=window.SwatiCore.addPurchase({
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
    });

    const baseContext={
      division,
      unit,
      activity:'purchase_extra_cost',
      costCenter:'purchase_extra_cost',
      sourceModule:'common_purchase_alpha8',
      operator:currentOperator(),
      notes:purchase.id
    };

    if(c.transport>0) window.SwatiCore.addExpense({
      date:purchase.date,category:'transportation',title:`Transport - ${itemName}`,
      amount:c.transport,paymentMode:'cash',party:$('purchaseParty').value.trim(),context:baseContext
    });
    if(c.loading>0) window.SwatiCore.addExpense({
      date:purchase.date,category:'loading',title:`Loading - ${itemName}`,
      amount:c.loading,paymentMode:'cash',party:$('purchaseParty').value.trim(),context:baseContext
    });
    if(c.unloading>0) window.SwatiCore.addExpense({
      date:purchase.date,category:'unloading',title:`Unloading - ${itemName}`,
      amount:c.unloading,paymentMode:'cash',party:$('purchaseParty').value.trim(),context:baseContext
    });

    resetPurchaseEntry();
    toast('ખરીદી સાચવાઈ');
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

    window.SwatiCore.addExpense({
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
    });

    $('coreExpenseForm').reset();
    $('expenseDate').value=todayISO();
    $('expenseDivision').value='company';
    $('expenseUnit').value='common';
    $('expensePaymentMode').value='cash';
    renderExpenses();
    toast('ખર્ચ સાચવાયો');
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
      finance:'ફાઇનાન્સ',
      usage:'વપરાશ',
      customers:'ગ્રાહકો',
      'retail-sales':'રિટેલ વેચાણ',
    history:'હિસ્ટ્રી',
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

    window.SwatiCore.addUsage({
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
    });

    $('usageForm').reset();
    $('usageDate').value=todayISO();
    renderUsage();
    toast('વપરાશ સાચવાયો');
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
    window.SwatiCore.addBankAccount({
      bankName,
      accountName:$('bankAccountName').value.trim(),
      accountType:$('bankAccountType').value,
      openingBalance:Number($('bankOpeningBalance').value||0)
    });
    $('bankAccountForm').reset();
    renderFinance();
    toast('Bank account ઉમેરાયું');
  });

  $('loanFacilityForm')?.addEventListener('submit',(e)=>{
    e.preventDefault();
    const name=$('loanFacilityName').value.trim();
    const sanctioned=Number($('loanSanctioned').value||0);
    const used=Number($('loanUsed').value||0);
    if(!name||sanctioned<=0){toast('Facility અને sanctioned limit દાખલ કરો');return;}
    const settings=window.SwatiCore.getFinanceSettings();
    const facilities=Array.isArray(settings.loanFacilities)?settings.loanFacilities:[];
    facilities.push({id:`LOAN-${Date.now()}`,name,sanctioned:round2(sanctioned),used:round2(used)});
    settings.loanFacilities=facilities;
    window.SwatiCore.saveFinanceSettings(settings);
    $('loanFacilityForm').reset();
    renderFinance();
    toast('Loan / Credit facility ઉમેરાઈ');
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
    const row={id:`RTL-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,date:$('retailSaleDate').value||todayISO(),category:$('retailCategory').value||'oil',customer:$('retailCustomer').value.trim(),village:$('retailVillage').value.trim(),mobile:$('retailMobile').value.trim(),item,qty:round2(c.qty),unit:$('retailUnit').value,rate:round2(c.rate),total:c.total,paid:round2(c.paid),outstanding:c.out,paymentMode:$('retailPaymentMode').value,note:$('retailNote').value.trim(),operator:currentOperator(),createdAt:new Date().toISOString()};
    const rows=getRetailSales();rows.push(row);saveRetailSales(rows);
    if(window.SwatiCore){
      const itemId=row.category==='oil'?(row.unit==='tin'?'oil.packaging.filled_tin_15kg':'oil.finished.oil'):`grain.retail.${row.item.toLowerCase().replace(/\s+/g,'_')}`;
      window.SwatiCore.addSale({date:row.date,party:row.customer,itemId,itemName:row.item,qty:row.qty,unitName:row.unit,rate:row.rate,amount:row.total,received:row.paid,context:{division:row.category==='oil'?'oil_mill':'grain_pulse',unit:'production',activity:'retail_sale',sourceModule:'retail_sales_alpha16',operator:row.operator,notes:row.id}});
    }
    $('retailSaleForm').reset();$('retailSaleDate').value=todayISO();$('retailCategory').value='oil';$('retailItem').value='Groundnut Oil';$('retailUnit').value='tin';$('retailPaid').value='0';
    document.querySelectorAll('[data-retail-category]').forEach(b=>b.classList.toggle('active',b.dataset.retailCategory==='oil'));
    renderRetailSales();toast('રિટેલ વેચાણ સાચવાયું');
  });

  document.querySelectorAll('[data-customer-list-mode]').forEach(btn=>btn.addEventListener('click',()=>{
    setCustomerMode(btn.dataset.customerListMode,true);
  }));

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
