'use strict';
(function(){
  const q=id=>document.getElementById(id);
  const txt=value=>String(value??'').trim();
  const escHtml=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let lastKey='',timer=null;

  function context(){return window.LBGAccess?.context||null}
  function ownCode(){return txt(context()?.teacher_code).toUpperCase()}
  function allowedCodes(){
    const set=new Set((context()?.teacher_codes||[]).map(code=>txt(code).toUpperCase()).filter(Boolean));
    const self=ownCode();if(self)set.add(self);
    return set;
  }

  function reportCard(){
    return [...document.querySelectorAll('section.card,section.lbg-ui-section,section')].find(section=>/^3\.\s*Kiểm tra và lập báo giảng/i.test(txt(section.querySelector('h3,h2')?.textContent)))||null;
  }

  function updateScopeNote(message,isWarning=false){
    const card=reportCard();if(!card)return;
    let note=card.querySelector('.lbg-access-note');
    if(!note){note=document.createElement('div');note.className='lbg-access-note';card.querySelector('.head')?.insertAdjacentElement('afterend',note)}
    note.textContent=message;
    note.style.borderColor=isWarning?'#fed7aa':'#bfdbfe';
    note.style.background=isWarning?'#fff7ed':'#eff6ff';
    note.style.color=isWarning?'#9a3412':'#1e3a8a';
  }

  function sourceTeachers(ws){
    const fn=typeof window.LBGAllTeachers==='function'?window.LBGAllTeachers:window.teachers;
    if(typeof fn!=='function')return[];
    const map=new Map();
    for(const item of fn(ws)||[]){
      const code=txt(item?.code).toUpperCase();if(!code)continue;
      if(!map.has(code))map.set(code,{code,name:txt(item?.name||item?.teacherName||code)});
    }
    return[...map.values()];
  }

  function refresh(force=false){
    const ctx=context();
    if(!ctx||ctx.is_owner)return;
    const week=q('week'),teacher=q('teacher');
    if(!week||!teacher||!week.value||typeof wb==='undefined'||!wb)return;
    const ws=wb.getWorksheet(week.value);if(!ws)return;

    const all=sourceTeachers(ws);
    const allowed=allowedCodes();
    const list=ctx.can_review_all_reports?all:all.filter(item=>allowed.has(item.code));
    const signature=[week.value,ctx.can_review_all_reports?'ALL':[...allowed].sort().join(','),list.map(item=>item.code).join(',')].join('|');
    const existing=[...teacher.options].filter(option=>txt(option.value)).map(option=>txt(option.value).toUpperCase());
    if(!force&&lastKey===signature&&!teacher.disabled&&existing.join(',')===list.map(item=>item.code).join(','))return;
    lastKey=signature;

    const previous=txt(teacher.value).toUpperCase();
    teacher.innerHTML='<option value="">Chọn giáo viên…</option>'+list.map(item=>`<option value="${escHtml(item.code)}" data-name="${escHtml(item.name)}">${escHtml(item.name)} — ${escHtml(item.code)}</option>`).join('');
    teacher.disabled=!list.length;
    if(q('analyze'))q('analyze').disabled=true;
    if(q('compare'))q('compare').disabled=true;
    if(q('export'))q('export').disabled=true;

    if(list.length){
      const self=ownCode();
      const selected=list.find(item=>item.code===previous)||list.find(item=>item.code===self)||list[0];
      teacher.value=selected.code;
      teacher.dispatchEvent(new Event('change',{bubbles:true}));
      if(ctx.can_review_all_reports){
        updateScopeNote(`Phạm vi báo giảng: Trưởng ban chuyên môn được chọn toàn bộ ${list.length} giáo viên trong tuần ${week.value}.`);
      }else{
        const scope=ctx.is_group_leader?'bạn và các thành viên thuộc nhóm được quản lý':'chính bạn';
        updateScopeNote(`Phạm vi báo giảng: chỉ hiển thị ${scope}.`);
      }
    }else{
      const self=ownCode();
      teacher.innerHTML=`<option value="">${self?'Không tìm thấy mã '+escHtml(self)+' trong tuần này':'Tài khoản chưa được gán mã giáo viên'}</option>`;
      updateScopeNote(self?`Không tìm thấy mã giáo viên ${self} trong tuần ${week.value}. Chủ sở hữu cần kiểm tra mã tài khoản có trùng chính xác với mã trong TKB hay không.`:'Tài khoản này chưa được gán mã giáo viên trong TKB. Chủ sở hữu cần gán mã trước khi lập báo giảng.',true);
    }
  }

  function bindWeek(){
    const week=q('week');
    if(!week||week.dataset.lbgTeacherRefreshBound==='1')return;
    week.dataset.lbgTeacherRefreshBound='1';
    week.addEventListener('change',()=>{lastKey='';setTimeout(()=>refresh(true),40)});
  }

  function start(){
    bindWeek();
    document.addEventListener('lbg-access-ready',()=>{lastKey='';bindWeek();setTimeout(()=>refresh(true),120)});
    timer=setInterval(()=>{bindWeek();refresh(false)},700);
    setTimeout(()=>refresh(true),300);
    window.addEventListener('beforeunload',()=>clearInterval(timer),{once:true});
  }

  start();
})();
