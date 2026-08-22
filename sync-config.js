(() => {
  'use strict';
  const STORAGE_KEY = 'swati_sync_config_v1';
  const DEFAULTS = {
    enabled: false,
    endpointUrl: 'https://script.google.com/macros/s/AKfycbxRmFFpsAX8RsAcdwJQ3hFDLkxww-lFris4ReWiJhkpfuu7tsOWBWSO5Gedj8CxMrmP/exec',
    workspaceCode: 'swati-main',
    workspaceKey: '',
    autoSync: true,
    autoSyncDelayMs: 3000,
    autoSyncIntervalMs: 120000
  };

  function load(){
    try { return {...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'), autoSyncIntervalMs:120000}; }
    catch { return {...DEFAULTS}; }
  }
  function save(next){
    const clean={...load(), ...next};
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    window.SWATI_SYNC_CONFIG=clean;
    window.dispatchEvent(new CustomEvent('swati:sync-config-changed'));
    return clean;
  }
  function clear(){
    localStorage.removeItem(STORAGE_KEY);
    window.SWATI_SYNC_CONFIG={...DEFAULTS};
    window.dispatchEvent(new CustomEvent('swati:sync-config-changed'));
  }
  window.getSwatiSyncConfig=load;
  window.saveSwatiSyncConfig=save;
  window.clearSwatiSyncConfig=clear;
  window.SWATI_SYNC_CONFIG=load();

  document.addEventListener('DOMContentLoaded',()=>{
    const $=id=>document.getElementById(id);
    const cfg=load();
    if($('syncEndpointInput')) $('syncEndpointInput').value=cfg.endpointUrl||'';
    if($('syncWorkspaceCodeInput')) $('syncWorkspaceCodeInput').value=cfg.workspaceCode||'swati-main';
    if($('syncWorkspaceKeyInput')) $('syncWorkspaceKeyInput').value=cfg.workspaceKey||'';
    if($('syncAutoToggle')) $('syncAutoToggle').checked=cfg.autoSync!==false;

    $('syncSaveConfigBtn')?.addEventListener('click',()=>{
      const endpoint=String($('syncEndpointInput')?.value||'').trim();
      const code=String($('syncWorkspaceCodeInput')?.value||'').trim();
      const key=String($('syncWorkspaceKeyInput')?.value||'').trim();
      if(!/^https:\/\//.test(endpoint)){ window.dispatchEvent(new CustomEvent('swati:toast',{detail:'Valid HTTPS sync URL નાખો'})); return; }
      if(!code || !key){ window.dispatchEvent(new CustomEvent('swati:toast',{detail:'Workspace code અને private key જરૂરી છે'})); return; }
      save({enabled:true,endpointUrl:endpoint,workspaceCode:code,workspaceKey:key,autoSync:!!$('syncAutoToggle')?.checked,autoSyncIntervalMs:120000});
      window.SwatiOfflineSync?.render?.();
      window.dispatchEvent(new CustomEvent('swati:toast',{detail:'Shared sync configuration આ deviceમાં સાચવાઈ'}));
    });
    $('syncForgetConfigBtn')?.addEventListener('click',()=>{
      if(!confirm('આ deviceમાંથી shared sync private key દૂર કરવી છે? Local business data delete નહીં થાય.')) return;
      clear();
      if($('syncWorkspaceKeyInput')) $('syncWorkspaceKeyInput').value='';
      window.SwatiOfflineSync?.render?.();
      window.dispatchEvent(new CustomEvent('swati:toast',{detail:'Shared sync configuration દૂર થઈ'}));
    });
    $('syncKeyToggleBtn')?.addEventListener('click',()=>{
      const el=$('syncWorkspaceKeyInput'); if(!el) return;
      el.type=el.type==='password'?'text':'password';
      $('syncKeyToggleBtn').textContent=el.type==='password'?'Show key':'Hide key';
    });
  });
})();
