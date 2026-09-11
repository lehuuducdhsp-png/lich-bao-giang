'use strict';
(function(){
  const VERSION='20260911.3';
  const ORG='Trung tâm giáo dục kỹ năng sống Hoàn Năng';
  const REPORT_RE=/^LICH_BAO_GIANG_/i;
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  let installed=false;

  function q(id){return document.getElementById(id)}
  function colLetter(n){let s='';while(n>0){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26)}return s||'A'}
  function shiftRange(range,rows=3){
    const m=txt(range).match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);if(!m)return range;
    return`${m[1].toUpperCase()}${Number(m[2])+rows}:${m[3].toUpperCase()}${Number(m[4])+rows}`;
  }
  function cloneData(value){
    if(value==null)return value;
    if(value instanceof Date)return new Date(value.getTime());
    try{if(typeof structuredClone==='function')return structuredClone(value)}catch{}
    try{return JSON.parse(JSON.stringify(value))}catch{return value}
  }
  function cellText(cell){
    try{
      if(txt(cell?.text))return txt(cell.text);
      const v=cell?.value;
      if(v==null)return'';
      if(typeof v==='string'||typeof v==='number'||typeof v==='boolean')return txt(v);
      if(Array.isArray(v?.richText))return txt(v.richText.map(x=>x?.text??'').join(''));
      if(v?.result!=null)return txt(v.result);
      if(v?.text!=null)return txt(v.text);
    }catch{}
    return'';
  }
  function looksLikeReport(ws){
    const value=cellText(ws?.getCell?.('A1'));
    return /LỊCH\s+BÁO\s+GIẢNG/i.test(value)||/LICH\s+BAO\s+GIANG/i.test(value);
  }
  function getLogoImage(){
    const base64=txt(window.LBG_HOAN_NANG_LOGO_JPEG);
    if(!/^data:image\/jpeg;base64,/i.test(base64))throw new Error('Dữ liệu logo Hoàn Năng chưa sẵn sàng.');
    return{base64,extension:'jpeg'};
  }
  function estimatedLines(value,width){
    const text=txt(value);if(!text)return 1;const usable=Math.max(8,Math.floor((Number(width)||20)*.9));
    return text.split(/\n/).reduce((sum,line)=>sum+Math.max(1,Math.ceil(Math.max(1,line.length)/usable)),0);
  }
  function fitRow(ws,row,last,minHeight,maxHeight){
    let lines=1;for(let c=3;c<=last;c++)lines=Math.max(lines,estimatedLines(cellText(ws.getCell(row,c)),ws.getColumn(c).width));
    ws.getRow(row).height=Math.min(maxHeight,Math.max(minHeight,12+lines*18));
  }
  function fitReportLayout(ws,last){
    for(let c=3;c<=last;c++)ws.getColumn(c).width=Math.max(Number(ws.getColumn(c).width)||0,23);
    ws.getColumn(1).width=Math.max(Number(ws.getColumn(1).width)||0,9);ws.getColumn(2).width=Math.max(Number(ws.getColumn(2).width)||0,10);
    fitRow(ws,8,last,96,180);fitRow(ws,14,last,96,180);
    for(const row of[9,10,11,12,13,15,16,17,18,19])fitRow(ws,row,last,44,130);
    ws.getRow(7).height=Math.max(Number(ws.getRow(7).height)||0,44);ws.getRow(20).height=Math.max(Number(ws.getRow(20).height)||0,34);
    for(let r=8;r<=20;r++)for(let c=1;c<=last;c++)ws.getCell(r,c).alignment={...(ws.getCell(r,c).alignment||{}),vertical:'middle',horizontal:'center',wrapText:true,shrinkToFit:false};
  }
  function copyWorksheetWithHeader(book,oldWs,logo){
    if(!looksLikeReport(oldWs))return oldWs;
    const oldName=oldWs.name,maxCol=Math.max(Number(oldWs.columnCount)||0,8),maxRow=Math.max(Number(oldWs.rowCount)||0,17),tempName=`__LBG_${Date.now()}_${Math.random().toString(36).slice(2,7)}`.slice(0,31),fresh=book.addWorksheet(tempName);
    fresh.properties=cloneData(oldWs.properties||{});fresh.pageSetup=cloneData(oldWs.pageSetup||{});fresh.views=cloneData(oldWs.views||[]);
    for(let c=1;c<=maxCol;c++){
      const srcCol=oldWs.getColumn(c),dstCol=fresh.getColumn(c);if(srcCol.width!=null)dstCol.width=srcCol.width;if(srcCol.hidden!=null)dstCol.hidden=srcCol.hidden;if(srcCol.outlineLevel!=null)dstCol.outlineLevel=srcCol.outlineLevel;
    }
    for(let r=1;r<=maxRow;r++){
      const srcRow=oldWs.getRow(r),dstRow=fresh.getRow(r+3);if(srcRow.height!=null)dstRow.height=srcRow.height;if(srcRow.hidden!=null)dstRow.hidden=srcRow.hidden;if(srcRow.outlineLevel!=null)dstRow.outlineLevel=srcRow.outlineLevel;
      for(let c=1;c<=maxCol;c++){
        const src=oldWs.getCell(r,c),dst=fresh.getCell(r+3,c),slave=Boolean(src?.isMerged&&src?.master&&src.master.address!==src.address);
        if(!slave&&src.value!=null)dst.value=cloneData(src.value);
        if(src.style&&Object.keys(src.style).length)dst.style=cloneData(src.style);
      }
    }
    for(const range of oldWs.model?.merges||[]){try{fresh.mergeCells(shiftRange(range,3))}catch(error){console.warn('Không sao chép được vùng gộp',range,error)}}
    const end=colLetter(maxCol);try{fresh.mergeCells('A1:B3')}catch{}try{fresh.mergeCells(`C1:${end}3`)}catch{}
    fresh.getRow(1).height=32;fresh.getRow(2).height=32;fresh.getRow(3).height=32;
    const brand=fresh.getCell('C1');brand.value=ORG;brand.alignment={horizontal:'center',vertical:'bottom',wrapText:true};brand.font={name:'Times New Roman',size:19,bold:true,italic:true,color:{argb:'FF111111'}};
    for(let c=1;c<=maxCol;c++)fresh.getCell(3,c).border={...(fresh.getCell(3,c).border||{}),bottom:{style:'medium',color:{argb:'FF000000'}}};
    const imageId=book.addImage({base64:logo.base64,extension:logo.extension});fresh.addImage(imageId,{tl:{col:.14,row:.12},ext:{width:116,height:88},editAs:'oneCell'});
    fitReportLayout(fresh,maxCol);
    fresh.pageSetup={...(fresh.pageSetup||{}),orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:1,margins:{left:.2,right:.2,top:.25,bottom:.25,header:.08,footer:.08}};
    const oldId=oldWs.id;book.removeWorksheet(oldId);fresh.name=oldName;return fresh;
  }
  async function fixWorkbookBlob(blob){
    const logo=getLogoImage(),array=await blob.arrayBuffer(),book=new ExcelJS.Workbook();await book.xlsx.load(array);
    // P is already placed by report-engine-v4 using this report's teacher code.
    for(const ws of[...book.worksheets])if(looksLikeReport(ws))copyWorksheetWithHeader(book,ws,logo);
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
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(url);a.remove()},1200);
  }
  function install(){
    if(installed||typeof window.saveAs!=='function'||!window.ExcelJS)return false;
    const fallback=window.saveAs.bind(window);installed=true;
    window.saveAs=function(blob,name,...rest){
      const filename=txt(name);if(!REPORT_RE.test(filename))return fallback(blob,name,...rest);
      (async()=>{try{const out=/\.zip$/i.test(filename)?await fixZipBlob(blob):await fixWorkbookBlob(blob);directSave(out,filename)}catch(error){console.error('LBG export hotfix V3:',error);alert('Không xuất được Lịch Báo giảng: '+(error?.message||String(error)))}})();
    };
    window.__lbgReportExportHotfixV3Installed=true;return true;
  }
  function boot(){if(install())return;let tries=0;const t=setInterval(()=>{tries++;if(install()||tries>200)clearInterval(t)},50)}
  window.LBGReportExportHotfixV3={version:VERSION,shiftRange,looksLikeReport,copyWorksheetWithHeader,fixWorkbookBlob,install};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
