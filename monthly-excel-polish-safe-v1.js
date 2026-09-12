'use strict';
(function(){
  const VERSION='20260912.1';
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  const isMonthlyFilename=name=>/\.xlsx$/i.test(txt(name))&&(/Bảng kê tiết dạy tháng/i.test(txt(name))||/BANG[_ -]?KE[_ -]?TIET[_ -]?DAY[_ -]?THANG/i.test(txt(name)));
  function estimatedLines(text,width){
    const value=txt(text);if(!value)return 1;
    const usable=Math.max(5,Math.floor((Number(width)||10)*0.9));
    return value.split(/\n/).reduce((sum,line)=>sum+Math.max(1,Math.ceil(Math.max(1,line.length)/usable)),0);
  }
  if(typeof module!=='undefined'&&module.exports){module.exports={VERSION,isMonthlyFilename,estimatedLines};return;}

  let installed=false;
  function cellText(cell){
    try{
      const t=txt(cell?.text);if(t)return t;
      const v=cell?.value;if(v==null)return'';
      if(typeof v==='string'||typeof v==='number'||typeof v==='boolean')return txt(v);
      if(Array.isArray(v?.richText))return txt(v.richText.map(x=>x?.text??'').join(''));
      if(v?.result!=null)return txt(v.result);
    }catch{}
    return'';
  }
  function findColumnByText(ws,row,pattern){
    for(let c=1;c<=Math.max(1,Number(ws.columnCount)||1);c++)if(pattern.test(cellText(ws.getCell(row,c))))return c;
    return 0;
  }
  function findRowByText(ws,col,pattern){
    for(let r=1;r<=Math.max(1,Number(ws.rowCount)||1);r++)if(pattern.test(cellText(ws.getCell(r,col))))return r;
    return 0;
  }
  function fitRow(ws,row,last,min=24,max=96){
    let lines=1;
    for(let c=1;c<=last;c++){
      const cell=ws.getCell(row,c),value=cellText(cell);if(!value)continue;
      lines=Math.max(lines,estimatedLines(value,ws.getColumn(c).width));
    }
    ws.getRow(row).height=Math.min(max,Math.max(Number(ws.getRow(row).height)||0,min,10+lines*15));
  }
  function polishSheet(ws){
    const last=Math.max(Number(ws.columnCount)||0,2),rows=Math.max(Number(ws.rowCount)||0,1);
    const mainCol=findColumnByText(ws,17,/Tiết\s*Chính/i)||Math.max(3,last-4),assistCol=findColumnByText(ws,17,/Trợ\s*Giảng/i)||mainCol+1;
    for(let c=1;c<=last;c++){const col=ws.getColumn(c);col.hidden=false}
    for(let r=1;r<=rows;r++)ws.getRow(r).hidden=false;

    ws.getColumn(1).width=Math.max(Number(ws.getColumn(1).width)||0,24);
    ws.getColumn(2).width=Math.max(Number(ws.getColumn(2).width)||0,28);
    for(let c=3;c<mainCol;c++)ws.getColumn(c).width=Math.max(Number(ws.getColumn(c).width)||0,6.8);
    ws.getColumn(mainCol).width=Math.max(Number(ws.getColumn(mainCol).width)||0,12.5);
    if(assistCol<=last)ws.getColumn(assistCol).width=Math.max(Number(ws.getColumn(assistCol).width)||0,12.5);
    const spacer=assistCol+1;if(spacer<=last)ws.getColumn(spacer).width=Math.max(Number(ws.getColumn(spacer).width)||0,3.5);
    for(let c=spacer+1;c<=last;c++)ws.getColumn(c).width=Math.max(Number(ws.getColumn(c).width)||0,c===last?34:31);

    for(let r=1;r<=rows;r++)for(let c=1;c<=last;c++){
      const cell=ws.getCell(r,c);cell.alignment={...(cell.alignment||{}),vertical:'middle',wrapText:true,shrinkToFit:false};
    }

    ws.getRow(1).height=Math.max(Number(ws.getRow(1).height)||0,38);
    ws.getRow(2).height=Math.max(Number(ws.getRow(2).height)||0,28);
    for(const r of[3,4,5])fitRow(ws,r,last,r===3?56:34,90);

    const totalRow=findRowByText(ws,1,/CỘNG\s*TUẦN/i);
    const grandRow=findRowByText(ws,1,/TỔNG\s*CỘNG\s*SỐ\s*TIẾT/i);
    const noteRow=findRowByText(ws,1,/Trong đó/i);
    const bodyEnd=totalRow?totalRow-1:(grandRow?grandRow-1:rows);
    for(let r=6;r<=bodyEnd;r++)fitRow(ws,r,last,30,72);
    if(totalRow)fitRow(ws,totalRow,last,52,96);
    if(grandRow){fitRow(ws,grandRow,last,48,90);if(grandRow+1<=rows)ws.getRow(grandRow+1).height=Math.max(Number(ws.getRow(grandRow+1).height)||0,22);if(grandRow+2<=rows)ws.getRow(grandRow+2).height=Math.max(Number(ws.getRow(grandRow+2).height)||0,22)}
    if(noteRow)fitRow(ws,noteRow,last,42,90);
    for(const r of[8,13,18])if(r<=rows)fitRow(ws,r,last,34,70);

    ws.properties={...(ws.properties||{}),defaultRowHeight:20};
    ws.pageSetup={...(ws.pageSetup||{}),orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0,horizontalCentered:true,margins:{left:.18,right:.18,top:.25,bottom:.25,header:.08,footer:.08}};
    return ws;
  }
  async function polishBlob(blob){
    const array=await blob.arrayBuffer(),book=new ExcelJS.Workbook();await book.xlsx.load(array);
    for(const ws of book.worksheets){const a=cellText(ws.getCell('A1'));if(/BẢNG\s*KÊ\s*KHAI\s*TIẾT\s*DẠY/i.test(a)||/Tiết dạy/i.test(ws.name))polishSheet(ws)}
    return new Blob([await book.xlsx.writeBuffer()],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  }
  function install(){
    if(installed||typeof window.saveAs!=='function'||!window.ExcelJS)return false;
    const fallback=window.saveAs.bind(window);installed=true;
    window.saveAs=function(blob,name,...rest){
      if(!isMonthlyFilename(name))return fallback(blob,name,...rest);
      (async()=>{try{fallback(await polishBlob(blob),name,...rest);if(typeof toast==='function')toast('Đã căn lại hàng/cột bảng kê để không ẩn chữ.')}catch(error){console.error('Monthly Excel polish:',error);fallback(blob,name,...rest)}})();
    };
    window.__lbgMonthlyExcelPolishSafeV1=true;return true;
  }
  function boot(){if(install())return;let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>240)clearInterval(timer)},50)}
  window.LBGMonthlyExcelPolishSafe={version:VERSION,isMonthlyFilename,estimatedLines,polishSheet,polishBlob,install};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
