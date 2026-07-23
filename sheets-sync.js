'use strict';
(function(){
  const WEB_APP_URL='https://script.google.com/macros/s/AKfycbxVwQlQXcR_bw_rh0jZQ0vMVdDolVJqDgXf1Wahkh-af0tvyDdScePpQFn-OyoDVhi2/exec';
  const ACCESS_KEY='LBG-2026-DUC-7c83mP9q';
  const POPUP_NAME='lbgGoogleSheetsBridge';
  let bridgeWindow=null;
  let pending=null;

  function currentResult(){
    try{return result||null;}catch{return null;}
  }

  function pad2(value){
    const number=Number(value);
    return Number.isFinite(number)&&number>0?String(number).padStart(2,'0'):String(value||'').trim();
  }

  function isoDate(value){
    if(!(value instanceof Date)||Number.isNaN(value.getTime()))return '';
    const y=value.getFullYear();
    const m=String(value.getMonth()+1).padStart(2,'0');
    const d=String(value.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }

  function tabStartDate(start,week,yearStart){
    if(start instanceof Date&&!Number.isNaN(start.getTime()))return new Date(start);
    const number=Number(week);
    if(!Number.isFinite(number)||number<1)return null;
    const base=new Date(yearStart,8,7,12);
    base.setDate(base.getDate()+(number-1)*7);
    return base;
  }

  function tabName(weekText,start,week,yearStart){
    const date=tabStartDate(start,week,yearStart);
    return date?`TUẦN ${weekText}_${date.getDate()}T${date.getMonth()+1}`:`TUẦN ${weekText}`;
  }

  function buildReport(mode){
    const a=currentResult();
    if(!a||!Array.isArray(a.entries)||!a.entries.length){
      throw new Error('Hãy nhấn Kiểm tra và bảo đảm lịch có ít nhất một tiết trước khi lưu.');
    }

    const yearStart=Number(document.getElementById('year')?.value)||new Date().getFullYear();
    const start=a.start instanceof Date?new Date(a.start):null;
    const end=start?new Date(start.getTime()+5*864e5):null;
    const weekText=pad2(a.week);
    const destinationSheet=tabName(weekText,start,a.week,yearStart);
    const entries=a.entries.map((entry,index)=>({
      index:index+1,
      day:Number(entry.day),
      session:String(entry.session||''),
      period:Number(entry.period),
      school:String(entry.school||''),
      className:String(entry.className||''),
      sourceCell:String(entry.address||''),
      address:String(entry.address||'')
    }));

    return {
      accessKey:ACCESS_KEY,
      key:ACCESS_KEY,
      week:a.week,
      weekNo:a.week,
      weekNumber:a.week,
      weekText,
      weekLabel:String(a.sheet||''),
      sourceSheet:String(a.sheet||''),
      sheetName:destinationSheet,
      destinationSheet,
      tabName:destinationSheet,
      schoolYear:`${yearStart}-${yearStart+1}`,
      schoolYearStart:yearStart,
      yearStart,
      yearEnd:yearStart+1,
      teacherName:String(a.teacherName||''),
      teacherCode:String(a.code||''),
      total:Number(a.total)||entries.length,
      totalPeriods:Number(a.total)||entries.length,
      startDate:isoDate(start),
      endDate:isoDate(end),
      mode,
      saveMode:mode,
      existingAction:mode,
      entries,
      schedule:entries
    };
  }

  function ensureButton(){
    const exportButton=document.getElementById('export');
    if(!exportButton||document.getElementById('saveSheets'))return;

    const button=document.createElement('button');
    button.id='saveSheets';
    button.type='button';
    button.className='btn';
    button.disabled=true;
    button.textContent='☁ Lưu vào Google Sheets';
    button.style.cssText='background:#2563eb;color:#fff;white-space:nowrap';
    exportButton.insertAdjacentElement('afterend',button);
    button.addEventListener('click',chooseMode);

    const syncDisabled=()=>{
      if(pending)return;
      const a=currentResult();
      button.disabled=!a||!Array.isArray(a.entries)||a.entries.length<1||exportButton.disabled;
    };

    new MutationObserver(syncDisabled).observe(exportButton,{attributes:true,attributeFilter:['disabled']});
    document.getElementById('analyze')?.addEventListener('click',()=>setTimeout(syncDisabled,50));
    document.getElementById('teacher')?.addEventListener('change',syncDisabled);
    document.getElementById('week')?.addEventListener('change',syncDisabled);
    setInterval(syncDisabled,1000);
    syncDisabled();
  }

  function ensureDialog(){
    let dialog=document.getElementById('sheetSaveDialog');
    if(dialog)return dialog;

    dialog=document.createElement('dialog');
    dialog.id='sheetSaveDialog';
    dialog.style.cssText='border:0;border-radius:18px;padding:0;max-width:480px;width:calc(100% - 30px);box-shadow:0 24px 70px rgba(15,23,42,.28)';
    dialog.innerHTML=`<form method="dialog" style="padding:22px;font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif">
      <h3 style="margin:0 0 7px;color:#082f49">Lưu vào Google Sheets</h3>
      <p id="sheetSavePrompt" style="margin:0 0 18px;color:#64748b">Chọn cách lưu tuần đang xem.</p>
      <div style="display:grid;gap:10px">
        <button value="overwrite" style="border:0;border-radius:12px;padding:12px 14px;background:#0f766e;color:#fff;font-weight:800;cursor:pointer">Ghi đè tab tuần hiện có</button>
        <button value="copy" style="border:1px solid #cbd5e1;border-radius:12px;padding:12px 14px;background:#fff;color:#132238;font-weight:800;cursor:pointer">Tạo BẢN 2 nếu tuần đã tồn tại</button>
        <button value="cancel" style="border:0;border-radius:12px;padding:10px;background:#f1f5f9;color:#64748b;font-weight:700;cursor:pointer">Hủy</button>
      </div>
    </form>`;
    document.body.appendChild(dialog);
    dialog.addEventListener('close',()=>{
      if(dialog.returnValue==='overwrite'||dialog.returnValue==='copy')saveToSheets(dialog.returnValue);
    });
    return dialog;
  }

  function chooseMode(){
    try{
      const report=buildReport('overwrite');
      const dialog=ensureDialog();
      const prompt=document.getElementById('sheetSavePrompt');
      if(prompt)prompt.textContent=`${report.sheetName} • ${report.teacherName} • ${report.total} tiết`;
      dialog.returnValue='cancel';
      if(typeof dialog.showModal==='function')dialog.showModal();
      else saveToSheets(confirm('Nhấn OK để ghi đè. Nhấn Hủy để tạo BẢN 2.')?'overwrite':'copy');
    }catch(error){
      alert(error.message||String(error));
    }
  }

  function setBusy(busy,text){
    const button=document.getElementById('saveSheets');
    if(!button)return;
    const a=currentResult();
    button.disabled=busy||!a?.entries?.length;
    button.textContent=text||(busy?'Đang lưu…':'☁ Lưu vào Google Sheets');
  }

  function hiddenInput(name,value){
    const input=document.createElement('input');
    input.type='hidden';
    input.name=name;
    input.value=value;
    return input;
  }

  function saveToSheets(mode){
    let report;
    try{report=buildReport(mode);}catch(error){alert(error.message||String(error));return;}
    if(pending){toast('Đang có một yêu cầu lưu.');return;}

    const requestId=`lbg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setBusy(true,'Đang gửi sang Google Sheets…');

    bridgeWindow=window.open('about:blank',POPUP_NAME,'popup=yes,width=540,height=650,left=120,top=80');
    if(!bridgeWindow){
      setBusy(false);
      alert('Trình duyệt đang chặn cửa sổ bật lên. Hãy cho phép cửa sổ bật lên rồi thử lại.');
      return;
    }

    pending={requestId,started:Date.now(),timer:null};

    const form=document.createElement('form');
    form.method='POST';
    form.action=WEB_APP_URL;
    form.target=POPUP_NAME;
    form.style.display='none';
    form.appendChild(hiddenInput('requestId',requestId));
    form.appendChild(hiddenInput('accessKey',ACCESS_KEY));
    form.appendChild(hiddenInput('payload',JSON.stringify(report)));
    document.body.appendChild(form);

    try{
      form.submit();
      setBusy(true,'Đang lưu vào Google Sheets…');
    }catch(error){
      form.remove();
      finish(false,'Không gửi được dữ liệu sang Google Sheets: '+(error.message||String(error)));
      return;
    }
    form.remove();

    pending.timer=setTimeout(()=>{
      if(!pending||pending.requestId!==requestId)return;
      finish(false,'Google Sheets chưa phản hồi. Hãy kiểm tra lại Apps Script và lượt triển khai.');
    },60000);
  }

  function finish(success,message,url){
    if(pending?.timer)clearTimeout(pending.timer);
    pending=null;
    setBusy(false,success?'✓ Đã lưu Google Sheets':'☁ Lưu vào Google Sheets');

    if(success){
      toast(message||'Đã lưu vào Google Sheets.');
      if(url&&confirm((message||'Đã lưu thành công.')+'\n\nMở Google Sheets ngay?'))window.open(url,'_blank','noopener');
      setTimeout(()=>setBusy(false),2200);
    }else{
      alert(message||'Không thể lưu vào Google Sheets.');
    }

    try{if(bridgeWindow&&!bridgeWindow.closed)bridgeWindow.close();}catch{}
    bridgeWindow=null;
  }

  window.addEventListener('message',event=>{
    const host=(()=>{try{return new URL(event.origin).hostname;}catch{return '';}})();
    if(host!=='script.google.com'&&!host.endsWith('.googleusercontent.com'))return;

    const message=event.data||{};
    if(!pending)return;
    if(message.requestId&&message.requestId!==pending.requestId)return;

    const body=message.result||message.data||message.payload||message;
    const isError=message.type==='LBG_ERROR'||message.success===false||body?.success===false||Boolean(message.error||body?.error);
    const isSuccess=message.type==='LBG_SAVED'||message.type==='LBG_SAVE_RESULT'||message.type==='LBG_RESULT'||message.success===true||body?.success===true||body?.ok===true;

    if(isError){
      finish(false,String(message.error||body?.error||body?.message||'Apps Script báo lỗi khi lưu.'));
    }else if(isSuccess){
      finish(true,String(body?.message||message.message||'Đã lưu vào Google Sheets.'),body?.url||body?.spreadsheetUrl||message.url);
    }
  });

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureButton);
  else ensureButton();
})();
