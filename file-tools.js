(() => {
  'use strict';
  let currentFile=null;
  const $=id=>document.getElementById(id);
  const enc=new TextEncoder();
  const u16=n=>new Uint8Array([n&255,(n>>>8)&255]);
  const u32=n=>new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]);
  const concat=parts=>{const n=parts.reduce((s,p)=>s+p.length,0),o=new Uint8Array(n);let x=0;for(const p of parts){o.set(p,x);x+=p.length;}return o;};
  const xmlEscape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  const colName=n=>{let s='';while(n>0){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26);}return s;};
  const crcTable=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
  const crc32=bytes=>{let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
  function zipStore(entries){
    const locals=[],centrals=[];let offset=0;
    for(const e of entries){
      const name=enc.encode(e.name),data=typeof e.data==='string'?enc.encode(e.data):e.data,crc=crc32(data);
      const local=concat([enc.encode('PK\x03\x04'),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),name,data]);
      locals.push(local);
      centrals.push(concat([enc.encode('PK\x01\x02'),u16(20),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]));
      offset+=local.length;
    }
    const centralBytes=concat(centrals),localBytes=concat(locals);
    return concat([localBytes,centralBytes,enc.encode('PK\x05\x06'),u16(0),u16(0),u16(entries.length),u16(entries.length),u32(centralBytes.length),u32(localBytes.length),u16(0)]);
  }
  function makeXlsx(rows,sheetName='Swati'){
    const safe=(rows||[]).map(r=>Array.isArray(r)?r:[r]);
    const sheetRows=safe.map((row,ri)=>`<row r="${ri+1}">${row.map((v,ci)=>{const ref=`${colName(ci+1)}${ri+1}`;if(typeof v==='number'&&Number.isFinite(v))return `<c r="${ref}"><v>${v}</v></c>`;return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(v)}</t></is></c>`;}).join('')}</row>`).join('');
    const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="18"/><sheetData>${sheetRows}</sheetData></worksheet>`;
    const workbook=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xmlEscape(String(sheetName).slice(0,31)||'Swati')}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
    const entries=[
      {name:'[Content_Types].xml',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`},
      {name:'_rels/.rels',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`},
      {name:'xl/workbook.xml',data:workbook},
      {name:'xl/_rels/workbook.xml.rels',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`},
      {name:'xl/worksheets/sheet1.xml',data:sheet}
    ];
    return new Blob([zipStore(entries)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  }
  function parseCsv(text){
    text=String(text||'').replace(/^\uFEFF/,'');const rows=[];let row=[],field='',q=false;
    for(let i=0;i<text.length;i++){const c=text[i];if(q){if(c==='"'&&text[i+1]==='"'){field+='"';i++;}else if(c==='"')q=false;else field+=c;}else if(c==='"')q=true;else if(c===','){row.push(field);field='';}else if(c==='\n'){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field='';}else field+=c;}
    if(field.length||row.length){row.push(field.replace(/\r$/,''));rows.push(row);}return rows.map(r=>r.map(v=>{const t=String(v).trim();return /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(t)?Number(t):v;}));
  }
  function notify(msg){window.dispatchEvent(new CustomEvent('swati:toast',{detail:msg}));}
  function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2500);notify(`ફાઇલ ડાઉનલોડ થઈ રહી છે: ${name}`);}
  function fileFrom(blob,name){return new File([blob],name,{type:blob.type||'application/octet-stream',lastModified:Date.now()});}
  async function nativeFileShare(blob,name,title='સ્વાતિ',text=''){
    if(!navigator.share || typeof File==='undefined') return false;
    const file=fileFrom(blob,name);
    const payloads=[
      text?{title,text,files:[file]}:null,
      {title,files:[file]},
      {files:[file]}
    ].filter(Boolean);
    for(const payload of payloads){
      try{
        if(navigator.canShare && payload.files && !navigator.canShare({files:payload.files})) continue;
        await navigator.share(payload);
        return true;
      }catch(e){
        if(e&&e.name==='AbortError') return true;
        console.warn('Native file share attempt failed',e);
      }
    }
    return false;
  }
  async function nativeTextShare(title,text){
    if(!navigator.share) return false;
    try{await navigator.share({title,text});return true;}catch(e){if(e&&e.name==='AbortError')return true;return false;}
  }
  async function share(blob,name,title='સ્વાતિ',text=''){
    if(await nativeFileShare(blob,name,title,text)){notify('શેર મેનુ ખોલાયું');return true;}
    notify('આ browserમાં file sharing ઉપલબ્ધ નથી. Chrome/Safariમાં app ખોલો અથવા ફાઇલ ડાઉનલોડ કરો.');
    return false;
  }
  function presentBlob(blob,name,opts={}){
    currentFile={blob,name,title:opts.title||'સ્વાતિ ફાઇલ',text:opts.text||''};
    const modal=$('fileActionModal');if(!modal){download(blob,name);return;}
    $('fileActionTitle').textContent=opts.title||'ફાઇલ તૈયાર છે';$('fileActionName').textContent=name;
    $('fileActionHint').textContent=opts.hint||'WhatsApp, Mail, Drive અથવા બીજી appમાં મોકલો.';
    modal.hidden=false;notify('ફાઇલ તૈયાર છે');
  }
  function presentCsvAsXlsx(csv,name){const rows=parseCsv(csv),xname=name.replace(/\.csv$/i,'.xlsx');presentBlob(makeXlsx(rows,'Swati'),xname,{title:'Excel ફાઇલ તૈયાર છે'});}
  function whatsappText(text,phone=''){
    let digits=String(phone||'').replace(/\D/g,'');
    if(digits.length===10) digits=`91${digits}`;
    const target=digits?`https://wa.me/${digits}`:'https://wa.me/';
    window.open(`${target}?text=${encodeURIComponent(text)}`,'_blank','noopener');
  }
  function copyVisualStyles(source,target){
    const props=[
      'display','position','box-sizing','width','height','min-width','min-height','max-width','max-height',
      'margin','margin-top','margin-right','margin-bottom','margin-left',
      'padding','padding-top','padding-right','padding-bottom','padding-left',
      'font-family','font-size','font-weight','font-style','line-height','letter-spacing','text-align','text-transform',
      'color','background-color','background-image','background-size','background-position','background-repeat',
      'border','border-top','border-right','border-bottom','border-left','border-radius','border-collapse',
      'grid-template-columns','grid-template-rows','grid-column','grid-row','gap','column-gap','row-gap',
      'align-items','align-content','justify-items','justify-content','place-items',
      'flex-direction','flex-wrap','flex-grow','flex-shrink','flex-basis',
      'white-space','overflow','overflow-wrap','word-break','vertical-align','opacity'
    ];
    const walk=(s,t)=>{
      const cs=getComputedStyle(s);
      let css='';
      for(const p of props){
        const v=cs.getPropertyValue(p);
        if(v) css+=`${p}:${v};`;
      }
      // PDF capture should never include shadows/animations.
      css+='box-shadow:none!important;animation:none!important;transition:none!important;';
      t.setAttribute('style',css);
      if(t.id) t.removeAttribute('id');
      if(t.classList?.contains('no-print')) t.remove();
      const sc=[...s.children],tc=[...t.children];
      for(let i=0;i<Math.min(sc.length,tc.length);i++) walk(sc[i],tc[i]);
    };
    walk(source,target);
    return target;
  }

  function sanitizeClone(root){
    root.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
    root.querySelectorAll('.no-print').forEach(n=>n.remove());
    return root;
  }

  async function waitForFonts(){
    try{
      if(document.fonts?.ready) await Promise.race([
        document.fonts.ready,
        new Promise(r=>setTimeout(r,1200))
      ]);
    }catch{}
  }

  async function elementJpeg(element,business){
    if(!element) throw new Error('Bill card was not found');
    await waitForFonts();

    // Keep the exact visible card appearance by cloning the resolved/computed styles,
    // not the whole application stylesheet. This avoids unsupported CSS breaking SVG capture.
    const clone=element.cloneNode(true);
    copyVisualStyles(element,clone);
    sanitizeClone(clone);

    const sourceRect=element.getBoundingClientRect();
    const targetWidth=business==='oil' ? 1120 : 760;
    const ratio=sourceRect.width>0 ? targetWidth/sourceRect.width : 1;

    // Force the bill itself into the desired PDF layout.
    clone.style.width=`${targetWidth}px`;
    clone.style.maxWidth='none';
    clone.style.margin='0';
    clone.style.background='#ffffff';
    if(clone.classList.contains('physical-card')){
      clone.style.display='grid';
      clone.style.gridTemplateColumns=business==='oil'?'1fr 1fr':'1fr';
      clone.style.gap=business==='oil'?'24px':'0';
    }

    const stage=document.createElement('div');
    stage.setAttribute('aria-hidden','true');
    stage.style.cssText=`position:fixed;left:-20000px;top:0;width:${targetWidth+48}px;background:#fff;padding:24px;box-sizing:border-box;z-index:-2147483647;`;
    stage.appendChild(clone);
    document.body.appendChild(stage);

    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const width=Math.max(targetWidth+48,Math.ceil(stage.scrollWidth));
    const height=Math.max(320,Math.ceil(stage.scrollHeight+24));

    // Inline XHTML only; no global stylesheets, CSS variables or backdrop filters.
    const html=stage.innerHTML;
    stage.remove();

    const safeHtml=html.replace(/&nbsp;/g,'&#160;');
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <foreignObject x="0" y="0" width="${width}" height="${height}">
        <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;min-height:${height}px;background:#fff;padding:0;margin:0;box-sizing:border-box;">
          ${safeHtml}
        </div>
      </foreignObject>
    </svg>`;

    // A blob-backed SVG containing foreignObject taints canvas on Android Chrome.
    // A same-document data URL keeps the canvas exportable for PDF generation.
    const url=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    const img=new Image();
    try{
      await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(new Error('Bill image render timed out')),5000);
        img.onload=()=>{clearTimeout(timer);resolve();};
        img.onerror=()=>{clearTimeout(timer);reject(new Error('Bill image render failed'));};
        img.src=url;
      });

      const scale=Math.min(2,Math.max(1,window.devicePixelRatio||1.5));
      const canvas=document.createElement('canvas');
      canvas.width=Math.ceil(width*scale);
      canvas.height=Math.ceil(height*scale);
      const ctx=canvas.getContext('2d',{alpha:false});
      if(!ctx) throw new Error('Canvas is unavailable');
      ctx.fillStyle='#fff';
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.setTransform(scale,0,0,scale,0,0);
      ctx.drawImage(img,0,0,width,height);

      const jpeg=await new Promise((resolve,reject)=>{
        canvas.toBlob(b=>b&&b.size>1000?resolve(b):reject(new Error('PDF card image could not be created')),'image/jpeg',0.94);
      });
      return {jpeg,width:canvas.width,height:canvas.height};
    }finally{}
  }

  function pdfFromJpeg(jpegBytes,w,h){
    const parts=[],offsets=[0];let pos=0;const push=x=>{const b=typeof x==='string'?enc.encode(x):x;parts.push(b);pos+=b.length;};
    push('%PDF-1.3\n');const obj=(n,body)=>{offsets[n]=pos;push(`${n} 0 obj\n${body}\nendobj\n`);};
    obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
    obj(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    obj(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
    offsets[4]=pos;
    push(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`);
    push(jpegBytes);push('\nendstream\nendobj\n');
    const margin=22,aw=595-margin*2,ah=842-margin*2,s=Math.min(aw/w,ah/h),dw=w*s,dh=h*s,x=(595-dw)/2,y=(842-dh)/2;
    const stream=`q\n${dw.toFixed(2)} 0 0 ${dh.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm\n/Im0 Do\nQ\n`;
    offsets[5]=pos;push(`5 0 obj\n<< /Length ${enc.encode(stream).length} >>\nstream\n${stream}endstream\nendobj\n`);
    const xref=pos;push('xref\n0 6\n0000000000 65535 f \n');
    for(let i=1;i<=5;i++)push(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
    push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
    return new Blob(parts,{type:'application/pdf'});
  }

  async function cardPdf(element,business){
    const {jpeg,width,height}=await elementJpeg(element,business);
    const blob=pdfFromJpeg(new Uint8Array(await jpeg.arrayBuffer()),width,height);
    if(!blob || blob.size<1500) throw new Error('Generated PDF is empty');
    return blob;
  }

  async function shareCardPdf(element,business,name,text=''){
    notify('PDF તૈયાર થઈ રહી છે…');
    const blob=await cardPdf(element,business);
    return share(blob,name,'સ્વાતિ બિલ',text);
  }

  async function presentCardPdf(element,business,name,text=''){
    notify('PDF તૈયાર થઈ રહી છે…');
    const blob=await cardPdf(element,business);
    presentBlob(blob,name,{title:'PDF તૈયાર છે',text});
    return blob;
  }
  document.addEventListener('DOMContentLoaded',()=>{
    $('fileActionClose')?.addEventListener('click',()=>{$('fileActionModal').hidden=true;});
    $('fileActionDownload')?.addEventListener('click',()=>{if(currentFile)download(currentFile.blob,currentFile.name);});
    $('fileActionShare')?.addEventListener('click',async()=>{
      if(!currentFile) return;
      const btn=$('fileActionShare');
      btn.disabled=true;btn.textContent='શેર થઈ રહ્યું છે…';
      try{
        const ok=await share(currentFile.blob,currentFile.name,currentFile.title,currentFile.text);
        if(ok) $('fileActionModal').hidden=true;
      }finally{
        btn.disabled=false;btn.textContent='ફાઇલ શેર કરો';
      }
    });
    $('fileActionModal')?.addEventListener('click',e=>{if(e.target===$('fileActionModal'))$('fileActionModal').hidden=true;});
  });
  window.SwatiFiles={makeXlsx,parseCsv,presentCsvAsXlsx,presentBlob,download,share,nativeFileShare,whatsappText,cardPdf,shareCardPdf,presentCardPdf};
})();
