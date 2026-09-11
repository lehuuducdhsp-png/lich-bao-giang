'use strict';
(function(){
  const VERSION='20260911.1';
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  const q=id=>document.getElementById(id);
  const engine=()=>window.LBGReportEngineV4;
  const rules=()=>window.LBGReportPayRulesV1;
  const trial=()=>window.LBGAssistPTrial;

  function reportPeriod(e){return Number(rules()?.reportPeriod?.(e)??e?.period)||0}
  function assistText(e){const base=txt(e?.className)||txt(e?.classRaw)||'Lớp chưa xác định',note=txt(e?.groupNote);return`${note?`${base} - ${note}`:base} (P)`}
  function cleanupCell(td){
    if(!td)return;
    [...td.childNodes].forEach(n=>{
      if(n.nodeType===3&&/^\s*&\s*$/.test(n.textContent||''))n.remove();
    });
  }
  function place(){
    const table=q('preview')?.querySelector('table.report');
    const api=trial();
    const code=txt(q('teacher')?.value);
    let ws=null;
    try{const b=typeof wb!=='undefined'?wb:null,name=q('week')?.value;ws=b&&name?b.getWorksheet(name):null}catch{}
    if(!table||!api?.scanAssist||!ws||!code)return;

    const entries=api.scanAssist(ws,code)||[];
    const days=engine()?.daysForWorksheet?.(ws)||[2,3,4,5,6,7];

    table.querySelectorAll('.lbg-assist-p').forEach(span=>{
      const p=span.parentElement;span.remove();cleanupCell(p);
    });

    for(const e of entries){
      const di=days.indexOf(Number(e.day));
      const p=reportPeriod(e);
      if(di<0||p<1||p>5)continue;
      const rowIndex=e.session==='Sáng'?1+p:7+p;
      // Các dòng tiết bị lệch 1 ô vì cột “Buổi” đang rowspan.
      const cellIndex=1+di;
      const cell=table.rows[rowIndex]?.cells[cellIndex];
      if(!cell)continue;
      if(txt(cell.textContent))cell.append(' & ');
      const span=document.createElement('span');
      span.className='lbg-assist-p';
      span.textContent=assistText(e);
      span.dataset.lbgAssistPosFix=VERSION;
      cell.appendChild(span);
    }
    table.dataset.lbgAssistPositionFixed=VERSION;
  }

  let queued=false;
  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;place()})}
  function install(){
    queue();
    const preview=q('preview');
    if(preview){const obs=new MutationObserver(queue);obs.observe(preview,{childList:true,subtree:true})}
    document.addEventListener('click',e=>{if(e.target?.closest?.('#analyze'))setTimeout(queue,220)},true);
    document.addEventListener('change',e=>{if(['week','teacher'].includes(e.target?.id))setTimeout(queue,120)},true);
    setInterval(queue,900);
    window.LBGAssistPPreviewPositionHotfix={version:VERSION,place};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
