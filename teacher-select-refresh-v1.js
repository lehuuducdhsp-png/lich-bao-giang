'use strict';
(function(){
  const q=id=>document.getElementById(id),txt=value=>String(value??'').trim(),escHtml=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let lastKey='',teacherObserver=null,queued=false;

  const context=()=>window.LBGAccess?.context||null;
  const ownCode=()=>txt(context()?.teacher_code).toUpperCase();
  function allowedCodes(){const set=new Set((context()?.teacher_codes||[]).map(code=>txt(code).toUpperCase()).filter(Boolean));const self=ownCode();if(self)set.add(self);return set}
  function reportCard(){return[...document.querySelectorAll('section.card,section.lbg-ui-section,section')].find(section=>/^3\.\s*Kiểm tra và lập báo giảng/i.test(txt(section.querySelector('h3,h2')?.textContent)))||null}
  function updateScopeNote(message,isWarning=false){const card=reportCard();if(!card)return;let note=card.querySelector('.lbg-access-note');if(!note){note=document.createElement('div');note.className='lbg-access-note';card.querySelector('.head')?.insertAdjacentElement('afterend',note)}if(note.textContent!==message)note.textContent=message;note.style.borderColor=isWarning?'#fed7aa':'#bfdbfe';note.style.background=isWarning?'#fff7ed':'#eff6ff';note.style.color=isWarning?'#9a3412':'#1e3a8a'}
  function sourceTeachers(ws){const fn=typeof window.LBGAllTeachers==='function'?window.LBGAllTeachers:window.teachers;if(typeof fn!=='function')return[];const map=new Map();for(const item of fn(ws)||[]){const code=txt(item?.code).toUpperCase();if(!code)continue;if(!map.has(code))map.set(code,{code,name:txt(item?.name||item?.teacherName||code)})}return[...map.values()]}

  function refresh(force=false){
    const ctx=context();if(!ctx||ctx.is_owner)return;
    const week=q('week'),teacher=q('teacher');if(!week||!teacher||!week.value||typeof wb==='undefined'||!wb)return;
    const ws=wb.getWorksheet(week.value);if(!ws)return;
    const all=sourceTeachers(ws),allowed=allowedCodes(),list=ctx.can_review_all_reports?all:all.filter(item=>allowed.has(item.code));
    const signature=[week.value,ctx.can_review_all_reports?'ALL':[...allowed].sort().join(','),list.map(item=>item.code).join(',')].join('|');
    const existing=[...teacher.options].filter(option=>txt(option.value)).map(option=>txt(option.value).toUpperCase());
    if(!force&&lastKey===signature&&!teacher.disabled&&existing.join(',')===list.map(item=>item.code).join(','))return;
    lastKey=signature;const previous=txt(teacher.value).toUpperCase();
    const next='<option value="">Chọn giáo viên…</option>'+list.map(item=>`<option value="${escHtml(item.code)}" data-name="${escHtml(item.name)}">${escHtml(item.name)} — ${escHtml(item.code)}</option>`).join('');
    if(teacher.innerHTML!==next)teacher.innerHTML=next;teacher.disabled=!list.length;
    if(q('analyze'))q('analyze').disabled=true;if(q('compare'))q('compare').disabled=true;if(q('export'))q('export').disabled=true;
    if(list.length){const self=ownCode(),selected=list.find(item=>item.code===previous)||list.find(item=>item.code===self)||list[0];teacher.value=selected.code;teacher.dispatchEvent(new Event('change',{bubbles:true}));updateScopeNote(ctx.can_review_all_reports?`Phạm vi báo giảng: Trưởng ban chuyên môn được chọn toàn bộ ${list.length} giáo viên trong tuần ${week.value}.`:`Phạm vi báo giảng: chỉ hiển thị ${ctx.is_group_leader?'bạn và các thành viên thuộc nhóm được quản lý':'chính bạn'}.`)}
    else{const self=ownCode();teacher.innerHTML=`<option value="">${self?'Không tìm thấy mã '+escHtml(self)+' trong tuần này':'Tài khoản chưa được gán mã giáo viên'}</option>`;updateScopeNote(self?`Không tìm thấy mã giáo viên ${self} trong tuần ${week.value}. Chủ sở hữu cần kiểm tra mã tài khoản có trùng chính xác với mã trong TKB hay không.`:'Tài khoản này chưa được gán mã giáo viên trong TKB. Chủ sở hữu cần gán mã trước khi lập báo giảng.',true)}
  }

  function schedule(force=false){if(force)lastKey='';if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;refresh(force)})}
  function bind(){
    const week=q('week'),teacher=q('teacher');
    if(week&&week.dataset.lbgTeacherRefreshBound!=='2'){week.dataset.lbgTeacherRefreshBound='2';week.addEventListener('change',()=>setTimeout(()=>schedule(true),30))}
    if(teacher&&teacher.dataset.lbgTeacherObserved!=='1'){teacher.dataset.lbgTeacherObserved='1';teacherObserver?.disconnect();teacherObserver=new MutationObserver(()=>schedule(false));teacherObserver.observe(teacher,{childList:true,subtree:true})}
  }
  function start(){bind();document.addEventListener('lbg-access-ready',()=>{bind();setTimeout(()=>schedule(true),80)});document.addEventListener('lbg-cloud-file-opened',()=>setTimeout(()=>schedule(true),80));setTimeout(()=>schedule(true),250);window.addEventListener('beforeunload',()=>teacherObserver?.disconnect(),{once:true})}
  start();
})();
