'use strict';
(function(){
  const STORAGE_KEY='lbg.sidebar.compact.v1';
  const q=id=>document.getElementById(id);
  let observer=null,queued=false;

  function addStyle(){
    if(q('lbgSidebarCompactReadableCss'))return;
    const s=document.createElement('style');
    s.id='lbgSidebarCompactReadableCss';
    s.textContent=`
      #lbgUiSidebar{transition:width .2s ease,padding .2s ease,box-shadow .2s ease}
      #lbgAppLayout{transition:grid-template-columns .2s ease,max-width .2s ease}
      .lbg-sidebar-toggle{position:absolute;right:7px;top:7px;width:30px;height:30px;border:1px solid #ead8cc;border-radius:10px;background:#fffaf6;color:#8f5636;display:grid;place-items:center;font-size:15px;font-weight:900;cursor:pointer;box-shadow:0 5px 14px rgba(91,56,40,.08);z-index:3;transition:.18s}
      .lbg-sidebar-toggle:hover{background:#fff1e6;border-color:#f0b889;transform:translateY(-1px)}
      .lbg-sidebar-toggle:focus-visible{outline:3px solid rgba(244,162,97,.22);outline-offset:2px}
      #lbgUiSidebar .lbg-ui-side-head{position:relative;padding-right:44px}

      @media(min-width:1181px){
        #lbgAppLayout{width:min(2200px,100%)!important;padding-left:26px!important;padding-right:26px!important}
        body.lbg-sidebar-compact #lbgAppLayout{grid-template-columns:78px minmax(0,1fr)!important;gap:16px!important}
        body.lbg-sidebar-compact #lbgUiSidebar{padding:10px 8px!important;border-radius:19px!important}
        body.lbg-sidebar-compact #lbgUiSidebar .lbg-ui-side-head{height:38px;padding:0!important;margin:0 0 9px!important;border-bottom:1px solid #eee2da!important}
        body.lbg-sidebar-compact #lbgUiSidebar .lbg-ui-side-head>b,
        body.lbg-sidebar-compact #lbgUiSidebar .lbg-ui-side-head>span,
        body.lbg-sidebar-compact #lbgUiSidebar .lbg-ui-nav-label,
        body.lbg-sidebar-compact #lbgUiSidebar .lbg-ui-nav-text,
        body.lbg-sidebar-compact #lbgUiSidebar .lbg-ui-side-actions{display:none!important}
        body.lbg-sidebar-compact #lbgUiSidebar .lbg-sidebar-toggle{position:static;margin:3px auto 0;width:34px;height:32px}
        body.lbg-sidebar-compact #lbgUiSidebar .lbg-ui-nav-group{margin:7px 0!important}
        body.lbg-sidebar-compact #lbgUiSidebar .lbg-ui-nav-link{justify-content:center!important;padding:10px 5px!important;gap:0!important;border-radius:12px!important;min-height:42px}
        body.lbg-sidebar-compact #lbgUiSidebar .lbg-ui-nav-link.active{box-shadow:inset 0 0 0 1px #f1c8ac!important}
        body.lbg-sidebar-compact #lbgUiSidebar .lbg-ui-nav-icon{width:auto!important;font-size:18px!important;line-height:1}
        body.lbg-sidebar-compact #lbgUiSidebar .lbg-ui-nav-link:hover{transform:translateY(-1px)}

        #lbgAppLayout main.shell{font-size:15px!important;line-height:1.55}
        #lbgAppLayout main.shell>.hero h2{font-size:21px!important}
        #lbgAppLayout main.shell .head h2,
        #lbgAppLayout main.shell .head h3{font-size:17px!important;line-height:1.35}
        #lbgAppLayout main.shell .head p{font-size:13px!important;line-height:1.55}
        #lbgAppLayout main.shell .card,
        #lbgAppLayout main.shell .lbg-owner-card,
        #lbgAppLayout main.shell .lbg-scope-card,
        #lbgAppLayout main.shell .lbg-branding-card,
        #lbgAppLayout main.shell .lbg-groups-card,
        #lbgAppLayout main.shell .lbg-ui-section{font-size:14px}
        #lbgAppLayout main.shell table th{font-size:12px!important;line-height:1.35}
        #lbgAppLayout main.shell table td{font-size:13px!important;line-height:1.45}
        #lbgAppLayout main.shell .meta,
        #lbgAppLayout main.shell small{font-size:12px!important;line-height:1.45}
        #lbgAppLayout main.shell .btn{font-size:12.5px!important;line-height:1.3}
        #lbgAppLayout main.shell input,
        #lbgAppLayout main.shell select,
        #lbgAppLayout main.shell textarea{font-size:13px!important}
      }

      @media(max-width:1180px){.lbg-sidebar-toggle{display:none!important}}
    `;
    document.head.appendChild(s);
  }

  function compactState(){try{return localStorage.getItem(STORAGE_KEY)==='1'}catch{return false}}
  function saveState(value){try{localStorage.setItem(STORAGE_KEY,value?'1':'0')}catch{}}

  function setCompact(value){
    const desktop=window.matchMedia('(min-width:1181px)').matches;
    const on=Boolean(value)&&desktop;
    document.body.classList.toggle('lbg-sidebar-compact',on);
    const btn=q('lbgSidebarCompactToggle');
    if(btn){
      btn.textContent=on?'»':'«';
      btn.title=on?'Mở rộng Danh mục chức năng':'Thu gọn Danh mục chức năng';
      btn.setAttribute('aria-label',btn.title);
      btn.setAttribute('aria-expanded',String(!on));
    }
    if(desktop)saveState(on);
  }

  function ensureToggle(){
    const sidebar=q('lbgUiSidebar');
    const head=sidebar?.querySelector('.lbg-ui-side-head');
    if(!sidebar||!head)return false;
    let btn=q('lbgSidebarCompactToggle');
    if(!btn){
      btn=document.createElement('button');
      btn.type='button';
      btn.id='lbgSidebarCompactToggle';
      btn.className='lbg-sidebar-toggle';
      btn.onclick=()=>setCompact(!document.body.classList.contains('lbg-sidebar-compact'));
      head.appendChild(btn);
    }
    setCompact(compactState());
    return true;
  }

  function enhanceNavAccessibility(){
    document.querySelectorAll('#lbgUiSidebar .lbg-ui-nav-link').forEach(link=>{
      const text=link.querySelector('.lbg-ui-nav-text')?.textContent?.trim();
      if(text){link.title=text;link.setAttribute('aria-label',text)}
    });
  }

  function run(){queued=false;addStyle();if(ensureToggle())enhanceNavAccessibility()}
  function queue(){if(queued)return;queued=true;requestAnimationFrame(run)}
  function start(){
    addStyle();run();
    observer=new MutationObserver(queue);
    observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('resize',()=>{
      if(window.matchMedia('(max-width:1180px)').matches)document.body.classList.remove('lbg-sidebar-compact');
      else setCompact(compactState());
    },{passive:true});
    window.addEventListener('beforeunload',()=>observer?.disconnect(),{once:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
