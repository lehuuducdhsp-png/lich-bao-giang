'use strict';
(function(){
  if(window.LBG_CHECKIN_ENABLED!==true)return;
  if(!window.LBGAuth)return;

  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fold=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase().replace(/\s+/g,' ');
  let auth=null,ctx=null,currentPosition=null,currentPoint=null,managerData=null,started=false;

  function style(){
    if(q('lbgCheckinCss'))return;
    const s=document.createElement('style');
    s.id='lbgCheckinCss';
    s.textContent=`
      .lbg-checkin-card{background:#fff;border:1px solid #f0ddd2;border-radius:20px;padding:19px;box-shadow:0 14px 36px rgba(91,56,40,.08);margin-top:18px}
      .lbg-checkin-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,.72fr);gap:14px}
      .lbg-checkin-panel{border:1px solid #f0ddd2;border-radius:16px;padding:14px;background:#fffdfb}
      .lbg-checkin-point{border:1px solid #eadfd8;border-radius:14px;padding:12px;margin-top:9px;background:#fff}
      .lbg-checkin-point-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
      .lbg-checkin-point h4{margin:0;color:#5b3828}.lbg-checkin-point p{margin:4px 0 0;color:#806b61;font-size:12px}
      .lbg-checkin-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}
      .lbg-checkin-pill{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:5px 8px;font-size:11px;font-weight:800;background:#fff3e8;color:#8f5636}
      .lbg-checkin-good{background:#ecfdf5;color:#166534}.lbg-checkin-fair{background:#fff7ed;color:#9a3412}.lbg-checkin-low{background:#fef2f2;color:#991b1b}
      .lbg-checkin-history{display:grid;gap:8px}.lbg-checkin-attempt{border:1px solid #e8e1dc;border-radius:12px;padding:10px;background:#fff}
      .lbg-checkin-attempt b{color:#5b3828}.lbg-checkin-meta{font-size:11px;color:#806b61;margin-top:3px}
      .lbg-checkin-empty{padding:18px;text-align:center;color:#806b61;border:1px dashed #e5d4ca;border-radius:13px;background:#fff}
      .lbg-checkin-manual{margin-top:12px;padding-top:12px;border-top:1px solid #eadfd8;display:grid;gap:8px}
      .lbg-checkin-manual-grid{display:grid;grid-template-columns:1fr 160px 190px;gap:8px}
      .lbg-checkin-manual input,.lbg-checkin-manual select,.lbg-checkin-toolbar input{width:100%;padding:9px 10px;border:1px solid #e2d2c8;border-radius:10px;background:#fff}
      .lbg-checkin-note{padding:10px 12px;border-radius:12px;font-size:12px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;margin-top:10px}
      .lbg-checkin-warn{background:#fff7ed;border-color:#fed7aa;color:#9a3412}
      .lbg-checkin-manager-list{display:grid;gap:10px;margin-top:12px}
      .lbg-checkin-manager-slot{border:1px solid #e5d8d0;border-radius:14px;padding:12px;background:#fff}
      .lbg-checkin-manager-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
      .lbg-checkin-manager-head h4{margin:0;color:#5b3828}.lbg-checkin-manager-head p{margin:3px 0;color:#806b61;font-size:12px}
      .lbg-checkin-manager-attempt{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:8px 0;border-top:1px solid #f1e8e2}
      .lbg-checkin-toolbar{display:flex;gap:8px;align-items:end;flex-wrap:wrap}.lbg-checkin-toolbar label{display:grid;gap:4px;font-size:12px;font-weight:800}
      .lbg-checkin-dialog{border:0;border-radius:18px;padding:0;width:min(560px,calc(100% - 24px));box-shadow:0 28px 90px rgba(15,23,42,.32)}
      .lbg-checkin-dialog::backdrop{background:rgba(15,23,42,.45)}
      .lbg-checkin-dialog-body{padding:18px}.lbg-checkin-dialog-grid{display:grid;gap:9px}.lbg-checkin-dialog-grid select,.lbg-checkin-dialog-grid textarea{width:100%;padding:10px;border:1px solid #ded1c9;border-radius:10px;background:#fff}
      @media(max-width:900px){.lbg-checkin-grid{grid-template-columns:1fr}}
      @media(max-width:700px){.lbg-checkin-manual-grid{grid-template-columns:1fr}.lbg-checkin-point-head,.lbg-checkin-manager-head{display:grid}.lbg-checkin-manager-attempt{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  function vnDateKey(date=new Date()){
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
    const map=Object.fromEntries(parts.map(x=>[x.type,x.value]));
    return `${map.year}-${map.month}-${map.day}`;
  }

  function fmtDateTime(value){
    if(!value)return'';
    const d=new Date(value);if(Number.isNaN(d.getTime()))return txt(value);
    return new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(d);
  }

  function fmtTime(value){
    if(!value)return'';
    const d=new Date(value);if(Number.isNaN(d.getTime()))return txt(value);
    return new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(d);
  }

  function qualityLabel(qv,accuracy){const a=Math.round(Number(accuracy)||0);if(qv==='good')return`GPS tốt ±${a} m`;if(qv==='fair')return`GPS trung bình ±${a} m`;return`GPS thấp ±${a} m`}
  function qualityClass(qv){return qv==='good'?'lbg-checkin-good':qv==='fair'?'lbg-checkin-fair':'lbg-checkin-low'}
  function googleMapsUrl(lat,lng){const query=encodeURIComponent(`${Number(lat)},${Number(lng)}`);return`https://www.google.com/maps/search/?api=1&query=${query}`}
  function openMap(lat,lng){if(!Number.isFinite(Number(lat))||!Number.isFinite(Number(lng)))return alert('Không có tọa độ hợp lệ.');window.open(googleMapsUrl(lat,lng),'_blank','noopener,noreferrer')}
  async function rpc(name,args={}){const{data,error}=await auth.client.rpc(name,args);if(error)throw error;return data}

  function findInsertAnchor(){const hero=document.querySelector('section.hero');const grid=hero?.nextElementSibling;return grid||hero||document.querySelector('main.shell')?.firstElementChild||null}
  function ensureCard(){let card=q('lbgCheckinCard');if(card)return card;const main=document.querySelector('main.shell');if(!main)return null;style();card=document.createElement('section');card.id='lbgCheckinCard';card.className='lbg-checkin-card';const anchor=findInsertAnchor();if(anchor)anchor.insertAdjacentElement('afterend',card);else main.prepend(card);return card}

  function timetablePoints(){
    const code=txt(ctx?.teacher_code).toUpperCase(),date=vnDateKey();
    if(!code||typeof wb==='undefined'||!wb||!window.LBGTeacherIntelligenceV6?.scanSheet)return[];
    const map=new Map();
    for(const ws of wb.worksheets||[]){
      let groups=[];try{groups=window.LBGTeacherIntelligenceV6.scanSheet(ws)?.groups||[]}catch{continue}
      for(const g of groups){
        if(txt(g.code).toUpperCase()!==code||txt(g.dateKey)!==date)continue;
        const school=txt(g.school),session=txt(g.session)||'Khác';if(!school)continue;
        const key=`${fold(session)}|${fold(school)}`;
        if(!map.has(key))map.set(key,{school_name:school,session:['Sáng','Chiều'].includes(session)?session:'Khác',schedule_source:'timetable',manual_reason:null,schedule_reference:{sheets:[],periods:[],classes:[]}});
        const x=map.get(key);if(g.sheet&&!x.schedule_reference.sheets.includes(g.sheet))x.schedule_reference.sheets.push(g.sheet);if(Number.isFinite(Number(g.period))&&!x.schedule_reference.periods.includes(Number(g.period)))x.schedule_reference.periods.push(Number(g.period));for(const c of g.members||[])if(c&&!x.schedule_reference.classes.includes(c))x.schedule_reference.classes.push(c);
      }
    }
    return[...map.values()].sort((a,b)=>{const sa=a.session==='Sáng'?0:a.session==='Chiều'?1:2,sb=b.session==='Sáng'?0:b.session==='Chiều'?1:2;return sa-sb||a.school_name.localeCompare(b.school_name,'vi')});
  }

  function pointKey(p){return`${fold(p.session)}|${fold(p.school_name)}`}
  function mySlotMap(day){const m=new Map();for(const s of day?.slots||[])m.set(pointKey(s),s);return m}
  async function loadMyDay(){return await rpc('my_checkin_day',{p_teaching_date:vnDateKey()})}
  function teacherEligible(){return Boolean(ctx&&!ctx.is_owner&&!ctx.is_group_leader&&txt(ctx.teacher_code))}
  function managerEligible(){return Boolean(ctx&&(ctx.is_owner||ctx.is_group_leader||ctx.is_manager))}

  async function render(){
    const card=ensureCard();if(!card||!ctx||!auth)return;card.innerHTML='<div class="empty">Đang tải Check-in…</div>';
    let day={slots:[]},setupError=null;try{day=await loadMyDay()}catch(e){setupError=e}
    const blocks=[];
    if(teacherEligible())blocks.push(renderTeacherPanel(day,setupError));
    else if(ctx.is_group_leader)blocks.push(`<div class="lbg-checkin-panel"><h3 style="margin-top:0">📍 Check-in giảng dạy</h3><div class="lbg-checkin-note"><b>Nhóm trưởng không cần check-in.</b><br>Bạn có thể dùng phần quản lý bên dưới để xem vị trí giáo viên trong nhóm khi cần.</div></div>`);
    else if(ctx.is_owner)blocks.push(`<div class="lbg-checkin-panel"><h3 style="margin-top:0">📍 Check-in giảng dạy</h3><div class="lbg-checkin-note">Chủ sở hữu không thuộc đối tượng check-in. Dữ liệu chỉ ghi vị trí tại thời điểm giáo viên chủ động bấm xác nhận.</div></div>`);
    else if(!txt(ctx.teacher_code))blocks.push(`<div class="lbg-checkin-panel"><h3 style="margin-top:0">📍 Check-in giảng dạy</h3><div class="lbg-checkin-note lbg-checkin-warn">Tài khoản chưa được gán mã giáo viên nên chưa thể check-in.</div></div>`);
    if(managerEligible())blocks.push(renderManagerPanel());
    card.innerHTML=`<div class="head"><div><h3>📍 CHECK-IN GIẢNG DẠY</h3><p>Ghi nhận GPS đúng thời điểm bấm. Không theo dõi vị trí nền và không tự kết luận “đúng trường”.</p></div><span class="badge">${esc(vnDateKey().split('-').reverse().join('/'))}</span></div><div class="lbg-checkin-grid">${blocks.join('')}</div>`;
    bindTeacher(day);bindManager();if(managerEligible())loadManager(vnDateKey()).catch(showManagerError);
  }

  function renderTeacherPanel(day,setupError){
    if(setupError){const msg=setupError?.message||String(setupError),missing=/my_checkin_day|schema cache|function/i.test(msg);return`<div class="lbg-checkin-panel"><h4 style="margin-top:0">Check-in của tôi</h4><div class="lbg-checkin-note lbg-checkin-warn">${missing?'<b>Check-in V1 chưa được kích hoạt trong Supabase staging.</b><br>Hãy chạy migration <code>20260810_checkin_v1.sql</code> ở môi trường thử nghiệm trước.':esc(msg)}</div></div>`}
    const points=timetablePoints(),slots=mySlotMap(day);
    const pointHtml=points.length?points.map(p=>pointCard(p,slots.get(pointKey(p)))).join(''):`<div class="lbg-checkin-empty">Chưa tìm thấy điểm dạy hôm nay trong TKB đang mở. Nếu bạn dạy thay hoặc TKB chưa cập nhật, dùng “Điểm dạy khác / Dạy thay” bên dưới.</div>`;
    const history=(day?.slots||[]).length?day.slots.map(historySlot).join(''):`<div class="lbg-checkin-empty">Hôm nay chưa có lần check-in nào.</div>`;
    return`<div class="lbg-checkin-panel"><h4 style="margin-top:0">Điểm dạy hôm nay</h4>${pointHtml}<div class="lbg-checkin-manual"><b>+ Điểm dạy khác / Dạy thay</b><div class="lbg-checkin-manual-grid"><input id="lbgCheckinManualSchool" maxlength="160" placeholder="Nhập tên trường"><select id="lbgCheckinManualSession"><option>Sáng</option><option>Chiều</option><option>Khác</option></select><select id="lbgCheckinManualReason"><option value="Dạy thay">Dạy thay</option><option value="Điều động đột xuất">Điều động đột xuất</option><option value="TKB chưa cập nhật">TKB chưa cập nhật</option><option value="Khác">Khác</option></select></div><button class="btn outline" id="lbgCheckinManualStart">📍 Check-in điểm dạy này</button></div><div class="lbg-checkin-note">Mỗi điểm dạy có <b>3 lượt</b>. Chỉ lần ghi nhận thành công trên máy chủ mới trừ lượt. Hết lượt thì báo Nhóm trưởng để cấp thêm đúng 3 lượt cho điểm dạy đó.</div></div><div class="lbg-checkin-panel"><h4 style="margin-top:0">Lịch sử hôm nay</h4><div class="lbg-checkin-history">${history}</div></div>`;
  }

  function pointCard(p,s){const remaining=s?Number(s.remaining):3,used=s?Number(s.attempts_used):0,disabled=remaining<=0;return`<article class="lbg-checkin-point" data-checkin-point="${esc(encodeURIComponent(JSON.stringify(p)))}"><div class="lbg-checkin-point-head"><div><h4>🏫 ${esc(p.school_name)}</h4><p>${esc(p.session)} • ${p.schedule_source==='timetable'?'Theo TKB':'Ngoài lịch dự kiến'}</p></div><span class="lbg-checkin-pill">${used}/${s?.quota_total||3} lượt đã dùng</span></div>${disabled?'<div class="lbg-checkin-note lbg-checkin-warn"><b>Đã hết lượt.</b> Hãy báo Nhóm trưởng để được cấp thêm 3 lượt cho đúng điểm dạy này.</div>':''}<div class="lbg-checkin-actions"><button class="btn primary" data-checkin-start ${disabled?'disabled':''}>📍 ${used?'Check-in lại':'Check-in'}</button></div></article>`}

  function historySlot(s){const attempts=s.attempts||[];return`<article class="lbg-checkin-point"><div class="lbg-checkin-point-head"><div><h4>${esc(s.school_name)}</h4><p>${esc(s.session)} • ${s.schedule_source==='manual'?'⚠ Địa điểm tự khai báo':'Theo TKB'}</p></div><span class="lbg-checkin-pill">Còn ${Number(s.remaining)||0} lượt</span></div><div class="lbg-checkin-history">${attempts.map(a=>`<div class="lbg-checkin-attempt"><b>Lần ${a.attempt_no} • ${esc(fmtTime(a.checked_at))}</b><div class="lbg-checkin-meta"><span class="lbg-checkin-pill ${qualityClass(a.gps_quality)}">${esc(qualityLabel(a.gps_quality,a.accuracy_m))}</span></div><div class="lbg-checkin-actions"><button class="btn outline mini" data-map-lat="${a.latitude}" data-map-lng="${a.longitude}">🗺️ Xem điểm GPS</button></div></div>`).join('')}</div></article>`}

  function renderManagerPanel(){return`<div class="lbg-checkin-panel" style="grid-column:1/-1"><div class="head"><div><h4 style="margin:0">Kiểm tra Check-in</h4><p>Chỉ mở bản đồ khi cần đối chiếu. Nhóm trưởng thấy thành viên thuộc nhóm; Quản lý/Chủ sở hữu thấy phạm vi được phép.</p></div></div><div class="lbg-checkin-toolbar"><label>Ngày<input type="date" id="lbgCheckinManagerDate" value="${esc(vnDateKey())}"></label><button class="btn outline" id="lbgCheckinManagerRefresh">Làm mới</button></div><div id="lbgCheckinManagerResult" class="lbg-checkin-manager-list"><div class="lbg-checkin-empty">Đang tải…</div></div></div>`}

  async function loadManager(date){const box=q('lbgCheckinManagerResult');if(!box)return;box.innerHTML='<div class="lbg-checkin-empty">Đang tải…</div>';managerData=await rpc('checkin_dashboard',{p_teaching_date:date});const items=managerData?.items||[];if(!items.length){box.innerHTML='<div class="lbg-checkin-empty">Chưa có lượt check-in nào trong ngày này.</div>';return}const slots=new Map();for(const x of items){if(!slots.has(x.slot_id))slots.set(x.slot_id,{...x,attempts:[]});if(x.checkin_id)slots.get(x.slot_id).attempts.push(x)}box.innerHTML=[...slots.values()].map(managerSlot).join('');bindManagerRows()}
  function managerSlot(s){const attempts=[...(s.attempts||[])].sort((a,b)=>Number(a.attempt_no)-Number(b.attempt_no));return`<article class="lbg-checkin-manager-slot"><div class="lbg-checkin-manager-head"><div><h4>${esc(s.display_name)} ${s.teacher_code?`— ${esc(s.teacher_code)}`:''}</h4><p>🏫 ${esc(s.school_name)} • ${esc(s.session)} ${s.schedule_source==='manual'?'• ⚠ Địa điểm tự khai báo':''}</p></div><span class="lbg-checkin-pill">${Number(s.attempts_used)}/${Number(s.quota_total)} lượt</span></div>${s.manual_reason?`<div class="lbg-checkin-meta">Lý do ngoài TKB: ${esc(s.manual_reason)}</div>`:''}<div>${attempts.map(a=>`<div class="lbg-checkin-manager-attempt"><div><b>Lần ${a.attempt_no} • ${esc(fmtDateTime(a.checked_at))}</b><div class="lbg-checkin-meta"><span class="lbg-checkin-pill ${qualityClass(a.gps_quality)}">${esc(qualityLabel(a.gps_quality,a.accuracy_m))}</span></div></div><button class="btn outline mini" data-manager-map-lat="${a.latitude}" data-manager-map-lng="${a.longitude}">📍 Xem vị trí</button></div>`).join('')}</div>${Number(s.remaining)<=0?`<div class="lbg-checkin-actions"><button class="btn primary" data-grant-slot="${s.slot_id}" data-grant-name="${esc(s.display_name)}" data-grant-school="${esc(s.school_name)}">+ Cấp thêm 3 lượt</button></div>`:''}</article>`}
  function showManagerError(e){const box=q('lbgCheckinManagerResult');if(!box)return;const msg=e?.message||String(e);box.innerHTML=`<div class="lbg-checkin-note lbg-checkin-warn">${/checkin_dashboard|schema cache|function/i.test(msg)?'<b>Check-in V1 chưa được kích hoạt trong Supabase staging.</b>':esc(msg)}</div>`}

  function bindTeacher(){document.querySelectorAll('[data-checkin-start]').forEach(b=>b.onclick=()=>{const raw=b.closest('[data-checkin-point]')?.dataset.checkinPoint;if(!raw)return;try{startLocate(JSON.parse(decodeURIComponent(raw)),b)}catch(e){alert(e?.message||String(e))}});q('lbgCheckinManualStart')?.addEventListener('click',()=>{const school=txt(q('lbgCheckinManualSchool')?.value),session=txt(q('lbgCheckinManualSession')?.value)||'Khác',reason=txt(q('lbgCheckinManualReason')?.value)||'Khác';if(school.length<2)return alert('Hãy nhập tên trường.');startLocate({school_name:school,session,schedule_source:'manual',manual_reason:reason,schedule_reference:{}},q('lbgCheckinManualStart'))});document.querySelectorAll('[data-map-lat]').forEach(b=>b.onclick=()=>openMap(b.dataset.mapLat,b.dataset.mapLng))}
  function bindManager(){q('lbgCheckinManagerRefresh')?.addEventListener('click',()=>loadManager(q('lbgCheckinManagerDate')?.value||vnDateKey()).catch(showManagerError));q('lbgCheckinManagerDate')?.addEventListener('change',()=>loadManager(q('lbgCheckinManagerDate')?.value||vnDateKey()).catch(showManagerError))}
  function bindManagerRows(){document.querySelectorAll('[data-manager-map-lat]').forEach(b=>b.onclick=()=>openMap(b.dataset.managerMapLat,b.dataset.managerMapLng));document.querySelectorAll('[data-grant-slot]').forEach(b=>b.onclick=()=>openGrantDialog(b.dataset.grantSlot,b.dataset.grantName,b.dataset.grantSchool))}

  function ensurePositionDialog(){let d=q('lbgCheckinPositionDialog');if(d)return d;d=document.createElement('dialog');d.id='lbgCheckinPositionDialog';d.className='lbg-checkin-dialog';d.innerHTML=`<div class="lbg-checkin-dialog-body"><div class="head"><div><h3>Xác nhận vị trí Check-in</h3><p id="lbgCheckinPositionSchool"></p></div><button class="btn outline" id="lbgCheckinPositionClose">Đóng</button></div><div id="lbgCheckinPositionBody"></div><div class="lbg-checkin-actions" style="justify-content:flex-end"><button class="btn outline" id="lbgCheckinPositionMap">🗺️ Xem vị trí vừa lấy</button><button class="btn primary" id="lbgCheckinConfirm">✅ Xác nhận check-in</button></div></div>`;document.body.appendChild(d);q('lbgCheckinPositionClose').onclick=()=>d.close();q('lbgCheckinPositionMap').onclick=()=>currentPosition&&openMap(currentPosition.latitude,currentPosition.longitude);q('lbgCheckinConfirm').onclick=submitCurrent;return d}

  async function startLocate(point,button){
    if(!navigator.geolocation)return alert('Thiết bị/trình duyệt này không hỗ trợ định vị.');
    const old=button?.textContent;if(button){button.disabled=true;button.textContent='Đang lấy GPS…'}currentPoint=point;currentPosition=null;
    navigator.geolocation.getCurrentPosition(pos=>{currentPosition={latitude:pos.coords.latitude,longitude:pos.coords.longitude,accuracy_m:pos.coords.accuracy};const d=ensurePositionDialog(),a=Number(pos.coords.accuracy)||0;q('lbgCheckinPositionSchool').textContent=`${point.school_name} • ${point.session}`;q('lbgCheckinPositionBody').innerHTML=`<div class="lbg-checkin-note ${a>200?'lbg-checkin-warn':''}"><b>Đã lấy được vị trí GPS.</b><br>Độ chính xác hiện tại: <b>±${Math.round(a)} m</b>. ${a>200?'Tín hiệu đang thấp; bạn nên đóng cửa sổ và thử lại GPS nếu có thể. Bạn vẫn được phép xác nhận và hệ thống sẽ ghi rõ độ chính xác này.':'Bạn có thể xem vị trí vừa lấy trước khi xác nhận.'}</div><div class="lbg-checkin-meta" style="margin-top:9px">Chỉ khi bấm <b>Xác nhận check-in</b> và máy chủ ghi thành công mới tính 1 lượt.</div>`;d.showModal();if(button){button.disabled=false;button.textContent=old}},err=>{if(button){button.disabled=false;button.textContent=old}const msg=err?.code===1?'Bạn chưa cho phép truy cập vị trí.':err?.code===2?'Không lấy được vị trí hiện tại. Hãy bật GPS và thử lại.':err?.code===3?'GPS phản hồi quá lâu. Hãy thử lại ở nơi thoáng hơn.':'Không lấy được GPS.';alert(msg+'\n\nLần này KHÔNG bị trừ lượt.')},{enableHighAccuracy:true,maximumAge:0,timeout:20000});
  }

  async function submitCurrent(){if(!currentPoint||!currentPosition)return;const b=q('lbgCheckinConfirm'),old=b?.textContent;if(b){b.disabled=true;b.textContent='Đang ghi nhận…'}try{const result=await rpc('submit_teaching_checkin',{p_teaching_date:vnDateKey(),p_session:currentPoint.session,p_school_name:currentPoint.school_name,p_schedule_source:currentPoint.schedule_source,p_manual_reason:currentPoint.manual_reason,p_schedule_reference:currentPoint.schedule_reference||{},p_latitude:currentPosition.latitude,p_longitude:currentPosition.longitude,p_accuracy_m:currentPosition.accuracy_m});q('lbgCheckinPositionDialog')?.close();alert(`Check-in thành công.\n\n${result.school_name} • ${result.session}\nThời gian máy chủ: ${fmtDateTime(result.checked_at)}\nLần ${result.attempt_no}/${result.quota_total}\nCòn ${result.remaining} lượt.`);currentPoint=null;currentPosition=null;await render()}catch(e){alert('Không ghi nhận được Check-in: '+(e?.message||String(e))+'\n\nNếu máy chủ chưa ghi thành công thì không mất lượt.')}finally{if(b){b.disabled=false;b.textContent=old}}}

  function ensureGrantDialog(){let d=q('lbgCheckinGrantDialog');if(d)return d;d=document.createElement('dialog');d.id='lbgCheckinGrantDialog';d.className='lbg-checkin-dialog';d.innerHTML=`<div class="lbg-checkin-dialog-body"><div class="head"><div><h3>Cấp thêm 3 lượt Check-in</h3><p id="lbgCheckinGrantTarget"></p></div><button class="btn outline" id="lbgCheckinGrantClose">Đóng</button></div><div class="lbg-checkin-dialog-grid"><label><b>Lý do</b><select id="lbgCheckinGrantReason"><option>Đi nhầm trường</option><option>GPS lỗi</option><option>Chọn nhầm điểm dạy</option><option>Đổi lịch / dạy thay</option><option>Khác</option></select></label><label id="lbgCheckinGrantOtherWrap" hidden><b>Ghi rõ lý do</b><textarea id="lbgCheckinGrantOther" rows="3" maxlength="200"></textarea></label></div><div class="lbg-checkin-actions" style="justify-content:flex-end"><button class="btn primary" id="lbgCheckinGrantConfirm">+ Cấp 3 lượt</button></div></div>`;document.body.appendChild(d);q('lbgCheckinGrantClose').onclick=()=>d.close();q('lbgCheckinGrantReason').onchange=()=>{q('lbgCheckinGrantOtherWrap').hidden=q('lbgCheckinGrantReason').value!=='Khác'};return d}
  function openGrantDialog(slotId,name,school){const d=ensureGrantDialog();d.dataset.slotId=slotId;q('lbgCheckinGrantTarget').textContent=`${name} • ${school}`;q('lbgCheckinGrantReason').value='Đi nhầm trường';q('lbgCheckinGrantOther').value='';q('lbgCheckinGrantOtherWrap').hidden=true;q('lbgCheckinGrantConfirm').onclick=grantCurrent;d.showModal()}
  async function grantCurrent(){const d=q('lbgCheckinGrantDialog'),slotId=d?.dataset.slotId;if(!slotId)return;const selected=txt(q('lbgCheckinGrantReason')?.value),reason=selected==='Khác'?txt(q('lbgCheckinGrantOther')?.value):selected;if(reason.length<2)return alert('Hãy nhập lý do.');const b=q('lbgCheckinGrantConfirm'),old=b.textContent;b.disabled=true;b.textContent='Đang cấp…';try{const result=await rpc('grant_teaching_checkin_quota',{p_slot_id:slotId,p_reason:reason});d.close();alert(`Đã cấp thêm 3 lượt.\nTổng hạn mức mới: ${result.quota_total} lượt.\nCòn lại: ${result.remaining} lượt.`);await loadManager(q('lbgCheckinManagerDate')?.value||vnDateKey())}catch(e){alert('Không cấp được lượt: '+(e?.message||String(e)))}finally{b.disabled=false;b.textContent=old}}

  async function start(){if(!auth)return;ctx=window.LBGAccess?.context;if(!ctx)return;started=true;await render()}
  document.addEventListener('lbg-access-ready',()=>start().catch(console.error));
  document.addEventListener('lbg-tkb-changed',()=>{if(started)render().catch(console.error)});
  window.LBGAuth.onReady(a=>{auth=a;if(window.LBGAccess?.context)start().catch(console.error)});
  window.LBGAuth.onLogout(()=>{q('lbgCheckinCard')?.remove();q('lbgCheckinPositionDialog')?.remove();q('lbgCheckinGrantDialog')?.remove();auth=null;ctx=null;currentPosition=null;currentPoint=null;managerData=null;started=false});
  window.LBGCheckinV1={refresh:()=>render(),openMap,today:vnDateKey,getContext:()=>ctx};
})();
