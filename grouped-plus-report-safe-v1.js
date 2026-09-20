'use strict';
(function(root,factory){
  const api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.LBGGroupedPlusReportSafeV1=api;
  if(root&&root.document)api.install();
})(typeof window!=='undefined'?window:globalThis,function(root){
  const VERSION='20260919.1';
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  const dayRank=s=>txt(s).toLowerCase().startsWith('sáng')?0:1;

  function mergeReportPlus(report,plusRows){
    if(!report||typeof report!=='object'||!Array.isArray(report.entries))return report;
    const total=report.total,atomicTotal=report.atomicTotal,payTotal=report.payTotal;
    const seen=new Set(report.entries.map(e=>txt(e?.address)).filter(Boolean)),added=[];
    for(const e of Array.isArray(plusRows)?plusRows:[]){
      const address=txt(e?.address);if(!address||seen.has(address))continue;
      seen.add(address);report.entries.push(e);added.push(e);
    }
    if(added.length){
      report.entries.sort((a,b)=>Number(a?.day)-Number(b?.day)||dayRank(a?.session)-dayRank(b?.session)||Number(a?.teachingPeriod??a?.period)-Number(b?.teachingPeriod??b?.period)||Number(a?.row)-Number(b?.row)||Number(a?.col)-Number(b?.col));
      report.__lbgGroupedPlusEntries=added.map(e=>txt(e.address));
      report.groupedPlusCount=added.length;
    }
    // Cộng 1 vẫn do report-pay-rules.scanPlus tính riêng. Không được làm tăng tổng chính.
    if(total!==undefined)report.total=total;
    if(atomicTotal!==undefined)report.atomicTotal=atomicTotal;
    if(payTotal!==undefined)report.payTotal=payTotal;
    return report;
  }

  function sameEvent(ev,plus,v7,opts={},ws=null){
    if(!ev||!plus)return false;
    const period=Number(plus?.teachingPeriod??plus?.period),loc=txt(plus?.locationKey);
    if(txt(ev.sheet)!==txt(ws?.name)||Number(ev.day)!==Number(plus.day)||txt(ev.session)!==txt(plus.session)||Number(ev.period)!==period||txt(ev.locationKey)!==loc)return false;
    const classId=v7?.normalizeClass?.(plus.classRaw||plus.className)||'';
    if(classId&&txt(ev.classId)!==txt(classId))return false;
    let role='KNS';try{role=opts.roleResolver?.(ws,plus.code,plus)||'KNS'}catch{}
    const track=v7?.roleTrack?.(role)?.track||'kns';
    return txt(ev.track)===txt(track);
  }

  function attachPlusToHistory(history,worksheets,parser,v7,opts={}){
    if(!history||!Array.isArray(history.events)||!history.byAddress||!parser?.scanPlusGroupedAssignments)return history;
    let attached=0;
    for(const ws of Array.isArray(worksheets)?worksheets:[]){
      let rows=[];try{rows=parser.scanPlusGroupedAssignments(ws)||[]}catch{rows=[]}
      for(const plus of rows){
        const ev=history.events.find(item=>sameEvent(item,plus,v7,opts,ws));if(!ev)continue;
        const address=txt(plus.address),key=`${txt(ws?.name)}!${address}`;
        if(address){
          ev.addresses=Array.isArray(ev.addresses)?ev.addresses:[];
          if(!ev.addresses.includes(address))ev.addresses.push(address);
          history.byAddress.set(key,ev);
        }
        ev.atoms=Array.isArray(ev.atoms)?ev.atoms:[];
        if(!ev.atoms.some(x=>txt(x?.address)===address))ev.atoms.push(plus);
        ev.participants=Array.isArray(ev.participants)?ev.participants:[];
        if(!ev.participants.some(x=>txt(x?.code).toUpperCase()===txt(plus.code).toUpperCase())){
          let role='KNS';try{role=opts.roleResolver?.(ws,plus.code,plus)||'KNS'}catch{}
          const rt=v7?.roleTrack?.(role)||{role:'KNS',label:'KNS'};
          ev.participants.push({code:txt(plus.code),name:txt(plus.teacherName||plus.code),role:rt.role||'KNS',label:rt.label||'KNS',plus:true});
        }
        ev.__lbgGroupedPlus=true;attached++;
      }
    }
    history.__lbgGroupedPlusAttached=attached;
    return history;
  }

  function wrapHistory(original,v7,parserProvider){
    if(typeof original!=='function')return null;
    const wrapped=function(book,selectedSheet,opts={}){
      const history=original.call(this,book,selectedSheet,opts);
      const parser=opts.parser||parserProvider?.();
      return attachPlusToHistory(history,book?.worksheets||[],parser,v7,opts);
    };
    wrapped.__lbgGroupedPlusReportSafe=VERSION;wrapped.__lbgOriginalBuildHistory=original;return wrapped;
  }

  if(typeof module==='object'&&module.exports){
    return{VERSION,mergeReportPlus,sameEvent,attachPlusToHistory,wrapHistory};
  }

  let analyzeWrapped=null,historyWrapped=null,readyNotified=false;
  const parser=()=>root.LBGTkbParserV2||null;
  const v7=()=>root.LBGGaSuggestionV7||null;

  function decorateAnalyzeResult(report,ws,code){
    const p=parser();if(!p?.scanPlusGroupedAssignments||!report)return report;
    let plus=[];try{plus=p.scanPlusGroupedAssignments(ws,code)||[]}catch(error){console.warn('LBG grouped plus:',error)}
    return mergeReportPlus(report,plus);
  }
  function wrapAnalyze(){
    const current=root.analyzeNow;if(typeof current!=='function')return false;
    if(current.__lbgGroupedPlusReportSafe===VERSION){analyzeWrapped=current;return true}
    const wrapped=function(ws,code,...rest){
      const out=current.call(this,ws,code,...rest);
      return out&&typeof out.then==='function'?out.then(report=>decorateAnalyzeResult(report,ws,code)):decorateAnalyzeResult(out,ws,code);
    };
    wrapped.__lbgGroupedPlusReportSafe=VERSION;wrapped.__lbgOriginalAnalyze=current;
    root.analyzeNow=wrapped;analyzeWrapped=wrapped;return true;
  }
  function wrapHistoryNow(){
    const base=v7(),p=parser();if(!base?.buildHistory||!p?.scanPlusGroupedAssignments)return false;
    if(base.buildHistory.__lbgGroupedPlusReportSafe===VERSION){historyWrapped=base.buildHistory;return true}
    const wrapped=wrapHistory(base.buildHistory,base,parser);if(!wrapped)return false;
    base.buildHistory=wrapped;historyWrapped=wrapped;return true;
  }
  function installOnce(){
    const a=wrapAnalyze(),h=wrapHistoryNow();
    if(a&&h&&!readyNotified){
      readyNotified=true;try{root.document.dispatchEvent(new CustomEvent('lbg-grouped-plus-report-ready',{detail:{version:VERSION}}))}catch{}
    }
    return a&&h;
  }
  function install(){
    let tries=0;const tick=()=>{tries++;if(installOnce())return;if(tries<600)setTimeout(tick,50)};tick();
    root.document.addEventListener('lbg-tkb-roster-group-period-ready',installOnce);
    root.document.addEventListener('lbg-runtime-ready',installOnce);
    return true;
  }
  return{VERSION,mergeReportPlus,sameEvent,attachPlusToHistory,wrapHistory,install};
});
