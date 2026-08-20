/**
 * Swati Job Work App — Shared Google Drive Master Sync (Alpha 24)
 * Deploy from the dedicated company Google account as a Web App.
 * Data remains in one master JSON file + timestamped daily backup files in Drive.
 * For low-volume use only. Use a long random WORKSPACE_KEY and never publish it publicly.
 */
const SWATI_FOLDER_NAME = 'Swati Job Work App';
const SWATI_MASTER_FILE = 'swati-master.json';
const SWATI_DAILY_FOLDER = 'Daily Backups';
const WORKSPACE_CODE = 'swati-main';
const WORKSPACE_KEY = 'CHANGE_THIS_TO_A_LONG_RANDOM_SECRET';

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (String(body.workspaceCode||'') !== WORKSPACE_CODE || String(body.workspaceKey||'') !== WORKSPACE_KEY) {
      return json_({ok:false,message:'Unauthorized workspace'});
    }
    if (body.action === 'pullMaster') {
      return json_({ok:true,master:loadMaster_()});
    }
    if (body.action !== 'syncMerge' || !body.snapshot) return json_({ok:false,message:'Invalid request'});

    const current = loadMaster_();
    const merged = mergeSnapshots_(current, body.snapshot);
    merged.updatedAt = new Date().toISOString();
    merged.lastDeviceId = String(body.deviceId||'');
    merged.lastOperator = String(body.operator||'');
    saveMaster_(merged);
    saveDailyBackup_(merged);
    return json_({ok:true,master:merged,savedAt:merged.updatedAt});
  } catch (err) {
    return json_({ok:false,message:String(err && err.message || err)});
  } finally { lock.releaseLock(); }
}

function doGet() { return json_({ok:true,service:'Swati Shared Sync',version:24}); }

function mergeSnapshots_(a, incoming) {
  const base = a && a.data ? a : {version:24,createdAt:new Date().toISOString(),updatedAt:'',data:{}};
  const inc = incoming && incoming.data ? incoming : {data:{}};
  const out = JSON.parse(JSON.stringify(base));
  out.version = 24;
  out.data = out.data || {};

  out.data['swati_deleted_v1'] = mergeByIdLatest_(arr_(out.data['swati_deleted_v1']), arr_(inc.data['swati_deleted_v1']));
  out.data['swati_oil_transactions_v1'] = mergeTransactions_(arr_(out.data['swati_oil_transactions_v1']), arr_(inc.data['swati_oil_transactions_v1']));
  out.data['swati_batches_v1'] = mergeByIdLatest_(arr_(out.data['swati_batches_v1']), arr_(inc.data['swati_batches_v1']));
  out.data['swati_audit_v1'] = mergeAudit_(arr_(out.data['swati_audit_v1']), arr_(inc.data['swati_audit_v1']));

  // Tombstones are authoritative: once deleted, stale devices cannot recreate the same record during merge.
  const deletedTx = {};
  const deletedBatch = {};
  arr_(out.data['swati_deleted_v1']).forEach(function(d){ if(d && d.id){ if(d.entityType==='batch') deletedBatch[d.id]=true; else deletedTx[d.id]=true; } });
  out.data['swati_oil_transactions_v1'] = arr_(out.data['swati_oil_transactions_v1']).filter(function(r){return r && !deletedTx[r.id];});
  out.data['swati_batches_v1'] = arr_(out.data['swati_batches_v1']).filter(function(r){return r && !deletedBatch[r.id];});

  // Settings/operators remain master-authoritative after the first setup.
  if (!out.data['swati_settings_v1'] && inc.data['swati_settings_v1']) out.data['swati_settings_v1'] = inc.data['swati_settings_v1'];
  if (!out.data['swati_operators_v1'] && inc.data['swati_operators_v1']) out.data['swati_operators_v1'] = inc.data['swati_operators_v1'];

  // Delete-security verifier can be updated from a trusted device and then shared to the others.
  out.data['swati_delete_security_v1'] = newerObject_(out.data['swati_delete_security_v1'], inc.data['swati_delete_security_v1']);
  return out;
}

