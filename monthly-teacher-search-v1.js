'use strict';
(function(){
  const VERSION='20260808.16';
  const q=id=>document.getElementById(id);
  const text=v=>String(v??'').replace(/\s+/g,' ').trim();
  const fold=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let observer=null,optionObserver=null,queued=false;

  function addStyle(){
    if(q('lbgMonthlyTeacherSearchCss'))return;
    const s=document.createElement('style');
    s.id='lbgMonthlyTeacherSearchCss';
    s.textContent=`
      .lbg-month-teacher-field{position:relative;display:grid;gap:5px;min-width:0;align-self:end}
      .lbg-month-teacher-label{font-size:11.5px;font-weight:790;line-height:1.4;color:#72594e}
      #month2Teacher.lbg-mtp-native{position:absolute!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important;overflow:hidden!important;padding:0!important;border:0!important}
      .lbg-mtp-picker{position:relative;min-width:0}
      .lbg-mtp-trigger{width:100%;min-height:42px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 11px;border:1px solid #ead5c8;border-radius:10px;background:#fff;color:#49362e;text-align:left;font:800 13px/1.35 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;cursor:pointer;box-shadow:0 1px 0 rgba(90,56,38,.02)}
      .lbg-mtp-trigger:hover:not(:disabled){border-color:#e2bea7;background:#fffdfb}
      .lbg-mtp-trigger:focus-visible{outline:none;border-color:#f4a261;box-shadow:0 0 0 3px rgba(244,162,97,.14)}
      .lbg-mtp-trigger:disabled{opacity:.48;cursor:not-allowed}
      .lbg-mtp-trigger-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .lbg-mtp-arrow{flex:0 0 auto;font-size:10px;color:#6f5042;transition:transform .16s ease}
      .lbg-mtp-trigger[aria-expanded="true"] .lbg-mtp-arrow{transform:rotate(180deg)}
      .lbg-mtp-panel{position:absolute;left:0;right:0;top:calc(100% + 6px);z-index:60;padding:8px;border:1px solid #ead5c8;border-radius:12px;background:#fff;box-shadow:0 16px 36px rgba(91,56,40,.16)}
      .lbg-mtp-panel[hidden]{display:none!important}
      .lbg-mtp-search{position:relative;margin-bottom:6px}
      .lbg-mtp-search input{width:100%;min-height:40px!important;padding:8px 36px 8px 10px!important;border-radius:9px!important;font-size:12.5px!important}
      .lbg-mtp-search-icon{position:absolute;right:11px;top:50%;transform:translateY(-50%);pointer-events:none;color:#9a7a69;font-size:14px}
      .lbg-mtp-results{display:grid;gap:3px;max-height:270px;overflow:auto}
      .lbg-mtp-item{width:100%;border:0;background:#fff;text-align:left;padding:8px 9px;border-radius:8px;cursor:pointer;color:#49362e;font:inherit;line-height:1.3}
      .lbg-mtp-item:hover,.lbg-mtp-item.active{background:#fff1e5;color:#7e4c31}
      .lbg-mtp-name{display:block;font-weight:820;font-size:12.5px}
      .lbg-mtp-code{display:block;margin-top:2px;color:#96796b;font-size:10.5px;font-weight:700}
      .lbg-mtp-empty{padding:11px 8px;color:#927d72;font-size:11px;text-align:center}
      @media(max-width:620px){.lbg-mtp-results{max-height:230px}.lbg-mtp-trigger{font-size:12.5px}.lbg-mtp-name{font-size:12px}}
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

  function selected(){
    const sel=q('month2Teacher'),o=sel?.selectedOptions?.[0];
    return o&&text(o.value)?{value:o.value,label:text(o.textContent),name:text(o.dataset.name||o.textContent)}:null;
  }

  function close(){
    const panel=q('month2TeacherPickerPanel'),button=q('month2TeacherPickerButton');
    if(panel)panel.hidden=true;
    if(button)button.setAttribute('aria-expanded','false');
  }

  function draw(query=''){
    const box=q('month2TeacherPickerResults');if(!box)return;
    const all=options(),term=fold(query),matches=(term?all.filter(x=>x.key.includes(term)):all).slice(0,24);
    if(!all.length){box.innerHTML='<div class="lbg-mtp-empty">Chưa có danh sách giáo viên.</div>';return}
    if(!matches.length){box.innerHTML='<div class="lbg-mtp-empty">Không tìm thấy giáo viên phù hợp.</div>';return}
    box.innerHTML=matches.map((x,i)=>`<button type="button" class="lbg-mtp-item${i===0?' active':''}" data-value="${esc(x.value)}"><span class="lbg-mtp-name">${esc(x.name||x.label)}</span><span class="lbg-mtp-code">Mã: ${esc(x.value)}</span></button>`).join('');
    box.querySelectorAll('.lbg-mtp-item').forEach(btn=>btn.addEventListener('mousedown',e=>{e.preventDefault();choose(btn.dataset.value)}));
  }

  function syncButton(){
    const sel=q('month2Teacher'),button=q('month2TeacherPickerButton'),label=q('month2TeacherPickerText');if(!sel||!button||!label)return;
    const current=selected(),disabled=sel.disabled||options().length===0;
    label.textContent=current?.label||'Chọn giáo viên…';
    button.disabled=disabled;
    button.title=current?.label||'';
    if(disabled)close();
  }

  function choose(value){
    const sel=q('month2Teacher');if(!sel||sel.disabled)return;
    if(![...sel.options].some(o=>o.value===value))return;
    if(sel.value!==value){sel.value=value;sel.dispatchEvent(new Event('change',{bubbles:true}))}
    syncButton();close();q('month2TeacherPickerButton')?.focus();
  }

  function open(){
    const button=q('month2TeacherPickerButton'),panel=q('month2TeacherPickerPanel'),input=q('month2TeacherPickerSearch');
    if(!button||!panel||button.disabled)return;
    const showing=!panel.hidden;
    if(showing){close();return}
    panel.hidden=false;button.setAttribute('aria-expanded','true');
    if(input){input.value='';draw('');requestAnimationFrame(()=>input.focus())}
  }

  function bindKeyboard(input){
    input.addEventListener('keydown',e=>{
      const box=q('month2TeacherPickerResults'),items=box?[...box.querySelectorAll('.lbg-mtp-item')]:[];
      if(e.key==='Escape'){e.preventDefault();close();q('month2TeacherPickerButton')?.focus();return}
      if(!items.length)return;
      let index=items.findIndex(x=>x.classList.contains('active'));if(index<0)index=0;
      if(e.key==='ArrowDown'||e.key==='ArrowUp'){
        e.preventDefault();items[index].classList.remove('active');index=e.key==='ArrowDown'?(index+1)%items.length:(index-1+items.length)%items.length;items[index].classList.add('active');items[index].scrollIntoView({block:'nearest'});
      }else if(e.key==='Enter'){e.preventDefault();choose(items[index].dataset.value)}
    });
  }

  function enhance(){
    const sel=q('month2Teacher');if(!sel)return false;
    addStyle();
    if(!q('month2TeacherPickerButton')){
      const oldLabel=sel.closest('label');if(!oldLabel)return false;
      const field=document.createElement('div');field.className='lbg-month-teacher-field';
      const title=document.createElement('div');title.className='lbg-month-teacher-label';title.textContent='Giáo viên';
      const picker=document.createElement('div');picker.className='lbg-mtp-picker';
      picker.innerHTML=`<button type="button" id="month2TeacherPickerButton" class="lbg-mtp-trigger" aria-haspopup="listbox" aria-expanded="false"><span id="month2TeacherPickerText" class="lbg-mtp-trigger-text">Chọn giáo viên…</span><span class="lbg-mtp-arrow">▼</span></button><div id="month2TeacherPickerPanel" class="lbg-mtp-panel" hidden><div class="lbg-mtp-search"><input id="month2TeacherPickerSearch" type="search" autocomplete="off" spellcheck="false" placeholder="Tìm tên hoặc mã giáo viên…" aria-label="Tìm giáo viên trong bảng kê tháng"><span class="lbg-mtp-search-icon">⌕</span></div><div id="month2TeacherPickerResults" class="lbg-mtp-results" role="listbox"></div></div>`;
      oldLabel.parentNode.insertBefore(field,oldLabel);
      sel.classList.add('lbg-mtp-native');field.appendChild(title);field.appendChild(sel);field.appendChild(picker);oldLabel.remove();
      const button=q('month2TeacherPickerButton'),input=q('month2TeacherPickerSearch');
      button.addEventListener('click',open);
      button.addEventListener('keydown',e=>{if(['ArrowDown','Enter',' '].includes(e.key)){e.preventDefault();open()}else if(e.key==='Escape')close()});
      input.addEventListener('input',()=>draw(input.value));bindKeyboard(input);
      document.addEventListener('mousedown',e=>{if(!field.contains(e.target))close()});
      sel.addEventListener('change',syncButton);
    }
    syncButton();
    if(optionObserver)optionObserver.disconnect();
    optionObserver=new MutationObserver(()=>{syncButton();const panel=q('month2TeacherPickerPanel'),input=q('month2TeacherPickerSearch');if(panel&&!panel.hidden)draw(input?.value||'')});
    optionObserver.observe(sel,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});
    return true;
  }

  function repair(){queued=false;enhance()}
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(repair)}
  function start(){
    repair();observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true});
    setTimeout(schedule,300);setTimeout(schedule,1200);setTimeout(schedule,2500);
    window.addEventListener('beforeunload',()=>{observer?.disconnect();optionObserver?.disconnect()},{once:true});
  }

  window.LBGMonthlyTeacherSearch={version:VERSION,repair:schedule};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
