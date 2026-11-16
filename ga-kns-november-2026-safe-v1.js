'use strict';
(function(root,factory){
  const api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.LBGGaKnsNovember2026SafeV1=api;
  if(root&&root.document)api.install();
})(typeof window!=='undefined'?window:globalThis,function(root){
  const VERSION='20261116.3-test';
  const WEEK_02='02T11',WEEK_09='09T11',WEEK_16='16T11';
  const LIMIT='2026-11-09';
  const KNS=[1,2,4,5,7,8,9,10,11,12,14,15,17,18,19,21,22,24,25,26,28,29,30,31,33,34];
  const afterNine=KNS.slice(KNS.indexOf(10));
  const txt=v=>String(v??'').trim();
  const normalizedWeek=v=>txt(v).toUpperCase().replace(/^0?(\d{1,2})T(\d{1,2})$/,(_,day,month)=>`${String(day).padStart(2,'0')}T${month}`);
  const dateMs=v=>v instanceof Date?v.getTime():Date.parse(v||'')||0;
  const membersOf=ev=>[...new Set((Array.isArray(ev?.members)?ev.members:[]).map(x=>txt(x).toUpperCase().replace(/\s+/g,'')).filter(Boolean))];
  const memberKey=(ev,member)=>[txt(ev?.locationKey),Number(ev?.grade),member].join('|');
  const isKns=ev=>txt(ev?.track).toLowerCase()==='kns';
  const inYear=ev=>/^2026-/.test(txt(ev?.dateKey));
  const fromAnchor=ev=>txt(ev?.dateKey)>=LIMIT;
  function nextUnlearned(learned){
    if(!(learned instanceof Set))return null;
    const earlier=KNS.filter(ga=>ga<10&&learned.has(ga));
    if(!earlier.length)return null;
    return KNS.slice(KNS.indexOf(earlier[0])).find(ga=>!learned.has(ga))??null;
  }
  function apply(history){
    if(!history||!Array.isArray(history.events))return history;
    if(history.__lbgGaKnsNovember2026===VERSION)return history;
    const state=new Map(),events=[...history.events].sort((a,b)=>dateMs(a.date)-dateMs(b.date)||Number(a.day)-Number(b.day)||Number(a.period)-Number(b.period));
    const stem09=new Map(),kns09=new Set();
    for(const ev of events){
      if(normalizedWeek(ev?.sheet)!==WEEK_09||!inYear(ev))continue;
      for(const member of membersOf(ev)){
        const key=memberKey(ev,member);
        if(isKns(ev))kns09.add(key);
        else if(txt(ev?.track).toLowerCase()==='stem'&&!stem09.has(key))
          stem09.set(key,{key,member,school:txt(ev.school),locationKey:txt(ev.locationKey)});
      }
    }
    const hasWeek16=events.some(ev=>normalizedWeek(ev?.sheet)===WEEK_16&&inYear(ev));
    const kns16=new Set(),ga10By16=new Set();
    for(const ev of events){
      if(!isKns(ev)||normalizedWeek(ev.sheet)!==WEEK_16||!inYear(ev))continue;
      for(const member of membersOf(ev))kns16.add(memberKey(ev,member));
    }
    const warnings=Array.isArray(history.warnings)?history.warnings:[];
    if(!Array.isArray(history.warnings))history.warnings=warnings;
    let changed=0,conflicts=0;
    for(const ev of events){
      if(!isKns(ev)||!inYear(ev))continue;
      const members=membersOf(ev),week=normalizedWeek(ev.sheet),is02=week===WEEK_02,is09=week===WEEK_09,after=fromAnchor(ev);
      if(!members.length)continue;
      const ga=Number(ev.ga),valid=ev.ga!==null&&ev.ga!==undefined&&
        txt(ev.ga)!==''&&Number.isFinite(ga)&&KNS.includes(ga),chosenBefore=valid?ga:null;
      let chosen=chosenBefore;
      const originalSource=txt(ev.gaSource);
      const available=members.map(m=>state.get(memberKey(ev,m))||null);
      const prevWeek=members.map((m,i)=>available[i]?.weeks?.get(week)).filter(v=>v!==undefined);
      if(is02&&valid&&ga===10){
        chosen=11;ev.gaSource='kns-nov-02-ga10-to-ga11';
      }else if(is09){
        // Tuần 09T11 học KNS = GA10; từ tuần sau bù GA chưa học.
        chosen=10;ev.gaSource='kns-nov-09-ga10-anchor';
      }else if(after&&!is09){
        const specialMembers=members.map(m=>{
          const key=memberKey(ev,m);return kns09.has(key)||stem09.has(key);
        });
        if(specialMembers.some(Boolean)&&!specialMembers.every(Boolean)){
          chosen=null;ev.gaSource='conflict';ev.historyMismatch=true;conflicts++;
          warnings.push(`Nhóm ${txt(ev.classDisplay)} tuần ${week} trộn lớp có/không học 09T11; phải đối chiếu từng lớp.`);
        }else if(specialMembers.every(Boolean)){
        const makeup=members.map((m,i)=>stem09.has(memberKey(ev,m))&&!available[i]?.learned?.has(10));
        const shouldMakeup=makeup.some(Boolean);
        if(shouldMakeup&&makeup.every(Boolean)){
          chosen=10;
          ev.gaSource=week===WEEK_16?'kns-nov-16-stem09-ga10-makeup':'kns-nov-stem09-delayed-ga10-makeup';
        }else if(shouldMakeup){
          chosen=null;ev.gaSource='conflict';ev.historyMismatch=true;conflicts++;
          warnings.push(`Nhóm lớp ${txt(ev.classDisplay)} tuần ${week} có lớp thiếu GA10 vì STEM 09T11; cần tách nhóm hoặc kiểm tra lại TKB.`);
        }else{
          const sameWeek=[...new Set(prevWeek.map(Number))];
          if(sameWeek.length===1){chosen=sameWeek[0];ev.gaSource='kns-nov-same-week';}
          else if(sameWeek.length>1){chosen=null;ev.gaSource='conflict';ev.historyMismatch=true;conflicts++;}
          else{
            const candidates=available.map(s=>s?.learned?.has(10)?nextUnlearned(s.learned):null);
            const withBasis=candidates.filter(x=>x!==null);
            if(withBasis.length&&withBasis.length===members.length&&new Set(withBasis).size===1){
              chosen=withBasis[0];ev.gaSource='kns-nov-per-class-catchup';
            }else{
              chosen=null;ev.gaSource='conflict';ev.historyMismatch=true;conflicts++;
              warnings.push(`Thiếu lịch sử hoặc các lớp trong nhóm ${txt(ev.classDisplay)} không có chung GA còn thiếu tại ${txt(ev.school)} tuần ${week}; cần xác nhận thực dạy.`);
            }
          }
        }
        }
      }
      if(originalSource==='manual'&&valid){
        if(chosen!==null&&chosen!==ga){
          ev.__lbgGaNeedsConfirmation={expected:chosen,stored:ga,week,classDisplay:txt(ev.classDisplay)};
          ev.historyMismatch=true;
          warnings.push(`GA đã lưu ${ga} khác GA dự kiến ${chosen} tại ${txt(ev.school)} – ${txt(ev.classDisplay)} tuần ${week}; không tự ghi đè.`);
        }
        chosen=ga;ev.gaSource='manual';
      }else if(originalSource==='conflict'){
        chosen=null;ev.gaSource='conflict';ev.historyMismatch=true;
      }
      if(chosen!==null&&(!valid||chosen!==ga))changed++;
      if(chosen!==null||ev.gaSource==='conflict')ev.ga=chosen;
      if(chosen!==null){
        if(chosen===10&&(is09||week===WEEK_16))for(const m of members)ga10By16.add(memberKey(ev,m));
        for(const m of members){
          const key=memberKey(ev,m),prev=state.get(key)||{learned:new Set(),seenNineOrLater:false,weeks:new Map()};
          prev.learned.add(chosen);if(chosen>=9)prev.seenNineOrLater=true;
          prev.weeks.set(week,chosen);state.set(key,prev);
        }
      }
    }
    const missing16=[],unresolved16=[];
    if(hasWeek16){
      for(const [key,meta] of stem09){
        if(ga10By16.has(key))continue;
        if(!kns16.has(key)){
          missing16.push(meta);
          warnings.push(`Lớp ${meta.member} tại ${meta.school||meta.locationKey}: tuần 09T11 học STEM, tuần 16T11 không có tiết KNS để bố trí GA10. Cần rà lại TKB.`);
        }else{
          unresolved16.push(meta);
          warnings.push(`Lớp ${meta.member} tại ${meta.school||meta.locationKey}: tuần 16T11 có tiết KNS nhưng GA10 chưa được gán chắc chắn, cần kiểm tra nhóm gộp/lịch sử.`);
        }
      }
    }
    history.__lbgGaKnsNovember2026=VERSION;
    history.__lbgGaKnsNovemberStats={changed,conflicts,stem09Classes:stem09.size,missingKns16:missing16,unresolvedGa10At16:unresolved16};
    return history;
  }
  function wrapBuildHistory(original){
    if(typeof original!=='function')return null;
    const wrapped=function(...args){return apply(original.apply(this,args))};
    wrapped.__lbgGaKnsNovember2026=VERSION;wrapped.__lbgOriginalBuildHistory=original;
    return wrapped;
  }
  function installOnce(){
    const base=root.LBGGaSuggestionV7;
    if(!base||typeof base.buildHistory!=='function')return false;
    if(base.buildHistory.__lbgGaKnsNovember2026===VERSION)return true;
    base.buildHistory=wrapBuildHistory(base.buildHistory);return true;
  }
  function install(){let tries=0;const tick=()=>{tries++;if(installOnce())return;if(tries<400)setTimeout(tick,50)};tick();return true}
  return{VERSION,WEEK_02,WEEK_09,WEEK_16,KNS,afterNine,normalizedWeek,nextUnlearned,apply,wrapBuildHistory,install};
});
