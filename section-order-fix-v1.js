'use strict';
(function(){
  const VERSION='20260808.13';
  const q=id=>document.getElementById(id);
  let queued=false,observer=null;

  function main(){return document.querySelector('main.shell')||document.querySelector('main')}
  function titleOf(node){return String(node?.querySelector(':scope > .head h3,:scope > .head h2,h3,h2')?.textContent||'').replace(/\s+/g,' ').trim()}

  function reportAnchor(root){
    const detail=q('detailCard');
    if(detail?.parentElement===root)return detail;
    const preview=q('previewCard');
    if(preview?.parentElement===root)return preview;
    return [...root.children].find(node=>/^3\.\s*Kiểm tra và lập báo giảng/i.test(titleOf(node)))||null;
  }

  function numberedSections(root){
    const month=q('monthCardFixed');
    const conflict=q('conflictCard')||root.querySelector('.lbg-conflict-card');
    const weekly=q('weeklyStatsV6');
    const scoped=q('lbgScopedWeekly');
    return [month,conflict,weekly,scoped].filter((node,index,list)=>node&&node.parentElement===root&&list.indexOf(node)===index);
  }

  function sameOrder(root,anchor,items){
    if(!anchor||!items.length)return true;
    let node=anchor.nextElementSibling;
    for(const item of items){
      while(node&&node!==item&&['previewCard','detailCard'].includes(node.id))node=node.nextElementSibling;
      if(node!==item)return false;
      node=node.nextElementSibling;
    }
    return true;
  }

  function lockMainOrder(){
    const root=main();if(!root)return;
    const anchor=reportAnchor(root),items=numberedSections(root);
    if(!anchor||!items.length||sameOrder(root,anchor,items))return;
    let cursor=anchor;
    for(const item of items){cursor.insertAdjacentElement('afterend',item);cursor=item}
  }

  function groupLabel(group){return String(group?.querySelector('.lbg-ui-nav-label')?.textContent||'').replace(/\s+/g,' ').trim()}
  function groupForTarget(target){const button=document.querySelector(`#lbgUiNav .lbg-ui-nav-link[data-target="${target}"]`);return button?.closest('.lbg-ui-nav-group')||null}
  function ensureGroup(nav,label,afterGroup=null){
    let group=[...nav.querySelectorAll(':scope > .lbg-ui-nav-group')].find(g=>groupLabel(g)===label);
    if(group)return group;
    group=document.createElement('div');group.className='lbg-ui-nav-group';group.innerHTML=`<div class="lbg-ui-nav-label">${label}</div>`;
    if(afterGroup?.parentElement===nav)afterGroup.insertAdjacentElement('afterend',group);else nav.appendChild(group);
    return group;
  }

  function repairConflictNav(nav){
    const button=nav.querySelector('.lbg-ui-nav-link[data-target="conflictCard"]');if(!button)return;
    const current=button.closest('.lbg-ui-nav-group');
    if(groupLabel(current)==='Kiểm tra dữ liệu')return;
    const monthGroup=groupForTarget('monthCardFixed');
    const target=ensureGroup(nav,'Kiểm tra dữ liệu',monthGroup);
    target.appendChild(button);
    if(current&&!current.querySelector('.lbg-ui-nav-link'))current.remove();
  }

  function orderNavGroups(nav){
    const priority=new Map([
      ['Thời khóa biểu',10],['Báo giảng',20],['Bảng kê tháng',30],['Kiểm tra dữ liệu',40],['Giáo án',50],['Thống kê tuần',60],
      ['Thông báo',70],['Quản trị',80],['Dữ liệu đám mây',90],['Cài đặt',100],['Tiện ích khác',110]
    ]);
    const groups=[...nav.querySelectorAll(':scope > .lbg-ui-nav-group')];
    const sorted=[...groups].sort((a,b)=>(priority.get(groupLabel(a))??105)-(priority.get(groupLabel(b))??105));
    if(groups.every((g,i)=>g===sorted[i]))return;
    sorted.forEach(g=>nav.appendChild(g));
  }

  function repairNav(){
    const nav=q('lbgUiNav');if(!nav)return;
    repairConflictNav(nav);orderNavGroups(nav);
  }

  function repair(){queued=false;lockMainOrder();repairNav()}
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(repair)}

  function start(){
    repair();
    observer=new MutationObserver(schedule);
    observer.observe(document.body,{childList:true,subtree:true});
    document.addEventListener('lbg-access-ready',schedule);
    document.addEventListener('lbg-cloud-file-opened',schedule);
    setTimeout(schedule,250);setTimeout(schedule,1000);setTimeout(schedule,2500);
    window.addEventListener('beforeunload',()=>observer?.disconnect(),{once:true});
  }

  window.LBGSectionOrderFix={version:VERSION,repair};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
