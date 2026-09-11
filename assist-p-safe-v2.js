'use strict';
(function(){
  const VERSION='20260911.safe2';
  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  const mergeCache=new WeakMap();
  let renderToken=0;

  function book(){try{return typeof wb!=='undefined'?wb:null}catch{return null}}
  function currentResult(){try{return typeof result!=='undefined'?result:null}catch{return null}}
  function currentWs(){const b=book(),name=txt(q('week')?.value);return b&&name?b.getWorksheet(name):null}
  function parser(){return window.LBGTkbParserV2||null}
  function engine(){return window.LBGReportEngineV4||null}
  function rules(){return window.LBGReportPayRulesV1||null}

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
    const m=txt(meta?.groupNote||meta?.classRaw).match(/\bTI[ẾE]T\s*([1-5])\b/i);
    return m?Number(m[1]):Number(slot)||null;
  }
  function classAt(ws,row,col,base){
    const p=parser();if(!p)return{classRaw:'',classDisplay:'',classType:'unknown',classCount:1,groupNote:''};
    const header=Math.max(1,Number(p.buildHeader?.(ws)?.headerRow||4)+1),floor=Math.max(header,row-10);
    const target=txt(base).toUpperCase(),stop=new Set([target,target+'P',target+'+']);let fallback='';
    for(let r=row-1;r>=floor;r--){
      const value=txt(masterText(ws,r,col)).replace(/\s+/g,' ').trim();if(!value)continue;
      const upper=value.toUpperCase();
      if(stop.has(upper)||p.resolveTeacherCode?.(ws,upper)){if(fallback)break;continue}
      if(/^(SÁNG|CHIỀU|TIẾT|THỨ|TÊN GV|TÊN GIÁO VIÊN|BUỔI|TRƯỜNG|PHÂN HIỆU|ĐIỂM TRƯỜNG|CƠ SỞ)$/i.test(value))continue;
      if(/^(GHI\s*CHÚ|CÓ\s*DI\s*CHUYỂN|DI\s*CHUYỂN\b)/i.test(value))continue;
      const meta=p.classMeta?.(value);if(meta&&meta.classType!=='unknown')return meta;
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
        const loc=p.locationAt?.(ws,row)||{},meta=classAt(ws,row,col,base),slot=Number(info.period)||null;
        out.push({...info,period:slot,slotPeriod:slot,teachingPeriod:explicitPeriod(meta,slot),school:txt(loc.schoolName),schoolName:txt(loc.schoolName),siteDisplay:txt(loc.siteDisplay),locationLabel:txt(loc.locationLabel),locationKey:txt(loc.locationKey),className:txt(meta.classDisplay||meta.classRaw),classRaw:txt(meta.classRaw||meta.classDisplay),classType:txt(meta.classType)||'unknown',classCount:Number(meta.classCount)||1,groupNote:txt(meta.groupNote),sourceCode:target,address:cell.address,row,col,isAssist:true,assignmentType:'assist',payEligible:false});
      }
    }
    out.sort((a,b)=>Number(a.day)-Number(b.day)||((a.session==='Sáng'?0:1)-(b.session==='Sáng'?0:1))||Number(a.teachingPeriod||a.period)-Number(b.teachingPeriod||b.period)||Number(a.row)-Number(b.row)||Number(a.col)-Number(b.col));
    return out;
  }
  function displayAssist(e){
    const base=txt(e?.className||e?.classRaw)||'Lớp chưa xác định',note=txt(e?.groupNote);
    return{...e,className:note?base:`${base} (P)`,classRaw:note?txt(e?.classRaw||base):`${txt(e?.classRaw||base)} (P)`,groupNote:note?`${note} (P)`:''};
  }
  function reportView(a,assist){return{...a,entries:[...(a?.entries||[]),...(assist||[]).map(displayAssist)],assistEntries:assist||[],assistCount:(assist||[]).length}}

  function css(){
    if(q('lbgAssistSafeCssV2'))return;
    const s=document.createElement('style');s.id='lbgAssistSafeCssV2';s.textContent=`
      #lbgAssistSafeBannerV2{margin:16px 0 0;padding:12px 15px;border:2px solid #f4a261;border-radius:15px;background:#fff7ed;color:#7c3f19}
      .lbg-assist-safe-chip{display:inline-flex;margin-left:7px;padding:3px 8px;border-radius:999px;background:#f4a261;color:#4b342b;font-size:10px;font-weight:900}
      #lbgAssistSafeInfoV2{margin-top:10px;padding:10px 12px;border:1px solid #fed7aa;border-radius:12px;background:#fffaf5;color:#7c3f19;font-size:12px}
      #lbgAssistSafeInfoV2 strong{font-size:14px}.lbg-assist-safe-list{margin:7px 0 0;padding-left:20px}.lbg-assist-safe-auto{display:block;margin-top:3px;color:#9a5b36;font-size:10px;font-weight:800}
      .mt-assist[data-lbg-assist-safe-auto]{background:#fff7ed!important;color:#7c3f19!important;font-weight:900!important}
    `;document.head.appendChild(s);
  }
  function banner(){
    if(q('lbgAssistSafeBannerV2'))return;
    const box=document.createElement('section');box.id='lbgAssistSafeBannerV2';
    box.innerHTML=`<b>🧪 BẢN THỬ AN TOÀN — TRỢ GIẢNG (P)</b><span class="lbg-assist-safe-chip">PR #36 • GIAI ĐOẠN 1: CHỈ KIỂM WEB</span><div style="margin-top:5px;font-size:12px">Bản này <b>không thay analyzeNow</b>, không ghi Google Sheets và chưa cho xuất Excel có P. Mục tiêu hiện tại chỉ là kiểm tra P đúng giáo viên • đúng thứ • đúng buổi • đúng tiết và không tăng tổng chính.</div>`;
    const hero=document.querySelector('main.shell .hero');hero?hero.insertAdjacentElement('afterend',box):document.querySelector('main.shell')?.prepend(box);
  }
  function showAssistInfo(a,assist){
    q('lbgAssistSafeInfoV2')?.remove();if(!a)return;
    const box=document.createElement('div');box.id='lbgAssistSafeInfoV2';
    if(!assist.length){box.innerHTML='<strong>Trợ giảng (P): 0 tiết</strong> — không tìm thấy mã hậu tố P cho giáo viên này trong tuần đang chọn.'}
    else{
      const items=assist.map(e=>`<li>${Number(e.day)===8?'Chủ nhật':'Thứ '+e.day} • ${e.session} • tiết ${rules()?.reportPeriod?.(e)||e.teachingPeriod||e.period} • ${txt(e.schoolName)||'Chưa xác định trường'} • ${txt(e.className)||'Chưa xác định lớp'} <b>(P)</b> • ô ${e.address}</li>`).join('');
      box.innerHTML=`<strong>Trợ giảng (P): ${assist.length} tiết</strong> — tổng chính vẫn giữ <b>${Number(a.total)||0}</b>.<ul class="lbg-assist-safe-list">${items}</ul>`;
    }
    q('summary')?.insertAdjacentElement('afterend',box);
  }
  function renderSafePreview(){
    const token=++renderToken,a=currentResult(),ws=currentWs(),code=txt(q('teacher')?.value),eng=engine();
    if(!a||!ws||!code||!eng?.renderPreview)return;
    try{
      const assist=scanAssist(ws,code);if(token!==renderToken)return;
      eng.renderPreview(reportView(a,assist));
      showAssistInfo(a,assist);
      const cap=q('caption');if(cap&&assist.length&&!cap.querySelector('.lbg-assist-safe-chip')){const chip=document.createElement('span');chip.className='lbg-assist-safe-chip';chip.textContent=`${assist.length} trợ (P)`;cap.append(' ');cap.appendChild(chip)}
    }catch(error){console.error('Assist P safe V2 preview:',error);const w=q('warnings');if(w)w.insertAdjacentHTML('beforeend',`<div class="alert warn"><b>Bản thử P chưa render được:</b> ${String(error?.message||error)}</div>`)}
  }

  function pad(n){return String(Number(n)||0).padStart(2,'0')}
  function dateKey(d){return`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
  function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);x.setHours(12,0,0,0);return x}
  function mondayOf(date){const d=new Date(date);d.setHours(12,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d}
  function monthYear(month){const y=Number(q('year')?.value)||new Date().getFullYear();return Number(month)>=8?y:y+1}
  function monthSegments(year,month){const first=new Date(year,month-1,1,12),last=new Date(year,month,0,12),out=[];for(let start=mondayOf(first);start<=last;start=addDays(start,7)){const dates=[];for(let i=0;i<7;i++){const d=addDays(start,i);if(d.getFullYear()===year&&d.getMonth()+1===month)dates.push(d)}if(dates.length)out.push({key:dateKey(start),dates})}return out}
  function weekSheet(key){const b=book();if(!b)return null;const found=[];for(const ws of b.worksheets){let d=null;try{d=typeof startDate==='function'?startDate(ws.name):null}catch{}if(d instanceof Date&&!Number.isNaN(d.getTime())&&dateKey(d)===key)found.push(ws)}return found[found.length-1]||null}
  function syncMonthlyAssist(){
    const preview=q('month2Preview'),code=txt(q('month2Teacher')?.value),month=Number(q('month2Select')?.value);if(!preview||!code||month<1||month>12)return;
    const segs=new Map(monthSegments(monthYear(month),month).map(x=>[x.key,x]));
    preview.querySelectorAll('.mt-assist').forEach(input=>{
      const seg=segs.get(input.dataset.week);if(!seg)return;const ws=weekSheet(seg.key),allowedDays=seg.dates.map(d=>d.getDay()===0?8:d.getDay()+1),count=ws?scanAssist(ws,code,{allowedDays}).length:0;
      input.readOnly=true;input.value=count?String(count):'';input.dataset.lbgAssistSafeAuto=String(count);input.title=`Tự động đọc từ mã ${code}P`;input.dispatchEvent(new Event('input',{bubbles:true}));
      const label=input.closest('label');if(label&&!label.querySelector('.lbg-assist-safe-auto')){const small=document.createElement('small');small.className='lbg-assist-safe-auto';small.textContent=`Tự động từ mã ${code}P`;label.appendChild(small)}
    });
  }

  function blockUnsafe(event){
    const button=event.target?.closest?.('button');if(!button)return;
    if(button.id==='saveSheets'){
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
      alert('Bản thử an toàn PR #36 đang ở GIAI ĐOẠN 1. Google Sheets tạm khóa để không ghi dữ liệu thật. Sau khi Web P đúng hoàn toàn mới mở bước Google Sheets.');
    }
    if(button.id==='export'){
      const ws=currentWs(),code=txt(q('teacher')?.value),hasP=ws&&code&&scanAssist(ws,code).length>0;
      if(hasP){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();alert('Bản thử an toàn PR #36 đang ở GIAI ĐOẠN 1. Excel có P tạm khóa. Ta sẽ mở bước Excel sau khi xác nhận Web P đúng hoàn toàn.');}
    }
  }
  function handleClick(event){
    const button=event.target?.closest?.('button');if(!button)return;
    if(button.id==='analyze'){setTimeout(renderSafePreview,120);setTimeout(renderSafePreview,450)}
    if(button.id==='month2Build'){setTimeout(syncMonthlyAssist,160);setTimeout(syncMonthlyAssist,500)}
  }
  function clearInfo(event){if(['week','teacher'].includes(event.target?.id)){q('lbgAssistSafeInfoV2')?.remove();renderToken++}}

  function install(){
    css();banner();
    window.addEventListener('click',blockUnsafe,true);
    document.addEventListener('click',handleClick,false);
    document.addEventListener('change',clearInfo,true);
    window.LBGAssistPSafeV2={version:VERSION,scanAssist,displayAssist,reportView,renderSafePreview,syncMonthlyAssist};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
