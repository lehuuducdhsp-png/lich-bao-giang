'use strict';
(function(){
  const cfg=window.LBG_SUPABASE_CONFIG;
  if(!cfg?.enabled||!window.LBGAuth)return;

  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').trim();
  let auth=null,pending=false;

  const current=()=>{try{return result||null;}catch{return null;}};
  const pad2=v=>{const n=Number(v);return Number.isFinite(n)&&n>0?String(n).padStart(2,'0'):txt(v);};
  const iso=d=>d instanceof Date&&!Number.isNaN(d.getTime())?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`:'';

  function parseLocalDate(value){
    const m=txt(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!m)return null;
    const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),12);
    return Number.isNaN(d.getTime())?null:d;
  }

  function defaultFirstWeek(year){
    const sep1=new Date(year,8,1,12);
    const day=sep1.getDay()||7;
    sep1.setDate(sep1.getDate()-day+1);
    return sep1;
  }

  function yearConfig(){
    const yearStart=Number(q('year')?.value)||new Date().getFullYear();
    const c=typeof window.getSchoolYearConfig==='function'
      ?window.getSchoolYearConfig()
      :{yearStart,startDate:iso(defaultFirstWeek(yearStart)),endDate:`${yearStart+1}-05-31`,valid:true};
    const start=parseLocalDate(c.startDate),end=parseLocalDate(c.endDate);
    return {
      yearStart,
      startDate:c.startDate||'',
      endDate:c.endDate||'',
      valid:Boolean(Number.isInteger(yearStart)&&start&&end&&start.getDay()===1&&end>=start&&start.getFullYear()===yearStart)
    };
  }

  function tabStart(start,week,year,c){
    if(start instanceof Date&&!Number.isNaN(start.getTime()))return new Date(start);
    const n=Number(week);
    if(!Number.isFinite(n)||n<1)return null;
    const d=parseLocalDate(c?.startDate)||defaultFirstWeek(year);
    d.setDate(d.getDate()+(n-1)*7);
    return d;
  }

  function tabName(weekText,start,week,year,c){
    const d=tabStart(start,week,year,c);
    return d?`TUẦN ${weekText}_${d.getDate()}T${d.getMonth()+1}`:`TUẦN ${weekText}`;
  }

  function gaValuesOf(a){
    const source=a?.gaValues&&typeof a.gaValues==='object'?a.gaValues:{};
    const out={};
    for(const [key,raw] of Object.entries(source)){
      const value=txt(raw);
      if(typeof key!=='string'||key.length>240||!/^\d+$/.test(value))continue;
      const n=Number(value);
      if(Number.isSafeInteger(n)&&n>=0)out[key]=String(n);
    }
    return out;
  }

  function buildReport(mode){
    const a=current();
    if(!a||!Array.isArray(a.entries)||!a.entries.length)throw new Error('Hãy nhấn Kiểm tra và bảo đảm lịch có ít nhất một tiết trước khi lưu.');
    const c=yearConfig();
    if(!c.valid)throw new Error('Cấu hình năm học chưa hợp lệ. Ngày bắt đầu Tuần 01 phải là Thứ Hai và ngày kết thúc phải ở phía sau.');
    const start=a.start instanceof Date?new Date(a.start):null;
    const end=start?new Date(start.getTime()+5*864e5):null;
    const weekText=pad2(a.week);
    const destinationSheet=tabName(weekText,start,a.week,c.yearStart,c);
    const entries=a.entries.map((e,i)=>({
      index:i+1,
      day:Number(e.day),
      session:txt(e.session),
      period:Number(e.period),
      school:txt(e.school),
      className:txt(e.className),
      sourceCell:txt(e.address),
      address:txt(e.address)
    }));
    const gaValues=gaValuesOf(a);
    return {
      requestId:`lbg-edge-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      week:a.week,weekNo:a.week,weekNumber:a.week,weekText,
      weekLabel:txt(a.sheet),sourceSheet:txt(a.sheet),sheetName:destinationSheet,destinationSheet,tabName:destinationSheet,
      schoolYear:`${c.yearStart}-${c.yearStart+1}`,
      schoolYearStart:c.yearStart,schoolYearStartDate:c.startDate,schoolYearEndDate:c.endDate,
      yearStart:c.yearStart,yearEnd:c.yearStart+1,
      teacherName:txt(a.teacherName),teacherCode:txt(a.code),
      total:Number(a.total)||entries.length,totalPeriods:Number(a.total)||entries.length,
      startDate:iso(start),endDate:iso(end),mode,saveMode:mode,existingAction:mode,
      gaValues,lessonPlanCounts:gaValues,entries,schedule:entries
    };
  }

  function syncButton(){
    const b=q('saveSheets'),exportButton=q('export'),a=current(),c=yearConfig();
    if(!b)return;
    b.disabled=pending||!auth?.isOwner()||!a?.entries?.length||Boolean(exportButton?.disabled)||!c.valid;
  }

  function ensureButton(){
    if(!auth?.isOwner()){q('saveSheets')?.remove();return;}
    const exportButton=q('export');
    if(!exportButton)return;
    let b=q('saveSheets');
    if(!b){
      b=document.createElement('button');
      b.id='saveSheets';b.type='button';b.className='btn';b.textContent='☁ Lưu vào Google Sheets';
      b.style.cssText='background:#2563eb;color:#fff;white-space:nowrap';
      exportButton.insertAdjacentElement('afterend',b);
      b.addEventListener('click',chooseMode);
      new MutationObserver(syncButton).observe(exportButton,{attributes:true,attributeFilter:['disabled']});
      ['analyze','teacher','week','year','schoolYearStartDate','schoolYearEndDate'].forEach(id=>q(id)?.addEventListener('change',()=>setTimeout(syncButton,50)));
      q('analyze')?.addEventListener('click',()=>setTimeout(syncButton,100));
    }
    syncButton();
  }

  function ensureDialog(){
    let d=q('sheetSaveDialog');
    if(d)return d;
    d=document.createElement('dialog');d.id='sheetSaveDialog';
    d.style.cssText='border:0;border-radius:18px;padding:0;max-width:480px;width:calc(100% - 30px);box-shadow:0 24px 70px rgba(15,23,42,.28)';
    d.innerHTML=`<form method="dialog" style="padding:22px;font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif"><h3 style="margin:0 0 7px;color:#082f49">Lưu vào Google Sheets</h3><p id="sheetSavePrompt" style="margin:0 0 18px;color:#64748b">Chọn cách lưu tuần đang xem.</p><div style="display:grid;gap:10px"><button value="overwrite" style="border:0;border-radius:12px;padding:12px 14px;background:#0f766e;color:#fff;font-weight:800;cursor:pointer">Ghi đè tab tuần hiện có</button><button value="copy" style="border:1px solid #cbd5e1;border-radius:12px;padding:12px 14px;background:#fff;color:#132238;font-weight:800;cursor:pointer">Tạo BẢN 2 nếu tuần đã tồn tại</button><button value="cancel" style="border:0;border-radius:12px;padding:10px;background:#f1f5f9;color:#64748b;font-weight:700;cursor:pointer">Hủy</button></div></form>`;
    document.body.appendChild(d);
    d.addEventListener('close',()=>{if(['overwrite','copy'].includes(d.returnValue))saveToSheets(d.returnValue);});
    return d;
  }

  function chooseMode(){
    try{
      const r=buildReport('overwrite'),d=ensureDialog(),p=q('sheetSavePrompt');
      if(p)p.textContent=`${r.schoolYear} • ${r.sheetName} • ${r.teacherName} • ${r.total} tiết • ${Object.keys(r.gaValues).length} ô GA`;
      d.returnValue='cancel';
      if(typeof d.showModal==='function')d.showModal();
      else saveToSheets(confirm('Nhấn OK để ghi đè. Nhấn Hủy để tạo BẢN 2.')?'overwrite':'copy');
    }catch(e){alert(e?.message||String(e));}
  }

  async function functionErrorMessage(error){
    let message=error?.message||String(error);
    try{
      const body=await error?.context?.json?.();
      if(body?.error)message=body.error;
    }catch{}
    return message;
  }

  async function saveToSheets(mode){
    if(pending)return;
    let report;
    try{report=buildReport(mode);}catch(e){alert(e?.message||String(e));return;}
    const b=q('saveSheets');pending=true;if(b)b.textContent='Đang lưu Google Sheets…';syncButton();
    try{
      const {data,error}=await auth.client.functions.invoke('google-sheets-owner',{body:report});
      if(error)throw new Error(await functionErrorMessage(error));
      if(data?.error)throw new Error(data.error);
      if(!data?.ok&&!data?.success)throw new Error('Máy chủ chưa xác nhận đã lưu Google Sheets.');
      const message=data.message||'Đã lưu vào Google Sheets.';
      if(data.url&&confirm(message+'\n\nMở Google Sheets ngay?'))window.open(data.url,'_blank','noopener');
      else if(typeof toast==='function')toast(message);else alert(message);
    }catch(e){alert('Không thể lưu Google Sheets: '+(e?.message||String(e)));}
    finally{pending=false;if(b)b.textContent='☁ Lưu vào Google Sheets';syncButton();}
  }

  window.LBGAuth.onReady(a=>{auth=a;ensureButton();clearInterval(window.__lbgSheetsOwnerTimer);window.__lbgSheetsOwnerTimer=setInterval(()=>{ensureButton();syncButton();},1000);});
  window.LBGAuth.onLogout(()=>{clearInterval(window.__lbgSheetsOwnerTimer);q('saveSheets')?.remove();q('sheetSaveDialog')?.remove();auth=null;});
})();
