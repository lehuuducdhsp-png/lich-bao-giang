'use strict';
(function(){
  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').trim();
  let auth=null,pending=false;

  const current=()=>{try{return result||null}catch{return null}};
  const pad2=v=>{const n=Number(v);return Number.isFinite(n)&&n>0?String(n).padStart(2,'0'):String(v||'').trim()};
  const iso=d=>d instanceof Date&&!Number.isNaN(d.getTime())?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`:'';

  function parseLocalDate(value){
    const m=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!m)return null;
    const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),12);
    return Number.isNaN(d.getTime())?null:d;
  }

  function defaultFirstWeek(year){
    const d=new Date(year,8,1,12),day=d.getDay()||7;
    d.setDate(d.getDate()-day+1);
    return d;
  }

  function yearConfig(){
    const yearStart=Number(q('year')?.value)||new Date().getFullYear();
    const cfg=typeof window.getSchoolYearConfig==='function'
      ?window.getSchoolYearConfig()
      :{yearStart,startDate:iso(defaultFirstWeek(yearStart)),endDate:`${yearStart+1}-05-31`,valid:true};
    const start=parseLocalDate(cfg.startDate),end=parseLocalDate(cfg.endDate);
    return {
      yearStart,
      startDate:cfg.startDate||'',
      endDate:cfg.endDate||'',
      valid:Boolean(Number.isInteger(yearStart)&&start&&end&&start.getDay()===1&&end>=start&&start.getFullYear()===yearStart)
    };
  }

  const tabStart=(start,week,year,cfg)=>{
    if(start instanceof Date&&!Number.isNaN(start.getTime()))return new Date(start);
    const n=Number(week);if(!Number.isFinite(n)||n<1)return null;
    const d=parseLocalDate(cfg?.startDate)||defaultFirstWeek(year);
    d.setDate(d.getDate()+(n-1)*7);
    return d;
  };

  const tabName=(weekText,start,week,year,cfg)=>{
    const d=tabStart(start,week,year,cfg);
    return d?`TUẦN ${weekText}_${d.getDate()}T${d.getMonth()+1}`:`TUẦN ${weekText}`;
  };

  function gaValuesOf(a){
    const source=a&&a.gaValues&&typeof a.gaValues==='object'?a.gaValues:{};
    const out={};
    for(const [key,raw] of Object.entries(source)){
      const value=String(raw??'').trim();
      if(typeof key!=='string'||key.length>240||!/^\d+$/.test(value))continue;
      const n=Number(value);if(Number.isSafeInteger(n)&&n>=0)out[key]=String(n);
    }
    return out;
  }

  function buildReport(mode){
    const a=current();
    if(!a||!Array.isArray(a.entries)||!a.entries.length)throw new Error('Hãy nhấn Kiểm tra và bảo đảm lịch có ít nhất một tiết trước khi lưu.');
    const cfg=yearConfig();
    if(!cfg.valid)throw new Error('Cấu hình năm học chưa hợp lệ. Ngày bắt đầu Tuần 01 phải là Thứ Hai.');
    const yearStart=cfg.yearStart,start=a.start instanceof Date?new Date(a.start):null,end=start?new Date(start.getTime()+5*864e5):null;
    const weekText=pad2(a.week),destinationSheet=tabName(weekText,start,a.week,yearStart,cfg);
    const entries=a.entries.map((e,i)=>({index:i+1,day:Number(e.day),session:String(e.session||''),period:Number(e.period),school:String(e.school||''),className:String(e.className||''),sourceCell:String(e.address||''),address:String(e.address||'')}));
    const gaValues=gaValuesOf(a);
    return {
      requestId:`lbg-edge-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      week:a.week,weekNo:a.week,weekNumber:a.week,weekText,
      weekLabel:String(a.sheet||''),sourceSheet:String(a.sheet||''),
      sheetName:destinationSheet,destinationSheet,tabName:destinationSheet,
      schoolYear:`${yearStart}-${yearStart+1}`,schoolYearStart:yearStart,
      schoolYearStartDate:cfg.startDate,schoolYearEndDate:cfg.endDate,
      yearStart,yearEnd:yearStart+1,
      teacherName:String(a.teacherName||''),teacherCode:String(a.code||''),
      total:Number(a.total)||entries.length,totalPeriods:Number(a.total)||entries.length,
      startDate:iso(start),endDate:iso(end),mode,saveMode:mode,existingAction:mode,
      gaValues,lessonPlanCounts:gaValues,entries,schedule:entries
    };
  }

  function ensureDialog(){
    let d=q('sheetSaveDialog');if(d)return d;
    d=document.createElement('dialog');d.id='sheetSaveDialog';
    d.style.cssText='border:0;border-radius:18px;padding:0;max-width:480px;width:calc(100% - 30px);box-shadow:0 24px 70px rgba(15,23,42,.28)';
    d.innerHTML=`<form method="dialog" style="padding:22px;font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif"><h3 style="margin:0 0 7px;color:#082f49">Lưu vào Google Sheets</h3><p id="sheetSavePrompt" style="margin:0 0 18px;color:#64748b">Chọn cách lưu tuần đang xem.</p><div style="display:grid;gap:10px"><button value="overwrite" style="border:0;border-radius:12px;padding:12px 14px;background:#0f766e;color:#fff;font-weight:800;cursor:pointer">Ghi đè tab tuần hiện có</button><button value="copy" style="border:1px solid #cbd5e1;border-radius:12px;padding:12px 14px;background:#fff;color:#132238;font-weight:800;cursor:pointer">Tạo BẢN 2 nếu tuần đã tồn tại</button><button value="cancel" style="border:0;border-radius:12px;padding:10px;background:#f1f5f9;color:#64748b;font-weight:700;cursor:pointer">Hủy</button></div></form>`;
    document.body.appendChild(d);
    d.addEventListener('close',()=>{if(['overwrite','copy'].includes(d.returnValue))saveToSheets(d.returnValue)});
    return d;
  }

  function syncButton(){
    const b=q('saveSheets'),a=current(),cfg=yearConfig(),exp=q('export');
    if(!b)return;
    b.disabled=pending||!a?.entries?.length||Boolean(exp?.disabled)||!cfg.valid;
  }

  function ensureButton(){
    if(!auth?.isOwner())return;
    const exp=q('export');if(!exp)return;
    let b=q('saveSheets');
    if(!b){
      b=document.createElement('button');
      Object.assign(b,{id:'saveSheets',type:'button',className:'btn',textContent:'☁ Lưu vào Google Sheets'});
      b.style.cssText='background:#2563eb;color:#fff;white-space:nowrap';
      exp.insertAdjacentElement('afterend',b);b.onclick=chooseMode;
      new MutationObserver(syncButton).observe(exp,{attributes:true,attributeFilter:['disabled']});
      ['analyze','teacher','week','year','schoolYearStartDate','schoolYearEndDate'].forEach(id=>q(id)?.addEventListener(id==='analyze'?'click':'change',()=>setTimeout(syncButton,80)));
      setInterval(syncButton,1200);
    }
    syncButton();
  }

  function chooseMode(){
    try{
      const r=buildReport('overwrite'),d=ensureDialog(),p=q('sheetSavePrompt');
      if(p)p.textContent=`${r.schoolYear} • ${r.sheetName} • ${r.teacherName} • ${r.total} tiết • ${Object.keys(r.gaValues).length} ô GA`;
      d.returnValue='cancel';
      typeof d.showModal==='function'?d.showModal():saveToSheets(confirm('Nhấn OK để ghi đè. Nhấn Hủy để tạo BẢN 2.')?'overwrite':'copy');
    }catch(e){alert(e?.message||String(e))}
  }

  function setBusy(busy,label){
    pending=busy;const b=q('saveSheets');if(!b)return;
    b.textContent=label||(busy?'Đang lưu…':'☁ Lưu vào Google Sheets');syncButton();
  }

  function normalizeResponse(data){
    if(data&&typeof data==='object')return data;
    const raw=String(data||'').trim();
    if(!raw)return {};
    try{return JSON.parse(raw)}catch{}
    return {ok:/LBG_SAVED|LBG_SAVE_RESULT|Đã lưu/i.test(raw)&&!/LBG_ERROR/i.test(raw),message:/LBG_ERROR/i.test(raw)?'Apps Script báo lỗi khi lưu.':'Đã gửi dữ liệu tới Google Sheets.'};
  }

  async function saveToSheets(mode){
    if(pending)return;
    try{
      const report=buildReport(mode);setBusy(true,'Đang lưu vào Google Sheets…');
      const {data,error}=await auth.client.functions.invoke('google-sheets-owner',{body:report});
      if(error)throw error;
      const out=normalizeResponse(data);
      if(out.error||out.success===false||out.ok===false)throw new Error(out.error||out.message||'Không thể lưu vào Google Sheets.');
      const message=out.message||'Đã lưu vào Google Sheets.';
      setBusy(false,'✓ Đã lưu Google Sheets');
      if(typeof window.toast==='function')window.toast(message);else alert(message);
      const url=out.url||out.spreadsheetUrl;
      if(url&&confirm(message+'\n\nMở Google Sheets ngay?'))window.open(url,'_blank','noopener');
      setTimeout(()=>{const b=q('saveSheets');if(b)b.textContent='☁ Lưu vào Google Sheets';syncButton()},2200);
    }catch(e){setBusy(false);alert(e?.message||String(e))}
  }

  function attach(){
    if(!window.LBGAuth){setTimeout(attach,250);return}
    window.LBGAuth.onReady(a=>{auth=a;if(a.isOwner())ensureButton();else q('saveSheets')?.remove()});
    window.LBGAuth.onLogout(()=>{auth=null;q('saveSheets')?.remove();q('sheetSaveDialog')?.remove()});
  }
  attach();
})();
