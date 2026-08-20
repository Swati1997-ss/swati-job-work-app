/**
 * Swati Mini Oil Mill — Shared Google Drive Master Sync (Alpha 37)
 * Deploy from the dedicated company Google account as a Web App.
 * Data remains in one master JSON file + timestamped daily backup files in Drive.
 * For low-volume use only. Use a long random WORKSPACE_KEY and never publish it publicly.
 */
const SWATI_FOLDER_NAME = 'Swati Mini Oil Mill App';
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

function doGet() { return json_({ok:true,service:'Swati Shared Sync',version:37}); }

function mergeSnapshots_(a, incoming) {
  const base = a && a.data ? a : {version:37,createdAt:new Date().toISOString(),updatedAt:'',data:{}};
  const inc = incoming && incoming.data ? incoming : {data:{}};
  const out = JSON.parse(JSON.stringify(base));
  out.version = 37;
  out.data = out.data || {};
  Object.keys(inc.data).forEach(function(key){
    const left=out.data[key],right=inc.data[key];
    if(key==='swati_deleted_records_v1') return;
    if(key==='swati_operators_v1'){out.data[key]=JSON.parse(JSON.stringify(right||[]));return;}
    if(key==='swati_oil_transactions_v1') out.data[key]=mergeTransactions_(arr_(left),arr_(right));
    else if(key==='swati_audit_v1') out.data[key]=mergeAudit_(arr_(left),arr_(right));
    else if(Array.isArray(left)||Array.isArray(right)) out.data[key]=mergeByIdLatest_(arr_(left),arr_(right));
    else if(right!==null && typeof right!=='undefined') out.data[key]=JSON.parse(JSON.stringify(right));
  });
  const tombstones=mergeTombstones_(arr_(out.data['swati_deleted_records_v1']),arr_(inc.data['swati_deleted_records_v1']));
  out.data['swati_deleted_records_v1']=tombstones;
  tombstones.forEach(function(t){
    if(!t||!t.dataset||!t.id||!Array.isArray(out.data[t.dataset])) return;
    out.data[t.dataset]=out.data[t.dataset].filter(function(row){return row&&row.id!==t.id;});
  });
  return out;
}

function mergeTombstones_(left,right){
  const map={};
  left.concat(right).forEach(function(t){
    if(!t||!t.dataset||!t.id)return;
    const key=t.dataset+'::'+t.id;
    if(!map[key]||String(map[key].deletedAt||'')<String(t.deletedAt||''))map[key]=JSON.parse(JSON.stringify(t));
  });
  return Object.keys(map).map(function(k){return map[k];});
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
  if(!it.hasNext()) return {version:37,createdAt:new Date().toISOString(),updatedAt:'',data:{}};
  try{return JSON.parse(it.next().getBlob().getDataAsString())}catch(e){return {version:37,createdAt:new Date().toISOString(),updatedAt:'',data:{}}}
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
