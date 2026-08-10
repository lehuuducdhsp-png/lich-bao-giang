'use strict';
(function(){
  function currentSchoolYearStart(){
    const now=new Date();
    return now.getMonth()>=7?now.getFullYear():now.getFullYear()-1;
  }
  function install(){
    const api=window.LBGTeacherIntelligenceV6;
    if(!api?.scanSheet)return false;
    if(api.__lbgCheckinSharedYearWrapped)return true;
    const original=api.scanSheet.bind(api);
    api.scanSheet=function(ws){
      const year=document.getElementById('year');
      let localBook=null;
      try{localBook=typeof wb!=='undefined'?wb:null}catch{}
      const isSeparateWorkbook=Boolean(ws?.workbook&&localBook&&ws.workbook!==localBook);
      if(!year||!isSeparateWorkbook)return original(ws);
      const previous=year.value;
      try{
        year.value=String(currentSchoolYearStart());
        return original(ws);
      }finally{
        year.value=previous;
      }
    };
    api.__lbgCheckinSharedYearWrapped=true;
    api.__lbgCheckinOriginalScanSheet=original;
    return true;
  }
  if(install())return;
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(install()||tries>300)clearInterval(timer);
  },100);
})();
