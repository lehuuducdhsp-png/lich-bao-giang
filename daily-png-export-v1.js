'use strict';
(function(root,factory){
  const api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.LBGDailyPngExportV1=api;
})(typeof window!=='undefined'?window:globalThis,function(root){
  const VERSION='20260929.1';
  const HTML2CANVAS_URL='https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
  const DEFAULT_WIDTH=2400;
  const MAX_PIXELS=28000000;
  let libraryPromise=null;

  function safeName(value){
    return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').replace(/[^A-Za-z0-9._-]+/g,'_').replace(/^_+|_+$/g,'')||'LBG';
  }
  function chooseScale(width,height,preferred=2,maxPixels=MAX_PIXELS){
    const w=Math.max(1,Number(width)||1),h=Math.max(1,Number(height)||1),p=Math.max(1,Number(preferred)||1),limit=Math.max(1000000,Number(maxPixels)||MAX_PIXELS);
    const safe=Math.sqrt(limit/(w*h));
    return Math.max(1,Math.min(p,Math.floor(safe*100)/100));
  }
  function ensureHtml2Canvas(){
    if(typeof root.html2canvas==='function')return Promise.resolve(root.html2canvas);
    if(libraryPromise)return libraryPromise;
    if(!root.document)return Promise.reject(new Error('Trình duyệt chưa sẵn sàng để xuất PNG.'));
    libraryPromise=new Promise((resolve,reject)=>{
      const ready=()=>typeof root.html2canvas==='function'?resolve(root.html2canvas):reject(new Error('Đã tải thư viện nhưng chưa khởi tạo được bộ xuất PNG.'));
      const existing=root.document.getElementById('lbgHtml2CanvasV1Script');
      if(existing){
        if(typeof root.html2canvas==='function'){resolve(root.html2canvas);return}
        existing.addEventListener('load',ready,{once:true});
        existing.addEventListener('error',()=>reject(new Error('Không tải được bộ tạo ảnh PNG.')),{once:true});
        return
      }
      const script=root.document.createElement('script');
      script.id='lbgHtml2CanvasV1Script';
      script.src=HTML2CANVAS_URL;
      script.async=true;
      script.crossOrigin='anonymous';
      script.onload=ready;
      script.onerror=()=>{libraryPromise=null;reject(new Error('Không tải được bộ tạo ảnh PNG. Hãy kiểm tra kết nối mạng rồi thử lại.'))};
      root.document.head.appendChild(script)
    });
    return libraryPromise
  }
  function exportStyle(){
    return `
      .lbg-png-capture{box-sizing:border-box!important;width:${DEFAULT_WIDTH}px!important;max-width:none!important;padding:30px!important;background:#fff!important;color:#2f241f!important;font-family:"Times New Roman",serif!important}
      .lbg-png-capture .lbg-daily-title{padding:6px 8px 20px!important}
      .lbg-png-capture .lbg-daily-title h2{font-size:34px!important;line-height:1.15!important;margin:0!important}
      .lbg-png-capture .lbg-daily-title p{font-size:20px!important;line-height:1.3!important;margin:8px 0 0!important;color:#5f4a40!important}
      .lbg-png-capture .lbg-daily-wrap{overflow:visible!important;max-width:none!important;border:1px solid #777!important;border-radius:0!important}
      .lbg-png-capture .lbg-daily-table{width:100%!important;min-width:0!important;table-layout:fixed!important;border-collapse:collapse!important;border-spacing:0!important}
      .lbg-png-capture .lbg-daily-table th,.lbg-png-capture .lbg-daily-table td{position:static!important;left:auto!important;top:auto!important;z-index:auto!important;padding:10px 7px!important;font-size:15px!important;line-height:1.25!important;border:1px solid #777!important;vertical-align:middle!important}
      .lbg-png-capture .lbg-daily-table .gv-head,.lbg-png-capture .lbg-daily-table .gv-cell{width:12%!important;min-width:0!important;max-width:none!important}
      .lbg-png-capture .lbg-daily-table .total-head,.lbg-png-capture .lbg-daily-table .total-cell{width:10%!important;min-width:0!important}
      .lbg-png-capture .lbg-daily-event{margin:2px 0!important;padding:5px 4px!important;background:rgba(255,255,255,.86)!important;border-radius:4px!important}
      .lbg-png-capture .lbg-daily-event .meta{font-size:12px!important}
      .lbg-png-capture .gv-cell b{font-size:17px!important}
      .lbg-png-capture .gv-cell small{font-size:12px!important}
      .lbg-png-capture .lbg-week-tabs,.lbg-png-capture .lbg-week-day-label{display:none!important}
    `
  }
  function makeCaptureNode(source,width=DEFAULT_WIDTH){
    if(!source?.cloneNode)throw new Error('Không tìm thấy bảng lịch để xuất PNG.');
    const doc=root.document;if(!doc)throw new Error('Trình duyệt chưa sẵn sàng.');
    const host=doc.createElement('div');
    host.id='lbgDailyPngCaptureHost';
    host.style.position='absolute';
    host.style.left='-100000px';
    host.style.top='0';
    host.style.width=`${width}px`;
    host.style.background='#fff';
    host.style.pointerEvents='none';
    host.style.zIndex='-1';
    const style=doc.createElement('style');style.textContent=exportStyle();
    const clone=source.cloneNode(true);
    clone.removeAttribute?.('id');
    clone.classList?.add('lbg-png-capture');
    clone.style.width=`${width}px`;
    clone.style.maxWidth='none';
    host.appendChild(style);host.appendChild(clone);doc.body.appendChild(host);
    return{host,clone}
  }
  function canvasBlob(canvas){
    return new Promise((resolve,reject)=>{
      if(!canvas?.toBlob){reject(new Error('Trình duyệt này chưa hỗ trợ tạo file PNG.'));return}
      canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Không tạo được dữ liệu ảnh PNG.')),'image/png',1)
    })
  }
  function downloadBlob(blob,filename){
    const doc=root.document,URLApi=root.URL||globalThis.URL;if(!doc||!URLApi?.createObjectURL)throw new Error('Trình duyệt chưa hỗ trợ tải ảnh.');
    const url=URLApi.createObjectURL(blob),a=doc.createElement('a');
    a.href=url;a.download=safeName(filename).replace(/\.png$/i,'')+'.png';
    a.style.display='none';doc.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URLApi.revokeObjectURL(url),1500)
  }
  async function renderBlob(source,{width=DEFAULT_WIDTH,preferredScale=2}={}){
    const html2canvas=await ensureHtml2Canvas();
    const {host,clone}=makeCaptureNode(source,width);
    try{
      try{await root.document?.fonts?.ready}catch{}
      await new Promise(resolve=>setTimeout(resolve,30));
      const w=Math.ceil(clone.scrollWidth||width),h=Math.ceil(clone.scrollHeight||1),scale=chooseScale(w,h,preferredScale);
      const canvas=await html2canvas(clone,{
        backgroundColor:'#ffffff',
        scale,
        useCORS:true,
        logging:false,
        width:w,
        height:h,
        windowWidth:w,
        windowHeight:h,
        scrollX:0,
        scrollY:0
      });
      return{blob:await canvasBlob(canvas),width:w,height:h,scale}
    }finally{host.remove()}
  }
  async function exportElement(source,filename,options={}){
    const result=await renderBlob(source,options);downloadBlob(result.blob,filename);return result
  }

  return{VERSION,HTML2CANVAS_URL,DEFAULT_WIDTH,MAX_PIXELS,safeName,chooseScale,ensureHtml2Canvas,renderBlob,exportElement};
});
