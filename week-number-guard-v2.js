'use strict';
(function(){
  const VERSION='20260903.2';
  const txt=v=>String(v??'').trim();
  const padWeek=n=>String(Math.max(1,Number(n)||1)).padStart(2,'0');

  function parseLocalIso(value){
    const m=txt(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!m)return null;
    const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),12);
    return Number.isNaN(d.getTime())?null:d;
  }

  function parseStartFromName(name){
    const s=txt(name);
    const m=s.match(/(\d{1,2})\s*[Tt]\s*(\d{1,2})/)||s.match(/(\d{1,2})[\/.-](\d{1,2})/);
    if(!m)return null;
    const year=Number(document.getElementById('year')?.value);
    if(!Number.isInteger(year))return null;
    const month=Number(m[2]);
    const fullYear=month>=8?year:year+1;
    const d=new Date(fullYear,month-1,Number(m[1]),12);
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

  function savedWeek1(){
    const year=Number(document.getElementById('year')?.value);
    if(!Number.isInteger(year))return null;

    const direct=document.getElementById('schoolYearStartDate')?.value||'';
    if(direct){
      const d=parseLocalIso(direct);
      if(d)return d;
    }

    try{
      if(typeof window.getSchoolYearConfig==='function'){
        const cfg=window.getSchoolYearConfig();
        const d=parseLocalIso(cfg?.startDate||'');
        if(d)return d;
      }
    }catch{}

    try{
      const raw=localStorage.getItem('lbgSchoolYearConfig:'+year);
      const cfg=raw?JSON.parse(raw):null;
      const d=parseLocalIso(cfg?.startDate||'');
      if(d)return d;
    }catch{}

    return null;
  }

  function inferredWeek1(){
    try{
      if(typeof wb==='undefined'||!wb||!Array.isArray(wb.worksheets))return null;
      const dates=wb.worksheets.map(ws=>parseStartFromName(ws?.name)).filter(d=>d instanceof Date&&!Number.isNaN(d.getTime()));
      if(!dates.length)return null;
      dates.sort((a,b)=>a-b);
      return dates[0];
    }catch{return null}
  }

  function resolveWeek1(reportStart){
    const saved=savedWeek1();
    if(saved&&reportStart instanceof Date&&reportStart>=saved)return saved;

    // Nếu ngày trên sheet sớm hơn cấu hình/không có cấu hình, lấy tuần đầu tiên thực tế
    // trong chính workbook làm mốc để không sinh Tuần 0, Tuần -1 hoặc dấu "...".
    const inferred=inferredWeek1();
    if(inferred)return inferred;
    return saved;
  }

  function calculatedWeek(start){
    if(!(start instanceof Date)||Number.isNaN(start.getTime()))return null;
    const week1=resolveWeek1(start);
    if(!week1)return null;
    const dayStart=new Date(start.getFullYear(),start.getMonth(),start.getDate(),12);
    const diff=Math.floor((dayStart-week1)/6048e5);
    return diff>=0?diff+1:null;
  }

  function normalizeReportWeek(report,ws){
    if(!report||typeof report!=='object')return report;
    const named=explicitWeek(ws?.name||report.sheet);
    if(named){report.week=padWeek(named);return report}

    const calculated=calculatedWeek(report.start);
    if(calculated){report.week=padWeek(calculated);return report}

    const existing=Number(report.week);
    report.week=Number.isInteger(existing)&&existing>0?padWeek(existing):'01';
    return report;
  }

  function install(){
    if(document.documentElement.dataset.lbgWeekGuardV2==='1')return;
    if(typeof window.analyzeNow!=='function')return;
    const original=window.analyzeNow;
    window.analyzeNow=function(ws,code,name){
      return normalizeReportWeek(original(ws,code,name),ws);
    };
    document.documentElement.dataset.lbgWeekGuardV2='1';
    window.LBGWeekNumberGuardV2={version:VERSION,normalizeReportWeek,explicitWeek,calculatedWeek,savedWeek1,inferredWeek1};
  }

  function start(){
    install();
    if(document.documentElement.dataset.lbgWeekGuardV2==='1')return;
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      install();
      if(document.documentElement.dataset.lbgWeekGuardV2==='1'||tries>200)clearInterval(timer);
    },100);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
