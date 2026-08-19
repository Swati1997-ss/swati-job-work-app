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
    if($('deviceAssignedOperator')) $('deviceAssignedOperator').textContent=currentOperator()||'Not assigned';
    if($('deviceAssignedId')) $('deviceAssignedId').textContent=shortDeviceId();
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
    fillGrainPreview(r); $('grainForm').style.display='none'; $('grainPrintArea').classList.add('visible'); window.scrollTo({top:0,behavior:'smooth'});
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
    const today = todayISO();
    const rows = all.filter(r => r.date === today);
    $('todayCount').textContent = rows.length;
    $('todayJob').textContent = money(rows.reduce((s,r)=>s+(r.jobWorkAmount||0),0));
    $('todayKhol').textContent = money(rows.reduce((s,r)=>s+(r.khol?.amount||0),0));
    $('todayOutstanding').textContent = money(rows.reduce((s,r)=>s+remainingFor(r),0));
    $('allCustomers').textContent=getCustomers().length;
    $('allTxCount').textContent=all.length;
    $('allReceivableOutstanding').textContent=money(all.filter(r=>r.settlement?.net>0).reduce((s,r)=>s+remainingFor(r),0));
    $('allPayableOutstanding').textContent=money(all.filter(r=>r.settlement?.net<0).reduce((s,r)=>s+remainingFor(r),0));
  }

  function renderCustomers(){
    const q=($('customerSearch')?.value||'').trim().toLowerCase();
    const rows=getCustomers().filter(c=>[c.name,c.mobile,c.village].join(' ').toLowerCase().includes(q));
    $('customerCountLabel').textContent=`${rows.length} ગ્રાહકો`;
    $('customerList').innerHTML=rows.map(c=>`<div class="customer-card">
      <div><strong>${escapeHtml(c.name)}</strong><div class="muted">${escapeHtml(c.village||'')}${c.mobile?` • ${escapeHtml(c.mobile)}`:''}</div><div class="customer-meta">${c.count} એન્ટ્રી • છેલ્લી ${escapeHtml(c.lastDate||'—')} • મજૂરી કામ ${money(c.totalJob)}</div></div>
      <div class="customer-due"><span>લેવાના બાકી ${money(c.receivableOutstanding)}</span><span>આપવાના બાકી ${money(c.payableOutstanding)}</span><div class="button-row"><button class="secondary small" data-new-oil-for="${escapeAttr(c.key)}">તેલ મિલ</button><button class="ghost small" data-new-grain-for="${escapeAttr(c.key)}">અનાજ/કઠોળ</button></div></div>
    </div>`).join('') || '<div class="empty">હજુ કોઈ ગ્રાહક નથી.</div>';
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
    $('reportDailyBody').innerHTML=[...daily.entries()].sort((a,b)=>b[0].localeCompare(a[0])).map(([d,x])=>`<tr><td>${escapeHtml(d)}</td><td>${x.count}</td><td>${money(x.job)}</td><td>${money(x.purchase)}</td><td>${money(x.sales)}</td><td>${money(x.outstanding)}</td></tr>`).join('')||'<tr><td colspan="6">આ સમયગાળામાં કોઈ એન્ટ્રી નથી.</td></tr>';

    const customers=new Map();
    rows.forEach(r=>{
      const name=r.customer?.name||'—', village=r.customer?.village||'', key=(r.customer?.mobile||'')||`${name}|${village}`;
      const x=customers.get(key)||{name,village,count:0,job:0}; x.count++; x.job+=Number(r.jobWorkAmount||0); customers.set(key,x);
    });
    $('reportCustomerBody').innerHTML=[...customers.values()].sort((a,b)=>b.job-a.job).slice(0,15).map(x=>`<tr><td>${escapeHtml(x.name)}</td><td>${escapeHtml(x.village)}</td><td>${x.count}</td><td>${money(x.job)}</td></tr>`).join('')||'<tr><td colspan="4">ડેટા નથી.</td></tr>';

    const villages=new Map();
    rows.forEach(r=>{
      const v=(r.customer?.village||'ગામ નથી').trim()||'ગામ નથી'; const x=villages.get(v)||{customers:new Set(),count:0,job:0,outstanding:0};
      x.customers.add((r.customer?.mobile||'')||r.customer?.name||r.id); x.count++; x.job+=Number(r.jobWorkAmount||0); x.outstanding+=remainingFor(r); villages.set(v,x);
    });
    $('reportVillageBody').innerHTML=[...villages.entries()].sort((a,b)=>b[1].job-a[1].job).map(([v,x])=>`<tr><td>${escapeHtml(v)}</td><td>${x.customers.size}</td><td>${x.count}</td><td>${money(x.job)}</td><td>${money(x.outstanding)}</td></tr>`).join('')||'<tr><td colspan="5">ડેટા નથી.</td></tr>';
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
    const blob = new Blob([content], {type});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download=name; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }

  function escapeHtml(s=''){ return String(s).replace(/[&<>'"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function escapeAttr(s=''){ return escapeHtml(s); }

  function toast(msg){
    const t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(t._timer); t._timer = setTimeout(()=>t.classList.remove('show'),2200);
  }

  function showScreen(name){
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.screen === name));
    $(`screen-${name}`).classList.add('active');
    hidePreview();
    hideGrainPreview();
    if (name === 'history') renderHistory();
    if (name === 'customers') renderCustomers();
    if (name === 'home') renderDashboard();
    if (name === 'stock') renderStock();
    if (name === 'reports') renderReports();
    window.scrollTo({top:0,behavior:'smooth'});
  }

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
  document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click',()=>showScreen(b.dataset.go)));
  $('oilForm').addEventListener('input', calculate);
  $('customerMobile').addEventListener('input',()=>{
    const clean = $('customerMobile').value.replace(/\D/g,'').slice(0,10);
    if ($('customerMobile').value !== clean) $('customerMobile').value = clean;
  });
  $('oilForm').addEventListener('submit', saveRecord);
  $('previewBtn').addEventListener('click', showPreview);
  $('backToForm').addEventListener('click', hidePreview);
  $('printBtn').addEventListener('click', () => window.print());
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
  $('customerList').addEventListener('click',(e)=>{ const bo=e.target.closest('[data-new-oil-for]'); if(bo){ selectCustomer(bo.dataset.newOilFor); showScreen('new-oil'); return;} const bg=e.target.closest('[data-new-grain-for]'); if(bg){ selectGrainCustomer(bg.dataset.newGrainFor); showScreen('grain'); } });
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
  $('grainPreviewBtn').addEventListener('click',showGrainPreview); $('grainBackToForm').addEventListener('click',hideGrainPreview); $('grainPrintBtn').addEventListener('click',()=>window.print()); $('grainResetBtn').addEventListener('click',resetGrainForm);
  $('grainTxDate').addEventListener('change',()=>{if(!lastSavedGrainId)$('grainBillNo').value=nextGrainBillNo();});
  $('batchForm').addEventListener('input',calculateBatch);
  $('batchForm').addEventListener('change',calculateBatch);
  $('batchForm').addEventListener('submit',saveBatch);
  $('batchResetBtn').addEventListener('click',resetBatchForm);
  $('batchBody').addEventListener('click',(e)=>{const b=e.target.closest('[data-delete-batch]');if(b)deleteBatch(b.dataset.deleteBatch);});
  $('deviceOperatorButtons')?.addEventListener('click',(e)=>{const b=e.target.closest('[data-assign-operator]'); if(b) assignDeviceOperator(b.dataset.assignOperator);});

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
