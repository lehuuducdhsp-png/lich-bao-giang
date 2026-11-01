'use strict';
(function(root,factory){
  const api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.LBGGaKnsNovember2026SafeV1=api;
  if(root&&root.document)api.install();
})(typeof window!=='undefined'?window:globalThis,function(root){
  const VERSION='20261101.2-test';
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
  function nextUnlearned(learned){for(const ga of afterNine){if(!learned.has(ga))return ga}return null}
  function apply(history){
    if(!history||!Array.isArray(history.events))return history;
    if(history.__lbgGaKnsNovember2026===VERSION)return history;
    // Chỉ cập nhật lịch sử tính toán; tuyệt đối không ghi dữ liệu vào TKB,
    // localStorage, Supabase hoặc các ô GA đã nhập tay.
    const state=new Map(),events=[...history.events].sort((a,b)=>dateMs(a.date)-dateMs(b.date)||Number(a.day)-Number(b.day)||Number(a.period)-Number(b.period));
    // Cần biết đúng lớp nào học STEM tuần 09T11 trước khi tính tiến độ KNS.
    // Khóa bao gồm trường/phân hiệu + khối + lớp, tránh đẩy GA10 của cơ sở khác.
    const stem09=new Map();
    for(const ev of events){
      if(normalizedWeek(ev?.sheet)!==WEEK_09||txt(ev?.track).toLowerCase()!=='stem'||!inYear(ev))continue;
      for(const member of membersOf(ev)){
        const key=memberKey(ev,member);
        if(!stem09.has(key))stem09.set(key,{key,member,school:txt(ev.school),locationKey:txt(ev.locationKey)});
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
      let ga=Number(ev.ga),valid=Number.isFinite(ga)&&KNS.includes(ga),chosen=valid?ga:null;
      const available=members.map(m=>state.get(memberKey(ev,m))||null);
      const prevWeek=members.map((m,i)=>available[i]?.weeks?.get(week)).filter(v=>v!==undefined);
      if(is02&&valid&&ga===10){
        // Tuần 02T11: chỉ những lớp vốn được gợi ý GA10 mới chuyển sang GA11.
        chosen=11;ev.gaSource='kns-nov-02-ga10-to-ga11';
      }else if(is09){
        // Tuần 09T11 là mốc chung GA10 KNS cho những lớp thực sự có lịch học.
        chosen=10;ev.gaSource='kns-nov-09-ga10-anchor';
      }else if(after&&!is09){
        // Lớp học STEM 09T11 và chưa học GA10 KNS sẽ phải bù ở 16T11,
        // nếu 16T11 có KNS. Nếu chưa có KNS, giữ quyền bù ở buổi KNS sau.
        const makeup=members.map((m,i)=>stem09.has(memberKey(ev,m))&&!available[i]?.learned?.has(10));
        const shouldMakeup=makeup.some(Boolean);
        if(shouldMakeup&&makeup.every(Boolean)){
          chosen=10;
          ev.gaSource=week===WEEK_16?'kns-nov-16-stem09-ga10-makeup':'kns-nov-stem09-delayed-ga10-makeup';
        }else if(shouldMakeup){
          // Nhóm gộp có lớp đã học GA10 và lớp chưa học: phải xử lý riêng.
          chosen=null;ev.gaSource='conflict';ev.historyMismatch=true;conflicts++;
          warnings.push(`Nhóm lớp ${txt(ev.classDisplay)} tuần ${week} có lớp thiếu GA10 vì STEM 09T11; cần tách nhóm hoặc kiểm tra lại TKB.`);
        }else{
          // Các lượt cùng lớp trong một tuần giữ chung GA.
          const sameWeek=[...new Set(prevWeek.map(Number))];
          if(sameWeek.length===1){chosen=sameWeek[0];ev.gaSource='kns-nov-same-week';}
          else if(sameWeek.length>1){chosen=null;ev.gaSource='conflict';ev.historyMismatch=true;conflicts++;}
          else{
            // Bù bài chưa học dựa trên lịch sử từng lớp và phân hiệu.
            const candidates=available.map(s=>s&&(s.seenNineOrLater||s.learned.size)?nextUnlearned(s.learned):null);
            const withBasis=candidates.filter(x=>x!==null);
            if(withBasis.length&&withBasis.length===members.length&&new Set(withBasis).size===1){
              chosen=withBasis[0];ev.gaSource='kns-nov-per-class-catchup';
            }else if(new Set(withBasis).size>1){
              chosen=null;ev.gaSource='conflict';ev.historyMismatch=true;conflicts++;
              warnings.push(`Chưa thống nhất được GA KNS bù cho nhóm lớp ${txt(ev.classDisplay)} tuần ${week}.`);
            }
          }
        }
      }
      if(chosen!==null&&(!valid||chosen!==ga))changed++;
      if(chosen!==null||ev.gaSource==='conflict')ev.ga=chosen;
      if(chosen!==null){
        if(chosen===10&&(is09||week===WEEK_16))for(const m of members)ga10By16.add(memberKey(ev,m));
        for(const m of members){
          const key=memberKey(ev,m),prev=state.get(key)||{learned:new Set(),seenNineOrLater:false,weeks:new Map()};
          prev.learned.add(chosen);if(chosen>=9)prev.seenNineOrLater=true;
          // Dùng cùng một bài nếu lớp được dạy nhiều lần trong tuần.
          prev.weeks.set(week,chosen);state.set(key,prev);
        }
      }
    }
    const missing16=[],unresolved16=[];
    if(hasWeek16){
      // Kiểm tra NGAY mốc 16T11, không tính GA10 học bù muộn ở 23T11
      // như đã hoàn tất đúng hạn ở 16T11.
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
