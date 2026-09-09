'use strict';
(function(){
  const VERSION='20260909.3';
  const ORG='Trung tâm giáo dục kỹ năng sống Hoàn Năng';
  const LOGO_URL='assets/hoan-nang-report-logo.jpg?v=20260909.1';
  const REPORT_RE=/^LICH_BAO_GIANG_/i;
  const txt=v=>String(v??'').trim();
  let installed=false,logoPngBase64='';

  function colLetter(n){let s='';while(n>0){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26)}return s||'A'}
  function shiftRange(range,rows=3){
    const m=txt(range).match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);if(!m)return range;
    return`${m[1].toUpperCase()}${Number(m[2])+rows}:${m[3].toUpperCase()}${Number(m[4])+rows}`;
  }
  function looksLikeReport(ws){
    const value=txt(ws?.getCell?.('A1')?.value?.richText?.map?.(x=>x.text).join('')||ws?.getCell?.('A1')?.value);
    return /LỊCH\s+BÁO\s+GIẢNG/i.test(value)||/LICH\s+BAO\s+GIANG/i.test(value);
  }
  function blobToImage(blob){
    return new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(blob),img=new Image();
      img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};
      img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Không đọc được ảnh logo Hoàn Năng.'))};
      img.src=url;
    });
  }
  async function getLogoPngBase64(){
    if(logoPngBase64)return logoPngBase64;
    const res=await fetch(LOGO_URL,{cache:'no-store'});if(!res.ok)throw new Error('Không tải được logo Hoàn Năng.');
    const blob=await res.blob(),img=await blobToImage(blob);
    const canvas=document.createElement('canvas');canvas.width=img.naturalWidth||img.width;canvas.height=img.naturalHeight||img.height;
    const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Trình duyệt không tạo được ảnh logo cho Excel.');
    ctx.fillStyle='#FFFFFF';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
    logoPngBase64=String(canvas.toDataURL('image/png')).split(',')[1]||'';
    if(!logoPngBase64)throw new Error('Không chuyển được logo sang định dạng Excel tương thích.');
    return logoPngBase64;
  }
  function applyBorder(cell){cell.border={...(cell.border||{}),bottom:{style:'medium',color:{argb:'FF000000'}}}}
  async function brandWorksheet(book,ws,base64){
    if(!looksLikeReport(ws)||ws.__lbgExportFixedV2)return;ws.__lbgExportFixedV2=true;
    const originalMerges=[...(ws.model?.merges||[])];
    for(const range of originalMerges){try{ws.unMergeCells(range)}catch{}}
    ws.spliceRows(1,0,[],[],[]);
    for(const range of originalMerges){try{ws.mergeCells(shiftRange(range,3))}catch(error){console.warn('Không khôi phục được vùng gộp',range,error)}}

    const last=Math.max(Number(ws.columnCount)||0,8),end=colLetter(last);
    try{ws.mergeCells('A1:B3')}catch{}
    try{ws.mergeCells(`C1:${end}3`)}catch{}
    ws.getRow(1).height=32;ws.getRow(2).height=32;ws.getRow(3).height=32;
    const brand=ws.getCell('C1');brand.value=ORG;brand.alignment={horizontal:'center',vertical:'bottom',wrapText:true};brand.font={name:'Times New Roman',size:19,bold:true,italic:true,color:{argb:'FF111111'}};
    for(let c=1;c<=last;c++)applyBorder(ws.getCell(3,c));
    if(base64){
      const imageId=book.addImage({base64,extension:'png'});
      ws.addImage(imageId,{tl:{col:.14,row:.12},ext:{width:116,height:88},editAs:'oneCell'});
    }
    ws.pageSetup={...(ws.pageSetup||{}),orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:1,margins:{left:.2,right:.2,top:.25,bottom:.25,header:.08,footer:.08}};
  }
  async function fixWorkbookBlob(blob){
    const base64=await getLogoPngBase64(),array=await blob.arrayBuffer(),book=new ExcelJS.Workbook();await book.xlsx.load(array);
    for(const ws of book.worksheets)await brandWorksheet(book,ws,base64);
    return new Blob([await book.xlsx.writeBuffer()],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  }
  async function fixZipBlob(blob){
    const JSZipCtor=window.JSZip;if(!JSZipCtor)throw new Error('Thư viện ZIP chưa sẵn sàng.');
    const zip=await JSZipCtor.loadAsync(blob),tasks=[];
    zip.forEach((path,file)=>{if(file.dir||!/\.xlsx$/i.test(path))return;tasks.push((async()=>{const data=await file.async('blob');zip.file(path,await fixWorkbookBlob(data))})())});
    await Promise.all(tasks);return zip.generateAsync({type:'blob',compression:'DEFLATE'});
  }
  function directSave(blob,name){
    if(typeof navigator!=='undefined'&&navigator.msSaveOrOpenBlob){navigator.msSaveOrOpenBlob(blob,name);return}
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(url);a.remove()},1200)
  }
  function install(){
    if(installed||typeof window.saveAs!=='function'||!window.ExcelJS)return false;
    const fallback=window.saveAs.bind(window);installed=true;
    window.saveAs=function(blob,name,...rest){
      const filename=txt(name);
      if(!REPORT_RE.test(filename))return fallback(blob,name,...rest);
      (async()=>{try{
        const out=/\.zip$/i.test(filename)?await fixZipBlob(blob):await fixWorkbookBlob(blob);
        directSave(out,filename);
      }catch(error){console.error('LBG export hotfix:',error);alert('Không xuất được Lịch Báo giảng: '+(error?.message||String(error)))}
      })();
    };
    window.__lbgReportExportHotfixV2Installed=true;return true;
  }
  function boot(){if(install())return;let tries=0;const t=setInterval(()=>{tries++;if(install()||tries>200)clearInterval(t)},50)}
  window.LBGReportExportHotfixV2={version:VERSION,shiftRange,looksLikeReport,getLogoPngBase64,fixWorkbookBlob,install};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
