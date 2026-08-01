'use strict';
(function(){
  const START_ID='schoolYearStartDate';
  const END_ID='schoolYearEndDate';
  const STATUS_ID='schoolYearConfigStatus';
  const STORAGE_PREFIX='lbgSchoolYearConfig:';

  const pad2=n=>String(n).padStart(2,'0');
  const iso=d=>`${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;

  function defaultConfig(year){
    const y=Number(year);
    const sep1=new Date(y,8,1,12);
    const day=sep1.getDay()||7;
    const monday=new Date(sep1);
    monday.setDate(sep1.getDate()-day+1);
    return {
      startDate:iso(monday),
      endDate:`${y+1}-05-31`
    };
  }

  function storageKey(year){
    return STORAGE_PREFIX+String(year);
  }

  function readStored(year){
    try{
      const parsed=JSON.parse(localStorage.getItem(storageKey(year))||'null');
      if(parsed&&typeof parsed==='object'&&parsed.startDate&&parsed.endDate)return parsed;
    }catch{}
    if(Number(year)===2026)return {startDate:'2026-08-31',endDate:'2027-05-31'};
    return defaultConfig(year);
  }

  function saveStored(){
    const year=Number(document.getElementById('year')?.value);
    const start=document.getElementById(START_ID)?.value||'';
    const end=document.getElementById(END_ID)?.value||'';
    if(!Number.isInteger(year))return;
    localStorage.setItem(storageKey(year),JSON.stringify({startDate:start,endDate:end}));
    updateStatus();
  }

  function parseLocal(value){
    const m=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!m)return null;
    const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),12);
    return Number.isNaN(d.getTime())?null:d;
  }

  function updateStatus(){
    const year=Number(document.getElementById('year')?.value);
    const startText=document.getElementById(START_ID)?.value||'';
    const endText=document.getElementById(END_ID)?.value||'';
    const status=document.getElementById(STATUS_ID);
    if(!status)return;

    const start=parseLocal(startText);
    const end=parseLocal(endText);
    let message='';
    let ok=true;

    if(!start||!end){
      message='Hãy nhập đủ ngày bắt đầu Tuần 01 và ngày kết thúc năm học.';
      ok=false;
    }else if(start.getDay()!==1){
      message='Ngày bắt đầu Tuần 01 phải là Thứ Hai.';
      ok=false;
    }else if(end<start){
      message='Ngày kết thúc phải sau ngày bắt đầu Tuần 01.';
      ok=false;
    }else if(start.getFullYear()!==year){
      message=`Ngày bắt đầu Tuần 01 phải thuộc năm ${year}.`;
      ok=false;
    }else{
      const weeks=Math.floor((end-start)/6048e5)+1;
      message=`Năm học ${year}–${year+1}: Tuần 01 từ ${start.toLocaleDateString('vi-VN')} • dự kiến ${weeks} tuần.`;
    }

    status.textContent=message;
    status.style.color=ok?'#166534':'#9a3412';
    status.style.background=ok?'#ecfdf5':'#fff7ed';
    status.style.borderColor=ok?'#bbf7d0':'#fed7aa';
  }

  function applyYearConfig(){
    const year=Number(document.getElementById('year')?.value);
    if(!Number.isInteger(year))return;
    const cfg=readStored(year);
    const start=document.getElementById(START_ID);
    const end=document.getElementById(END_ID);
    if(start)start.value=cfg.startDate;
    if(end)end.value=cfg.endDate;
    updateStatus();
  }

  function ensureUI(){
    if(document.getElementById(START_ID))return;
    const yearInput=document.getElementById('year');
    if(!yearInput)return;

    const row=yearInput.closest('.row')||yearInput.parentElement;
    const box=document.createElement('div');
    box.id='schoolYearConfigBox';
    box.style.cssText='margin-top:12px;padding:13px;border:1px solid #dbe6eb;border-radius:13px;background:#f8fafc';
    box.innerHTML=`
      <div style="font-weight:850;color:#082f49;margin-bottom:8px">Cấu hình năm học</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <label style="display:grid;gap:5px;font-size:12px;font-weight:750">
          Ngày bắt đầu Tuần 01
          <input id="${START_ID}" type="date" style="width:100%;padding:10px 11px;border:1px solid #dbe6eb;border-radius:11px;background:#fff">
        </label>
        <label style="display:grid;gap:5px;font-size:12px;font-weight:750">
          Ngày kết thúc năm học
          <input id="${END_ID}" type="date" style="width:100%;padding:10px 11px;border:1px solid #dbe6eb;border-radius:11px;background:#fff">
        </label>
      </div>
      <div id="${STATUS_ID}" style="margin-top:9px;padding:8px 10px;border:1px solid;border-radius:9px;font-size:12px"></div>
      <div style="margin-top:7px;color:#64748b;font-size:11px">Mỗi năm học được lưu vào một Google Sheets riêng. Bạn có thể sửa hai ngày này trước lần lưu đầu tiên của năm học mới.</div>
    `;

    if(row&&row.parentElement)row.insertAdjacentElement('afterend',box);
    else yearInput.insertAdjacentElement('afterend',box);

    document.getElementById(START_ID).addEventListener('change',saveStored);
    document.getElementById(END_ID).addEventListener('change',saveStored);
    yearInput.addEventListener('change',()=>setTimeout(applyYearConfig,0));
    applyYearConfig();
  }

  window.getSchoolYearConfig=function(){
    const year=Number(document.getElementById('year')?.value);
    const startDate=document.getElementById(START_ID)?.value||'';
    const endDate=document.getElementById(END_ID)?.value||'';
    const start=parseLocal(startDate);
    const end=parseLocal(endDate);
    return {
      yearStart:year,
      startDate,
      endDate,
      valid:Boolean(
        Number.isInteger(year)&&start&&end&&start.getDay()===1&&end>=start&&start.getFullYear()===year
      )
    };
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureUI);
  else ensureUI();
})();
