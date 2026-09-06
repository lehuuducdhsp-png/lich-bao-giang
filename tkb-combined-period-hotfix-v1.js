'use strict';
(function(){
  const txt=v=>String(v??'').replace(/\r/g,'').trim();

  function operationalPeriod(group){
    for(const e of group?.source||[]){
      if(e?.classType!=='combined')continue;
      const m=txt(e.groupNote||e.classRaw||e.className).match(/(?:^|[-–\s])TIẾT\s*([1-5])(?:\b|$)/i);
      if(m)return Number(m[1]);
    }
    return Number(group?.period)||null;
  }

  function memberDisplay(value){
    const s=txt(value);
    if(/^\d{1,2}\s*\/\s*\d{1,2}$/.test(s))return 'Lớp '+s.replace(/\s/g,'');
    return s;
  }

  function patchResult(result){
    if(!result||!Array.isArray(result.groups))return result;
    return{
      ...result,
      groups:result.groups.map(group=>{
        const sourcePeriod=Number(group?.period)||null;
        const period=operationalPeriod(group)||sourcePeriod;
        return{
          ...group,
          sourcePeriod,
          operationalPeriod:period,
          period,
          members:(group.members||[]).map(memberDisplay)
        };
      })
    };
  }

  function fixTomorrowDetail(){
    document.querySelectorAll('#lbgTomorrowReportV2 .lbg-checkin-meta').forEach(el=>{
      const before=el.textContent||'';
      const after=before.replace(/•\s*Lớp\s+(?=KHỐI\b)/i,'• ');
      if(after!==before)el.textContent=after;
    });
  }

  function install(){
    const api=window.LBGTeacherIntelligenceV6;
    if(!api?.scanSheet||api.__lbgOperationalPeriodHotfixV2)return false;

    const originalScan=api.scanSheet.bind(api);
    api.scanSheet=function(ws){return patchResult(originalScan(ws))};
    api.__lbgOperationalPeriodHotfixV2=true;

    // Chỉ lớp Check-in/Báo lịch ngày mai dùng period vận hành.
    // Parser gốc, Lịch Báo giảng, tổng tiết, bảng kê và dữ liệu tính lương
    // vẫn giữ nguyên từng ô phân công nguồn và period theo cột TKB.
    let queued=false;
    const queueFix=()=>{
      if(queued)return;queued=true;
      requestAnimationFrame(()=>{queued=false;fixTomorrowDetail()});
    };
    const observer=new MutationObserver(queueFix);
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
    queueFix();

    document.dispatchEvent(new CustomEvent('lbg-operational-period-hotfix-ready'));
    return true;
  }

  if(install())return;
  let tries=0;
  const timer=setInterval(()=>{tries++;if(install()||tries>300)clearInterval(timer)},50);
})();
