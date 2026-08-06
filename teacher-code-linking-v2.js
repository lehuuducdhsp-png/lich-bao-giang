'use strict';
(function(){
  if(!window.LBGAuth)return;

  const q=id=>document.getElementById(id);
  const txt=value=>String(value??'').trim();
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const norm=value=>txt(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toLowerCase().replace(/[^a-z0-9]+/g,'');
  let auth=null,observer=null,queued=false,invokePatched=false;

  function style(){
    if(q('lbgTeacherLinkCss'))return;
    const s=document.createElement('style');s.id='lbgTeacherLinkCss';s.textContent=`
      .lbg-code-link-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:10px 0 13px;padding:11px 12px;border:1px solid #a7d8d0;border-radius:13px;background:#f0fdfa}
      .lbg-code-link-toolbar .meta{flex:1;min-width:240px;color:#0f5f5a}
      .lbg-code-select{min-width:180px;width:100%;padding:8px 9px;border:1px solid #cddde2;border-radius:10px;background:#fff}
      .lbg-code-linked{display:inline-flex;align-items:center;gap:5px;color:#166534;font-size:11px;font-weight:800;margin-top:4px}
      @media(max-width:700px){.lbg-code-link-toolbar{display:grid}.lbg-code-link-toolbar .meta{min-width:0}}
    `;document.head.appendChild(s);
  }

  function teacherSource(){
    let book=null;try{book=wb}catch{}
    if(!book?.worksheets?.length)return[];
    const selected=q('week')?.value;
    const ws=(selected&&book.getWorksheet(selected))||book.worksheets.find(x=>/\d{1,2}\s*[Tt]\s*\d{1,2}|tuần/i.test(x.name))||book.worksheets[0];
    const fn=typeof window.LBGAllTeachers==='function'?window.LBGAllTeachers:window.teachers;
    if(typeof fn!=='function')return[];
    const map=new Map();
    for(const item of fn(ws)||[]){
      const code=txt(item?.code).toUpperCase(),name=txt(item?.name||item?.teacherName);
      if(!code||!name||code==='OFF'||/^Mã\s+/i.test(name))continue;
      if(!map.has(code))map.set(code,{code,name});
    }
    return[...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'vi'));
  }

  function uniqueTeacherByName(displayName,teachers=teacherSource()){
    const key=norm(displayName);if(!key)return null;
    const matches=teachers.filter(t=>norm(t.name)===key);
    return matches.length===1?matches[0]:null;
  }

  function parseCodeFromCreate(body){
    const explicit=txt(body?.teacher_code).toUpperCase();if(explicit)return explicit;
    const note=txt(body?.notes);
    const noteMatch=note.match(/(?:mã|ma)\s+(.+)$/i);
    if(noteMatch)return txt(noteMatch[1]).toUpperCase();
    return uniqueTeacherByName(body?.display_name)?.code||'';
  }

  function patchInvoke(){
    if(invokePatched||!auth?.client?.functions?.invoke)return;
    const holder=auth.client.functions;
    if(holder.__lbgTeacherCodePatched){invokePatched=true;return}
    const original=holder.invoke.bind(holder);
    holder.invoke=async function(functionName,options={}){
      const body=options?.body||{};
      const result=await original(functionName,options);
      if(functionName==='admin-users'&&body.action==='create'&&!result?.error&&result?.data?.user_id){
        const code=parseCodeFromCreate(body);
        if(code){
          const {error}=await auth.client.rpc('set_profile_teacher_code',{p_user_id:result.data.user_id,p_teacher_code:code});
          if(error){
            console.error('Tài khoản đã tạo nhưng chưa liên kết được mã TKB:',error);
            result.data.teacher_code_warning=error.message;
            setTimeout(()=>alert(`Tài khoản đã được tạo nhưng chưa liên kết mã ${code}: ${error.message}`),0);
          }else{
            result.data.teacher_code=code;
            window.LBGAccess?.refresh?.().catch(()=>{});
          }
        }
      }
      return result;
    };
    holder.__lbgTeacherCodePatched=true;invokePatched=true;
  }

  function codeOptions(current,teachers){
    const value=txt(current).toUpperCase();
    const known=teachers.some(t=>t.code===value);
    const extra=value&&!known?`<option value="${esc(value)}" selected>${esc(value)} — mã đang lưu, không có trong TKB hiện tại</option>`:'';
    return `<option value="">Chưa liên kết</option>${extra}`+teachers.map(t=>`<option value="${esc(t.code)}" ${t.code===value?'selected':''}>${esc(t.name)} — ${esc(t.code)}</option>`).join('');
  }

  function findLinkSection(){
    return [...document.querySelectorAll('#lbgOwnerPeople section,.lbg-group-section')].find(section=>/Gán mã TKB|Liên kết tài khoản/i.test(txt(section.querySelector('h3,h2')?.textContent)))||null;
  }

  function enhanceTable(){
    const section=findLinkSection();if(!section)return;
    const teachers=teacherSource();
    const heading=section.querySelector('h3,h2');if(heading&&heading.textContent!=='Liên kết tài khoản với giáo viên trong TKB')heading.textContent='Liên kết tài khoản với giáo viên trong TKB';
    const desc=section.querySelector('.head p');if(desc)desc.textContent='Tài khoản tạo từ danh sách TKB được liên kết mã tự động. Chỉ chọn lại khi cần sửa một trường hợp đặc biệt; quyền xem bảng kê người khác vẫn mặc định tắt.';

    if(!q('lbgAutoLinkToolbar')){
      const toolbar=document.createElement('div');toolbar.id='lbgAutoLinkToolbar';toolbar.className='lbg-code-link-toolbar';
      toolbar.innerHTML=`<div class="meta"><b>Liên kết tự động:</b> đối chiếu chính xác tên tài khoản với tên và mã đã đọc từ TKB.</div><button class="btn primary" id="lbgAutoLinkNow">🔗 Đồng bộ mã từ TKB</button><button class="btn outline" id="lbgRefreshCodeList">↻ Làm mới danh sách</button>`;
      section.querySelector('.head')?.insertAdjacentElement('afterend',toolbar);
      q('lbgAutoLinkNow').onclick=autoLinkExisting;
      q('lbgRefreshCodeList').onclick=()=>{queued=false;enhanceTable()};
    }

    section.querySelectorAll('input[id^="code-"]').forEach(input=>{
      const select=document.createElement('select');select.id=input.id;select.className='lbg-code-select';select.innerHTML=codeOptions(input.value,teachers);
      input.replaceWith(select);
    });
    section.querySelectorAll('select[id^="code-"]').forEach(select=>{
      const current=select.value;
      const expected=codeOptions(current,teachers);
      if(select.dataset.lbgOptionsSignature!==expected){select.innerHTML=expected;select.value=current;select.dataset.lbgOptionsSignature=expected}
      const row=select.closest('tr');
      if(row&&!row.querySelector('.lbg-code-linked')&&current){
        const note=document.createElement('div');note.className='lbg-code-linked';note.textContent='✓ Đã liên kết';select.insertAdjacentElement('afterend',note);
      }
    });
    q('lbgAutoMapCodes')?.remove();
  }

  async function autoLinkExisting(){
    const button=q('lbgAutoLinkNow');if(!button)return;
    const old=button.textContent;button.disabled=true;button.textContent='Đang đối chiếu…';
    try{
      const teachers=teacherSource();
      if(!teachers.length)throw new Error('Hãy mở một file TKB trước khi đồng bộ mã.');
      const {data,error}=await auth.client.rpc('my_group_dashboard');if(error)throw error;
      const people=data?.people||[];
      let linked=0,correct=0,ambiguous=0,missing=0,failed=0;
      const seenCodes=new Set(people.map(p=>txt(p.teacher_code).toUpperCase()).filter(Boolean));
      for(const person of people){
        const match=uniqueTeacherByName(person.display_name,teachers);
        if(!match){
          const count=teachers.filter(t=>norm(t.name)===norm(person.display_name)).length;
          if(count>1)ambiguous++;else missing++;
          continue;
        }
        const current=txt(person.teacher_code).toUpperCase();
        if(current===match.code){correct++;continue}
        if(!current&&seenCodes.has(match.code)){failed++;continue}
        const {error:linkError}=await auth.client.rpc('set_profile_teacher_code',{p_user_id:person.id,p_teacher_code:match.code});
        if(linkError){failed++;console.error(linkError);continue}
        seenCodes.add(match.code);linked++;
      }
      await window.LBGAccess?.refresh?.().catch(()=>{});
      alert(`Đồng bộ mã TKB hoàn tất.\n\nĐã liên kết/cập nhật: ${linked}\nĐã đúng sẵn: ${correct}\nKhông tìm thấy tên khớp: ${missing}\nTên trùng cần kiểm tra: ${ambiguous}\nKhông thể liên kết: ${failed}\n\nTrang sẽ tải lại để cập nhật quyền.`);
      location.reload();
    }catch(error){alert('Không đồng bộ được mã TKB: '+(error?.message||String(error)))}
    finally{button.disabled=false;button.textContent=old}
  }

  function scan(){queued=false;patchInvoke();enhanceTable()}
  function queue(){if(queued)return;queued=true;requestAnimationFrame(scan)}

  window.LBGAuth.onReady(a=>{
    auth=a;style();patchInvoke();
    observer=new MutationObserver(queue);observer.observe(document.body,{childList:true,subtree:true});
    q('week')?.addEventListener('change',queue);
    setInterval(queue,1400);queue();
  });
  window.LBGAuth.onLogout(()=>{observer?.disconnect();observer=null;auth=null});
})();
