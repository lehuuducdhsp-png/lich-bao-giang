'use strict';
(function(){
  const VERSION='20260815.1';
  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').replace(/\s+/g,' ').trim();
  let timer=null,patchedClient=null,originalRpc=null;
  let sortMode='newest';

  function compareDate(a,b){return txt(a?.teaching_date).localeCompare(txt(b?.teaching_date))}
  function compareTime(a,b){
    const ta=a?.acknowledged_at?new Date(a.acknowledged_at).getTime():0;
    const tb=b?.acknowledged_at?new Date(b.acknowledged_at).getTime():0;
    return (Number.isFinite(ta)?ta:0)-(Number.isFinite(tb)?tb:0);
  }
  function compareName(a,b){return txt(a?.display_name||a?.username).localeCompare(txt(b?.display_name||b?.username),'vi',{sensitivity:'base'})}
  function sortRows(rows){
    if(!Array.isArray(rows))return rows;
    return rows.slice().sort((a,b)=>{
      if(sortMode==='oldest')return compareDate(a,b)||compareTime(a,b)||compareName(a,b);
      if(sortMode==='name')return compareName(a,b)||(-compareDate(a,b))||(-compareTime(a,b));
      return (-compareDate(a,b))||(-compareTime(a,b))||compareName(a,b);
    });
  }

  function patchRpc(){
    const client=window.LBGAuth?.client;if(!client||patchedClient===client)return;
    if(patchedClient&&originalRpc)patchedClient.rpc=originalRpc;
    patchedClient=client;originalRpc=client.rpc;
    client.rpc=function(name,args,options){
      const result=originalRpc.call(client,name,args,options);
      if(name!=='teaching_schedule_ack_history')return result;
      return Promise.resolve(result).then(res=>{
        if(res&&Array.isArray(res.data))return{...res,data:sortRows(res.data)};
        return res;
      });
    };
  }

  function addStyle(){
    if(q('lbgAckHistorySortCss'))return;
    const s=document.createElement('style');s.id='lbgAckHistorySortCss';s.textContent=`
      #lbgAckHistoryV1 .lbg-ack-history-filters{grid-template-columns:repeat(6,minmax(125px,1fr))}
      #lbgAckHistSort{font-weight:800}
      @media(max-width:1100px){#lbgAckHistoryV1 .lbg-ack-history-filters{grid-template-columns:repeat(3,minmax(0,1fr))}}
      @media(max-width:700px){#lbgAckHistoryV1 .lbg-ack-history-filters{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  function addControl(){
    const filters=document.querySelector('#lbgAckHistoryV1 .lbg-ack-history-filters');if(!filters||q('lbgAckHistSort'))return;
    const label=document.createElement('label');label.innerHTML=`Sắp xếp<select id="lbgAckHistSort"><option value="newest">Mới → Cũ</option><option value="oldest">Cũ → Mới</option><option value="name">Tên A → Z</option></select>`;
    filters.appendChild(label);
    const select=q('lbgAckHistSort');if(!select)return;select.value=sortMode;
    select.onchange=()=>{
      sortMode=select.value||'newest';
      window.LBG_ACK_HISTORY_SORT=sortMode;
      window.LBGScheduleAckHistoryV1?.refresh?.();
    };
  }

  function apply(){patchRpc();addStyle();addControl()}
  function start(){window.LBG_ACK_HISTORY_SORT=sortMode;apply();timer=setInterval(apply,350)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('beforeunload',()=>{clearInterval(timer);if(patchedClient&&originalRpc)patchedClient.rpc=originalRpc},{once:true});
  window.LBGScheduleAckHistorySortV1={version:VERSION,get mode(){return sortMode},refresh:apply};
})();
