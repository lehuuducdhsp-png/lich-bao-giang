'use strict';
(function(){
  const txt=v=>String(v??'').trim();
  const norm=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toLowerCase().replace(/[^a-z0-9]+/g,'');
  let panel=null,activeInput=null,activeSelect=null,items=[],activeIndex=-1,observer=null,queued=false;

  function ensureStyle(){
    if(document.getElementById('lbgTeacherCodeSearchCss'))return;
    const s=document.createElement('style');
    s.id='lbgTeacherCodeSearchCss';
    s.textContent=`
      .lbg-code-search-wrap{position:relative;width:100%}
      .lbg-code-search-input{width:100%;box-sizing:border-box;padding:9px 36px 9px 11px;border:1px solid #e3cfc2;border-radius:10px;background:#fff;color:#4b342b;font:inherit;outline:none}
      .lbg-code-search-input:focus{border-color:#f4a261;box-shadow:0 0 0 3px rgba(244,162,97,.16)}
      .lbg-code-search-wrap:after{content:'⌕';position:absolute;right:11px;top:50%;transform:translateY(-50%);color:#9a6a50;font-weight:900;pointer-events:none}
      .lbg-code-search-native{display:none!important}
      #lbgTeacherCodeSearchPanel{position:fixed;z-index:100000;display:none;max-height:min(360px,48vh);overflow:auto;background:#fff;border:1px solid #e3cfc2;border-radius:12px;box-shadow:0 18px 48px rgba(76,52,41,.20);padding:5px}
      #lbgTeacherCodeSearchPanel .lbg-code-search-item{width:100%;border:0;background:#fff;color:#4b342b;text-align:left;padding:9px 10px;border-radius:9px;cursor:pointer;font:inherit;line-height:1.3}
      #lbgTeacherCodeSearchPanel .lbg-code-search-item:hover,#lbgTeacherCodeSearchPanel .lbg-code-search-item[data-active="1"]{background:#fff3e8}
      #lbgTeacherCodeSearchPanel .lbg-code-search-code{display:inline-flex;margin-left:6px;padding:2px 6px;border-radius:999px;background:#fff3e8;color:#8f5636;font-size:11px;font-weight:800}
      #lbgTeacherCodeSearchPanel .lbg-code-search-empty{padding:12px;color:#806b61;font-size:12px;text-align:center}
      @media(max-width:700px){#lbgTeacherCodeSearchPanel{max-height:42vh}.lbg-code-search-input{font-size:16px}}
    `;
    document.head.appendChild(s);
  }

  function ensurePanel(){
    if(panel)return panel;
    panel=document.createElement('div');
    panel.id='lbgTeacherCodeSearchPanel';
    panel.setAttribute('role','listbox');
    document.body.appendChild(panel);
    return panel;
  }

  function optionItems(select){
    return [...select.options].map(o=>({value:o.value,label:txt(o.textContent),disabled:o.disabled})).filter(x=>!x.disabled);
  }

  function selectedLabel(select){
    const o=select.options?.[select.selectedIndex];
    return txt(o?.textContent)||'Chưa liên kết';
  }

  function parseLabel(item){
    const label=item.label||'';
    const idx=label.lastIndexOf(' — ');
    if(idx>0)return{name:label.slice(0,idx),code:label.slice(idx+3)};
    return{name:label,code:item.value||''};
  }

  function positionPanel(){
    if(!panel||!activeInput||panel.style.display==='none')return;
    const r=activeInput.getBoundingClientRect();
    const gap=5,pad=8;
    const width=Math.min(Math.max(r.width,280),Math.max(280,window.innerWidth-pad*2));
    let left=Math.min(Math.max(pad,r.left),Math.max(pad,window.innerWidth-width-pad));
    let top=r.bottom+gap;
    panel.style.width=width+'px';
    panel.style.left=left+'px';
    panel.style.top=top+'px';
    const pr=panel.getBoundingClientRect();
    if(pr.bottom>window.innerHeight-pad&&r.top>pr.height+gap+pad)panel.style.top=Math.max(pad,r.top-pr.height-gap)+'px';
  }

  function closePanel(){
    if(panel)panel.style.display='none';
    activeInput=null;activeSelect=null;items=[];activeIndex=-1;
  }

  function choose(index){
    const item=items[index];
    if(!item||!activeSelect||!activeInput)return;
    activeSelect.value=item.value;
    activeSelect.dispatchEvent(new Event('input',{bubbles:true}));
    activeSelect.dispatchEvent(new Event('change',{bubbles:true}));
    activeInput.value=selectedLabel(activeSelect);
    activeInput.dataset.lbgCommitted=activeInput.value;
    closePanel();
    activeInput?.focus?.();
  }

  function renderResults(input,select){
    ensurePanel();
    activeInput=input;activeSelect=select;
    const needle=norm(input.value===input.dataset.lbgCommitted?'':input.value);
    const all=optionItems(select);
    const scored=all.map(item=>{
      const p=parseLabel(item),name=norm(p.name),code=norm(p.code||item.value),full=norm(item.label);
      let score=99;
      if(!needle)score=item.value?10:0;
      else if(code===needle)score=0;
      else if(name===needle)score=1;
      else if(code.startsWith(needle))score=2;
      else if(name.startsWith(needle))score=3;
      else if(code.includes(needle))score=4;
      else if(name.includes(needle))score=5;
      else if(full.includes(needle))score=6;
      return{item,score};
    }).filter(x=>x.score<99).sort((a,b)=>a.score-b.score||a.item.label.localeCompare(b.item.label,'vi')).slice(0,16);
    items=scored.map(x=>x.item);activeIndex=items.length?0:-1;
    panel.innerHTML=items.length?items.map((item,i)=>{const p=parseLabel(item);return`<button type="button" class="lbg-code-search-item" role="option" data-index="${i}" data-active="${i===activeIndex?'1':'0'}"><span>${escapeHtml(p.name||item.label)}</span>${p.code?`<span class="lbg-code-search-code">${escapeHtml(p.code)}</span>`:''}</button>`}).join(''):'<div class="lbg-code-search-empty">Không tìm thấy giáo viên/mã phù hợp.</div>';
    panel.style.display='block';
    panel.querySelectorAll('[data-index]').forEach(b=>b.addEventListener('mousedown',e=>{e.preventDefault();choose(Number(b.dataset.index))}));
    requestAnimationFrame(positionPanel);
  }

  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c))}

  function moveActive(delta){
    if(!items.length||!panel)return;
    activeIndex=(activeIndex+delta+items.length)%items.length;
    panel.querySelectorAll('[data-index]').forEach((b,i)=>b.dataset.active=i===activeIndex?'1':'0');
    panel.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({block:'nearest'});
  }

  function enhance(select){
    if(!select||select.dataset.lbgSearchEnhanced==='1')return;
    select.dataset.lbgSearchEnhanced='1';
    select.classList.add('lbg-code-search-native');
    const wrap=document.createElement('div');wrap.className='lbg-code-search-wrap';
    const input=document.createElement('input');
    input.type='search';input.className='lbg-code-search-input';input.autocomplete='off';input.spellcheck=false;
    input.placeholder='Gõ tên hoặc mã GV…';
    input.setAttribute('aria-label','Tìm giáo viên hoặc mã trong TKB');
    input.value=selectedLabel(select);input.dataset.lbgCommitted=input.value;
    select.parentNode.insertBefore(wrap,select);wrap.appendChild(input);wrap.appendChild(select);

    input.addEventListener('focus',()=>{input.select();renderResults(input,select)});
    input.addEventListener('input',()=>renderResults(input,select));
    input.addEventListener('keydown',e=>{
      if(e.key==='ArrowDown'){e.preventDefault();moveActive(1)}
      else if(e.key==='ArrowUp'){e.preventDefault();moveActive(-1)}
      else if(e.key==='Enter'&&activeIndex>=0){e.preventDefault();choose(activeIndex)}
      else if(e.key==='Escape'){e.preventDefault();input.value=input.dataset.lbgCommitted||selectedLabel(select);closePanel();input.blur()}
    });
    input.addEventListener('blur',()=>setTimeout(()=>{
      if(activeInput===input){input.value=selectedLabel(select);input.dataset.lbgCommitted=input.value;closePanel()}
    },120));
    select.addEventListener('change',()=>{input.value=selectedLabel(select);input.dataset.lbgCommitted=input.value});
  }

  function syncEnhanced(select){
    const input=select.closest('.lbg-code-search-wrap')?.querySelector('.lbg-code-search-input');
    if(!input)return;
    const label=selectedLabel(select);
    if(document.activeElement!==input){input.value=label;input.dataset.lbgCommitted=label}
  }

  function scan(){
    queued=false;ensureStyle();ensurePanel();
    document.querySelectorAll('select[id^="code-"]').forEach(select=>{
      if(select.dataset.lbgSearchEnhanced!=='1')enhance(select);else syncEnhanced(select);
    });
  }
  function queue(){if(queued)return;queued=true;requestAnimationFrame(scan)}

  function start(){
    ensureStyle();ensurePanel();scan();
    observer=new MutationObserver(queue);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-lbg-options-signature']});
    document.addEventListener('lbg-access-ready',queue);document.addEventListener('lbg-cloud-file-opened',queue);
    window.addEventListener('resize',positionPanel);window.addEventListener('scroll',positionPanel,true);
    document.addEventListener('mousedown',e=>{if(panel?.style.display!=='none'&&e.target!==activeInput&&!panel.contains(e.target))closePanel()});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
