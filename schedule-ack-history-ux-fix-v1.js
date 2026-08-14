'use strict';
(function(){
  const VERSION='20260814.1';
  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').trim();
  let timer=null,searchTimer=null,groupsCache={rows:[],at:0},groupsLoading=null,selectedGroup='all';

  function auth(){return window.LBGAuth?.client||null}
  function vnParts(d=new Date()){const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);return Object.fromEntries(p.map(x=>[x.type,x.value]))}
  function todayKey(){const p=vnParts();return`${p.year}-${p.month}-${p.day}`}

  async function loadGroups(force=false){
    const now=Date.now();
    if(!force&&groupsCache.rows.length&&now-groupsCache.at<60000)return groupsCache.rows;
    if(groupsLoading)return groupsLoading;
    groupsLoading=(async()=>{
      try{
        const c=auth();if(!c)return[];
        const{data,error}=await c.rpc('schedule_ack_monitor_groups');
        if(error)throw error;
        groupsCache={rows:(data||[]).slice().sort((a,b)=>txt(a.group_name).localeCompare(txt(b.group_name),'vi')),at:Date.now()};
        return groupsCache.rows;
      }catch{return groupsCache.rows||[]}
      finally{groupsLoading=null}
    })();
    return groupsLoading;
  }

  function patchSearch(){
    const input=q('lbgAckHistSearch');
    if(!input||input.dataset.ackSearchSmooth==='1')return;
    input.dataset.ackSearchSmooth='1';
    const original=input.oninput;
    const run=()=>{clearTimeout(searchTimer);searchTimer=null;if(typeof original==='function'&&document.contains(input))original.call(input,{target:input})};
    input.oninput=()=>{clearTimeout(searchTimer);searchTimer=setTimeout(run,380)};
    input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();run()}};
    input.onblur=()=>{if(searchTimer)run()};
  }

  function patchTodayButton(){
    const quick=document.querySelector('#lbgAckHistoryV1 .lbg-ack-history-quick');
    if(!quick||q('lbgAckTodayV1'))return;
    const b=document.createElement('button');
    b.id='lbgAckTodayV1';b.className='btn outline mini';b.textContent='Hôm nay';
    b.onclick=()=>{
      const from=q('lbgAckHistFrom'),to=q('lbgAckHistTo');if(!from||!to)return;
      const today=todayKey();from.value=today;to.value=today;
      from.dispatchEvent(new Event('change',{bubbles:true}));
      to.dispatchEvent(new Event('change',{bubbles:true}));
      setTimeout(apply,120);
    };
    const seven=quick.querySelector('[data-ack-quick="7"]');
    seven?quick.insertBefore(b,seven):quick.prepend(b);
  }

  async function patchGroups(){
    const select=q('lbgAckHistGroup');if(!select)return;
    if(select.dataset.ackGroupsSmooth!=='1'){
      select.dataset.ackGroupsSmooth='1';
      if(selectedGroup==='all'&&select.value)selectedGroup=select.value;
      const original=select.onchange;
      select.onchange=function(e){selectedGroup=this.value||'all';if(typeof original==='function')original.call(this,e);setTimeout(apply,120)};
    }
    const groups=await loadGroups(false);if(!document.contains(select))return;
    const existing=new Set([...select.options].map(o=>o.value));
    for(const g of groups){const id=String(g.group_id||'');if(!id||existing.has(id))continue;const o=document.createElement('option');o.value=id;o.textContent=txt(g.group_name)||'Nhóm không tên';select.appendChild(o)}
    if(selectedGroup!=='all'&&[...select.options].some(o=>o.value===selectedGroup))select.value=selectedGroup;
  }

  function apply(){patchSearch();patchTodayButton();patchGroups().catch(()=>{})}
  function start(){apply();timer=setInterval(apply,250)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  document.addEventListener('lbg-access-ready',()=>{groupsCache.at=0;apply()});
  window.addEventListener('focus',()=>{groupsCache.at=0;apply()});
  window.addEventListener('beforeunload',()=>{clearInterval(timer);clearTimeout(searchTimer)},{once:true});
  window.LBGScheduleAckHistoryUxFixV1={version:VERSION,refresh:()=>{groupsCache.at=0;apply()}};
})();