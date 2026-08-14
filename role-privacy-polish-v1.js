'use strict';
(function(){
  const VERSION='20260814.1';
  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').replace(/\s+/g,' ').trim();
  const fold=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase();
  let observer=null,queued=false;

  function context(){return window.LBGAccess?.context||null}
  function style(){
    if(q('lbgRolePrivacyPolishCss'))return;
    const s=document.createElement('style');s.id='lbgRolePrivacyPolishCss';s.textContent=`
      #month2TeacherPickerButton[data-lbg-self-only="1"]{opacity:1!important;cursor:default!important;background:#fffdfb!important;border-color:#ead5c8!important;color:#49362e!important}
      #month2TeacherPickerButton[data-lbg-self-only="1"] .lbg-mtp-arrow{display:none!important}
      #lbgGroupsCard[hidden]{display:none!important}
      #lbgUiSidebar .lbg-ui-nav-link[data-lbg-group-nav-hidden="1"],#lbgUiSidebar [data-lbg-group-nav-hidden="1"]{display:none!important}
    `;document.head.appendChild(s);
  }

  function protectMonthlyPayroll(){
    const c=context(),sel=q('month2Teacher'),button=q('month2TeacherPickerButton'),panel=q('month2TeacherPickerPanel');
    if(!c||!sel||!button)return;
    const restricted=!c.is_owner&&!c.can_view_payroll_details,own=fold(c.teacher_code);
    if(!restricted){button.removeAttribute('data-lbg-self-only');button.removeAttribute('aria-disabled');return}
    if(own){
      let found='';
      [...sel.options].forEach(opt=>{const code=fold(opt.value);if(!code)return;const ok=code===own;opt.hidden=!ok;opt.disabled=!ok;if(ok)found=opt.value});
      if(found&&sel.value!==found){sel.value=found;sel.dispatchEvent(new Event('change',{bubbles:true}))}
    }
    button.dataset.lbgSelfOnly='1';button.setAttribute('aria-disabled','true');button.title='Bảng kê cá nhân: tài khoản này chỉ xem chính mình.';
    if(panel)panel.hidden=true;
    panel?.querySelectorAll('[data-value]').forEach(item=>{item.hidden=Boolean(own)&&fold(item.dataset.value)!==own});
  }

  function groupPanelAllowed(c){return Boolean(c?.is_owner||c?.is_group_leader||c?.can_manage_groups||c?.can_transfer_group_members)}
  function hideUselessGroupPanel(){
    const c=context();if(!c)return;
    const allowed=groupPanelAllowed(c),card=q('lbgGroupsCard');if(card)card.hidden=!allowed;
    const sidebar=q('lbgUiSidebar');if(!sidebar)return;
    [...sidebar.querySelectorAll('.lbg-ui-nav-link,a,button')].forEach(el=>{
      if(/Quản lý nhóm/i.test(txt(el.textContent))){if(allowed)el.removeAttribute('data-lbg-group-nav-hidden');else el.dataset.lbgGroupNavHidden='1'}
    });
  }

  function apply(){style();protectMonthlyPayroll();hideUselessGroupPanel()}
  function queue(){if(queued)return;queued=true;setTimeout(()=>{queued=false;apply()},90)}
  function start(){style();queue();observer=new MutationObserver(queue);observer.observe(document.body,{childList:true,subtree:true});
    document.addEventListener('click',e=>{const b=e.target.closest?.('#month2TeacherPickerButton[data-lbg-self-only="1"]');if(b){e.preventDefault();e.stopImmediatePropagation();q('month2TeacherPickerPanel')?.setAttribute('hidden','')}} ,true);
    document.addEventListener('keydown',e=>{const b=e.target.closest?.('#month2TeacherPickerButton[data-lbg-self-only="1"]');if(b&&['Enter',' ','ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation()}},true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  document.addEventListener('lbg-access-ready',queue);window.addEventListener('focus',queue);
  window.addEventListener('beforeunload',()=>observer?.disconnect(),{once:true});
  window.LBGRolePrivacyPolishV1={version:VERSION,refresh:queue};
})();
