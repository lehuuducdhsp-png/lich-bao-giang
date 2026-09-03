'use strict';
(function(){
  const VERSION='20260903.1';
  const txt=v=>String(v??'').trim();

  function parseLocalIso(value){
    const m=txt(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!m)return null;
    const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),12);
    return Number.isNaN(d.getTime())?null:d;
  }

  function explicitWeek(name){
    const s=txt(name);
    let m=s.match(/tu[aâ]n\s*0*(\d{1,2})/i);
    if(!m)m=s.match(/(?:^|[^A-Za-z0-9])T\s*0*(\d{1,2})(?:[^A-Za-z0-9]|$)/i);
    if(!m)return null;
    const n=Number(m[1]);
    return Number.isInteger(n)&&n>0?n:null;
  }

  function configuredWeek(start){
    if(!(start instanceof Date)||Number.isNaN(start.getTime()))return null;
    let cfg=null;
    try{cfg=typeof window.getSchoolYearConfig==='function'?window.getSchoolYearConfig():null}catch{}
    const inputValue=document.getElementById('schoolYearStartDate')?.value||cfg?.startDate||'';
    const week1=parseLocalIso(inputValue);
    if(!week1)return null;
    const diff=Math.floor((new Date(start.getFullYear(),start.getMonth(),start.getDate(),12)-week1)/6048e5);
    return diff>=0?diff+1:null;
  }

  function normalizeReportWeek(report,ws){
    if(!report||typeof report!=='object')return report;
    const named=explicitWeek(ws?.name||report.sheet);
    if(named){report.week=named;return report}
    const calculated=configuredWeek(report.start);
    if(calculated){report.week=calculated;return report}
    if(Number(report.week)<=0)report.week='';
    return report;
  }

  function install(){
    if(document.documentElement.dataset.lbgWeekGuard==='1')return;
    if(typeof window.analyzeNow!=='function')return;
    const original=window.analyzeNow;
    window.analyzeNow=function(ws,code,name){
      return normalizeReportWeek(original(ws,code,name),ws);
    };
    document.documentElement.dataset.lbgWeekGuard='1';
    window.LBGWeekNumberGuardV1={version:VERSION,normalizeReportWeek,explicitWeek,configuredWeek};
  }

  function start(){
    install();
    if(document.documentElement.dataset.lbgWeekGuard==='1')return;
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      install();
      if(document.documentElement.dataset.lbgWeekGuard==='1'||tries>200)clearInterval(timer);
    },100);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