function mergeTransactions_(left, right) {
  const map = {};
  left.concat(right).forEach(function(row){
    if (!row || !row.id) return;
    const prev = map[row.id];
    if (!prev) { map[row.id] = JSON.parse(JSON.stringify(row)); return; }
    const newest = newer_(prev,row) ? prev : row;
    const older = newest === prev ? row : prev;
    const merged = JSON.parse(JSON.stringify(newest));
    merged.payments = mergeByIdLatest_(arr_(older.payments), arr_(newest.payments));
    // Recompute payment totals conservatively without changing settlement direction/net.
    const paid = merged.payments.reduce((s,p)=>s+Number(p.amount||0),0);
    if (merged.settlement) {
      merged.settlement.paid = round2_(paid);
      merged.settlement.remaining = round2_(Math.max(0, Math.abs(Number(merged.settlement.net||0)) - paid));
    }
    map[row.id] = merged;
  });
  return Object.keys(map).map(k=>map[k]).sort((x,y)=>String(y.date||y.updatedAt||'').localeCompare(String(x.date||x.updatedAt||'')));
}

function mergeByIdLatest_(left, right) {
  const map={};
  left.concat(right).forEach(function(row){
    if(!row || !row.id) return;
    if(!map[row.id] || !newer_(map[row.id],row)) map[row.id]=JSON.parse(JSON.stringify(row));
  });
  return Object.keys(map).map(k=>map[k]);
}

function mergeAudit_(left,right){
  const rows=mergeByIdLatest_(left,right);
  rows.sort((a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
  return rows.slice(-5000);
}

function newerObject_(a,b){
  if(!a) return b || a; if(!b) return a;
  return newer_(a,b) ? a : b;
}

function newer_(a,b){
  const ta=String(a && (a.updatedAt||a.createdAt)||'');
  const tb=String(b && (b.updatedAt||b.createdAt)||'');
  return ta >= tb;
}
function arr_(x){ return Array.isArray(x)?x:[]; }
function round2_(n){ return Math.round((Number(n||0)+Number.EPSILON)*100)/100; }

function getRoot_(){ return getOrCreateFolder_(DriveApp.getRootFolder(),SWATI_FOLDER_NAME); }
function loadMaster_(){
  const root=getRoot_(); const it=root.getFilesByName(SWATI_MASTER_FILE);
  if(!it.hasNext()) return {version:24,createdAt:new Date().toISOString(),updatedAt:'',data:{}};
  try{return JSON.parse(it.next().getBlob().getDataAsString())}catch(e){return {version:24,createdAt:new Date().toISOString(),updatedAt:'',data:{}}}
}
function saveMaster_(obj){
  const root=getRoot_(); const text=JSON.stringify(obj,null,2); const it=root.getFilesByName(SWATI_MASTER_FILE);
  if(it.hasNext()) it.next().setContent(text); else root.createFile(SWATI_MASTER_FILE,text,MimeType.PLAIN_TEXT);
}
function saveDailyBackup_(obj){
  const root=getRoot_(); const folder=getOrCreateFolder_(root,SWATI_DAILY_FOLDER);
  const tz=Session.getScriptTimeZone()||'Asia/Kolkata'; const day=Utilities.formatDate(new Date(),tz,'yyyy-MM-dd');
  const name=`swati-backup-${day}.json`; const text=JSON.stringify(obj,null,2); const it=folder.getFilesByName(name);
  if(it.hasNext()) it.next().setContent(text); else folder.createFile(name,text,MimeType.PLAIN_TEXT);
}
function getOrCreateFolder_(parent,name){const it=parent.getFoldersByName(name);return it.hasNext()?it.next():parent.createFolder(name);}
function json_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
