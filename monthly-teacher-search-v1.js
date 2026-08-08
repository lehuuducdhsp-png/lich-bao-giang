'use strict';
(function(){
  const VERSION='20260808.15';
  const q=id=>document.getElementById(id);
  const text=v=>String(v??'').replace(/\s+/g,' ').trim();
  const fold=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase();
  let observer=null,optionObserver=null,queued=false;

  function addStyle(){
    if(q('lbgMonthlyTeacherSearchCss'))return;
    const s=document.createElement('style');
    s.id='lbgMonthlyTeacherSearchCss';
    s.textContent=`
      .lbg-month-teacher-wrap{position:relative;display:grid;gap:7px}
      .lbg-month-teacher-search{position:relative}
      .lbg-month-teacher-search input{width:100%;padding-right:38px!important}
      .lbg-month-teacher-search .lbg-mts-icon{position:absolute;right:12px;top:50%;transform:translateY(-50%);pointer-events:none;color:#9a7a69;font-size:14px}
      .lbg-mts-results{position:absolute;left:0;right:0;top:calc(100% + 6px);z-index:45;display:grid;gap:4px;max-height:270px;overflow:auto;padding:7px;border:1px solid #ead5c8;border-radius:12px;background:#fff;box-shadow:0 14px 34px rgba(91,56,40,.14)}
      .lbg-mts-results[hidden]{display:none!important}
      .lbg-mts-item{width:100%;border:0;background:#fff;text-align:left;padding:9px 10px;border-radius:9px;cursor:pointer;color:#49362e;font:inherit;line-height:1.3}
      .lbg-mts-item:hover,.lbg-mts-item.active{background:#fff1e5;color:#7e4c31}
      .lbg-mts-name{display:block;font-weight:800;font-size:12.5px}
      .lbg-mts-code{display:block;margin-top:2px;color:#96796b;font-size:10.5px;font-weight:700}
      .lbg-mts-empty{padding:10px;color:#927d72;font-size:11px;text-align:center}
      .lbg-mts-help{font-size:10.5px;color:#927d72;line-height:1.4}
      @media(max-width:620px){.lbg-mts-results{max-height:230px}.lbg-mts-name{font-size:12px}}
    `;
    document.head.appendChild(s);
  }

  function options(){
    const sel=q('month2Teacher');if(!sel)return[];
    return [...sel.options].filter(o=>text(o.value)).map(o=>({
      value:o.value,
      name:text(o.dataset.name||o.textContent.replace(/\s+[—-]\s+[^—-]+$/,'')),
      label:text(o.textContent),
      key:fold(`${o.dataset.name||''} ${o.textContent||''} ${o.value||''}`)
    }));
  }

  function close(){const box=q('month2TeacherSearchResults');if(box)box.hidden=true}

  function selectTeacher(value){
    const sel=q('month2Teacher');if(!sel)return;
    const exists=[...sel.options].some(o=>o.value===value);if(!exists)return;
    if(sel.value!==value){sel.value=value;sel.dispatchEvent(new Event('change',{bubbles:true}))}
    const input=q('month2TeacherSearch');if(input){input.value='';input.blur()}
    close();
  }

  function draw(query=''){
    const box=q('month2TeacherSearchResults'),input=q('month2TeacherSearch');if(!box||!input)return;
    const term=fold(query),all=options();
    const matches=(term?all.filter(x=>x.key.includes(term)):all).slice(0,12);
    if(!all.length){box.innerHTML='<div class="lbg-mts-empty">Chưa có danh sách giáo viên.</div>';box.hidden=false;return}
    if(!matches.length){box.innerHTML='<div class="lbg-mts-empty">Không tìm thấy giáo viên phù hợp.</div>';box.hidden=false;return}
    box.innerHTML=matches.map((x,i)=>`<button type="button" class="lbg-mts-item${i===0?' active':''}" data-value="${String(x.value).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}"><span class="lbg-mts-name">${String(x.name||x.label).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span><span class="lbg-mts-code">Mã: ${String(x.value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span></button>`).join('');
    box.querySelectorAll('.lbg-mts-item').forEach(btn=>btn.addEventListener('mousedown',e=>{e.preventDefault();selectTeacher(btn.dataset.value)}));
    box.hidden=false;
  }

  function bindKeyboard(input){
    input.addEventListener('keydown',e=>{
      const box=q('month2TeacherSearchResults');if(!box||box.hidden)return;
      const items=[...box.querySelectorAll('.lbg-mts-item')];if(!items.length)return;
      let index=Math.max(0,items.findIndex(x=>x.classList.contains('active')));
      if(e.key==='ArrowDown'){e.preventDefault();items[index].classList.remove('active');index=(index+1)%items.length;items[index].classList.add('active');items[index].scrollIntoView({block:'nearest'})}
      else if(e.key==='ArrowUp'){e.preventDefault();items[index].classList.remove('active');index=(index-1+items.length)%items.length;items[index].classList.add('active');items[index].scrollIntoView({block:'nearest'})}
      else if(e.key==='Enter'){e.preventDefault();selectTeacher(items[index].dataset.value)}
      else if(e.key==='Escape'){close();input.blur()}
    });
  }

  function syncDisabled(){
    const sel=q('month2Teacher'),input=q('month2TeacherSearch');if(!sel||!input)return;
    input.disabled=sel.disabled||options().length===0;
    input.placeholder=input.disabled?'Chọn file TKB trước…':'Tìm tên hoặc mã giáo viên…';
  }

  function enhance(){
    const sel=q('month2Teacher');if(!sel)return false;
    addStyle();
    const label=sel.closest('label');if(!label)return false;
    if(!q('month2TeacherSearch')){
      const wrap=document.createElement('div');wrap.className='lbg-month-teacher-wrap';
      const search=document.createElement('div');search.className='lbg-month-teacher-search';
      search.innerHTML='<input id="month2TeacherSearch" type="search" autocomplete="off" spellcheck="false" placeholder="Tìm tên hoặc mã giáo viên…" aria-label="Tìm giáo viên trong bảng kê tháng"><span class="lbg-mts-icon">⌕</span><div id="month2TeacherSearchResults" class="lbg-mts-results" hidden></div>';
      const help=document.createElement('div');help.className='lbg-mts-help';help.textContent='Gõ tên hoặc mã giáo viên để chọn nhanh • có thể dùng ↑ ↓ và Enter.';
      wrap.appendChild(search);wrap.appendChild(help);label.appendChild(wrap);
      const input=q('month2TeacherSearch');
      input.addEventListener('input',()=>draw(input.value));
      input.addEventListener('focus',()=>draw(input.value));
      bindKeyboard(input);
      document.addEventListener('mousedown',e=>{if(!wrap.contains(e.target))close()});
    }
    syncDisabled();
    if(optionObserver)optionObserver.disconnect();
    optionObserver=new MutationObserver(()=>{syncDisabled();const input=q('month2TeacherSearch');if(input&&document.activeElement===input)draw(input.value)});
    optionObserver.observe(sel,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});
    return true;
  }

  function repair(){queued=false;if(enhance())return}
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(repair)}
  function start(){
    repair();
    observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true});
    setTimeout(schedule,300);setTimeout(schedule,1200);setTimeout(schedule,2500);
    window.addEventListener('beforeunload',()=>{observer?.disconnect();optionObserver?.disconnect()},{once:true});
  }

  window.LBGMonthlyTeacherSearch={version:VERSION,repair:schedule};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
