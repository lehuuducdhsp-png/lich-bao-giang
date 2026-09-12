'use strict';
(function(){
  const VERSION='20260911.1';
  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  const assistantCode=code=>`${txt(code).toUpperCase()}P`;
  const dayCellIndex=(days,day)=>{const i=(days||[]).map(Number).indexOf(Number(day));return i<0?-1:i+1};
  const formatClassText=e=>{
    const base=txt(e?.className||e?.classRaw)||'Lớp chưa xác định';
    const note=txt(e?.groupNote);
    return `${note?`${base} - ${note}`:base} (P)`;
  };

  if(typeof module!=='undefined'&&module.exports){
    module.exports={VERSION,assistantCode,dayCellIndex,formatClassText};
    return;
  }

  let installed=false;
  const book=()=>{try{return typeof wb!=='undefined'?wb:null}catch{return null}};
  const currentWs=()=>{const b=book(),name=txt(q('week')?.value);return b&&name?b.getWorksheet(name):null};
  const parser=()=>window.LBGTkbParserV2||null;
  const engine=()=>window.LBGReportEngineV4||null;
  const rules=()=>window.LBGReportPayRulesV1||null;

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

  function classAt(ws,row,col,base){
    const p=parser();
    if(!p)return{className:'',classRaw:'',groupNote:''};
    const first=Math.max(1,Number(p.buildHeader?.(ws)?.headerRow||4)+1);
    const floor=Math.max(first,row-10);
    const stop=new Set([txt(base).toUpperCase(),assistantCode(base),`${txt(base).toUpperCase()}+`]);
    let fallback='';
    for(let r=row-1;r>=floor;r--){
      const value=txt(ws.getCell(r,col)?.text).replace(/\s+/g,' ').trim();
      if(!value)continue;
      const upper=value.toUpperCase();
      if(stop.has(upper)||p.resolveTeacherCode?.(ws,upper)){if(fallback)break;continue}
      if(/^(SÁNG|CHIỀU|TIẾT|THỨ|TÊN GV|TÊN GIÁO VIÊN|BUỔI|TRƯỜNG|PHÂN HIỆU|ĐIỂM TRƯỜNG|CƠ SỞ)$/i.test(value))continue;
      if(/^(GHI\s*CHÚ|CÓ\s*DI\s*CHUYỂN|DI\s*CHUYỂN\b)/i.test(value))continue;
      const meta=p.classMeta?.(value);
      if(meta&&meta.classType!=='unknown')return{...meta,className:txt(meta.classDisplay||meta.classRaw)};
      if(!fallback&&value.length<=100)fallback=value;
    }
    const meta=p.classMeta?.(fallback)||{};
    return{...meta,className:txt(meta.classDisplay||meta.classRaw||fallback),classRaw:txt(meta.classRaw||fallback),groupNote:txt(meta.groupNote)};
  }

  function scanAssist(ws,teacherCode){
    const p=parser(),base=txt(teacherCode).toUpperCase();
    if(!ws||!p||!base)return[];
    const target=assistantCode(base),out=[];
    const start=Math.max(1,Number(p.buildHeader?.(ws)?.headerRow||4)+1);
    for(const col of p.timetableColumns?.(ws)||[]){
      const info=p.colInfoFor?.(ws,col);if(!info)continue;
      for(let row=start;row<=Number(ws.rowCount||0);row++){
        const cell=ws.getCell(row,col);
        if(cellText(cell).toUpperCase()!==target)continue;
        const loc=p.locationAt?.(ws,row)||{},meta=classAt(ws,row,col,base);
        const explicit=txt(meta.groupNote||meta.classRaw).match(/\bTI[ẾE]T\s*([1-5])\b/i);
        out.push({
          day:Number(info.day),session:txt(info.session),period:Number(info.period),
          teachingPeriod:explicit?Number(explicit[1]):Number(info.period),
          schoolName:txt(loc.schoolName||loc.school),siteDisplay:txt(loc.siteDisplay||loc.siteName),
          className:txt(meta.className||meta.classDisplay||meta.classRaw),classRaw:txt(meta.classRaw),groupNote:txt(meta.groupNote),
          address:cell.address,row,col,sourceCode:target,isAssist:true,payEligible:false
        });
      }
    }
    return out.sort((a,b)=>a.day-b.day||((a.session==='Sáng'?0:1)-(b.session==='Sáng'?0:1))||a.teachingPeriod-b.teachingPeriod||a.row-b.row||a.col-b.col);
  }

  function reportPeriod(e){return Number(rules()?.reportPeriod?.(e)??e?.teachingPeriod??e?.period)||0}
  function findSessionStart(table,session){
    for(let i=0;i<table.rows.length;i++){
      const cells=table.rows[i].cells;
      if(cells.length>=2&&txt(cells[0].textContent)===session&&/^Tiết$/i.test(txt(cells[1].textContent)))return i;
    }
    return-1;
  }
  function clearPlaced(){
    document.querySelectorAll('.lbg-assist-p-preview').forEach(x=>x.remove());
    q('lbgAssistPPreviewInfo')?.remove();
  }
  function showInfo(entries,code){
    q('lbgAssistPPreviewInfo')?.remove();
    const summary=q('summary');if(!summary)return;
    const box=document.createElement('div');box.id='lbgAssistPPreviewInfo';
    box.style.cssText='margin-top:10px;padding:10px 12px;border:1px solid #fed7aa;border-radius:12px;background:#fff7ed;color:#7c3f19;font-size:12px';
    box.innerHTML=entries.length
      ?`<b>Trợ giảng (P): ${entries.length} tiết</b> • đọc từ mã <b>${assistantCode(code)}</b> • không cộng vào tổng chính.`
      :`Không tìm thấy mã trợ giảng <b>${assistantCode(code)}</b> trong tuần này.`;
    summary.insertAdjacentElement('afterend',box);
  }
  function placeAssist(){
    clearPlaced();
    const ws=currentWs(),code=txt(q('teacher')?.value),table=q('preview')?.querySelector('table.report');
    if(!ws||!code||!table)return;
    const entries=scanAssist(ws,code),days=engine()?.daysForWorksheet?.(ws)||[2,3,4,5,6,7];
    for(const e of entries){
      const di=dayCellIndex(days,e.day),p=reportPeriod(e),start=findSessionStart(table,e.session);
      if(di<1||p<1||p>5||start<0)continue;
      const row=table.rows[start+p],cell=row?.cells?.[di];
      if(!cell)continue;
      const span=document.createElement('span');span.className='lbg-assist-p-preview';
      span.style.cssText='font-weight:800;color:#9a5b36';
      span.textContent=(txt(cell.textContent)?' & ':'')+formatClassText(e);
      cell.appendChild(span);
    }
    showInfo(entries,code);
    table.dataset.lbgAssistPPreview=VERSION;
  }

  function addBanner(){
    if(q('lbgAssistPTestBanner'))return;
    const box=document.createElement('div');box.id='lbgAssistPTestBanner';
    box.style.cssText='margin:14px 0;padding:10px 13px;border:2px solid #f4a261;border-radius:13px;background:#fff7ed;color:#7c3f19;font-size:12px';
    box.innerHTML='<b>🧪 PR TEST — TRỢ GIẢNG (P), GIAI ĐOẠN WEB</b><br>Chỉ thêm hiển thị <b>(P)</b> vào Lịch Báo giảng. Không sửa tính tiết, GA, dấu +, dấu &, Excel, Google Sheets, check-in hay phân quyền.';
    const hero=document.querySelector('main.shell .hero');hero?hero.insertAdjacentElement('afterend',box):document.querySelector('main.shell')?.prepend(box);
  }
  function onClick(event){
    if(!event.target?.closest?.('#analyze'))return;
    setTimeout(placeAssist,120);
    setTimeout(placeAssist,360);
  }
  function onChange(event){if(['week','teacher'].includes(event.target?.id))clearPlaced()}
  function install(){
    if(installed)return;installed=true;
    document.addEventListener('click',onClick,false);
    document.addEventListener('change',onChange,false);
    window.LBGAssistPPreviewSafe={version:VERSION,assistantCode,dayCellIndex,formatClassText,scanAssist,placeAssist};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
