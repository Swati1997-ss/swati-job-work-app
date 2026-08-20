(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const isStandalone=()=>window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone===true;
  const isiOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent);
  const isAndroid=()=>/android/i.test(navigator.userAgent);
  function render(){
    if($('pwaInstallStatus')) $('pwaInstallStatus').textContent=isStandalone()?'Installed / Home Screen mode':'Browser mode';
    if($('pwaInstallHelp')){
      if(isStandalone()) $('pwaInstallHelp').textContent='આ deviceમાં app normal installed app જેવી ખુલી રહી છે.';
      else if(isiOS()) $('pwaInstallHelp').textContent='iPhone: Safariમાં Share → Add to Home Screen → Add.';
      else if(isAndroid()) $('pwaInstallHelp').textContent='Android: Chromeમાં Install app / Add to Home screen પસંદ કરો.';
      else $('pwaInstallHelp').textContent='HTTPS hosting પછી browser menuમાંથી Install app / Add to Home screen પસંદ કરો.';
    }
    if($('pwaInstallActionBtn')) $('pwaInstallActionBtn').hidden=isStandalone();
  }
  let reloading=false;
  if('serviceWorker' in navigator){navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloading)return;reloading=true;location.reload();});window.addEventListener('load',()=>navigator.serviceWorker.getRegistration().then(r=>r?.update()).catch(()=>{}));}
  document.addEventListener('DOMContentLoaded',()=>{
    render();
    $('pwaInstallActionBtn')?.addEventListener('click',()=>{
      const nativeBtn=$('installBtn');
      if(nativeBtn && !nativeBtn.hidden){ nativeBtn.click(); return; }
      if(isiOS()) alert('Safari ખોલો → Share button દબાવો → Add to Home Screen → Add.');
      else alert('Browser menu ખોલો અને “Install app” અથવા “Add to Home screen” પસંદ કરો. Install option માટે app HTTPS link પરથી ખૂલેલી હોવી જોઈએ.');
    });
    window.matchMedia('(display-mode: standalone)').addEventListener?.('change',render);
  });
})();
