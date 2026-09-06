'use strict';
(function(){
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  const periodFromNote=v=>{const m=txt(v).match(/\bTIẾT\s*([1-5])\b/i);return m?Number(m[1]):null};

  function enrich(entry){
    if(!entry||typeof entry!=='object')return entry;
    const slotPeriod=Number(entry.slotPeriod??entry.period)||null;
    const teachingPeriod=Number(entry.teachingPeriod)||periodFromNote(entry.groupNote)||periodFromNote(entry.classRaw)||slotPeriod;
    return{
      ...entry,
      // period/slotPeriod = vị trí ô mã GV trong TKB. Đây là trục dùng cho Lịch Báo giảng và tính tiết.
      period:slotPeriod,
      slotPeriod,
      // teachingPeriod = tiết thực tế ghi trong nhãn lớp gộp (vd. "- TIẾT 4"), dùng để đọc/sắp lịch thực tế.
      teachingPeriod,
      // Mỗi ô mã giáo viên là một lượt tính riêng. Không nhân theo số lớp trong nhãn KHỐI và cũng không dedupe ô lặp.
      payUnits:1,
      atomicKey:txt(entry.address)||`${entry.day||''}|${entry.session||''}|${slotPeriod||''}|${entry.row||''}|${entry.col||''}`
    }
  }

  function install(){
    const api=window.LBGTkbParserV2;
    if(!api?.scanAssignments)return false;
    if(api.__lbgAtomicTeachingV1)return true;

    const originalScan=api.scanAssignments.bind(api);
    const originalAnalyze=typeof api.analyze==='function'?api.analyze.bind(api):null;

    api.scanAssignments=function(ws,onlyCode=''){
      return(originalScan(ws,onlyCode)||[]).map(enrich);
    };

    api.analyze=function(ws,code,name){
      const base=originalAnalyze?originalAnalyze(ws,code,name):{sheet:ws?.name||'',code,teacherName:name||code,warnings:[],start:null,week:''};
      const entries=api.scanAssignments(ws,code);
      const total=entries.reduce((sum,e)=>sum+(Number(e.payUnits)||1),0);
      return{...base,entries,total,atomicTotal:entries.length,payTotal:total};
    };

    api.periodFromGroupNote=periodFromNote;
    api.enrichAtomicAssignment=enrich;
    api.__lbgAtomicTeachingV1=true;
    window.analyzeNow=api.analyze;
    window.LBGAtomicTeachingV1={version:'1.0.0',periodFromNote,enrich};
    document.dispatchEvent(new CustomEvent('lbg-atomic-teaching-v1-ready'));
    return true;
  }

  if(install())return;
  let tries=0;
  const timer=setInterval(()=>{tries++;if(install()||tries>300)clearInterval(timer)},50);
})();
