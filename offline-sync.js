(() => {
  'use strict';
  const QUEUE_KEY='swati_sync_queue_v2';
  const LAST_SYNC_KEY='swati_last_sync_v2';
  const LAST_MASTER_KEY='swati_master_updated_v1';
  const KEYS=['swati_oil_transactions_v1','swati_settings_v1','swati_batches_v1','swati_operators_v1','swati_audit_v1','swati_deleted_v1','swati_delete_security_v1'];
  const cfg=()=>window.getSwatiSyncConfig?window.getSwatiSyncConfig():(window.SWATI_SYNC_CONFIG||{});
  const parse=(k,fallback)=>{try{const v=localStorage.getItem(k);return v===null?fallback:JSON.parse(v)}catch{return fallback}};
  const queue=()=>parse(QUEUE_KEY,[]);
  const setQueue=(rows)=>localStorage.setItem(QUEUE_KEY,JSON.stringify(rows.slice(-200)));
  const configured=()=>!!(cfg().enabled && /^https:\/\//.test(String(cfg().endpointUrl||'')) && cfg().workspaceCode && cfg().workspaceKey);
  const deviceId=()=>localStorage.getItem('swati_device_id_v1')||'';
  const operator=()=>localStorage.getItem('swati_current_operator_v1')||'';
  let timer=null, syncing=false, applying=false;

  function enqueue(dataset='data', action='update'){
    if(applying) return;
    const rows=queue(); const now=new Date().toISOString();
    const existing=rows.find(x=>x.dataset===dataset);
    if(existing){existing.changedAt=now;existing.action=action;existing.count=(existing.count||1)+1;}
    else rows.push({id:(crypto.randomUUID?crypto.randomUUID():`q-${Date.now()}-${Math.random()}`),dataset,action,changedAt:now,count:1});
    setQueue(rows); render(); scheduleAuto();
  }

  function snapshot(){
    const data={}; for(const k of KEYS) data[k]=parse(k,null);
    return {version:24,createdAt:new Date().toISOString(),workspaceCode:cfg().workspaceCode,deviceId:deviceId(),operator:operator(),data};
  }

  function applyMaster(master){
    if(!master || !master.data) return;
    applying=true;
    try{
      for(const k of KEYS){ if(Object.prototype.hasOwnProperty.call(master.data,k) && master.data[k]!==null) localStorage.setItem(k,JSON.stringify(master.data[k])); }
      if(master.updatedAt) localStorage.setItem(LAST_MASTER_KEY, master.updatedAt);
      localStorage.setItem('swati_last_local_save_v1',new Date().toISOString());
    } finally { applying=false; }
  }

  async function request(action, includeSnapshot=true){
    const body={action,workspaceCode:cfg().workspaceCode,workspaceKey:cfg().workspaceKey,deviceId:deviceId(),operator:operator(),pending:queue()};
    if(includeSnapshot) body.snapshot=snapshot();
    const r=await fetch(cfg().endpointUrl,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body)});
    const text=await r.text(); let out={}; try{out=JSON.parse(text)}catch{out={ok:r.ok,message:text}};
    if(!r.ok || out.ok===false) throw new Error(out.message||'Sync failed');
    return out;
  }

  async function syncNow({silent=false}={}){
    if(syncing) return {ok:false,reason:'busy'};
    if(!navigator.onLine){render(); if(!silent) throw new Error('Internet ઉપલબ્ધ નથી. Data local save છે.'); return {ok:false,reason:'offline'};}
    if(!configured()){render(); if(!silent) throw new Error('Shared sync હજી configure નથી. Local data સલામત છે.'); return {ok:false,reason:'not-configured'};}
    syncing=true; render();
    try{
      const out=await request('syncMerge',true);
      if(out.master) applyMaster(out.master);
      setQueue([]); localStorage.setItem(LAST_SYNC_KEY,new Date().toISOString());
      if(out.master?.updatedAt) localStorage.setItem(LAST_MASTER_KEY,out.master.updatedAt);
      render(); return {ok:true,result:out};
    } finally {syncing=false; render();}
  }

  async function pullLatest({silent=false}={}){
    if(syncing) return {ok:false,reason:'busy'};
    if(!navigator.onLine){if(!silent) throw new Error('Internet ઉપલબ્ધ નથી.'); return {ok:false,reason:'offline'};}
    if(!configured()){if(!silent) throw new Error('Shared sync હજી configure નથી.'); return {ok:false,reason:'not-configured'};}
    syncing=true; render();
    try{
      const out=await request('pullMaster',false);
      if(out.master){applyMaster(out.master); localStorage.setItem(LAST_SYNC_KEY,new Date().toISOString());}
      render(); return {ok:true,result:out};
    } finally {syncing=false;render();}
  }

  function downloadSnapshot(){
    const name=`swati-local-snapshot-${new Date().toISOString().slice(0,10)}.json`;
    const blob=new Blob([JSON.stringify({pending:queue(),snapshot:snapshot()},null,2)],{type:'application/json;charset=utf-8'});
    if(window.SwatiFiles) window.SwatiFiles.presentBlob(blob,name,{title:'Local Snapshot તૈયાર છે',hint:'આ snapshot આ device/browserના local dataની copy છે. Download અથવા Share કરો.'});
    else {const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
  }

  function scheduleAuto(){
    if(!cfg().autoSync || !configured() || !navigator.onLine) return;
    clearTimeout(timer); timer=setTimeout(()=>syncNow({silent:true}).catch(()=>{}),Number(cfg().autoSyncDelayMs||3000));
  }

  function render(){
    const n=document.getElementById('syncNetworkStatus'), p=document.getElementById('syncPendingCount'), l=document.getElementById('syncLastAt'), t=document.getElementById('syncTargetStatus'), m=document.getElementById('syncMasterAt'), b=document.getElementById('syncNowBtn'), pb=document.getElementById('pullMasterBtn');
    if(n) n.textContent=navigator.onLine?'Online':'Offline';
    if(p) p.textContent=String(queue().length);
    const last=localStorage.getItem(LAST_SYNC_KEY); if(l) l.textContent=last?new Date(last).toLocaleString('en-IN'):'Never';
    const masterAt=localStorage.getItem(LAST_MASTER_KEY); if(m) m.textContent=masterAt?new Date(masterAt).toLocaleString('en-IN'):'Never';
    if(t) t.textContent=configured()?'Google master configured':'Not configured';
    if(b){b.disabled=syncing;b.textContent=syncing?'Syncing…':'Sync & Merge';}
    if(pb) pb.disabled=syncing;
  }

  window.addEventListener('swati:data-changed',e=>enqueue(e.detail?.dataset||'data',e.detail?.action||'update'));
  window.addEventListener('online',()=>{render();scheduleAuto();});
  window.addEventListener('offline',render);
  window.addEventListener('swati:sync-config-changed',()=>{render();scheduleAuto();});
  document.addEventListener('DOMContentLoaded',()=>{
    document.getElementById('syncNowBtn')?.addEventListener('click',()=>syncNow().then(()=>{window.dispatchEvent(new CustomEvent('swati:toast',{detail:'Shared sync પૂર્ણ થયું'})); setTimeout(()=>location.reload(),350);}).catch(e=>window.dispatchEvent(new CustomEvent('swati:toast',{detail:e.message}))));
    document.getElementById('pullMasterBtn')?.addEventListener('click',()=>pullLatest().then(()=>{window.dispatchEvent(new CustomEvent('swati:toast',{detail:'Latest data મળ્યું'})); setTimeout(()=>location.reload(),350);}).catch(e=>window.dispatchEvent(new CustomEvent('swati:toast',{detail:e.message}))));
    document.getElementById('downloadLocalSnapshotBtn')?.addEventListener('click',downloadSnapshot);
    render(); scheduleAuto();
  });
  window.SwatiOfflineSync={enqueue,queue,snapshot,syncNow,pullLatest,downloadSnapshot,render,configured,applyMaster};
})();
