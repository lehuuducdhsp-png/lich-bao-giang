'use strict';
(function(){
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  const mergeCache=new WeakMap();
  const parser=()=>window.LBGTkbParserV2;
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
  function lettersCol(s){let n=0;for(const ch of String(s||''))n=n*26+ch.charCodeAt(0)-64;return n}
  function mergeRanges(ws){
    if(mergeCache.has(ws))return mergeCache.get(ws);
    const out=[];
    for(const range of ws?.model?.merges||[]){
      const m=String(range).match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
      if(m)out.push({c1:lettersCol(m[1]),r1:Number(m[2]),c2:lettersCol(m[3]),r2:Number(m[4])});
    }
    mergeCache.set(ws,out);return out;
  }
  function masterText(ws,row,col){
    for(const m of mergeRanges(ws))if(row>=m.r1&&row<=m.r2&&col>=m.c1&&col<=m.c2)return cellText(ws.getCell(m.r1,m.c1));
    return cellText(ws.getCell(row,col));
  }
  function explicitPeriod(meta,slot){
    const m=txt(meta?.groupNote||meta?.classRaw).match(/(?:^|[-–—\s])TI[ẾE]T\s*([1-5])(?:\s|$)/i);
    return m?Number(m[1]):Number(slot)||null;
  }
  function classAt(ws,row,col,base){
    const p=parser();if(!p)return{classRaw:'',classDisplay:'',classType:'unknown',classCount:1,groupNote:''};
    const header=Math.max(1,Number(p.buildHeader?.(ws)?.headerRow||4)+1);
    const floor=Math.max(header,row-10),target=txt(base).toUpperCase(),stop=new Set([target,target+'P',target+'+']);
    let fallback='';
    for(let r=row-1;r>=floor;r--){
      const value=txt(masterText(ws,r,col)).replace(/\s+/g,' ').trim();if(!value)continue;
      const upper=value.toUpperCase();
      if(stop.has(upper)||p.resolveTeacherCode?.(ws,upper)||(/[P+]$/.test(upper)&&p.resolveTeacherCode?.(ws,upper.slice(0,-1))))break;
      if(/^(SÁNG|CHIỀU|TIẾT|THỨ|TÊN GV|TÊN GIÁO VIÊN|BUỔI|TRƯỜNG|PHÂN HIỆU|ĐIỂM TRƯỜNG|CƠ SỞ)$/i.test(value))continue;
      if(/^(GHI\s*CHÚ|CÓ\s*DI\s*CHUYỂN|DI\s*CHUYỂN\b)/i.test(value))continue;
      const meta=p.classMeta?.(value);
      if(meta&&meta.classType!=='unknown')return meta;
      if(!fallback&&value.length<=100)fallback=value;
    }
    return p.classMeta?.(fallback)||{classRaw:fallback,classDisplay:fallback,classType:'unknown',classCount:1,groupNote:''};
  }
  function scanAssist(ws,teacherCode,options={}){
    const p=parser(),base=txt(teacherCode).toUpperCase();if(!ws||!p||!base)return[];
    const target=`${base}P`,allowed=new Set((options.allowedDays||[]).map(Number).filter(Number.isFinite));
    const out=[],start=Math.max(1,Number(p.buildHeader?.(ws)?.headerRow||4)+1);
    for(const col of p.timetableColumns?.(ws)||[]){
      const info=p.colInfoFor?.(ws,col);if(!info)continue;
      if(allowed.size&&!allowed.has(Number(info.day)))continue;
      for(let row=start;row<=Number(ws.rowCount||0);row++){
        const cell=ws.getCell(row,col);if(cellText(cell).toUpperCase()!==target)continue;
        if(cell.isMerged&&cell.master?.address!==cell.address)continue;
        if(p.resolveTeacherCode?.(ws,target))continue; // An exact teacher code takes precedence over a suffix.
        const loc=p.locationAt?.(ws,row)||{},meta=classAt(ws,row,col,base),slot=Number(info.period)||null;
        const teachingPeriod=explicitPeriod(meta,slot);
        out.push({
          ...info,period:slot,slotPeriod:slot,teachingPeriod,
          school:txt(loc.schoolName),schoolName:txt(loc.schoolName),schoolNote:txt(loc.schoolNote),
          siteRaw:txt(loc.siteRaw),siteType:txt(loc.siteType),siteName:txt(loc.siteName),siteDisplay:txt(loc.siteDisplay),
          locationLabel:txt(loc.locationLabel),locationKey:txt(loc.locationKey),locationNotes:[...(loc.notes||loc.locationNotes||[])],
          className:txt(meta.classDisplay||meta.classRaw),classRaw:txt(meta.classRaw||meta.classDisplay),classType:txt(meta.classType)||'unknown',classCount:Number(meta.classCount)||1,groupNote:txt(meta.groupNote),
          sourceCode:target,code:base,address:cell.address,row,col,isAssist:true,assignmentType:'assist',payEligible:false
        });
      }
    }
    out.sort((a,b)=>Number(a.day)-Number(b.day)||((a.session==='Sáng'?0:1)-(b.session==='Sáng'?0:1))||Number(a.teachingPeriod||a.period)-Number(b.teachingPeriod||b.period)||Number(a.row)-Number(b.row)||Number(a.col)-Number(b.col));
    return out;
  }
  function displayAssist(e){
    const base=txt(e?.className||e?.classRaw)||'Lớp chưa xác định',note=txt(e?.groupNote);
    return{...e,className:note?base:`${base} (P)`,classRaw:note?txt(e?.classRaw||base):`${txt(e?.classRaw||base)} (P)`,groupNote:note?`${note} (P)`:''};
  }
  function reportView(a,ws){
    if(!a)return a;
    const assist=scanAssist(ws,a.code);
    return{...a,entries:[...(a.entries||[]).filter(e=>!e.isAssist),...assist.map(displayAssist)],assistEntries:assist,assistCount:assist.length};
  }
  window.LBGAssistP={version:'20260911.verified1',scanAssist,displayAssist,reportView};
})();
