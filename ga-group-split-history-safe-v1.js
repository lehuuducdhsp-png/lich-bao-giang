'use strict';
(function(root,factory){
  const api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.LBGGaGroupSplitHistorySafeV1=api;
  if(root&&root.document)api.install();
})(typeof window!=='undefined'?window:globalThis,function(root){
  const VERSION='20260920.1';
  const KNS_SEQUENCE=[1,2,4,5,7,8,9,10,11,12,14,15,17,18,19,21,22,24,25,26,28,29,30,31,33,34];
  const STEM_SEQUENCE=[3,6,13,16,20,23,27,32,35];
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  const fold=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase().replace(/\s+/g,' ');
  const seqFor=track=>track==='stem'?STEM_SEQUENCE:KNS_SEQUENCE;
  const nextGa=(track,ga)=>{const seq=seqFor(track),i=seq.indexOf(Number(ga));return i<0?seq.find(x=>x>Number(ga))??seq[0]??null:seq[i+1]??null};
  const expectedFromState=(track,state,current)=>txt(state?.event?.sheet)===txt(current?.sheet)?Number(state?.ga):nextGa(track,state?.ga);
  const dayRank=s=>txt(s).toLowerCase().startsWith('sáng')?0:1;

  function wholeGradeFromText(value){
    const raw=fold(value);if(!raw)return null;
    let m=raw.match(/\bKHOI\s*([1-5])\b/);if(m)return Number(m[1]);
    // Một số TKB có thể ghi "LỚP 1 (4 LỚP)" thay vì "KHỐI 1 (4 LỚP)".
    m=raw.match(/\bLOP\s*([1-5])\s*\(\s*\d+\s*LOP\s*\)/);return m?Number(m[1]):null;
  }
  function isWholeGradeGroup(event){
    const grade=Number(event?.grade),groupGrade=wholeGradeFromText(event?.classDisplay||event?.classId);
    return Number.isFinite(grade)&&groupGrade===grade;
  }
  function specificMembers(event){
    const grade=Number(event?.grade),out=[];
    for(const raw of Array.isArray(event?.members)?event.members:[]){
      const m=txt(raw).match(/^([1-5])\s*\/\s*(\d+)$/);if(!m||Number(m[1])!==grade)continue;
      const key=`${Number(m[1])}/${Number(m[2])}`;if(!out.includes(key))out.push(key);
    }
    return out;
  }
  function scopeKey(event){return`${txt(event?.locationKey)}|${Number(event?.grade)}|${txt(event?.track)}`}
  function manualValues(event,sequence){
    let values=[];try{values=[...(event?.manualValues||[])]}catch{}
    return [...new Set(values.map(Number).filter(x=>Number.isFinite(x)&&sequence.includes(x)))];
  }
  function uniqueEvents(states){
    return [...new Map(states.filter(Boolean).map(x=>[x.event?.id||`${x.event?.dateKey}|${x.member}`,x.event])).values()].filter(Boolean);
  }
  function addWarning(history,text){
    if(!text)return;history.warnings=Array.isArray(history.warnings)?history.warnings:[];
    if(!history.warnings.includes(text))history.warnings.push(text);
  }

  function reconcileHistory(history){
    if(!history||!Array.isArray(history.events)||!history.events.length)return history;
    const events=[...history.events].sort((a,b)=>(a?.date-b?.date)||dayRank(a?.session)-dayRank(b?.session)||Number(a?.period||0)-Number(b?.period||0)||txt(a?.id).localeCompare(txt(b?.id)));
    const groupScopes=new Set(events.filter(isWholeGradeGroup).map(scopeKey));
    if(!groupScopes.size)return history;

    // Thu thập các lớp thành viên nhìn thấy trong toàn bộ lịch sử đến tuần đang chọn.
    // Việc này chỉ xác định tên lớp (1/1, 1/2...), không lấy GA từ tương lai.
    const knownByScope=new Map();
    for(const ev of events){
      const scope=scopeKey(ev);if(!groupScopes.has(scope))continue;
      const members=specificMembers(ev);if(!members.length)continue;
      if(!knownByScope.has(scope))knownByScope.set(scope,new Set());
      for(const member of members)knownByScope.get(scope).add(member);
    }

    const states=new Map(),gradeStates=new Map();
    for(const ev of events){
      const scope=scopeKey(ev);if(!groupScopes.has(scope))continue;
      const group=isWholeGradeGroup(ev),known=[...(knownByScope.get(scope)||[])],specific=specificMembers(ev);
      if(!group&&!specific.length)continue;
      const members=group?known:specific;
      const seq=seqFor(ev.track),manual=manualValues(ev,seq),prior=[];

      if(group){
        if(members.length){
          for(const member of members){const st=states.get(`${scope}|${member}`)||gradeStates.get(scope);if(st)prior.push(st)}
        }else{const st=gradeStates.get(scope);if(st)prior.push(st)}
      }else{
        for(const member of members){const st=states.get(`${scope}|${member}`)||gradeStates.get(scope);if(st)prior.push(st)}
      }

      ev.previousEvents=uniqueEvents(prior);
      ev.partialHistory=members.length>0&&new Set(prior.map(x=>x.member)).size<members.length;
      ev.historyMismatch=false;
      if(manual.length===1){ev.ga=manual[0];ev.gaSource='manual'}
      else if(manual.length>1){
        ev.ga=null;ev.gaSource='conflict';ev.historyMismatch=true;
        addWarning(history,`Mâu thuẫn GA đã nhập tại ${txt(ev.dateKey)}, ${txt(ev.school)}, ${txt(ev.classDisplay)}.`);
      }else if(!prior.length){
        ev.ga=seq[0]??null;ev.gaSource='first';
      }else{
        const candidates=prior.map(x=>expectedFromState(ev.track,x,ev)).filter(x=>x!==null&&Number.isFinite(Number(x))),uniq=[...new Set(candidates.map(Number))];
        const sameWeek=prior.length>0&&prior.every(x=>txt(x?.event?.sheet)===txt(ev.sheet));
        if(uniq.length===1){ev.ga=uniq[0];ev.gaSource=sameWeek?'same-week':'previous'}
        else{
          ev.ga=null;ev.gaSource='conflict';ev.historyMismatch=true;
          addWarning(history,`Lịch sử GA các lớp trong nhóm không đồng nhất tại ${txt(ev.dateKey)}, ${txt(ev.school)}.`);
        }
      }

      if(ev.ga===null||ev.ga===undefined)continue;
      if(group){
        const gradeState={member:`KHỐI ${Number(ev.grade)}`,ga:ev.ga,event:ev};gradeStates.set(scope,gradeState);
        // "KHỐI 1" là toàn bộ lớp 1: một lần học gộp cập nhật tiến trình của tất cả lớp 1 đã biết.
        for(const member of known)states.set(`${scope}|${member}`,{member,ga:ev.ga,event:ev});
        ev.__lbgWholeGradeHistory=true;
      }else{
        for(const member of members)states.set(`${scope}|${member}`,{member,ga:ev.ga,event:ev});
        if(prior.some(x=>x.event?.__lbgWholeGradeHistory))ev.__lbgInheritedFromWholeGrade=true;
      }
    }
    history.__lbgGroupSplitHistory=VERSION;
    return history;
  }

  function wrapBuildHistory(original){
    if(typeof original!=='function')return null;
    const wrapped=function(...args){return reconcileHistory(original.apply(this,args))};
    wrapped.__lbgGroupSplitHistory=VERSION;wrapped.__lbgOriginalBuildHistory=original;return wrapped;
  }

  function installOnce(){
    const v7=root.LBGGaSuggestionV7;if(!v7||typeof v7.buildHistory!=='function')return false;
    if(v7.buildHistory.__lbgGroupSplitHistory===VERSION)return true;
    const wrapped=wrapBuildHistory(v7.buildHistory);if(!wrapped)return false;
    v7.buildHistory=wrapped;return true;
  }
  function install(){let tries=0;const tick=()=>{tries++;if(installOnce())return;if(tries<400)setTimeout(tick,50)};tick();return true}

  return{VERSION,KNS_SEQUENCE,STEM_SEQUENCE,expectedFromState,wholeGradeFromText,isWholeGradeGroup,specificMembers,scopeKey,reconcileHistory,wrapBuildHistory,install};
});
