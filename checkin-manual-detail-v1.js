'use strict';
(function(){
  const VERSION='20260813.1';
  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').replace(/\s+/g,' ').trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fold=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase();
  let observer=null,queued=false,current=null,position=null;

  function style(){
    if(q('lbgCheckinManualDetailCss'))return;
    const s=document.createElement('style');s.id='lbgCheckinManualDetailCss';s.textContent=`
      .lbg-manual-detail-grid{display:grid;grid-template-columns:minmax(190px,1.2fr) minmax(130px,.55fr) minmax(145px,.6fr) minmax(180px,.8fr);gap:8px;margin-top:8px}
      .lbg-manual-detail-grid label{display:grid;gap:4px;color:#6f4b39;font-size:12px;font-weight:850;min-width:0}
      .lbg-manual-detail-grid input,.lbg-manual-detail-grid select{width:100%;min-height:42px;padding:9px 10px;border:1px solid #e2d2c8;border-radius:10px;background:#fff;color:#4b342b;font:inherit}
      .lbg-manual-substitute{margin-top:8px;padding:10px 11px;border:1px solid #f0d9c8;border-radius:12px;background:#fff8f2}
      .lbg-manual-substitute label{display:grid;gap:5px;color:#6f4b39;font-size:12px;font-weight:850}
      .lbg-manual-substitute select{width:100%;min-height:42px;padding:9px 10px;border:1px solid #e2d2c8;border-radius:10px;background:#fff;color:#4b342b;font:inherit}
      .lbg-manual-context{margin-top:8px;padding:9px 11px;border-radius:11px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;font-size:12.5px;line-height:1.5}
      .lbg-manual-context.warn{background:#fff7ed;border-color:#fed7aa;color:#9a3412}
      .lbg-manual-context.ok{background:#ecfdf5;border-color:#bbf7d0;color:#166534}
      .lbg-manual-help{margin-top:6px;color:#806b61;font-size:11.5px;line-height:1.45}
      .lbg-manual-confirm-dialog{border:0;border-radius:18px;padding:0;width:min(720px,calc(100% - 24px));box-shadow:0 28px 90px rgba(15,23,42,.32)}
      .lbg-manual-confirm-dialog::backdrop{background:rgba(15,23,42,.45)}
      .lbg-manual-confirm-body{padding:18px}.lbg-manual-confirm-body h3{margin:0;color:#5b3828}.lbg-manual-confirm-meta{display:grid;gap:7px;margin:12px 0}.lbg-manual-confirm-row{padding:9px 10px;border:1px solid #eadfd8;border-radius:10px;background:#fffaf7;color:#5b3828;font-size:13px}
      @media(max-width:1050px){.lbg-manual-detail-grid{grid-template-columns:1fr 1fr}}
      @media(max-width:650px){.lbg-manual-detail-grid{grid-template-columns:1fr}}
    `;document.head.appendChild(s)
  }

  function vnDateKey(){
    try{return window.LBGCheckinV2?.today?.()||''}catch{return''}
  }
  function shared(){try{return window.LBGCheckinV2?.getSharedTimetable?.()||null}catch{return null}}
  function auth(){return window.LBGAuth||null}
  function parsePeriods(raw){
    const out=new Set(),parts=txt(raw).replace(/[–—]/g,'-').split(/[;,\s]+/).filter(Boolean);
    for(const part of parts){
      const m=part.match(/^(\d{1,2})-(\d{1,2})$/);
      if(m){const a=Number(m[1]),b=Number(m[2]);if(a<1||b<1||a>20||b>20||a>b)return null;for(let n=a;n<=b;n++)out.add(n);continue}
      if(!/^\d{1,2}$/.test(part))return null;const n=Number(part);if(n<1||n>20)return null;out.add(n)
    }
    return[...out].sort((a,b)=>a-b)
  }
  function scanToday(){
    const sh=shared(),book=sh?.workbook,scanner=window.LBGTeacherIntelligenceV6?.scanSheet,date=vnDateKey();
    if(sh?.status!=='ready'||!book||!scanner||!date)return[];
    const rows=[];
    for(const ws of book.worksheets||[]){
      let groups=[];try{groups=scanner(ws)?.groups||[]}catch{continue}
      for(const g of groups){
        if(txt(g.dateKey)!==date)continue;
        const school=txt(g.school),session=txt(g.session);if(!school||!['Sáng','Chiều'].includes(session))continue;
        rows.push({sheet:txt(g.sheet)||ws.name,school,session,period:Number(g.period),teacher_code:txt(g.code).toUpperCase(),teacher_name:txt(g.teacherName)||txt(g.code).toUpperCase(),classes:[...(g.members||[])].map(txt).filter(Boolean)})
      }
    }
    return rows
  }
  function schoolsToday(rows){return[...new Map(rows.map(r=>[fold(r.school),r.school])).values()].sort((a,b)=>a.localeCompare(b,'vi'))}
  function candidates(rows,school,session){
    const sf=fold(school),ss=txt(session);if(!sf)return[];
    const exact=rows.filter(r=>fold(r.school)===sf&&r.session===ss);
    const source=exact.length?exact:rows.filter(r=>fold(r.school).includes(sf)&&r.session===ss);
    const map=new Map();
    for(const r of source){const key=r.teacher_code||fold(r.teacher_name);if(!map.has(key))map.set(key,{teacher_code:r.teacher_code,teacher_name:r.teacher_name,school:r.school,session:r.session,periods:new Set(),classes:new Set(),sheets:new Set()});const x=map.get(key);if(Number.isFinite(r.period)&&r.period>0)x.periods.add(r.period);for(const c of r.classes)x.classes.add(c);if(r.sheet)x.sheets.add(r.sheet)}
    return[...map.values()].map(x=>({...x,periods:[...x.periods].sort((a,b)=>a-b),classes:[...x.classes],sheets:[...x.sheets]})).sort((a,b)=>a.teacher_name.localeCompare(b.teacher_name,'vi'))
  }
  function htmOpt(v,label){return`<option value="${esc(v)}">${esc(label)}</option>`}

  function installFields(form){
    if(form.dataset.lbgManualDetail==='1')return;
    const school=q('lbgCheckinManualSchool'),session=q('lbgCheckinManualSession'),reason=q('lbgCheckinManualReason'),button=q('lbgCheckinManualStart');if(!school||!session||!reason||!button)return;
    form.dataset.lbgManualDetail='1';
    const oldGrid=form.querySelector('.lbg-checkin-manual-grid');if(oldGrid)oldGrid.style.display='none';
    const rows=scanToday(),list=document.createElement('datalist');list.id='lbgCheckinManualSchoolList';list.innerHTML=schoolsToday(rows).map(s=>`<option value="${esc(s)}"></option>`).join('');form.appendChild(list);school.setAttribute('list',list.id);
    const grid=document.createElement('div');grid.className='lbg-manual-detail-grid';grid.innerHTML=`
      <label>Trường dạy<div data-school-slot></div></label>
      <label>Buổi dạy<div data-session-slot></div></label>
      <label>Tiết dạy<input id="lbgCheckinManualPeriods" inputmode="numeric" autocomplete="off" placeholder="VD: 1, 2, 5"></label>
      <label>Lý do<div data-reason-slot></div></label>`;
    oldGrid?.insertAdjacentElement('afterend',grid);
    grid.querySelector('[data-school-slot]').appendChild(school);grid.querySelector('[data-session-slot]').appendChild(session);grid.querySelector('[data-reason-slot]').appendChild(reason);
    const sub=document.createElement('div');sub.className='lbg-manual-substitute';sub.dataset.lbgManualSubstitute='1';sub.innerHTML=`<label>Dạy thay cho giáo viên<select id="lbgCheckinManualForTeacher"><option value="">Chọn giáo viên được dạy thay…</option></select></label><div class="lbg-manual-help">Khi trường và buổi có trong TKB chung, hệ thống sẽ gợi ý giáo viên cùng các tiết của giáo viên đó. Bạn vẫn có thể sửa lại tiết nếu điều động thực tế khác TKB.</div>`;grid.insertAdjacentElement('afterend',sub);
    const context=document.createElement('div');context.id='lbgCheckinManualContext';context.className='lbg-manual-context';sub.insertAdjacentElement('afterend',context);
    const help=document.createElement('div');help.className='lbg-manual-help';help.innerHTML='Với <b>TKB chưa cập nhật</b> hoặc <b>Điều động đột xuất</b>, hãy nhập rõ tiết thực tế. Thông tin tiết và giáo viên được dạy thay sẽ được lưu cùng bản ghi Check-in để đối chiếu sau này.';context.insertAdjacentElement('afterend',help);

    const replacement=button.cloneNode(true);button.replaceWith(replacement);replacement.id='lbgCheckinManualStart';replacement.addEventListener('click',onStart);
    for(const el of [school,session,reason,q('lbgCheckinManualPeriods'),q('lbgCheckinManualForTeacher')])el?.addEventListener(el.tagName==='INPUT'?'input':'change',()=>updateContext(rows));
    reason.addEventListener('change',()=>{q('lbgCheckinManualForTeacher').value='';q('lbgCheckinManualPeriods').dataset.autoFor='';updateContext(rows)});
    q('lbgCheckinManualForTeacher').addEventListener('change',()=>autoPeriods(rows));
    updateContext(rows)
  }

  function updateContext(rows=scanToday()){
    const school=txt(q('lbgCheckinManualSchool')?.value),session=txt(q('lbgCheckinManualSession')?.value)||'Khác',reason=txt(q('lbgCheckinManualReason')?.value)||'Khác',select=q('lbgCheckinManualForTeacher'),sub=document.querySelector('[data-lbg-manual-substitute]'),box=q('lbgCheckinManualContext');if(!select||!box)return;
    if(sub)sub.hidden=reason!=='Dạy thay';
    const cand=candidates(rows,school,session),previous=select.value;
    select.innerHTML='<option value="">Chọn giáo viên được dạy thay…</option>'+cand.map(c=>htmOpt(c.teacher_code||c.teacher_name,`${c.teacher_name}${c.teacher_code?` — ${c.teacher_code}`:''}${c.periods.length?` • Tiết ${c.periods.join(', ')}`:''}`)).join('');
    if(cand.some(c=>(c.teacher_code||c.teacher_name)===previous))select.value=previous;
    if(!school){box.className='lbg-manual-context';box.innerHTML='💡 Chọn hoặc nhập tên trường để hệ thống đối chiếu lịch dạy trong TKB chung hôm nay.';return}
    if(session==='Khác'){box.className='lbg-manual-context warn';box.innerHTML='Buổi <b>Khác</b> không có khung TKB chuẩn để tự gợi ý giáo viên. Hãy nhập tiết thực tế và thông tin cần thiết.';return}
    if(!cand.length){box.className='lbg-manual-context warn';box.innerHTML=`TKB chung hôm nay chưa tìm thấy giáo viên có lịch tại <b>${esc(school)}</b> • <b>${esc(session)}</b>. Nếu đây là điều động đột xuất/TKB chưa cập nhật, bạn vẫn có thể nhập tiết thực tế.`;return}
    const summary=cand.slice(0,5).map(c=>`${esc(c.teacher_name)}${c.periods.length?` — tiết ${esc(c.periods.join(', '))}`:''}`).join('; ');
    box.className='lbg-manual-context ok';box.innerHTML=`📘 TKB chung tìm thấy <b>${cand.length}</b> giáo viên tại trường/buổi này: ${summary}${cand.length>5?'…':''}.`;
  }
  function autoPeriods(rows=scanToday()){
    const select=q('lbgCheckinManualForTeacher'),period=q('lbgCheckinManualPeriods'),school=txt(q('lbgCheckinManualSchool')?.value),session=txt(q('lbgCheckinManualSession')?.value),key=txt(select?.value);if(!select||!period||!key)return;
    const c=candidates(rows,school,session).find(x=>(x.teacher_code||x.teacher_name)===key);if(!c)return;
    const oldAuto=period.dataset.autoFor||'';if(!txt(period.value)||oldAuto)period.value=c.periods.join(', ');period.dataset.autoFor=key;updateContext(rows)
  }
  function selectedCandidate(rows=scanToday()){
    const key=txt(q('lbgCheckinManualForTeacher')?.value),school=txt(q('lbgCheckinManualSchool')?.value),session=txt(q('lbgCheckinManualSession')?.value);if(!key)return null;return candidates(rows,school,session).find(x=>(x.teacher_code||x.teacher_name)===key)||null
  }

  function ensureDialog(){
    let d=q('lbgManualDetailPositionDialog');if(d)return d;d=document.createElement('dialog');d.id='lbgManualDetailPositionDialog';d.className='lbg-manual-confirm-dialog';d.innerHTML=`<div class="lbg-manual-confirm-body"><div class="head"><div><h3>📍 Xác nhận Check-in điểm dạy</h3><p id="lbgManualDetailDialogTitle"></p></div><button class="btn outline" id="lbgManualDetailClose">Đóng</button></div><div id="lbgManualDetailDialogMeta" class="lbg-manual-confirm-meta"></div><div id="lbgManualDetailGps" class="lbg-manual-context"></div><div class="lbg-checkin-actions" style="justify-content:flex-end;margin-top:12px"><button class="btn primary" id="lbgManualDetailConfirm">✅ Xác nhận Check-in</button></div><div class="lbg-manual-help">Chỉ khi bấm Xác nhận và máy chủ ghi thành công mới tính 1 lượt Check-in.</div></div>`;document.body.appendChild(d);q('lbgManualDetailClose').onclick=()=>d.close();q('lbgManualDetailConfirm').onclick=submit;return d
  }
  function onStart(){
    const school=txt(q('lbgCheckinManualSchool')?.value),session=txt(q('lbgCheckinManualSession')?.value)||'Khác',reason=txt(q('lbgCheckinManualReason')?.value)||'Khác',periods=parsePeriods(q('lbgCheckinManualPeriods')?.value),rows=scanToday(),candidate=selectedCandidate(rows);
    if(school.length<2)return alert('Hãy nhập tên trường.');
    if(!periods||!periods.length)return alert('Hãy nhập tiết dạy cụ thể, ví dụ: 1, 2, 5 hoặc 1-3.');
    if(reason==='Dạy thay'&&!candidate)return alert('Hãy chọn giáo viên mà bạn đang dạy thay. Nếu TKB chưa có giáo viên đó, hãy chọn lý do phù hợp như “TKB chưa cập nhật” hoặc “Điều động đột xuất”.');
    if(!navigator.geolocation)return alert('Thiết bị/trình duyệt này không hỗ trợ định vị.');
    const sh=shared(),reference={manual_detail_version:1,periods,classes:candidate?.classes||[],substitute_for:candidate?{teacher_code:candidate.teacher_code||null,teacher_name:candidate.teacher_name||null}:null,shared_tkb_id:sh?.row?.id||null,shared_tkb_name:sh?.row?.original_name||null,matched_sheets:candidate?.sheets||[]};
    current={school_name:school,session,schedule_source:'manual',manual_reason:reason,schedule_reference:reference,candidate,periods};position=null;
    const button=q('lbgCheckinManualStart'),old=button?.textContent;if(button){button.disabled=true;button.textContent='Đang lấy GPS…'}
    navigator.geolocation.getCurrentPosition(pos=>{
      position={latitude:pos.coords.latitude,longitude:pos.coords.longitude,accuracy_m:pos.coords.accuracy};const d=ensureDialog(),a=Number(pos.coords.accuracy)||0;
      q('lbgManualDetailDialogTitle').textContent=`${school} • ${session}`;
      q('lbgManualDetailDialogMeta').innerHTML=`<div class="lbg-manual-confirm-row"><b>Tiết dạy:</b> ${esc(periods.join(', '))}</div><div class="lbg-manual-confirm-row"><b>Lý do:</b> ${esc(reason)}</div>${candidate?`<div class="lbg-manual-confirm-row"><b>Dạy thay cho:</b> ${esc(candidate.teacher_name)}${candidate.teacher_code?` — ${esc(candidate.teacher_code)}`:''}</div>`:''}`;
      q('lbgManualDetailGps').className=`lbg-manual-context ${a>200?'warn':'ok'}`;q('lbgManualDetailGps').innerHTML=`<b>Đã lấy được vị trí GPS.</b><br>Độ chính xác hiện tại: <b>±${Math.round(a)} m</b>. ${a>200?'Tín hiệu đang thấp; bạn có thể đóng và thử lấy lại GPS nếu cần.':'Thông tin điểm dạy đã sẵn sàng để xác nhận.'}`;d.showModal();if(button){button.disabled=false;button.textContent=old}
    },error=>{if(button){button.disabled=false;button.textContent=old}const msg=error?.code===1?'Bạn chưa cho phép truy cập vị trí.':error?.code===2?'Không lấy được vị trí hiện tại. Hãy bật GPS và thử lại.':error?.code===3?'GPS phản hồi quá lâu. Hãy thử lại ở nơi thoáng hơn.':'Không lấy được GPS.';alert(msg+'\n\nLần này KHÔNG bị trừ lượt.')},{enableHighAccuracy:true,maximumAge:0,timeout:20000})
  }
  async function submit(){
    if(!current||!position)return;const api=auth(),button=q('lbgManualDetailConfirm'),old=button?.textContent;if(!api?.client)return alert('Hệ thống đăng nhập chưa sẵn sàng.');if(button){button.disabled=true;button.textContent='Đang ghi nhận…'}
    try{
      const{data,error}=await api.client.rpc('submit_teaching_checkin',{p_teaching_date:vnDateKey(),p_session:current.session,p_school_name:current.school_name,p_schedule_source:'manual',p_manual_reason:current.manual_reason,p_schedule_reference:current.schedule_reference,p_latitude:position.latitude,p_longitude:position.longitude,p_accuracy_m:position.accuracy_m});if(error)throw error;
      q('lbgManualDetailPositionDialog')?.close();alert(`Check-in thành công.\n\n${data?.school_name||current.school_name} • ${data?.session||current.session}\nTiết ${current.periods.join(', ')}${current.candidate?`\nDạy thay cho: ${current.candidate.teacher_name}`:''}\nCòn ${Number(data?.remaining??0)} lượt.`);current=null;position=null;await window.LBGCheckinV2?.refresh?.()
    }catch(error){alert('Không ghi được Check-in: '+(error?.message||String(error)))}finally{if(button){button.disabled=false;button.textContent=old}}
  }

  function apply(){queued=false;style();document.querySelectorAll('.lbg-checkin-manual').forEach(installFields)}
  function queue(){if(queued)return;queued=true;requestAnimationFrame(apply)}
  function start(){style();queue();observer=new MutationObserver(queue);observer.observe(document.body,{childList:true,subtree:true});document.addEventListener('lbg-access-ready',queue);window.addEventListener('focus',queue);window.addEventListener('beforeunload',()=>observer?.disconnect(),{once:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.LBGCheckinManualDetailV1={version:VERSION,refresh:queue};
})();