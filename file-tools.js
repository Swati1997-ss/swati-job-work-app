(() => {
  'use strict';
  let currentFile=null;
  const $=id=>document.getElementById(id);
  const enc=new TextEncoder();
  const u16=(n)=>new Uint8Array([n&255,(n>>>8)&255]);
  const u32=(n)=>new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]);
  const concat=(parts)=>{const n=parts.reduce((s,p)=>s+p.length,0),o=new Uint8Array(n);let x=0;for(const p of parts){o.set(p,x);x+=p.length;}return o;};
  const xmlEscape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  const colName=n=>{let s='';while(n>0){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26);}return s;};
  const crcTable=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
  const crc32=bytes=>{let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
  function zipStore(entries){
    const locals=[], centrals=[]; let offset=0;
    for(const e of entries){
      const name=enc.encode(e.name), data=typeof e.data==='string'?enc.encode(e.data):e.data, crc=crc32(data);
      const local=concat([enc.encode('PK\x03\x04'),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),name,data]);
      locals.push(local);
      const central=concat([enc.encode('PK\x01\x02'),u16(20),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]);
      centrals.push(central); offset+=local.length;
    }
    const centralBytes=concat(centrals), localBytes=concat(locals);
    const end=concat([enc.encode('PK\x05\x06'),u16(0),u16(0),u16(entries.length),u16(entries.length),u32(centralBytes.length),u32(localBytes.length),u16(0)]);
    return concat([localBytes,centralBytes,end]);
  }
  function makeXlsx(rows,sheetName='Data'){
    const safe=(rows||[]).map(r=>Array.isArray(r)?r:[r]);
    const sheetRows=safe.map((row,ri)=>`<row r="${ri+1}">${row.map((v,ci)=>{
      const ref=`${colName(ci+1)}${ri+1}`;
      if(typeof v==='number' && Number.isFinite(v)) return `<c r="${ref}"><v>${v}</v></c>`;
      return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(v)}</t></is></c>`;
    }).join('')}</row>`).join('');
    const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="18"/><sheetData>${sheetRows}</sheetData></worksheet>`;
    const workbook=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xmlEscape(String(sheetName).slice(0,31)||'Data')}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
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
    text=String(text||'').replace(/^\uFEFF/,''); const rows=[]; let row=[],field='',q=false;
    for(let i=0;i<text.length;i++){
      const c=text[i];
      if(q){if(c==='"'&&text[i+1]==='"'){field+='"';i++;}else if(c==='"')q=false;else field+=c;}
      else if(c==='"')q=true; else if(c===','){row.push(field);field='';} else if(c==='\n'){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field='';} else field+=c;
    }
    if(field.length||row.length){row.push(field.replace(/\r$/,''));rows.push(row);}
    return rows.map(r=>r.map(v=>{const t=String(v).trim();return /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(t)?Number(t):v;}));
  }
  function notify(msg,type='info'){window.dispatchEvent(new CustomEvent('swati:toast',{detail:{message:msg,type}}));}
  function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500);notify(`ફાઇલ ડાઉનલોડ માટે તૈયાર છે: ${name}`,'success');}
  function openFile(blob,name){const url=URL.createObjectURL(blob);const w=window.open(url,'_blank');setTimeout(()=>URL.revokeObjectURL(url),60000);if(!w){download(blob,name);notify('Direct open block થયું; ફાઇલ download કરી છે.','warning');}else notify('ફાઇલ open કરવા મોકલાઈ','success');}
  async function share(blob,name,title='સ્વાતિ',text=''){
    const file=new File([blob],name,{type:blob.type||'application/octet-stream'});
    try{
      if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){await navigator.share({title,text,files:[file]});notify('શેર મેનુ ખોલાયું','success');return true;}
    }catch(e){if(e?.name==='AbortError')return false;}
    download(blob,name); notify('આ deviceમાં direct file sharing ઉપલબ્ધ નથી; ફાઇલ ડાઉનલોડ કરી છે.','warning'); return false;
  }
  function presentBlob(blob,name,opts={}){
    currentFile={blob,name,title:opts.title||'સ્વાતિ ફાઇલ',text:opts.text||''};
    const modal=$('fileActionModal'); if(!modal){download(blob,name);return;}
    $('fileActionTitle').textContent=opts.title||'ફાઇલ તૈયાર છે';
    $('fileActionName').textContent=name;
    $('fileActionHint').textContent=opts.hint||'ડાઉનલોડ કરો અથવા Android / iPhoneના Share મેનુથી WhatsApp, Messages, Mail, Drive વગેરેમાં મોકલો.';
    modal.hidden=false; notify('ફાઇલ તૈયાર થઈ','success');
  }
  function presentCsvAsXlsx(csv,name){const rows=parseCsv(csv);const xname=name.replace(/\.csv$/i,'.xlsx');presentBlob(makeXlsx(rows,'Swati'),xname,{title:'Excel ફાઇલ તૈયાર છે'});}
  function whatsappText(text){const url=`https://wa.me/?text=${encodeURIComponent(text)}`;window.open(url,'_blank','noopener');}
  function billText(r,business){
    const b=business==='grain'?'અનાજ / કઠોળ':'તેલ મિલ'; const net=Number(r?.settlement?.net||0); const dir=net>0?'ગ્રાહક પાસેથી લેવાના':net<0?'ગ્રાહકને આપવાના':'સરભર પૂર્ણ';
    return `સ્વાતિ મિની ઓઇલ મિલ\n${b}\nબિલ: ${r?.billNo||'—'}\nતારીખ: ${r?.date||'—'}\nગ્રાહક: ${r?.customer?.name||'—'}\nગામ: ${r?.customer?.village||'—'}\nમજૂરી: ₹${Number(r?.jobWorkAmount||0).toFixed(2)}\n${dir}: ₹${Math.abs(net).toFixed(2)}\nબાકી: ₹${Number(r?.settlement?.remaining||0).toFixed(2)}`;
  }
  const wrap=(ctx,text,x,y,max,line=34)=>{const words=String(text).split(/\s+/);let s='',yy=y;for(const w of words){const t=s?s+' '+w:w;if(ctx.measureText(t).width>max&&s){ctx.fillText(s,x,yy);yy+=line;s=w;}else s=t;}if(s)ctx.fillText(s,x,yy);return yy;};
  function pdfFromJpeg(jpegBytes,w,h){
    const parts=[]; const offsets=[0]; let pos=0; const push=x=>{const b=typeof x==='string'?enc.encode(x):x;parts.push(b);pos+=b.length;};
    push('%PDF-1.3\n');
    const obj=(n,body)=>{offsets[n]=pos;push(`${n} 0 obj\n${body}\nendobj\n`);};
    obj(1,'<< /Type /Catalog /Pages 2 0 R >>'); obj(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    obj(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
    offsets[4]=pos;push(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`);push(jpegBytes);push('\nendstream\nendobj\n');
    const stream='q\n595 0 0 842 0 0 cm\n/Im0 Do\nQ\n'; offsets[5]=pos;push(`5 0 obj\n<< /Length ${enc.encode(stream).length} >>\nstream\n${stream}endstream\nendobj\n`);
    const xref=pos;push('xref\n0 6\n0000000000 65535 f \n');for(let i=1;i<=5;i++)push(String(offsets[i]).padStart(10,'0')+' 00000 n \n');push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
    return new Blob(parts,{type:'application/pdf'});
  }
  async function billPdf(r,business){
    const c=document.createElement('canvas'); c.width=1240;c.height=1754; const x=c.getContext('2d'); x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.fillStyle='#5d1430';x.textBaseline='top';
    x.textAlign='center';x.font='bold 52px sans-serif';x.fillText('સ્વાતિ મિની ઓઇલ મિલ',620,70);x.font='28px sans-serif';x.fillText(business==='grain'?'સુલતાનપુર — અનાજ / કઠોળ સફાઈ':'સુલતાનપુર — તેલ મિલ મજૂરી કામ',620,138);
    x.textAlign='left';x.font='30px sans-serif'; let y=220; const line=(l,v)=>{x.font='26px sans-serif';x.fillStyle='#6e6265';x.fillText(l,90,y);x.font='bold 30px sans-serif';x.fillStyle='#231f20';x.fillText(String(v||'—'),390,y);y+=58;};
    line('બિલ નંબર',r?.billNo);line('તારીખ',r?.date);line('ગ્રાહક',r?.customer?.name);line('ગામ',r?.customer?.village);line('મોબાઇલ',r?.customer?.mobile);
    y+=18;x.strokeStyle='#8f1736';x.lineWidth=3;x.beginPath();x.moveTo(90,y);x.lineTo(1150,y);x.stroke();y+=35;
    const rows=[];
    if(business==='grain'){
      rows.push(['માલ',r?.grain?.commodity||'—']);rows.push(['કુલ સફાઈ વજન',`${Number(r?.grain?.totalKg??r?.grain?.inputKg??0)} કિલો`]);rows.push(['સાફ થયેલ સારો માલ',`${Number(r?.grain?.cleanKg??r?.grain?.returnedKg??0)} કિલો`]);rows.push(['ખરાબ / વધેલો માલ',`${Number(r?.grain?.badKg??r?.grain?.differenceKg??0)} કિલો`]);if(r?.grain?.purchaseEnabled)rows.push(['વધેલો માલ ખરીદી',`₹${Number(r?.grain?.purchaseAmount||0).toFixed(2)}`]);
    }else{
      rows.push(['સિંગ / ગોગળા',`${Number(r?.incoming?.singGoglaKg||0)} કિલો`]);rows.push(['દાણા / ફાડા',`${Number(r?.incoming?.danaFalaKg||0)} કિલો`]);rows.push(['તેલ',`${Number(r?.oilOutput?.tins||0)} ડબા + ${Number(r?.oilOutput?.extraKg||0)} કિલો`]);rows.push(['ખોળ',`${Number(r?.khol?.kg||0)} કિલો`]);if(Number(r?.oilSale?.amount||0)>0)rows.push(['તેલ વેચાણ',`₹${Number(r.oilSale.amount).toFixed(2)}`]);
    }
    rows.push(['મજૂરી કામ',`₹${Number(r?.jobWorkAmount||0).toFixed(2)}`]);
    for(const [l,v] of rows)line(l,v);
    y+=15;x.strokeStyle='#8f1736';x.beginPath();x.moveTo(90,y);x.lineTo(1150,y);x.stroke();y+=35;
    const net=Number(r?.settlement?.net||0), paid=Number(r?.settlement?.paid||0), rem=Number(r?.settlement?.remaining||0);line(net>0?'ગ્રાહક પાસેથી લેવાના':net<0?'ગ્રાહકને આપવાના':'સરભર પૂર્ણ',`₹${Math.abs(net).toFixed(2)}`);line('ચૂકવેલ / મળેલ',`₹${paid.toFixed(2)}`);line('બાકી',`₹${rem.toFixed(2)}`);
    if(r?.note){y+=20;x.font='26px sans-serif';x.fillStyle='#231f20';y=wrap(x,`નોંધ: ${r.note}`,90,y,1060,36)+60;}
    x.textAlign='center';x.font='24px sans-serif';x.fillStyle='#6e6265';x.fillText('Swati Job Work App દ્વારા બનાવેલ',620,1640);
    const jpeg=await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('Canvas export failed')),'image/jpeg',0.92)); const data=await jpeg.arrayBuffer(); return pdfFromJpeg(new Uint8Array(data),c.width,c.height);
  }
  document.addEventListener('DOMContentLoaded',()=>{
    $('fileActionClose')?.addEventListener('click',()=>{$('fileActionModal').hidden=true;});
    $('fileActionOpen')?.addEventListener('click',()=>{if(currentFile)openFile(currentFile.blob,currentFile.name);});
    $('fileActionDownload')?.addEventListener('click',()=>{if(currentFile)download(currentFile.blob,currentFile.name);});
    $('fileActionShare')?.addEventListener('click',()=>{if(currentFile)share(currentFile.blob,currentFile.name,currentFile.title,currentFile.text);});
    $('fileActionModal')?.addEventListener('click',e=>{if(e.target===$('fileActionModal'))$('fileActionModal').hidden=true;});
  });
  window.SwatiFiles={makeXlsx,parseCsv,presentCsvAsXlsx,presentBlob,download,openFile,share,whatsappText,billText,billPdf};
})();
