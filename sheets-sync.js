'use strict';
(function(){
  const WEB_APP_URL='https://script.google.com/macros/s/AKfycbxRVd_GG4n8Ozk0CYoekM3kJ1xmHGOF5Nu-wS5jAaiwc0SRJdmWAzPiLEobixDXqCbY/exec';
  const ACCESS_KEY='LBG-2026-DUC-7c83mP9q';
  const POPUP_NAME='lbgGoogleSheetsBridge';
  let bridgeWindow=null,pending=null;

  const current=()=>{try{return result||null;}catch{return null;}};
  const pad2=v=>{const n=Number(v);return Number.isFinite(n)&&n>0?String(n).padStart(2,'0'):String(v||'').trim();};
  const iso=d=>d instanceof Date&&!Number.isNaN(d.getTime())?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`:'';
  const tabStart=(start,week,year)=>{if(start instanceof Date&&!Number.isNaN(start.getTime()))return new Date(start);const n=Number(week);if(!Number.isFinite(n)||n<1)return null;const d=new Date(year,7,31,12);d.setDate(d.getDate()+(n-1)*7);return d;};
  const tabName=(weekText,start,week,year)=>{const d=tabStart(start,week,year);return d?`TUẦN ${weekText}_${d.getDate()}T${d.getMonth()+1}`:`TUẦN ${weekText}`;};

  function gaValuesOf(a){
    const source=a&&a.gaValues&&typeof a.gaValues==='object'?a.gaValues:{};
    const out={};
    for(const [key,raw] of Object.entries(source)){
      const text=String(raw??'').trim();
      if(typeof key!=='string'||key.length>240||!/^\d+$/.test(text))continue;
      const n=Number(text);
      if(Number.isSafeInteger(n)&&n>=0)out[key]=String(n);
    }
    return out;
  }

  function buildReport(mode){
    const a=current();
    if(!a||!Array.isArray(a.entries)||!a.entries.length)throw new Error('Hãy nhấn Kiểm tra và bảo đảm lịch có ít nhất một tiết trước khi lưu.');
    const yearStart=Number(document.getElementById('year')?.value)||new Date().getFullYear();
    const start=a.start instanceof Date?new Date(a.start):null;
    const end=start?new Date(start.getTime()+5*864e5):null;
    const weekText=pad2(a.week),destinationSheet=tabName(weekText,start,a.week,yearStart);
    const entries=a.entries.map((e,i)=>({index:i+1,day:Number(e.day),session:String(e.session||''),period:Number(e.period),school:String(e.school||''),className:String(e.className||''),sourceCell:String(e.address||''),address:String(e.address||'')}));
    const gaValues=gaValuesOf(a);
    return {accessKey:ACCESS_KEY,key:ACCESS_KEY,week:a.week,weekNo:a.week,weekNumber:a.week,weekText,weekLabel:String(a.sheet||''),sourceSheet:String(a.sheet||''),sheetName:destinationSheet,destinationSheet,tabName:destinationSheet,schoolYear:`${yearStart}-${yearStart+1}`,schoolYearStart:yearStart,yearStart,yearEnd:yearStart+1,teacherName:String(a.teacherName||''),teacherCode:String(a.code||''),total:Number(a.total)||entries.length,totalPeriods:Number(a.total)||entries.length,startDate:iso(start),endDate:iso(end),mode,saveMode:mode,existingAction:mode,gaValues,lessonPlanCounts:gaValues,entries,schedule:entries};
  }

  function ensureButton(){
    const exportButton=document.getElementById('export');
    if(!exportButton||document.getElementById('saveSheets'))return;
    const button=document.createElement('button');
    Object.assign(button,{id:'saveSheets',type:'button',className:'btn',disabled:true,textContent:'☁ Lưu vào Google Sheets'});
    button.style.cssText='background:#2563eb;color:#fff;white-space:nowrap';
    exportButton.insertAdjacentElement('afterend',button);
    button.addEventListener('click',chooseMode);
    const sync=()=>{if(pending)return;const a=current();button.disabled=!a||!Array.isArray(a.entries)||a.entries.length<1||exportButton.disabled;};
    new MutationObserver(sync).observe(exportButton,{attributes:true,attributeFilter:['disabled']});
    document.getElementById('analyze')?.addEventListener('click',()=>setTimeout(sync,50));
    document.getElementById('teacher')?.addEventListener('change',sync);
    document.getElementById('week')?.addEventListener('change',sync);
    setInterval(sync,1000);sync();
  }

  function ensureDialog(){
    let d=document.getElementById('sheetSaveDialog');if(d)return d;
    d=document.createElement('dialog');d.id='sheetSaveDialog';d.style.cssText='border:0;border-radius:18px;padding:0;max-width:480px;width:calc(100% - 30px);box-shadow:0 24px 70px rgba(15,23,42,.28)';
    d.innerHTML=`<form method="dialog" style="padding:22px;font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif"><h3 style="margin:0 0 7px;color:#082f49">Lưu vào Google Sheets</h3><p id="sheetSavePrompt" style="margin:0 0 18px;color:#64748b">Chọn cách lưu tuần đang xem.</p><div style="display:grid;gap:10px"><button value="overwrite" style="border:0;border-radius:12px;padding:12px 14px;background:#0f766e;color:#fff;font-weight:800;cursor:pointer">Ghi đè tab tuần hiện có</button><button value="copy" style="border:1px solid #cbd5e1;border-radius:12px;padding:12px 14px;background:#fff;color:#132238;font-weight:800;cursor:pointer">Tạo BẢN 2 nếu tuần đã tồn tại</button><button value="cancel" style="border:0;border-radius:12px;padding:10px;background:#f1f5f9;color:#64748b;font-weight:700;cursor:pointer">Hủy</button></div></form>`;
    document.body.appendChild(d);d.addEventListener('close',()=>{if(['overwrite','copy'].includes(d.returnValue))saveToSheets(d.returnValue);});return d;
  }

  function chooseMode(){try{const r=buildReport('overwrite'),d=ensureDialog(),p=document.getElementById('sheetSavePrompt');if(p)p.textContent=`${r.sheetName} • ${r.teacherName} • ${r.total} tiết • ${Object.keys(r.gaValues).length} ô GA`;d.returnValue='cancel';typeof d.showModal==='function'?d.showModal():saveToSheets(confirm('Nhấn OK để ghi đè. Nhấn Hủy để tạo BẢN 2.')?'overwrite':'copy');}catch(e){alert(e.message||String(e));}}
  function setBusy(busy,text){const b=document.getElementById('saveSheets');if(!b)return;const a=current();b.disabled=busy||!a?.entries?.length;b.textContent=text||(busy?'Đang lưu…':'☁ Lưu vào Google Sheets');}
  function hidden(name,value){const i=document.createElement('input');i.type='hidden';i.name=name;i.value=value;return i;}

  function saveToSheets(mode){
    let report;try{report=buildReport(mode);}catch(e){alert(e.message||String(e));return;}if(pending){toast('Đang có một yêu cầu lưu.');return;}
    const requestId=`lbg-${Date.now()}-${Math.random().toString(36).slice(2)}`;setBusy(true,'Đang gửi sang Google Sheets…');
    bridgeWindow=window.open('about:blank',POPUP_NAME,'popup=yes,width=540,height=650,left=120,top=80');
    if(!bridgeWindow){setBusy(false);alert('Trình duyệt đang chặn cửa sổ bật lên. Hãy cho phép cửa sổ bật lên rồi thử lại.');return;}
    pending={requestId,timer:null};
    const f=document.createElement('form');f.method='POST';f.action=WEB_APP_URL;f.target=POPUP_NAME;f.style.display='none';f.append(hidden('requestId',requestId),hidden('accessKey',ACCESS_KEY),hidden('payload',JSON.stringify(report)));document.body.appendChild(f);
    try{f.submit();setBusy(true,'Đang lưu vào Google Sheets…');}catch(e){f.remove();finish(false,'Không gửi được dữ liệu sang Google Sheets: '+(e.message||String(e)));return;}f.remove();
    pending.timer=setTimeout(()=>{if(pending?.requestId===requestId)finish(false,'Google Sheets chưa phản hồi. Hãy kiểm tra lại Apps Script và lượt triển khai.');},60000);
  }

  function finish(ok,message,url){if(pending?.timer)clearTimeout(pending.timer);pending=null;setBusy(false,ok?'✓ Đã lưu Google Sheets':'☁ Lưu vào Google Sheets');if(ok){toast(message||'Đã lưu vào Google Sheets.');if(url&&confirm((message||'Đã lưu thành công.')+'\n\nMở Google Sheets ngay?'))window.open(url,'_blank','noopener');setTimeout(()=>setBusy(false),2200);}else alert(message||'Không thể lưu vào Google Sheets.');try{if(bridgeWindow&&!bridgeWindow.closed)bridgeWindow.close();}catch{}bridgeWindow=null;}

  window.addEventListener('message',event=>{
    const host=(()=>{try{return new URL(event.origin).hostname;}catch{return '';}})();if(host!=='script.google.com'&&!host.endsWith('.googleusercontent.com'))return;
    const m=event.data||{};if(!pending||(m.requestId&&m.requestId!==pending.requestId))return;const body=m.result||m.data||m.payload||m;
    const err=m.type==='LBG_ERROR'||m.success===false||body?.success===false||Boolean(m.error||body?.error);const ok=m.type==='LBG_SAVED'||m.type==='LBG_SAVE_RESULT'||m.type==='LBG_RESULT'||m.success===true||body?.success===true||body?.ok===true;
    if(err)finish(false,String(m.error||body?.error||body?.message||'Apps Script báo lỗi khi lưu.'));else if(ok)finish(true,String(body?.message||m.message||'Đã lưu vào Google Sheets.'),body?.url||body?.spreadsheetUrl||m.url);
  });

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureButton);else ensureButton();
})();
