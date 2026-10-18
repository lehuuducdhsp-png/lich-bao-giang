'use strict';
(function(){
  const VERSION='20261017.2';
  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  const assistantCode=code=>`${txt(code).toUpperCase()}P`;
  const dayCellIndex=(days,day)=>{const i=(days||[]).map(Number).indexOf(Number(day));return i<0?-1:i+1};
  const emptyClass=()=>({className:'',classRaw:'',classType:'unknown',classCount:1,groupNote:''});
  const formatClassText=e=>{
    const base=txt(e?.className||e?.classRaw)||'Lớp không xác định';
    const note=txt(e?.groupNote);
    return `${note?`${base} - ${note}`:base} (P)`;
  };
  function assistAppendFragment(existing,label){
    const current=txt(existing),full=txt(label),assistClass=full.replace(/\s*\(P\)\s*$/i,'').trim();
    const visible=current.replace(/\s*\(GA\s*\d+\)\s*/ig,' ').replace(/\s+/g,' ').trim();
    if(visible&&assistClass&&visible.toUpperCase()===assistClass.toUpperCase())return' (P)';
    return `${current?' & ':''}${full}`;
  }

  function sameRowMainCandidates(assignments,row,col,base,info={}){
    const code=txt(base).toUpperCase(),day=Number(info?.day),session=txt(info?.session);
    return(assignments||[]).filter(e=>{
      if(txt(e?.code).toUpperCase()!==code||Number(e?.row)!==Number(row))return false;
      if(Number.isFinite(day)&&Number(e?.day)!==day)return false;
      if(session&&txt(e?.session)!==session)return false;
      return true;
    }).map(e=>({entry:e,distance:Math.abs(Number(e?.col)-Number(col))})).sort((a,b)=>a.distance-b.distance||Number(a.entry?.col)-Number(b.entry?.col));
  }

  function pairedMainAssignment(assignments,row,col,base,info={}){
    const candidates=sameRowMainCandidates(assignments,row,col,base,info);
    if(!candidates.length)return null;
    if(candidates.length>1&&candidates[0].distance===candidates[1].distance)return null;
    return candidates[0].entry;
  }
  function specialPairedMainAssignment(assignments,row,col,base,parser,ws){
    const code=txt(base).toUpperCase();
    const candidates=(assignments||[]).filter(e=>{
      if(txt(e?.code).toUpperCase()!==code||Number(e?.row)!==Number(row))return false;
      const distance=Math.abs(Number(e?.col)-Number(col));if(distance<1||distance>2)return false;
      const hinted=Number(e?.rosterTeachingPeriod)||Number(parser?.rosterTeachingPeriodAt?.(ws,e?.row,e?.col))||0;
      return hinted>=1&&hinted<=5;
    }).map(e=>({entry:e,distance:Math.abs(Number(e?.col)-Number(col))})).sort((a,b)=>a.distance-b.distance||Number(a.entry?.col)-Number(b.entry?.col));
    if(!candidates.length)return null;
    if(candidates.length>1&&candidates[0].distance===candidates[1].distance)return null;
    return candidates[0].entry;
  }

  function classFromKnownSource(source){
    if(!source||typeof source!=='object')return emptyClass();
    const type=txt(source.classType).toLowerCase();
    if(!type||type==='unknown')return emptyClass();
    const name=txt(source.className||source.classDisplay||source.classRaw),raw=txt(source.classRaw||name);
    if(!name&&!raw)return emptyClass();
    return{
      className:name,
      classRaw:raw,
      classType:txt(source.classType),
      classCount:Number(source.classCount)||1,
      groupNote:txt(source.groupNote)
    };
  }

  function classFromPairedMain(main){return classFromKnownSource(main)}

  function thanhLamSplitPairedMain(main,base,row,col){
    // Ngoại lệ RẤT HẸP: từ TKB tách 19 lớp tại THỦY PHƯƠNG – Thanh Lam cũ.
    // Nhãn lớp nằm trong cột GV chính ngay sát bên trái mã P cùng hàng.
    // Không áp dụng cho Phú Mỹ, 25 Dạ Lê hoặc các nơi khác cũng có lớp 1/6, 2/6...
    if(!main||txt(main.code).toUpperCase()!==txt(base).toUpperCase()||
       Number(main.row)!==Number(row)||Math.abs(Number(main.col)-Number(col))!==1||
       txt(main.classType)!=='single'||!/^([1-5])\/(?:6|7|8|9)$/.test(txt(main.className)))return null;
    const fold=s=>txt(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase();
    if(fold(main.schoolName)!=='THUY PHUONG'||!fold(main.siteRaw||main.siteDisplay).includes('THANH LAM CU'))return null;
    return main;
  }

  function selectAssistClass(mainCandidates,pairedMain,localMeta,specialMain=null){
    // Mặc định vẫn giữ quy tắc nghiệp vụ cũ: lớp (P) lấy từ CHÍNH CỘT có mã P.
    // Ngoại lệ hẹp duy nhất: TKB dạng "KHỐI ... - DẠY TIẾT N" xếp P ngay cạnh GV chính
    // (ví dụ ĐÔ ở BB61, ĐÔP ở BC61). Khi parser đã xác nhận GV chính thuộc cụm đặc biệt,
    // P được kế thừa đúng lớp/tiết của GV chính; các ca thông thường như ĐỨCP vẫn không mượn lớp bên cạnh.
    const own=classFromKnownSource(localMeta);
    if(own.className||own.classRaw)return own;
    return specialMain?classFromPairedMain(specialMain):emptyClass();
  }


  // TKB có các cụm xếp xen kẽ: lớp 4/2 -> ĐỨC -> DƯƠNGP;
  // lớp 4/5 -> THANH -> DƯƠNGP; lớp 4/3 -> DƯƠNG ở cột bên cạnh.
  // Luôn lấy lớp ngay trong cột của P, không ghép P với lớp của GV chính cùng tên ở cột khác.
  function strictClassForPColumn(ws,row,col,base,currentLoc,p){
    if(!ws?.getCell||!p?.classMeta)return emptyClass();
    const first=Math.max(1,Number(p.buildHeader?.(ws)?.headerRow||4)+1);
    const origin=Number(row),key=txt(currentLoc?.locationKey);
    for(const step of [1,2]){
      const r=origin-step;if(r<first)break;
      let rowKey='';try{rowKey=txt(p.locationAt?.(ws,r)?.locationKey)}catch{}
      if(key&&rowKey&&rowKey!==key)break;
      let cell=null;try{cell=ws.getCell(r,col)}catch{}
      const value=txt(cellText(cell?.master||cell)).replace(/\s+/g,' ').trim();
      if(!value)continue;
      // Hàng sát trên có thể là giáo viên chính KHÁC với người P.
      // Vượt đúng một hàng GV, không vượt qua cả một cụm/điểm trường mới.
      if(isAssignmentCode(p,ws,value,base)){
        if(step===1)continue;
        return emptyClass();
      }
      if(/^(SÁNG|CHIỀU|TIẾT|THỨ|TÊN GV|TÊN GIÁO VIÊN|BUỔI|TRƯỜNG|PHÂN HIỆU|ĐIỂM TRƯỜNG|CƠ SỞ)$/i.test(value)||/^(GHI\s*CHÚ|CÓ\s*DI\s*CHUYỂN|DI\s*CHUYỂN\b)/i.test(value))continue;
      let meta=null;try{meta=p.classMeta(value)}catch{}
      const known=classFromKnownSource(meta);
      if(known.className||known.classRaw)return{...known,assistClassRow:r};
      return emptyClass();
    }
    return emptyClass();
  }

  if(typeof module!=='undefined'&&module.exports){
    module.exports={VERSION,assistantCode,dayCellIndex,formatClassText,assistAppendFragment,sameRowMainCandidates,pairedMainAssignment,specialPairedMainAssignment,classFromPairedMain,selectAssistClass,strictClassForPColumn};
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

  function isAssignmentCode(p,ws,value,base){
    const code=txt(value).toUpperCase(),main=txt(base).toUpperCase();if(!code)return false;
    if(code===main||code===assistantCode(main)||code===`${main}+`)return true;
    try{if(p.resolveTeacherCode?.(ws,code))return true}catch{}
    const m=code.match(/^(.+?)(P|\+)$/);
    if(m){try{if(p.resolveTeacherCode?.(ws,m[1]))return true}catch{}}
    return false;
  }

  function strictLocalClassAt(ws,row,col,base,currentLoc){
    return strictClassForPColumn(ws,row,col,base,currentLoc,parser());
  }

  function scanAssist(ws,teacherCode){
    const p=parser(),base=txt(teacherCode).toUpperCase();
    if(!ws||!p||!base)return[];
    const target=assistantCode(base),out=[];
    const start=Math.max(1,Number(p.buildHeader?.(ws)?.headerRow||4)+1);
    let assignments=[];try{assignments=p.scanAssignments?.(ws)||[]}catch(error){console.warn('Trợ giảng (P): không đọc được phân công chính để đối chiếu.',error)}
    for(const col of p.timetableColumns?.(ws)||[]){
      const info=p.colInfoFor?.(ws,col);if(!info)continue;
      for(let row=start;row<=Number(ws.rowCount||0);row++){
        const cell=ws.getCell(row,col);
        if(cellText(cell).toUpperCase()!==target)continue;
        const loc=p.locationAt?.(ws,row)||{};
        const candidates=sameRowMainCandidates(assignments,row,col,base,info);
        const main=pairedMainAssignment(assignments,row,col,base,info);
        const localMeta=strictLocalClassAt(ws,row,col,base,loc);
        // Tiết bổ sung Phú Tân: P phải học đúng tiết in trên nhãn cụm,
        // kể cả P nằm ở cột bên cạnh hay xuống dòng 159/160 (BB160 = tiết 4, không phải 5).
        const extra=window.LBGTkbPhuTanExtraPeriodV1;
        const extraHeader=extra?.findHeader?.(ws,{row,col,day:info.day,session:info.session},p)||null;
        const ownRosterPeriod=Number(extraHeader?.period)||Number(p.rosterTeachingPeriodAt?.(ws,row,col))||0;
        const specialMain=ownRosterPeriod?null:specialPairedMainAssignment(assignments,row,col,base,p,ws);
        // Với riêng cụm MỖI GV/LỚP, nếu P đặt ngay cạnh GV chính (ví dụ AR155,
        // BB160), được mượn lớp từ CHÍNH GIÁO VIÊN CÙNG MÃ trên cùng hàng.
        // Không mở rộng việc mượn lớp cho các nhóm khác, tránh sai lệch giáo án.
        const rosterPairedMain=extraHeader&&main?.phuTanExtraPeriod?main:null;
        const thanhLamMain=thanhLamSplitPairedMain(main,base,row,col);
        const meta=selectAssistClass(candidates,main,localMeta,specialMain||rosterPairedMain||thanhLamMain);
        const resolvedClass=txt(meta.className||meta.classDisplay||meta.classRaw)||'Lớp không xác định';
        const resolvedRaw=txt(meta.classRaw)||resolvedClass;
        const explicit=txt(meta.groupNote||resolvedRaw).match(/\bTI[ẾE]T\s*([1-5])\b/i);
        const localKnown=Boolean(localMeta.className||localMeta.classRaw),anchor=specialMain||null;
        const sourceInfo=(thanhLamMain||anchor)?{
          day:(thanhLamMain||anchor).day,session:(thanhLamMain||anchor).session,
          period:(thanhLamMain||anchor).period
        }:info;
        const sourceLoc=thanhLamMain||anchor||loc;
        const rosterPeriod=ownRosterPeriod||Number((thanhLamMain||anchor)?.teachingPeriod||(thanhLamMain||anchor)?.rosterTeachingPeriod)||0;
        out.push({
          day:Number(sourceInfo.day),session:txt(sourceInfo.session),period:Number(sourceInfo.period),
          teachingPeriod:rosterPeriod||(explicit?Number(explicit[1]):Number(sourceInfo.period)),
          schoolName:txt(sourceLoc.schoolName||sourceLoc.school),siteDisplay:txt(sourceLoc.siteDisplay||sourceLoc.siteName),
          className:resolvedClass,classRaw:resolvedRaw,classType:txt(meta.classType),classCount:Number(meta.classCount)||1,groupNote:txt(meta.groupNote),
          address:cell.address,row,col,sourceCode:target,isAssist:true,payEligible:false,
          pairedMainAddress:txt((anchor||main)?.address),pairedMainCode:txt((anchor||main)?.code),
          assistClassSource:localKnown?'same-column-class':anchor?'special-roster-paired-main':thanhLamMain?'thanh-lam-paired-main':'unresolved',
          assistClassRow:Number(localMeta.assistClassRow)||null,
          rosterTeachingPeriod:rosterPeriod||null,
          phuTanExtraPeriodAssist:Boolean(extraHeader),
          phuTanExtraPeriodHeaderRow:extraHeader?.row||null
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
      span.textContent=assistAppendFragment(txt(cell.textContent),formatClassText(e));
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
    window.LBGAssistPPreviewSafe={version:VERSION,assistantCode,dayCellIndex,formatClassText,assistAppendFragment,sameRowMainCandidates,pairedMainAssignment,specialPairedMainAssignment,classFromPairedMain,selectAssistClass,strictClassForPColumn,scanAssist,placeAssist};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
