'use strict';
(function(){
  const VERSION='20260813.1';
  let queued=false,observer=null;
  const txt=v=>String(v??'').replace(/\s+/g,' ').trim();

  function style(){
    if(document.getElementById('lbgCheckinProfessionalLabelsCss'))return;
    const s=document.createElement('style');
    s.id='lbgCheckinProfessionalLabelsCss';
    s.textContent=`
      #lbgCheckinPermissionAdminV3 .lbg-p3-pilot{display:none!important}
    `;
    document.head.appendChild(s);
  }

  function replaceText(root){
    if(!root)return;
    const replacements=[
      ['PILOT là giai đoạn thử nghiệm giới hạn trước khi mở chính thức. Chủ sở hữu quản lý toàn hệ thống theo từng nhóm.','Chủ sở hữu quản lý quyền Check-in toàn hệ thống theo từng nhóm.'],
      ['Bạn có thể kiểm tra dữ liệu và quản lý giai đoạn thử nghiệm bên dưới.','Bạn có thể kiểm tra dữ liệu và quản lý quyền Check-in bên dưới.'],
      ['Tài khoản này chưa được bật trong nhóm thử nghiệm Check-in.','Tài khoản này chưa được cấp quyền Check-in.'],
      ['Nhóm thử nghiệm Check-in','Quản lý quyền Check-in'],
      ['Chỉ Chủ sở hữu cấu hình. Cờ thử nghiệm không thay đổi vai trò hiện có.','Chỉ Chủ sở hữu cấu hình. Phân quyền Check-in không thay đổi vai trò tài khoản hiện có.'],
      ['Nhãn PILOT cho biết hệ thống vẫn đang giới hạn người dùng để kiểm tra an toàn trước khi mở chính thức.','Phạm vi Check-in được Chủ sở hữu quản lý theo tài khoản và nhóm.']
    ];
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    for(const node of nodes){
      let value=node.nodeValue||'';
      for(const [from,to] of replacements)value=value.split(from).join(to);
      if(value!==node.nodeValue)node.nodeValue=value;
    }
  }

  function cleanHeader(card){
    const badge=card?.querySelector(':scope > .head .badge');
    if(!badge)return;
    const m=txt(badge.textContent).match(/(\d{2}\/\d{2}\/\d{4})/);
    if(m)badge.textContent=m[1];
    else if(/PILOT|THỬ NGHIỆM/i.test(txt(badge.textContent)))badge.hidden=true;
  }

  function cleanLegacyPilot(card){
    card?.querySelectorAll('.lbg-checkin-panel').forEach(panel=>{
      const h=panel.querySelector('h4');
      if(h&&/Nhóm thử nghiệm Check-in/i.test(txt(h.textContent)))h.textContent='⚙️ Quản lý quyền Check-in';
      panel.querySelectorAll('.lbg-checkin-pill').forEach(pill=>{
        if(/^PILOT$/i.test(txt(pill.textContent)))pill.hidden=true;
      });
    });
  }

  function apply(){
    style();
    const card=document.getElementById('lbgCheckinCard');
    if(!card)return;
    cleanHeader(card);
    cleanLegacyPilot(card);
    replaceText(card);
    const p3=document.getElementById('lbgCheckinPermissionAdminV3');
    if(p3){
      const badge=p3.querySelector('.lbg-p3-pilot');if(badge)badge.hidden=true;
      const p=p3.querySelector('.lbg-p3-head p');
      if(p&&/PILOT|thử nghiệm/i.test(txt(p.textContent)))p.textContent='Chủ sở hữu quản lý quyền Check-in toàn hệ thống theo từng nhóm.';
    }
  }

  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})}
  function start(){style();queue();observer=new MutationObserver(queue);observer.observe(document.body,{childList:true,subtree:true,characterData:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  document.addEventListener('lbg-access-ready',queue);
  window.addEventListener('focus',queue);
  window.addEventListener('beforeunload',()=>observer?.disconnect(),{once:true});
  window.LBGCheckinProfessionalLabelsV1={version:VERSION,refresh:queue};
})();