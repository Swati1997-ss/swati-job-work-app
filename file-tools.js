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
    const payloads=[{files:[file]},{title,files:[file]},text?{title,text,files:[file]}:null].filter(Boolean);
    for(const payload of payloads){
      try{await navigator.share(payload);return true;}
      catch(e){if(e&&e.name==='AbortError')return true;console.warn('Native file share attempt failed',e);}
    }
    return false;
  }
  async function nativeTextShare(title,text){
    if(!navigator.share) return false;
    try{await navigator.share({title,text});return true;}catch(e){if(e&&e.name==='AbortError')return true;return false;}
  }
  async function share(blob,name,title='સ્વાતિ',text=''){
    if(await nativeFileShare(blob,name,title,text)){notify('શેર મેનુ ખોલાયું');return true;}
    notify('આ browser/device direct file sharing સપોર્ટ કરતું નથી. Installed Chrome/Safari appથી ફરી પ્રયાસ કરો અથવા Download પસંદ કરો.');
    return false;
  }
  async function openFile(blob,name,title='સ્વાતિ ફાઇલ'){
    if(blob.type==='application/pdf'){
      const url=URL.createObjectURL(blob);const w=window.open(url,'_blank');if(w){setTimeout(()=>URL.revokeObjectURL(url),60000);notify('PDF ખોલાઈ રહી છે');return true;}
    }
    if(await nativeFileShare(blob,name,title,`ફાઇલ ખોલવા માટે યોગ્ય app પસંદ કરો: ${name}`)){return true;}
    download(blob,name);notify('આ file type browser સીધી ખોલી શકતી નથી; download કરી છે.');return false;
  }
  function presentBlob(blob,name,opts={}){
    currentFile={blob,name,title:opts.title||'સ્વાતિ ફાઇલ',text:opts.text||''};
    const modal=$('fileActionModal');if(!modal){download(blob,name);return;}
    $('fileActionTitle').textContent=opts.title||'ફાઇલ તૈયાર છે';$('fileActionName').textContent=name;
    $('fileActionHint').textContent=opts.hint||'ફાઇલ ખોલો, share menuથી WhatsApp / Messages / Mail / Driveમાં મોકલો, અથવા download કરો.';
    modal.hidden=false;notify('ફાઇલ તૈયાર છે');
  }
  function presentCsvAsXlsx(csv,name){const rows=parseCsv(csv),xname=name.replace(/\.csv$/i,'.xlsx');presentBlob(makeXlsx(rows,'Swati'),xname,{title:'Excel ફાઇલ તૈયાર છે'});}
  function whatsappText(text){const url=`https://wa.me/?text=${encodeURIComponent(text)}`;window.open(url,'_blank','noopener');}
  function collectCss(){let css='';for(const sheet of [...document.styleSheets]){try{for(const rule of [...sheet.cssRules])css+=rule.cssText+'\n';}catch{}}return css;}
  function sanitizeClone(root){root.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));root.querySelectorAll('.no-print').forEach(n=>n.remove());return root;}
  async function elementJpeg(element,business){
    const clone=sanitizeClone(element.cloneNode(true));
    clone.style.display='grid';clone.style.width=business==='oil'?'1120px':'720px';clone.style.maxWidth='none';clone.style.margin='0';clone.style.gap=business==='oil'?'28px':'0';clone.style.gridTemplateColumns=business==='oil'?'1fr 1fr':'1fr';
    clone.querySelectorAll('.card-face').forEach(n=>{n.style.minHeight=business==='oil'?'500px':'760px';n.style.boxSizing='border-box';n.style.boxShadow='none';});
    const width=business==='oil'?1120:720;
    const stage=document.createElement('div');stage.style.cssText=`position:fixed;left:-10000px;top:0;width:${width}px;background:#fff;padding:24px;box-sizing:border-box;z-index:-1;`;stage.appendChild(clone);document.body.appendChild(stage);
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const height=Math.ceil(stage.scrollHeight+24);const html=stage.innerHTML;stage.remove();
    const css=collectCss()+`\n*{box-sizing:border-box} body{margin:0;background:#fff}.physical-card{display:grid!important;grid-template-columns:${business==='oil'?'1fr 1fr':'1fr'}!important;gap:${business==='oil'?'28px':'0'}!important;width:${width}px!important;max-width:none!important}.card-face{box-shadow:none!important}`;
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width+48}" height="${height}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="background:#fff;padding:24px;width:${width+48}px;min-height:${height}px"><style>${css.replace(/<\/style/gi,'<\\/style')}</style>${html}</div></foreignObject></svg>`;
    const img=new Image();const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});
    const scale=2,canvas=document.createElement('canvas');canvas.width=(width+48)*scale;canvas.height=height*scale;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.scale(scale,scale);ctx.drawImage(img,0,0);URL.revokeObjectURL(url);
    const jpeg=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Card capture failed')),'image/jpeg',0.94));return {jpeg,width:canvas.width,height:canvas.height};
  }
  function pdfFromJpeg(jpegBytes,w,h){
    const parts=[],offsets=[0];let pos=0;const push=x=>{const b=typeof x==='string'?enc.encode(x):x;parts.push(b);pos+=b.length;};
    push('%PDF-1.3\n');const obj=(n,body)=>{offsets[n]=pos;push(`${n} 0 obj\n${body}\nendobj\n`);};
    obj(1,'<< /Type /Catalog /Pages 2 0 R >>');obj(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');obj(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
    offsets[4]=pos;push(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`);push(jpegBytes);push('\nendstream\nendobj\n');
    const margin=24,aw=595-margin*2,ah=842-margin*2,s=Math.min(aw/w,ah/h),dw=w*s,dh=h*s,x=(595-dw)/2,y=(842-dh)/2;
    const stream=`q\n${dw.toFixed(2)} 0 0 ${dh.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm\n/Im0 Do\nQ\n`;offsets[5]=pos;push(`5 0 obj\n<< /Length ${enc.encode(stream).length} >>\nstream\n${stream}endstream\nendobj\n`);
    const xref=pos;push('xref\n0 6\n0000000000 65535 f \n');for(let i=1;i<=5;i++)push(String(offsets[i]).padStart(10,'0')+' 00000 n \n');push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);return new Blob(parts,{type:'application/pdf'});
  }
  async function cardPdf(element,business){const {jpeg,width,height}=await elementJpeg(element,business);return pdfFromJpeg(new Uint8Array(await jpeg.arrayBuffer()),width,height);}
  async function shareCardPdf(element,business,name,text=''){notify('PDF તૈયાર થઈ રહી છે…');const blob=await cardPdf(element,business);return share(blob,name,'સ્વાતિ બિલ',text);}
  async function presentCardPdf(element,business,name,text=''){notify('PDF તૈયાર થઈ રહી છે…');const blob=await cardPdf(element,business);presentBlob(blob,name,{title:'PDF તૈયાર છે',text});return blob;}
  document.addEventListener('DOMContentLoaded',()=>{
    $('fileActionClose')?.addEventListener('click',()=>{$('fileActionModal').hidden=true;});
    $('fileActionOpen')?.addEventListener('click',()=>{if(currentFile)openFile(currentFile.blob,currentFile.name,currentFile.title);});
    $('fileActionDownload')?.addEventListener('click',()=>{if(currentFile)download(currentFile.blob,currentFile.name);});
    $('fileActionShare')?.addEventListener('click',()=>{if(currentFile)share(currentFile.blob,currentFile.name,currentFile.title,currentFile.text);});
    $('fileActionModal')?.addEventListener('click',e=>{if(e.target===$('fileActionModal'))$('fileActionModal').hidden=true;});
  });
  window.SwatiFiles={makeXlsx,parseCsv,presentCsvAsXlsx,presentBlob,download,openFile,share,nativeFileShare,whatsappText,cardPdf,shareCardPdf,presentCardPdf};
})();
