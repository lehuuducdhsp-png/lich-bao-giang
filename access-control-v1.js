'use strict';
(function(){
  if(!window.LBGAuth)return;
  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').trim();
  const escHtml=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  let auth=null,ctx=null,originalTeachers=null,patched=false,observer=null;
  const ownCode=()=>txt(ctx?.teacher_code).toUpperCase();
  const allowed=()=>new Set((ctx?.teacher_codes||[]).map(x=>txt(x).toUpperCase()).filter(Boolean));

  function style(){
    if(q('lbgAccessCss'))return;
    const s=document.createElement('style');s.id='lbgAccessCss';s.textContent=`
      .lbg-access-note{margin:10px 0;padding:10px 12px;border:1px solid #bfdbfe;background:#eff6ff;color:#1e3a8a;border-radius:11px;font-size:12px}
      .lbg-scope-card{background:#fff;border:1px solid #dbe6eb;border-radius:20px;padding:19px;box-shadow:0 14px 36px rgba(8,47,73,.09);margin-top:18px}
      .lbg-scope-controls{display:flex;gap:8px;align-items:end;flex-wrap:wrap}.lbg-scope-controls label{display:grid;gap:5px;font-size:12px;font-weight:750;min-width:240px}.lbg-scope-controls select{padding:10px 11px;border:1px solid #dbe6eb;border-radius:11px;background:#fff}
      .lbg-scope-table td,.lbg-scope-table th{white-space:normal}.lbg-setup-warning{margin:14px 0;padding:12px 14px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:12px}
      @media(max-width:760px){.lbg-scope-controls{display:grid}.lbg-scope-controls label{min-width:0}}
    `;document.head.appendChild(s);
  }

  function findCard(pattern){
    return [...document.querySelectorAll('section.card,section.lbg-owner-card,section')].find(card=>pattern.test(txt(card.querySelector('h3')?.textContent||card.querySelector('h2')?.textContent)))||null;
  }

  function updateUserbar(){
    const chip=q('lbgUserBar')?.querySelector('.lbg-userchip');if(!chip||!ctx)return;
    const name=auth?.profile?.display_name||auth?.profile?.username||'';
    let label='Thành viên';
    if(ctx.is_owner)label='Chủ sở hữu';
    else if(ctx.is_group_leader)label='Nhóm trưởng';
    else if((ctx.group_ids||[]).length>0)label='Phụ trách chuyên môn';
    chip.innerHTML=`<b>${escHtml(name)}</b> • ${escHtml(label)}`;
  }

  function patchTeachers(){
    if(patched||typeof window.teachers!=='function'||!ctx)return false;
    originalTeachers=window.teachers;
    window.LBGAllTeachers=originalTeachers;
    window.teachers=function(ws){
      const list=originalTeachers(ws)||[];
      if(ctx?.is_owner)return list;
      const set=allowed();
      return list.filter(x=>set.has(txt(x.code).toUpperCase()));
    };
    patched=true;
    return true;
  }

  function applyTeacherSelect(select,set){
    if(!select||!select.options)return;
    let first='';
    [...select.options].forEach(opt=>{
      const code=txt(opt.value).toUpperCase();
      if(!code)return;
      const ok=set.has(code);
      opt.hidden=!ok;opt.disabled=!ok;
      if(ok&&!first)first=opt.value;
    });
    const current=txt(select.value).toUpperCase();
    if(current&&!set.has(current)){
      select.value=first||'';
      select.dispatchEvent(new Event('change',{bubbles:true}));
    }
  }

  function enforceReportScope(){
    if(!ctx||ctx.is_owner)return;
    const set=allowed(),select=q('teacher');
    applyTeacherSelect(select,set);
    const card=findCard(/^3\.\s*Kiểm tra và lập báo giảng/i);
    if(card&&!card.querySelector('.lbg-access-note')){
      const names=ctx.is_group_leader?'các thành viên thuộc nhóm được quản lý':((ctx.group_ids||[]).length?'các nhóm được chủ sở hữu giao':'chính bạn');
      const n=document.createElement('div');n.className='lbg-access-note';n.textContent=`Phạm vi báo giảng: chỉ hiển thị ${names}.`;
      card.querySelector('.head')?.insertAdjacentElement('afterend',n);
    }
  }

  function allTeacherCodes(){
    try{
      const ws=typeof wb!=='undefined'&&wb?wb.getWorksheet(q('week')?.value):null;
      return new Set((originalTeachers?.(ws)||[]).map(x=>txt(x.code).toUpperCase()).filter(Boolean));
    }catch{return new Set()}
  }

  function protectPayroll(){
    if(!ctx||ctx.is_owner||ctx.can_view_payroll_details)return;
    const card=findCard(/Bảng kê tiết dạy tháng/i);if(!card)return;
    const code=ownCode();
    if(!card.querySelector('.lbg-access-note')){
      const n=document.createElement('div');n.className='lbg-access-note';n.innerHTML='<b>Dữ liệu riêng tư:</b> tài khoản này chỉ được xem và xuất bảng kê của chính mình. Nhóm trưởng không được xem bảng kê chi tiết hoặc số tiền của thành viên khác.';
      card.querySelector('.head')?.insertAdjacentElement('afterend',n);
    }
    if(!code){
      card.querySelectorAll('button,select').forEach(x=>x.disabled=true);
      return;
    }
    const only=new Set([code]);
    card.querySelectorAll('select').forEach(sel=>{
      const hasOwn=[...sel.options].some(o=>txt(o.value).toUpperCase()===code);
      if(hasOwn)applyTeacherSelect(sel,only);
    });
    const codes=allTeacherCodes();
    card.querySelectorAll('tbody tr').forEach(row=>{
      const text=txt(row.textContent).toUpperCase();
      const rowCodes=[...codes].filter(c=>c&&text.includes(c));
      row.hidden=rowCodes.length>0&&!rowCodes.includes(code);
    });
  }

  function weekOptions(){
    const source=q('week');
    return source?[...source.options].map(o=>`<option value="${escHtml(o.value)}">${escHtml(o.textContent)}</option>`).join(''):'<option>Chưa có tuần</option>';
  }

  function ensureScopedWeekly(){
    if(!ctx||ctx.can_view_all_weekly_stats)return;
    const global=q('weeklyStatsV6')||findCard(/Thống kê giáo viên và tiết dạy trong tuần/i);
    if(global)global.hidden=true;
    if(q('lbgScopedWeekly'))return;
    const main=document.querySelector('main.shell');if(!main)return;
    style();
    const card=document.createElement('section');card.id='lbgScopedWeekly';card.className='lbg-scope-card';
    const title=(ctx.group_ids||[]).length?'Thống kê tuần theo phạm vi được giao':'Thống kê tiết dạy cá nhân trong tuần';
    card.innerHTML=`<div class="head"><div><h3>6. ${escHtml(title)}</h3><p>Không hiển thị giáo viên ngoài phạm vi tài khoản.</p></div><span class="badge" id="lbgScopedWeeklyBadge">0 giáo viên</span></div><div class="lbg-scope-controls"><label>Tuần cần xem<select id="lbgScopedWeek">${weekOptions()}</select></label><button class="btn primary" id="lbgScopedRun">Xem thống kê</button><button class="btn outline" id="lbgScopedExport" disabled>Xuất Excel</button></div><div id="lbgScopedResult"><div class="empty">Chọn tuần và nhấn Xem thống kê.</div></div>`;
    if(global)global.insertAdjacentElement('afterend',card);else main.appendChild(card);
    q('lbgScopedRun').onclick=renderScopedWeekly;
    q('lbgScopedExport').onclick=exportScopedWeekly;
    q('week')?.addEventListener('change',()=>{q('lbgScopedWeek').innerHTML=weekOptions();q('lbgScopedWeek').value=q('week').value});
  }

  function scopedWeeklyData(){
    if(typeof wb==='undefined'||!wb)throw new Error('Hãy mở một file TKB trước.');
    const ws=wb.getWorksheet(q('lbgScopedWeek')?.value||q('week')?.value);
    if(!ws)throw new Error('Không tìm thấy tuần đang chọn.');
    const api=window.LBGTeacherIntelligenceV6;
    if(!api?.scanSheet)throw new Error('Mô-đun thống kê chưa sẵn sàng.');
    const scan=api.scanSheet(ws),set=allowed(),map=new Map();
    for(const e of scan.source){
      if(!set.has(txt(e.code).toUpperCase()))continue;
      if(!map.has(e.code))map.set(e.code,{code:e.code,name:e.teacherName,total:0,morning:0,afternoon:0,makeUp:0});
      const x=map.get(e.code);x.total++;if(e.session==='Sáng')x.morning++;else x.afternoon++;if(e.makeUp)x.makeUp++;
    }
    return{ws,list:[...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'vi'))};
  }

  function renderScopedWeekly(){
    const box=q('lbgScopedResult');
    try{
      const data=scopedWeeklyData();window.__lbgScopedWeeklyData=data;
      q('lbgScopedWeeklyBadge').textContent=`${data.list.length} giáo viên`;
      q('lbgScopedExport').disabled=!data.list.length;
      box.innerHTML=data.list.length?`<div class="wrap lbg-scope-table"><table><thead><tr><th>STT</th><th>Giáo viên</th><th>Mã</th><th>Tiết sáng</th><th>Tiết chiều</th><th>Tiết bù</th><th>Tổng tiết</th></tr></thead><tbody>${data.list.map((x,i)=>`<tr><td>${i+1}</td><td>${escHtml(x.name)}</td><td>${escHtml(x.code)}</td><td>${x.morning}</td><td>${x.afternoon}</td><td>${x.makeUp}</td><td><b>${x.total}</b></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Không có tiết trong phạm vi tài khoản ở tuần này.</div>';
    }catch(e){box.innerHTML=`<div class="alert warn"><b>Không thống kê được:</b> ${escHtml(e?.message||String(e))}</div>`}
  }

  async function exportScopedWeekly(){
    try{
      const data=window.__lbgScopedWeeklyData||scopedWeeklyData();
      if(!window.ExcelJS||!window.saveAs)throw new Error('Thư viện xuất Excel chưa sẵn sàng.');
      const book=new ExcelJS.Workbook(),ws=book.addWorksheet('THỐNG KÊ TUẦN');
      ws.addRow(['STT','GIÁO VIÊN','MÃ','TIẾT SÁNG','TIẾT CHIỀU','TIẾT BÙ','TỔNG TIẾT']);
      data.list.forEach((x,i)=>ws.addRow([i+1,x.name,x.code,x.morning,x.afternoon,x.makeUp,x.total]));
      ws.columns=[{width:8},{width:30},{width:14},{width:14},{width:14},{width:12},{width:14}];
      const h=ws.getRow(1);h.font={bold:true,color:{argb:'FFFFFFFF'}};h.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF0F766E'}};h.alignment={horizontal:'center'};
      const buf=await book.xlsx.writeBuffer();saveAs(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`THONG_KE_TUAN_${txt(data.ws.name).replace(/[^A-Za-z0-9_-]+/g,'_')}.xlsx`);
    }catch(e){alert(e?.message||String(e))}
  }

  function setupObserver(){
    if(observer)return;
    observer=new MutationObserver(()=>{patchTeachers();enforceReportScope();protectPayroll();ensureScopedWeekly();updateUserbar()});
    observer.observe(document.body,{childList:true,subtree:true});
    setInterval(()=>{patchTeachers();enforceReportScope();protectPayroll();ensureScopedWeekly();updateUserbar()},1200);
  }

  async function loadContext(){
    const {data,error}=await auth.client.rpc('my_access_context');
    if(error)throw error;
    ctx=data||{};
    window.LBGAccess={context:ctx,allowedTeacherCodes:allowed,isOwner:()=>Boolean(ctx?.is_owner),isGroupLeader:()=>Boolean(ctx?.is_group_leader),canViewAllWeekly:()=>Boolean(ctx?.can_view_all_weekly_stats),refresh:loadContext};
    updateUserbar();patchTeachers();enforceReportScope();protectPayroll();ensureScopedWeekly();setupObserver();
    document.dispatchEvent(new CustomEvent('lbg-access-ready',{detail:ctx}));
  }

  function setupFailure(error){
    console.error(error);
    if(auth?.isOwner()&&!q('lbgAccessSetupWarning')){
      const main=document.querySelector('main.shell'),n=document.createElement('div');n.id='lbgAccessSetupWarning';n.className='lbg-setup-warning';n.innerHTML='<b>Chưa kích hoạt mô-đun nhóm:</b> hãy chạy migration <code>20260804_groups_permissions.sql</code> trong Supabase SQL Editor.';main?.prepend(n);
    }
  }

  window.LBGAuth.onReady(a=>{auth=a;style();loadContext().catch(setupFailure)});
  window.LBGAuth.onLogout(()=>{observer?.disconnect();observer=null;ctx=null;auth=null;q('lbgScopedWeekly')?.remove();q('lbgAccessSetupWarning')?.remove()});
})();
