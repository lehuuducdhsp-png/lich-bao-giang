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
    return {startDate:iso(monday),endDate:`${y+1}-05-31`};
  }

  function storageKey(year){return STORAGE_PREFIX+String(year);}

  function readStored(year){
    try{
      const parsed=JSON.parse(localStorage.getItem(storageKey(year))||'null');
      if(parsed&&typeof parsed==='object'&&parsed.startDate&&parsed.endDate)return parsed;
    }catch{}
    if(Number(year)===2026)return {startDate:'2026-08-31',endDate:'2027-05-31'};
    return defaultConfig(year);
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

  function saveStored(){
    const year=Number(document.getElementById('year')?.value);
    const start=document.getElementById(START_ID)?.value||'';
    const end=document.getElementById(END_ID)?.value||'';
    if(!Number.isInteger(year))return;
    localStorage.setItem(storageKey(year),JSON.stringify({startDate:start,endDate:end}));
    updateStatus();
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

    document.getElementById(START_ID)?.addEventListener('change',saveStored);
    document.getElementById(END_ID)?.addEventListener('change',saveStored);
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
      valid:Boolean(Number.isInteger(year)&&start&&end&&start.getDay()===1&&end>=start&&start.getFullYear()===year)
    };
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureUI);
  else ensureUI();
})();

(function(){
  const LOGO='data:image/png;base64,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';

  function applyBrand(){
    const styleId='ducBrandStyle';
    if(!document.getElementById(styleId)){
      const style=document.createElement('style');
      style.id=styleId;
      style.textContent=`
        .top .logo{
          width:54px!important;
          height:54px!important;
          min-width:54px!important;
          border-radius:50%!important;
          overflow:hidden!important;
          padding:0!important;
          display:flex!important;
          align-items:center!important;
          justify-content:center!important;
          background:#fff!important;
          border:2px solid #dbe6eb!important;
          box-shadow:0 4px 14px rgba(8,47,73,.20)!important;
        }
        .top .logo img{
          width:100%!important;
          height:100%!important;
          display:block!important;
          object-fit:cover!important;
          border-radius:50%!important;
          transform:scale(1.04);
        }
      `;
      document.head.appendChild(style);
    }

    const logo=document.querySelector('.top .logo');
    if(logo){
      logo.textContent='';
      const img=document.createElement('img');
      img.src=LOGO;
      img.alt='Logo DUC';
      logo.appendChild(img);
    }

    for(const rel of ['icon','shortcut icon','apple-touch-icon']){
      let link=document.head.querySelector(`link[rel="${rel}"]`);
      if(!link){
        link=document.createElement('link');
        link.rel=rel;
        document.head.appendChild(link);
      }
      link.type='image/png';
      link.href=LOGO;
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyBrand);
  else applyBrand();
})();
