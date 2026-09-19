'use strict';
(function(root,factory){
  const api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.LBGTkbRosterGroupPeriodSafeV1=api;
  if(root&&root.document)api.install();
})(typeof window!=='undefined'?window:globalThis,function(root){
  const VERSION='20260919.1';
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
  function explicitGroupPeriod(value){
    const f=fold(value);
    const m=f.match(/\b(?:KHOI|LOP)\s*[1-5]\s*\(\s*\d+\s*LOP\s*\)\s*[-–—:]?\s*TIET\s*([1-5])\b/);
    return m?Number(m[1]):null;
  }

  function lettersCol(s){let n=0;for(const ch of String(s||''))n=n*26+ch.charCodeAt(0)-64;return n}
  function mergeRanges(ws){
    if(!ws)return[];
    if(mergeCache.has(ws))return mergeCache.get(ws);
    const out=[];
    for(const range of ws?.model?.merges||[]){
      const m=String(range).match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
      if(m)out.push({c1:lettersCol(m[1]),r1:Number(m[2]),c2:lettersCol(m[3]),r2:Number(m[4]),ref:String(range)});
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
  function sameLocation(parser,ws,rowA,rowB,knownKey=''){
    if(!parser?.locationAt)return true;
    try{
      const a=txt(knownKey)||txt(parser.locationAt(ws,rowA)?.locationKey);
      const b=txt(parser.locationAt(ws,rowB)?.locationKey);
      return !a||!b||a===b;
    }catch{return true}
  }
  function assignmentLike(parser,ws,value){
    const raw=txt(value).toUpperCase();if(!raw)return false;
    try{if(parser?.resolveTeacherCode?.(ws,raw))return true}catch{}
    const m=raw.match(/^(.+?)(P|\+)$/);
    if(m){try{if(parser?.resolveTeacherCode?.(ws,m[1]))return true}catch{}}
    return false;
  }
  function classMetaOf(parser,value){
    try{return parser?.classMeta?.(value)||null}catch{return null}
  }
  function clearPathToGroup(parser,ws,anchorRow,row,col){
    for(let r=Number(anchorRow)+1;r<Number(row);r++){
      const value=txt(cellText(masterCell(ws,r,col))).replace(/\s+/g,' ').trim();
      if(!value)continue;
      if(assignmentLike(parser,ws,value))continue;
      const meta=classMetaOf(parser,value);
      if(meta&&txt(meta.classType).toLowerCase()!=='unknown')return false;
      return false;
    }
    return true;
  }
  function explicitGroupAnchorAt(ws,row,col,parser=null,locationKey=''){
    if(!ws?.getCell)return null;
    const origin=Number(row),column=Number(col),first=Math.max(1,origin-4);
    for(let r=origin-1;r>=first;r--){
      if(!sameLocation(parser,ws,origin,r,locationKey))continue;
      const merge=mergeFor(ws,r,column),cell=masterCell(ws,r,column),value=txt(cellText(cell)).replace(/\s+/g,' ').trim();
      if(!value)continue;
      const period=explicitGroupPeriod(value),meta=classMetaOf(parser,value);
      const combined=meta&&txt(meta.classType).toLowerCase()==='combined';
      if(!period||!combined)continue;
      if(merge&&(column<merge.c1||column>merge.c2))continue;
      if(!clearPathToGroup(parser,ws,r,origin,column))continue;
      return{row:r,col:column,period,sourceText:value,merge,meta,locationKey:txt(locationKey)};
    }
    return null;
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
  function applyGroupContinuation(entry,anchor){
    if(!entry||typeof entry!=='object'||!anchor?.meta)return entry;
    const currentType=txt(entry.classType).toLowerCase();
    if(currentType&&currentType!=='unknown')return entry;
    const meta=anchor.meta,slot=Number(entry.slotPeriod??entry.period)||null;
    return{
      ...entry,
      className:txt(meta.classDisplay||meta.classRaw),
      classRaw:txt(meta.classRaw||anchor.sourceText),
      classType:txt(meta.classType)||'combined',
      classCount:Number(meta.classCount)||1,
      groupNote:txt(meta.groupNote)||`TIẾT ${anchor.period}`,
      slotPeriod:slot,
      teachingPeriod:Number(anchor.period),
      groupContinuation:true,
      groupContinuationSource:txt(anchor.sourceText),
      groupContinuationRow:Number(anchor.row)||null,
      groupContinuationMerge:txt(anchor.merge?.ref)
    };
  }
  function normalizeEntry(ws,entry,parser=null){
    const locKey=txt(entry?.locationKey),anchor=explicitGroupAnchorAt(ws,entry?.row,entry?.col,parser,locKey);
    const repaired=applyGroupContinuation(entry,anchor);
    const resolver=parser?.locationAt?(w,r)=>parser.locationAt(w,r):null;
    return applyHint(repaired,periodHintAt(ws,repaired?.row,repaired?.col,resolver,repaired?.locationKey));
  }

  function scanPlusGroupedAssignments(ws,onlyCode='',parser=null){
    if(!ws||!parser?.timetableColumns||!parser?.colInfoFor||!parser?.resolveTeacherCode)return[];
    const want=txt(onlyCode).toUpperCase(),out=[],start=Math.max(1,Number(parser.buildHeader?.(ws)?.headerRow||4)+1);
    const summary=parser.teacherSummary?.(ws),nameFor=code=>txt(summary?.byCode?.get?.(code)?.name||code);
    for(const col of parser.timetableColumns(ws)||[]){
      const info=parser.colInfoFor(ws,col);if(!info)continue;
      for(let row=start;row<=Number(ws.rowCount||0);row++){
        const raw=txt(cellText(ws.getCell(row,col))).toUpperCase(),m=raw.match(/^(.+?)\+$/);if(!m)continue;
        let resolved=null;try{resolved=parser.resolveTeacherCode(ws,m[1])}catch{}
        const code=txt(resolved?.code).toUpperCase();if(!code||(want&&code!==want))continue;
        let loc={};try{loc=parser.locationAt?.(ws,row)||{}}catch{}
        const anchor=explicitGroupAnchorAt(ws,row,col,parser,txt(loc?.locationKey));if(!anchor)continue;
        const meta=anchor.meta,slot=Number(info.period)||null;
        out.push({
          day:Number(info.day),session:txt(info.session),period:slot,slotPeriod:slot,teachingPeriod:Number(anchor.period),
          school:txt(loc.schoolName||loc.school),schoolName:txt(loc.schoolName||loc.school),schoolNote:txt(loc.schoolNote),
          siteRaw:txt(loc.siteRaw),siteType:txt(loc.siteType),siteName:txt(loc.siteName),siteDisplay:txt(loc.siteDisplay),
          locationLabel:txt(loc.locationLabel),locationKey:txt(loc.locationKey),locationNotes:Array.isArray(loc.notes)?loc.notes:[],
          className:txt(meta.classDisplay||meta.classRaw),classRaw:txt(meta.classRaw||anchor.sourceText),classType:txt(meta.classType)||'combined',
          classCount:Number(meta.classCount)||1,groupNote:txt(meta.groupNote)||`TIẾT ${anchor.period}`,
          code,sourceCode:raw,resolution:'grouped-plus',teacherName:nameFor(code),address:ws.getCell(row,col).address,row,col,
          isPlus:true,reportOnlyPlus:true,payUnits:0,payEligible:false,makeUp:false,
          groupContinuation:true,groupContinuationSource:txt(anchor.sourceText),groupContinuationRow:Number(anchor.row)||null,groupContinuationMerge:txt(anchor.merge?.ref),
          atomicKey:ws.getCell(row,col).address
        });
      }
    }
    return out.sort((a,b)=>a.day-b.day||((a.session==='Sáng'?0:1)-(b.session==='Sáng'?0:1))||a.teachingPeriod-b.teachingPeriod||a.row-b.row||a.col-b.col);
  }

  if(typeof module==='object'&&module.exports){
    return{VERSION,periodHintFromText,explicitGroupPeriod,periodHintAt,explicitGroupAnchorAt,applyHint,applyGroupContinuation,normalizeEntry};
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
    parser.explicitGroupAnchorAt=(ws,row,col)=>explicitGroupAnchorAt(ws,row,col,parser,txt(parser.locationAt?.(ws,row)?.locationKey));
    parser.scanPlusGroupedAssignments=(ws,onlyCode='')=>scanPlusGroupedAssignments(ws,onlyCode,parser);
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
  return{VERSION,periodHintFromText,explicitGroupPeriod,periodHintAt,explicitGroupAnchorAt,applyHint,applyGroupContinuation,normalizeEntry,scanPlusGroupedAssignments,install};
});
