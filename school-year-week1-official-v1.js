'use strict';
(function(){
  const VERSION='20260903.2';
  const YEAR=2026;
  const WEEK_COUNT=40;
  const OFFICIAL_START='2026-09-07';
  const OFFICIAL_END='2027-06-12';
  const LEGACY_START='2026-08-31';
  const LEGACY_END='2027-05-31';
  const STORAGE_KEY=`lbgSchoolYearConfig:${YEAR}`;

  function readStored(){
    try{
      const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
      return value&&typeof value==='object'?value:null;
    }catch{return null}
  }

  function migrateStored(){
    const current=readStored()||{};
    const currentStart=String(current.startDate||'');
    const currentEnd=String(current.endDate||'');

    const startDate=(!currentStart||currentStart===LEGACY_START)
      ?OFFICIAL_START
      :currentStart;

    // Chỉ tự đổi ngày kết thúc cũ khi năm 2026–2027 đang dùng đúng mốc Tuần 01 chính thức.
    // Nếu người dùng đã chủ động đặt một mốc khác thì giữ nguyên để không ghi đè cấu hình cá nhân.
    const endDate=(startDate===OFFICIAL_START&&(!currentEnd||currentEnd===LEGACY_END))
      ?OFFICIAL_END
      :(currentEnd||LEGACY_END);

    const next={startDate,endDate};
    if(next.startDate!==currentStart||next.endDate!==currentEnd){
      try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next))}catch{}
    }
    return next;
  }

  function applyToUi(){
    const yearInput=document.getElementById('year');
    if(Number(yearInput?.value)!==YEAR)return false;

    const start=document.getElementById('schoolYearStartDate');
    const end=document.getElementById('schoolYearEndDate');
    if(!start)return false;

    const stored=migrateStored();
    let changed=false;

    if(!start.value||start.value===LEGACY_START){
      start.value=OFFICIAL_START;
      changed=true;
    }

    if(end&&start.value===OFFICIAL_START&&(!end.value||end.value===LEGACY_END)){
      end.value=OFFICIAL_END;
      changed=true;
    }

    if(changed){
      start.dispatchEvent(new Event('change',{bubbles:true}));
      end?.dispatchEvent(new Event('change',{bubbles:true}));
    }
    return true;
  }

  function installFallbackConfig(){
    if(typeof window.getSchoolYearConfig==='function')return;
    window.getSchoolYearConfig=function(){
      const yearStart=Number(document.getElementById('year')?.value);
      if(yearStart===YEAR){
        const stored=migrateStored();
        const startDate=document.getElementById('schoolYearStartDate')?.value||stored.startDate||OFFICIAL_START;
        const endDate=document.getElementById('schoolYearEndDate')?.value||stored.endDate||OFFICIAL_END;
        const start=new Date(`${startDate}T12:00:00`);
        const end=new Date(`${endDate}T12:00:00`);
        return {
          yearStart,
          startDate,
          endDate,
          valid:Boolean(!Number.isNaN(start.getTime())&&!Number.isNaN(end.getTime())&&start.getDay()===1&&end>=start)
        };
      }
      return {yearStart,startDate:'',endDate:'',valid:false};
    };
    window.getSchoolYearConfig.__lbgOfficialFallback=true;
  }

  function start(){
    migrateStored();
    installFallbackConfig();
    applyToUi();

    const yearInput=document.getElementById('year');
    yearInput?.addEventListener('change',()=>setTimeout(()=>{
      migrateStored();
      applyToUi();
    },30));

    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      migrateStored();
      installFallbackConfig();
      if(applyToUi()||tries>=100)clearInterval(timer);
    },100);
  }

  window.LBGSchoolYearWeek1Official={
    version:VERSION,
    year:YEAR,
    weekCount:WEEK_COUNT,
    startDate:OFFICIAL_START,
    endDate:OFFICIAL_END,
    legacyStartDate:LEGACY_START,
    legacyEndDate:LEGACY_END,
    migrateStored,
    applyToUi
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
