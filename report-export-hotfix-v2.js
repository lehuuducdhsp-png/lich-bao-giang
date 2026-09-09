'use strict';
(function(){
  const VERSION='20260909.7';
  const ORG='Trung tâm giáo dục kỹ năng sống Hoàn Năng';
  const REPORT_RE=/^LICH_BAO_GIANG_/i;
  const txt=v=>String(v??'').trim();
  let installed=false;

  function colLetter(n){let s='';while(n>0){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26)}return s||'A'}
  function shiftRange(range,rows=3){
    const m=txt(range).match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);if(!m)return range;
    return`${m[1].toUpperCase()}${Number(m[2])+rows}:${m[3].toUpperCase()}${Number(m[4])+rows}`;
  }
  function looksLikeReport(ws){
    const value=txt(ws?.getCell?.('A1')?.value?.richText?.map?.(x=>x.text).join('')||ws?.getCell?.('A1')?.value);
    return /LỊCH\s+BÁO\s+GIẢNG/i.test(value)||/LICH\s+BAO\s+GIANG/i.test(value);
  }
  function getLogoImage(){
    const base64=txt(window.LBG_HOAN_NANG_LOGO_JPEG);
    if(!/^data:image\/jpeg;base64,/i.test(base64))throw new Error('Dữ liệu logo Hoàn Năng chưa sẵn sàng.');
    return{base64,extension:'jpeg'};
  }
  function applyBorder(cell){cell.border={...(cell.border||{}),bottom:{style:'medium',color:{argb:'FF000000'}}}}
  function cellText(cell){
    try{
      if(txt(cell?.text))return txt(cell.text);
      const v=cell?.value;
      if(v==null)return'';
      if(typeof v==='string'||typeof v==='number')return txt(v);
      if(Array.isArray(v?.richText))return txt(v.richText.map(x=>x?.text??'').join(''));
      if(v?.result!=null)return txt(v.result);
    }catch{}
    return'';
  }
  function estimatedLines(value,width){
    const text=txt(value);if(!text)return 1;
    const usable=Math.max(10,Math.floor((Number(width)||20)*1.25));
    return text.split(/\n/).reduce((sum,line)=>sum+Math.max(1,Math.ceil(Math.max(1,line.length)/usable)),0);
  }
  function fitRow(ws,row,last,minHeight,maxHeight){
    let lines=1;
    for(let c=3;c<=last;c++)lines=Math.max(lines,estimatedLines(cellText(ws.getCell(row,c)),ws.getColumn(c).width));
    ws.getRow(row).height=Math.min(maxHeight,Math.max(minHeight,10+lines*16));
  }
  function fitReportLayout(ws,last){
    for(let c=3;c<=last;c++)ws.getColumn(c).width=Math.max(Number(ws.getColumn(c).width)||0,22);
    ws.getColumn(1).width=Math.max(Number(ws.getColumn(1).width)||0,9);
    ws.getColumn(2).width=Math.max(Number(ws.getColumn(2).width)||0,10);
    fitRow(ws,8,last,94,138);
    fitRow(ws,14,last,94,138);
    for(const row of[9,10,11,12,13,15,16,17,18,19])fitRow(ws,row,last,40,82);
    ws.getRow(7).height=Math.max(Number(ws.getRow(7).height)||0,44);
    ws.getRow(20).height=Math.max(Number(ws.getRow(20).height)||0,30);
    for(let r=8;r<=19;r++)for(let c=1;c<=last;c++)ws.getCell(r,c).alignment={...(ws.getCell(r,c).alignment||{}),vertical:'middle',horizontal:'center',wrapText:true};
  }
  async function brandWorksheet(book,ws,logo){
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
    const imageId=book.addImage({base64:logo.base64,extension:'jpeg'});
    ws.addImage(imageId,{tl:{col:.14,row:.12},ext:{width:116,height:88},editAs:'oneCell'});
    fitReportLayout(ws,last);
    ws.pageSetup={...(ws.pageSetup||{}),orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:1,margins:{left:.2,right:.2,top:.25,bottom:.25,header:.08,footer:.08}};
  }
  async function fixWorkbookBlob(blob){
    const logo=getLogoImage(),array=await blob.arrayBuffer(),book=new ExcelJS.Workbook();await book.xlsx.load(array);
    for(const ws of book.worksheets)await brandWorksheet(book,ws,logo);
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
  window.LBGReportExportHotfixV2={version:VERSION,shiftRange,looksLikeReport,getLogoImage,fitReportLayout,fixWorkbookBlob,install};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
