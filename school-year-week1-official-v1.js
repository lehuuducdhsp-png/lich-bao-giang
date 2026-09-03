'use strict';
(function(){
  const VERSION='20260903.1';
  const YEAR=2026;
  const OFFICIAL_START='2026-09-07';
  const LEGACY_START='2026-08-31';
  const DEFAULT_END='2027-05-31';
  const STORAGE_KEY=`lbgSchoolYearConfig:${YEAR}`;

  function readStored(){
    try{
      const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
      return value&&typeof value==='object'?value:null;
    }catch{return null}
  }

  function migrateStored(){
    const current=readStored();
    if(current&&current.startDate&&current.startDate!==LEGACY_START)return current;

    const next={
      startDate:OFFICIAL_START,
      endDate:String(current?.endDate||DEFAULT_END)
    };
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next))}catch{}
    return next;
  }

  function applyToUi(){
    const yearInput=document.getElementById('year');
    if(Number(yearInput?.value)!==YEAR)return false;

    const start=document.getElementById('schoolYearStartDate');
    const end=document.getElementById('schoolYearEndDate');
    if(!start)return false;

    const stored=migrateStored();
    const shouldUpdate=!start.value||start.value===LEGACY_START;
    if(shouldUpdate){
      start.value=OFFICIAL_START;
      if(end&&!end.value)end.value=stored.endDate||DEFAULT_END;
      start.dispatchEvent(new Event('change',{bubbles:true}));
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
        const endDate=document.getElementById('schoolYearEndDate')?.value||stored.endDate||DEFAULT_END;
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
    startDate:OFFICIAL_START,
    legacyStartDate:LEGACY_START,
    migrateStored,
    applyToUi
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
