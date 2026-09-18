'use strict';
(function(root,factory){
  const api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.LBGTkbRosterGroupPeriodSafeV1=api;
  if(root&&root.document)api.install();
})(typeof window!=='undefined'?window:globalThis,function(root){
  const VERSION='20260918.1';
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  const fold=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase().replace(/\s+/g,' ');
  const mergeCache=new WeakMap();

  function periodHintFromText(value){
    const f=fold(value);
    let m=f.match(/\bKHOI\s*[1-5]\s*[-–—:]?\s*DAY\s*(?:TRONG\s*LOP\s*)?TIET\s*([1-5])\b/);
    if(m)return Number(m[1]);
    m=f.match(/\bMOI\s*NGUOI\s*1\s*LOP\b.*\bDAY\s*(?:TRONG\s*LOP\s*)?TIET\s*([1-5])\b/);
    return m?Number(m[1]):null;
  }

  function lettersCol(s){let n=0;for(const ch of String(s||''))n=n*26+ch.charCodeAt(0)-64;return n}
  function mergeRanges(ws){
    if(!ws)return[];
    if(mergeCache.has(ws))return mergeCache.get(ws);
    const out=[];
    for(const range of ws?.model?.merges||[]){
      const m=String(range).match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
      if(m)out.push({c1:lettersCol(m[1]),r1:Number(m[2]),c2:lettersCol(m[3]),r2:Number(m[4])});
    }
    mergeCache.set(ws,out);return out;
  }
  function mergeFor(ws,row,col){for(const m of mergeRanges(ws))if(Number(row)>=m.r1&&Number(row)<=m.r2&&Number(col)>=m.c1&&Number(col)<=m.c2)return m;return null}
  function cellText(cell){
    try{
      const t=txt(cell?.text);if(t)return t;
      const v=cell?.value;if(v==null)return'';
      if(typeof v==='string'||typeof v==='number'||typeof v==='boolean')return txt(v);
      if(Array.isArray(v?.richText))return txt(v.richText.map(x=>x?.text??'').join(''));
      if(v?.result!=null)return txt(v.result);
      if(typeof v?.text==='string')return txt(v.text);
    }catch{}
    return'';
  }
  function masterCell(ws,row,col){
    const m=mergeFor(ws,row,col);
    return m?ws.getCell(m.r1,m.c1):ws.getCell(row,col);
  }
  function periodHintAt(ws,row,col,locationResolver=null,originLocationKey=''){
    if(!ws?.getCell||!Number.isFinite(Number(row))||!Number.isFinite(Number(col)))return null;
    const origin=Number(row),first=Math.max(1,origin-6),last=Math.min(Number(ws.rowCount||origin+2),origin+2);
    let baseKey=txt(originLocationKey);
    if(!baseKey&&typeof locationResolver==='function'){
      try{baseKey=txt(locationResolver(ws,origin)?.locationKey)}catch{}
    }
    for(let r=first;r<=last;r++){
      if(baseKey&&typeof locationResolver==='function'){
        let rowKey='';try{rowKey=txt(locationResolver(ws,r)?.locationKey)}catch{}
        if(rowKey&&rowKey!==baseKey)continue;
      }
      const value=cellText(masterCell(ws,r,Number(col))),period=periodHintFromText(value);
      if(period)return{period,row:r,col:Number(col),sourceText:value,locationKey:baseKey};
    }
    return null;
  }
  function applyHint(entry,hint){
    if(!entry||typeof entry!=='object'||!hint||!Number.isFinite(Number(hint.period)))return entry;
    if(txt(entry.classType).toLowerCase()!=='single')return entry;
    const slot=Number(entry.slotPeriod??entry.period)||null,period=Number(hint.period);
    return{...entry,slotPeriod:slot,teachingPeriod:period,rosterTeachingPeriod:period,rosterTeachingPeriodSource:txt(hint.sourceText),rosterTeachingPeriodRow:Number(hint.row)||null};
  }
  function normalizeEntry(ws,entry,parser=null){
    const resolver=parser?.locationAt?(w,r)=>parser.locationAt(w,r):null;
    return applyHint(entry,periodHintAt(ws,entry?.row,entry?.col,resolver,entry?.locationKey));
  }

  if(typeof module==='object'&&module.exports){
    return{VERSION,periodHintFromText,periodHintAt,applyHint,normalizeEntry};
  }

  function installOnce(){
    const parser=root.LBGTkbParserV2;
    if(!parser?.scanAssignments||!parser.__lbgAtomicTeachingV1||!parser.__lbgClassTypoFixV1)return false;
    if(parser.__lbgRosterGroupPeriodSafeV1===VERSION)return true;
    const original=parser.scanAssignments.bind(parser);
    const wrapped=function(ws,onlyCode=''){return(original(ws,onlyCode)||[]).map(entry=>normalizeEntry(ws,entry,parser))};
    wrapped.__lbgRosterGroupPeriodSafeV1=VERSION;
    wrapped.__lbgOriginalScanAssignments=original;
    parser.scanAssignments=wrapped;
    parser.rosterTeachingPeriodHintAt=(ws,row,col)=>{
      const resolver=parser.locationAt?(w,r)=>parser.locationAt(w,r):null;
      return periodHintAt(ws,row,col,resolver);
    };
    parser.rosterTeachingPeriodAt=(ws,row,col)=>parser.rosterTeachingPeriodHintAt(ws,row,col)?.period||null;
    parser.__lbgRosterGroupPeriodSafeV1=VERSION;
    try{root.document.dispatchEvent(new CustomEvent('lbg-tkb-roster-group-period-ready',{detail:{version:VERSION}}))}catch{}
    return true;
  }
  function install(){
    let tries=0;
    const tick=()=>{tries++;if(installOnce())return;if(tries<600)setTimeout(tick,50)};
    tick();
    root.document.addEventListener('lbg-atomic-teaching-v1-ready',installOnce);
    root.document.addEventListener('lbg-runtime-ready',installOnce);
    return true;
  }
  return{VERSION,periodHintFromText,periodHintAt,applyHint,normalizeEntry,install};
});
