'use strict';
(function(root,factory){
  const api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.LBGTkbLocationBoundarySafeV1=api;
  if(root&&root.document)api.install();
})(typeof window!=='undefined'?window:globalThis,function(root){
  const VERSION='20261011.1';
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  const fold=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase().replace(/\s+/g,' ');
  const mergeCache=new WeakMap();

  function cellText(cell){
    try{
      const c=cell?.master||cell,t=txt(c?.text);if(t)return t;
      const v=c?.value;if(v==null)return'';
      if(typeof v==='string'||typeof v==='number'||typeof v==='boolean')return txt(v);
      if(Array.isArray(v?.richText))return txt(v.richText.map(x=>x?.text??'').join(''));
      if(v?.result!=null)return txt(v.result);
      if(typeof v?.text==='string')return txt(v.text);
    }catch{}
    return'';
  }
  function lettersCol(s){let n=0;for(const ch of String(s||''))n=n*26+ch.charCodeAt(0)-64;return n}
  function merges(ws){
    if(!ws)return[];
    if(mergeCache.has(ws))return mergeCache.get(ws);
    const out=[];
    for(const ref of ws?.model?.merges||[]){
      const m=String(ref).match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
      if(m)out.push({c1:lettersCol(m[1]),r1:Number(m[2]),c2:lettersCol(m[3]),r2:Number(m[4]),ref:String(ref)});
    }
    mergeCache.set(ws,out);return out;
  }
  function mergeFor(ws,row,col){return merges(ws).find(m=>Number(row)>=m.r1&&Number(row)<=m.r2&&Number(col)>=m.c1&&Number(col)<=m.c2)||null}
  function directSiteAt(ws,row){
    const r=Number(row);if(!ws?.getCell||!Number.isFinite(r)||r<1)return{direct:false,row:r,text:'',merge:null};
    const merge=mergeFor(ws,r,3);
    if(merge){
      const value=txt(cellText(ws.getCell(merge.r1,merge.c1)));
      return{direct:Boolean(value),row:r,text:value,merge,startRow:merge.r1,endRow:merge.r2};
    }
    const value=txt(cellText(ws.getCell(r,3)));
    return{direct:Boolean(value),row:r,text:value,merge:null,startRow:r,endRow:r};
  }
  function copyLocation(entry,loc,row,reason){
    return{
      ...entry,
      school:txt(loc?.schoolName||loc?.school),
      schoolName:txt(loc?.schoolName||loc?.school),
      schoolNote:txt(loc?.schoolNote),
      schoolKey:txt(loc?.schoolKey),
      siteRaw:txt(loc?.siteRaw),
      siteType:txt(loc?.siteType),
      siteName:txt(loc?.siteName),
      siteDisplay:txt(loc?.siteDisplay),
      siteKey:txt(loc?.siteKey),
      locationLabel:txt(loc?.locationLabel),
      locationKey:txt(loc?.locationKey),
      locationNotes:Array.isArray(loc?.notes)?loc.notes:[],
      locationOriginalKey:txt(entry?.locationKey),
      locationAnchorRow:Number(row)||null,
      locationBoundaryRepaired:true,
      locationRepairReason:reason
    };
  }
  function repairEntryLocation(ws,entry,parser){
    if(!ws||!entry||!parser?.locationAt)return entry;
    const row=Number(entry.row),classRow=Number(entry.classRow);
    if(!Number.isFinite(row)||!Number.isFinite(classRow)||row<=0||classRow<=0||classRow>=row)return entry;

    const classSite=directSiteAt(ws,classRow);
    // Nếu hàng lớp thật sự nằm trong ô cơ sở/điểm dạy thì giữ lớp làm mốc.
    // Đây là hàng rào bảo vệ ca QUANG TRUNG 1/8 đã sửa trước đây.
    if(classSite.direct)return entry;

    const teacherSite=directSiteAt(ws,row);
    if(!teacherSite.direct)return entry;

    let classLoc={},teacherLoc={};
    try{classLoc=parser.locationAt(ws,classRow)||{}}catch{}
    try{teacherLoc=parser.locationAt(ws,row)||{}}catch{}
    const oldKey=txt(entry.locationKey||classLoc.locationKey),newKey=txt(teacherLoc.locationKey);
    if(!newKey||newKey===oldKey)return entry;

    const oldSchool=fold(entry.schoolName||entry.school||classLoc.schoolName||classLoc.school);
    const newSchool=fold(teacherLoc.schoolName||teacherLoc.school);
    if(oldSchool&&newSchool&&oldSchool!==newSchool)return entry;

    // Chỉ sửa khi cơ sở mới bắt đầu SAU hàng lớp và phủ trực tiếp hàng GV.
    // Mẫu thực tế 25 Dạ Lê: hàng 4/2,4/1 nằm ngay trước vùng merge
    // "TRỤ SỞ CHÍNH - 25 DẠ LÊ"; hàng ĐỨC nằm trong vùng merge đó.
    const start=Number(teacherSite.startRow)||row;
    if(start<=classRow||start>row)return entry;
    return copyLocation(entry,teacherLoc,row,'class-row-before-direct-site-block');
  }
  function repairEntries(ws,entries,parser){return(entries||[]).map(e=>repairEntryLocation(ws,e,parser))}

  function installOnce(){
    const parser=root.LBGTkbParserV2;
    if(!parser?.scanAssignments||!parser.__lbgRosterGroupPeriodSafeV1)return false;
    if(parser.__lbgLocationBoundarySafeV1===VERSION)return true;
    const original=parser.scanAssignments.bind(parser);
    const wrapped=function(ws,onlyCode=''){return repairEntries(ws,original(ws,onlyCode)||[],parser)};
    wrapped.__lbgLocationBoundarySafeV1=VERSION;
    wrapped.__lbgOriginalScanAssignments=original;
    parser.scanAssignments=wrapped;
    parser.repairAssignmentLocationBoundary=(ws,e)=>repairEntryLocation(ws,e,parser);
    parser.__lbgLocationBoundarySafeV1=VERSION;
    try{root.document.dispatchEvent(new CustomEvent('lbg-tkb-location-boundary-safe-ready',{detail:{version:VERSION}}))}catch{}
    return true;
  }
  function install(){
    let tries=0;
    const tick=()=>{tries++;if(installOnce())return;if(tries<600)setTimeout(tick,50)};
    tick();root.document?.addEventListener?.('lbg-tkb-roster-group-period-ready',installOnce);
    return true;
  }
  return{VERSION,directSiteAt,repairEntryLocation,repairEntries,install};
});
