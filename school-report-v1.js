'use strict';
(function(root,factory){
  const api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.LBGSchoolReportV1=api;
  if(root&&root.document)api.install();
})(typeof window!=='undefined'?window:globalThis,function(root){
  const VERSION='20260914.2';
  const MODES={class:'Lớp',teacher:'Giáo viên','teacher-class':'Giáo viên - lớp'};
  const TARGET_SEP='::LBG_SITE::';
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  const fold=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase().replace(/\s+/g,' ');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const q=id=>root.document?.getElementById(id)||null;
  const safeFile=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').replace(/[^A-Za-z0-9._-]+/g,'_').replace(/^_+|_+$/g,'')||'TRUONG';
  const mainCache=new WeakMap(),assistCache=new WeakMap();
  let installed=false,currentData=null,exportBusy=false;

  function classText(e){
    const base=txt(e?.className||e?.classRaw)||'Lớp không xác định';
    const note=txt(e?.groupNote);
    return note&&!base.toUpperCase().includes(note.toUpperCase())?`${base} - ${note}`:base;
  }
  function teacherCodeText(e){return txt(e?.code)||'GV?'}
  function displayEntry(e,mode='teacher-class'){
    const teacher=teacherCodeText(e),cls=classText(e),assist=Boolean(e?.isAssist);
    if(mode==='class')return assist?(/\(P\)\s*$/i.test(cls)?cls:`${cls} (P)`):cls;
    if(mode==='teacher')return assist?`${teacher} (P)`:teacher;
    return assist?`${teacher} - ${/\(P\)\s*$/i.test(cls)?cls:`${cls} (P)`}`:`${teacher} - ${cls}`;
  }
  function schoolKey(e){return fold(e?.schoolName||e?.school)}
  function siteText(e){return txt(e?.siteDisplay||e?.siteName||e?.site)}
  function siteKey(e){return fold(siteText(e))}
  function targetKey(e){return `${schoolKey(e)}${TARGET_SEP}${siteKey(e)}`}
  function collectSchoolOptions(entries){
    const map=new Map();
    for(const e of entries||[]){const key=schoolKey(e),name=txt(e?.schoolName||e?.school);if(key&&name&&!map.has(key))map.set(key,{key,name})}
    return[...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'vi'));
  }
  function collectSchoolSiteOptions(entries){
    const map=new Map();
    for(const e of entries||[]){
      const school=txt(e?.schoolName||e?.school),schoolFold=schoolKey(e);if(!school||!schoolFold)continue;
      const site=siteText(e),key=targetKey(e),label=site?`${school} — ${site}`:school;
      if(!map.has(key))map.set(key,{key,school,site,label});
    }
    return[...map.values()].sort((a,b)=>a.school.localeCompare(b.school,'vi')||a.site.localeCompare(b.site,'vi'));
  }
  function filterBySchool(entries,key){const wanted=fold(key);return(entries||[]).filter(e=>schoolKey(e)===wanted)}
  function filterBySchoolSite(entries,key){const wanted=txt(key);return(entries||[]).filter(e=>targetKey(e)===wanted)}
  const slotKey=e=>`${Number(e?.day)}|${txt(e?.session)}|${Number(e?.teachingPeriod??e?.period)}`;
  function buildSlots(entries,mode){
    const map=new Map();
    for(const e of entries||[]){const key=slotKey(e);if(!map.has(key))map.set(key,[]);map.get(key).push(e)}
    for(const list of map.values())list.sort((a,b)=>displayEntry(a,mode).localeCompare(displayEntry(b,mode),'vi')||txt(a?.address).localeCompare(txt(b?.address)));
    return map;
  }
  function reportLocationText(school,site){return site?`${txt(school)} • ${txt(site)}`:txt(school)}
  function footerText(school,mainCount,assistCount,site=''){return`TỔNG: ${Math.max(0,Number(mainCount)||0)} lượt phân công${assistCount?` • ${Math.max(0,Number(assistCount)||0)} Trợ (P)`:''} | Trường: ${reportLocationText(school,site)}`}
  function canWholeSchool(){const a=root.LBGAccess;return Boolean(a&&(a.isOwner?.()||a.canReviewAllReports?.()))}
  function book(){try{return typeof wb!=='undefined'?wb:null}catch{return null}}
  function currentWs(){const b=book(),name=txt(q('week')?.value);return b&&name?b.getWorksheet(name):null}
  function allTeachers(ws){
    const fn=typeof root.LBGAllTeachers==='function'?root.LBGAllTeachers:(typeof root.teachers==='function'?root.teachers:null);
    try{return fn?(fn(ws)||[]):[]}catch{return[]}
  }
  function normalizeMain(e){return{...(e||{}),isAssist:false,teachingPeriod:Number(e?.teachingPeriod??e?.period)||0}}
  function normalizeAssist(e,t){return{...(e||{}),code:txt(t?.code),teacherName:txt(t?.name||t?.teacherName||t?.code),isAssist:true,teachingPeriod:Number(e?.teachingPeriod??e?.period)||0}}
  function cellText(cell){
    try{const c=cell?.master||cell,t=txt(c?.text);if(t)return t;const v=c?.value;if(v==null)return'';if(typeof v==='string'||typeof v==='number'||typeof v==='boolean')return txt(v);if(Array.isArray(v?.richText))return txt(v.richText.map(x=>x?.text??'').join(''));if(v?.result!=null)return txt(v.result);if(typeof v?.text==='string')return txt(v.text)}catch{}return'';
  }
  function mainEvents(ws){
    if(!ws)return[];if(mainCache.has(ws))return mainCache.get(ws);
    const parser=root.LBGTkbParserV2;if(!parser?.scanAssignments)throw new Error('Bộ đọc TKB chưa sẵn sàng.');
    const teachers=allTeachers(ws),allowed=new Set(teachers.map(t=>txt(t?.code).toUpperCase()).filter(Boolean));
    const out=(parser.scanAssignments(ws)||[]).filter(e=>allowed.has(txt(e?.code).toUpperCase())).map(normalizeMain);mainCache.set(ws,out);return out;
  }
  function assistTeacherCodesPresent(ws,teachers){
    const parser=root.LBGTkbParserV2,map=new Map((teachers||[]).map(t=>[`${txt(t?.code).toUpperCase()}P`,txt(t?.code).toUpperCase()]).filter(x=>x[0]!=='P')),found=new Set();
    if(!ws||!map.size||!parser?.timetableColumns)return found;
    const start=Math.max(1,Number(parser.buildHeader?.(ws)?.headerRow||4)+1),last=Number(ws.rowCount||0);
    for(const col of parser.timetableColumns(ws)||[]){for(let row=start;row<=last;row++){const value=cellText(ws.getCell(row,col)).toUpperCase();const base=map.get(value);if(base)found.add(base)}}
    return found;
  }
  function assistEvents(ws){
    if(!ws)return[];if(assistCache.has(ws))return assistCache.get(ws);
    const api=root.LBGAssistPPreviewSafe,teachers=allTeachers(ws),byCode=new Map(teachers.map(t=>[txt(t?.code).toUpperCase(),t]));if(!api?.scanAssist){assistCache.set(ws,[]);return[]}
    const present=assistTeacherCodesPresent(ws,teachers),out=[],seen=new Set();
    for(const code of present){const t=byCode.get(code);if(!t)continue;for(const e of api.scanAssist(ws,code)||[]){const id=txt(e?.address)||`${code}|${slotKey(e)}|${txt(e?.schoolName)}|${siteText(e)}|${txt(e?.className)}`;if(seen.has(id))continue;seen.add(id);out.push(normalizeAssist(e,t))}}
    assistCache.set(ws,out);return out;
  }
  function allEvents(ws){return[...mainEvents(ws),...assistEvents(ws)]}
  function daysFor(ws,events){
    try{const days=root.LBGReportEngineV4?.daysForWorksheet?.(ws);if(Array.isArray(days)&&days.length)return days.map(Number)}catch{}
    return(events||[]).some(e=>Number(e?.day)===8)?[2,3,4,5,6,7,8]:[2,3,4,5,6,7];
  }
  const dayLabel=d=>Number(d)===8?'Chủ nhật':`Thứ ${Number(d)}`;

  function style(){
    if(q('lbgSchoolReportCss'))return;const s=root.document.createElement('style');s.id='lbgSchoolReportCss';s.textContent=`
      #lbgSchoolReportCard{margin-top:18px}.lbg-school-controls{display:grid;grid-template-columns:minmax(280px,1.45fr) minmax(190px,.8fr) auto auto;gap:10px;align-items:end;margin-top:12px}.lbg-school-controls label{display:grid;gap:5px;font-size:12px;font-weight:800}.lbg-school-controls select{width:100%;padding:10px 11px;border:1px solid #eadfd8;border-radius:11px;background:#fff;color:#4b342b}.lbg-school-note{margin-top:10px;padding:9px 11px;border:1px solid #bfdbfe;border-radius:11px;background:#eff6ff;color:#1e40af;font-size:12px}.lbg-school-summary{margin:12px 0;padding:9px 11px;border:1px solid #d1fae5;border-radius:11px;background:#ecfdf5;color:#166534;font-size:12px}.lbg-school-preview .sheet{min-width:1020px}.lbg-school-preview .title{text-align:center}.lbg-school-preview .title h2,.lbg-school-preview .title h3{margin:3px 0}.lbg-school-preview table{width:100%;border-collapse:collapse;font-family:"Times New Roman",serif}.lbg-school-preview th,.lbg-school-preview td{border:1px solid #666;padding:6px;text-align:center;vertical-align:middle}.lbg-school-preview th,.lbg-school-preview .session,.lbg-school-preview .period-head{background:#f6c9ae;font-weight:800}.lbg-school-preview td{background:#dff5e4;min-width:120px}.lbg-school-preview .slot-line{display:block;margin:2px 0}.lbg-school-preview .slot-assist{color:#9a5b36;font-weight:800}.lbg-school-preview .foot{display:flex;justify-content:space-between;gap:12px;padding:10px 14px;background:#b9e6a5;border:1px solid #666;border-top:0;font-family:"Times New Roman",serif;font-weight:800}.lbg-school-preview .wrap{overflow:auto}.lbg-school-empty{padding:18px;border:1px dashed #d8c2b5;border-radius:12px;text-align:center;color:#806b61;background:#fffaf7}@media(max-width:900px){.lbg-school-controls{grid-template-columns:1fr 1fr}.lbg-school-controls button{width:100%}}@media(max-width:620px){.lbg-school-controls{grid-template-columns:1fr}}
    `;root.document.head.appendChild(s)
  }
  function ensureCard(){
    if(q('lbgSchoolReportCard'))return q('lbgSchoolReportCard');
    const anchor=q('previewCard')||[...root.document.querySelectorAll('section.card')].find(x=>/Kiểm tra và lập báo giảng/i.test(txt(x.textContent)));if(!anchor?.parentNode)return null;
    style();const card=root.document.createElement('section');card.id='lbgSchoolReportCard';card.className='card';card.innerHTML=`<div class="head"><div><h3>Lịch báo giảng theo trường</h3><p>Mỗi cơ sở/điểm dạy được tách riêng; trong lịch chỉ dùng mã GV.</p></div><span class="badge" id="lbgSchoolBadge">3 chế độ</span></div><div id="lbgSchoolPermission" class="lbg-school-note">Đang kiểm tra quyền xem lịch toàn trường…</div><div class="lbg-school-controls"><label>Trường / cơ sở<select id="lbgSchoolSelect" disabled><option value="">Chưa có dữ liệu</option></select></label><label>Cách hiển thị<select id="lbgSchoolMode" disabled><option value="class">Lớp</option><option value="teacher">Giáo viên</option><option value="teacher-class" selected>Giáo viên - lớp</option></select></label><button class="btn primary" id="lbgSchoolCheck" disabled>✓ Kiểm tra</button><button class="btn outline" id="lbgSchoolExport" disabled>⇩ Xuất Excel</button></div><div id="lbgSchoolSummary"></div><div id="lbgSchoolPreview" class="lbg-school-preview"><div class="lbg-school-empty">Chọn trường/cơ sở và nhấn Kiểm tra.</div></div>`;
    anchor.parentNode.insertBefore(card,anchor);bind();return card;
  }
  function bind(){
    q('lbgSchoolCheck')?.addEventListener('click',renderCurrent);q('lbgSchoolExport')?.addEventListener('click',exportCurrent);
    q('lbgSchoolSelect')?.addEventListener('change',()=>{currentData=null;q('lbgSchoolExport').disabled=true});
    q('lbgSchoolMode')?.addEventListener('change',()=>{if(currentData)renderCurrent()});
    q('week')?.addEventListener('change',()=>{currentData=null;setTimeout(refresh,0)});
  }
  function setEnabled(ok){['lbgSchoolSelect','lbgSchoolMode','lbgSchoolCheck'].forEach(id=>{const el=q(id);if(el)el.disabled=!ok});if(!ok&&q('lbgSchoolExport'))q('lbgSchoolExport').disabled=true}
  function refresh(){
    ensureCard();const note=q('lbgSchoolPermission'),select=q('lbgSchoolSelect'),ws=currentWs();if(!note||!select)return;
    if(!root.LBGAccess){note.textContent='Đang kiểm tra quyền xem lịch toàn trường…';setEnabled(false);return}
    if(!canWholeSchool()){note.innerHTML='<b>Phạm vi bảo mật:</b> Lịch theo trường chỉ mở cho Chủ sở hữu hoặc tài khoản được quyền kiểm tra toàn bộ báo giảng, để không lộ lịch của giáo viên ngoài phạm vi.';select.innerHTML='<option value="">Không có quyền xem toàn trường</option>';setEnabled(false);return}
    if(!ws){note.textContent='Hãy mở TKB và chọn tuần trước.';select.innerHTML='<option value="">Chưa có tuần</option>';setEnabled(false);return}
    try{
      const events=mainEvents(ws),targets=collectSchoolSiteOptions(events),old=select.value;select.innerHTML=targets.length?targets.map(x=>`<option value="${esc(x.key)}">${esc(x.label)}</option>`).join(''):'<option value="">Không tìm thấy trường/cơ sở</option>';if(old&&targets.some(x=>x.key===old))select.value=old;
      note.textContent='Mỗi cơ sở/điểm dạy được xuất riêng. Chế độ Giáo viên và Giáo viên - lớp chỉ hiện mã GV (THANH, THAOR2, ĐỨC, TÂM…). Trợ (P) chỉ quét khi bấm Kiểm tra để tránh làm chậm trang.';setEnabled(Boolean(targets.length));
    }catch(error){note.textContent='Chưa đọc được dữ liệu trường: '+(error?.message||String(error));setEnabled(false)}
  }
  function makeData(){
    if(!canWholeSchool())throw new Error('Tài khoản này không có quyền xem lịch toàn trường.');const ws=currentWs();if(!ws)throw new Error('Hãy chọn tuần trước.');
    const key=txt(q('lbgSchoolSelect')?.value),mode=txt(q('lbgSchoolMode')?.value)||'teacher-class';if(!key)throw new Error('Hãy chọn trường/cơ sở.');
    const target=collectSchoolSiteOptions(mainEvents(ws)).find(x=>x.key===key);if(!target)throw new Error('Không tìm thấy trường/cơ sở đang chọn trong TKB.');
    const all=allEvents(ws),entries=filterBySchoolSite(all,key),main=entries.filter(e=>!e.isAssist),assist=entries.filter(e=>e.isAssist),days=daysFor(ws,entries);
    return{ws,school:target.school,site:target.site,label:target.label,key,mode,entries,main,assist,days,slots:buildSlots(entries,mode)};
  }
  function renderCurrent(){
    const box=q('lbgSchoolPreview'),summary=q('lbgSchoolSummary');if(!box)return;
    try{
      const d=makeData();currentData=d;const year=Number(q('year')?.value)||new Date().getFullYear();let rows='';
      for(const session of['Sáng','Chiều']){rows+=`<tr><td class="session" rowspan="6">${session}</td><td class="period-head">Tiết</td>${d.days.map(()=>'<td class="period-head"></td>').join('')}</tr>`;for(let p=1;p<=5;p++)rows+=`<tr><td class="period-head">Tiết ${p}</td>${d.days.map(day=>{const list=d.slots.get(`${day}|${session}|${p}`)||[];return`<td>${list.map(e=>`<span class="slot-line ${e.isAssist?'slot-assist':''}">${esc(displayEntry(e,d.mode))}</span>`).join('')}</td>`}).join('')}</tr>`}
      const sitePart=d.site?` • <b>${esc(d.site)}</b>`:'';if(summary)summary.innerHTML=`<div class="lbg-school-summary"><b>${esc(d.school)}</b>${sitePart} • ${d.main.length} lượt phân công chính • ${d.assist.length} Trợ (P) • Hiển thị: <b>${esc(MODES[d.mode]||d.mode)}</b></div>`;
      box.innerHTML=`<div class="wrap"><div class="sheet"><div class="title"><h2>LỊCH BÁO GIẢNG NĂM HỌC ${year} - ${year+1}</h2><h3>THEO TRƯỜNG: ${esc(d.school)}${d.site?` — ${esc(d.site)}`:''}</h3><p>TKB tuần: ${esc(d.ws.name)} • Chế độ: ${esc(MODES[d.mode]||d.mode)}</p></div><table class="report"><tr>${['Buổi','Tiết',...d.days.map(dayLabel)].map(x=>`<th>${esc(x)}</th>`).join('')}</tr>${rows}</table><div class="foot"><span>TỔNG: ${d.main.length} lượt phân công${d.assist.length?` • ${d.assist.length} Trợ (P)`:''}</span><span>Trường: ${esc(reportLocationText(d.school,d.site))}</span></div></div></div>`;q('lbgSchoolExport').disabled=!d.entries.length;
    }catch(error){currentData=null;q('lbgSchoolExport').disabled=true;if(summary)summary.innerHTML='';box.innerHTML=`<div class="lbg-school-empty">${esc(error?.message||String(error))}</div>`}
  }
  function styleCell(cell,fill,bold=false,size=12){cell.alignment={horizontal:'center',vertical:'middle',wrapText:true};cell.font={name:'Times New Roman',size,bold};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:fill}};cell.border={top:{style:'thin'},left:{style:'thin'},bottom:{style:'thin'},right:{style:'thin'}}}
  function colLetter(n){let s='';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26)}return s}
  function addExcelSheet(bookOut,d){
    const ws=bookOut.addWorksheet('LBG TRƯỜNG'),last=2+d.days.length,endCol=colLetter(last),year=Number(q('year')?.value)||new Date().getFullYear();ws.pageSetup={orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:1,margins:{left:.2,right:.2,top:.3,bottom:.3,header:.1,footer:.1}};
    [`A1:${endCol}1`,`A2:${endCol}2`,`A3:${endCol}3`,'A5:A10','A11:A16','A17:D17',`E17:${endCol}17`].forEach(r=>{try{ws.mergeCells(r)}catch{}});ws.getCell('A1').value=`LỊCH BÁO GIẢNG NĂM HỌC ${year} - ${year+1}`;ws.getCell('A2').value=`THEO TRƯỜNG: ${d.school}${d.site?` — ${d.site}`:''}`;ws.getCell('A3').value=`TKB tuần: ${d.ws.name} • Chế độ: ${MODES[d.mode]||d.mode}`;ws.getRow(4).values=['Buổi','Tiết',...d.days.map(dayLabel)];
    for(const[session,sr,pr]of[['Sáng',5,6],['Chiều',11,12]]){ws.getCell(sr,1).value=session;ws.getCell(sr,2).value='Tiết';for(let p=1;p<=5;p++)ws.getCell(pr+p-1,2).value='Tiết '+p;d.days.forEach((day,i)=>{const col=i+3;for(let p=1;p<=5;p++){const list=d.slots.get(`${day}|${session}|${p}`)||[];ws.getCell(pr+p-1,col).value=list.map(e=>displayEntry(e,d.mode)).join('\n')}})}
    ws.getCell('A17').value=`TỔNG: ${d.main.length} lượt phân công${d.assist.length?` • ${d.assist.length} Trợ (P)`:''}`;ws.getCell('E17').value='Trường: '+reportLocationText(d.school,d.site);ws.columns=[{width:9},{width:10},...d.days.map(()=>({width:d.days.includes(8)?20:23}))];
    for(let r=1;r<=17;r++){ws.getRow(r).height=r<=3?26:r===4?42:(r===5||r===11?34:r===17?42:38);for(let c=1;c<=last;c++)styleCell(ws.getCell(r,c),[1,2,3,17].includes(r)?'FFB9E6A5':(r===4||c<=2?'FFF6C9AE':'FFDFF5E4'),[4,5,11,17].includes(r),r===1?18:r===2?15:12)}
    return ws;
  }
  async function exportCurrent(){
    if(exportBusy)return;const button=q('lbgSchoolExport'),old=button?.textContent;exportBusy=true;if(button){button.disabled=true;button.textContent='Đang tạo Excel…'}
    try{const d=currentData&&currentData.key===txt(q('lbgSchoolSelect')?.value)&&currentData.mode===txt(q('lbgSchoolMode')?.value)?currentData:makeData();if(!root.ExcelJS||!root.saveAs)throw new Error('Thư viện xuất Excel chưa sẵn sàng.');const out=new root.ExcelJS.Workbook();addExcelSheet(out,d);const buf=await out.xlsx.writeBuffer();root.saveAs(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`LBG_TRUONG_${safeFile(d.school)}${d.site?`_${safeFile(d.site)}`:''}_${safeFile(d.ws.name)}_${safeFile(d.mode)}.xlsx`);if(typeof root.toast==='function')root.toast(`Đã xuất LBG ${d.label} • ${MODES[d.mode]||d.mode}.`)}catch(error){console.error(error);root.alert?.('Không xuất được LBG theo trường: '+(error?.message||String(error)))}finally{exportBusy=false;if(button){button.disabled=false;button.textContent=old||'⇩ Xuất Excel'}}
  }
  function install(){
    if(installed)return;installed=true;ensureCard();root.document.addEventListener('lbg-access-ready',()=>setTimeout(refresh,0));setTimeout(refresh,300);setTimeout(refresh,900);root.LBGSchoolReportV1={version:VERSION,MODES,classText,teacherCodeText,displayEntry,schoolKey,siteText,targetKey,collectSchoolOptions,collectSchoolSiteOptions,filterBySchool,filterBySchoolSite,slotKey,buildSlots,reportLocationText,footerText,canWholeSchool,refresh,renderCurrent,addExcelSheet};
  }
  return{VERSION,MODES,classText,teacherCodeText,displayEntry,schoolKey,siteText,targetKey,collectSchoolOptions,collectSchoolSiteOptions,filterBySchool,filterBySchoolSite,slotKey,buildSlots,reportLocationText,footerText,install};
});
