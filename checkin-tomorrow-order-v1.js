'use strict';
(function(){
  const VERSION='20260906.1';
  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').replace(/\s+/g,' ').trim();
  const fold=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cfg=window.LBG_SUPABASE_CONFIG||{};
  let shared={status:'idle',row:null,workbook:null,loadedAt:0,error:null};
  let observer=null,queued=false,applying=false;

  function auth(){return window.LBGAuth?.client||null}
  function context(){return window.LBGAccess?.context||window.LBGCheckinV2?.getContext?.()||null}
  function vnParts(date=new Date()){const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);return Object.fromEntries(p.map(x=>[x.type,x.value]))}
  function todayKey(){const p=vnParts();return`${p.year}-${p.month}-${p.day}`}
  function addDays(k,n){const d=new Date(`${k}T12:00:00+07:00`);d.setUTCDate(d.getUTCDate()+n);const p=vnParts(d);return`${p.year}-${p.month}-${p.day}`}
  function tomorrowKey(){return addDays(todayKey(),1)}
  function normalizeSession(v){const x=fold(v);return x==='SANG'?'Sáng':x==='CHIEU'?'Chiều':'Khác'}
  function dayPhrase(k){const d=new Date(`${k}T12:00:00+07:00`),x=d.getUTCDay();return x===0?'chủ nhật':`thứ ${x+1}`}
  function dateLabel(k){const d=new Date(`${k}T12:00:00+07:00`);return new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'}).format(d)}
  function classLabel(v){const c=txt(v);if(!c)return'';if(/^KHỐI\b/i.test(c)||/^LỚP\b/i.test(c))return c;return`Lớp ${c}`}

  async function loadShared(force=false){
    const now=Date.now();
    if(!force&&shared.status==='ready'&&now-shared.loadedAt<60000)return shared;
    shared={status:'loading',row:null,workbook:null,loadedAt:now,error:null};
    try{
      const c=auth();if(!c)throw new Error('Chưa có kết nối đăng nhập.');
      const{data,error}=await c.from('tkb_files').select('id,original_name,storage_path,created_at,updated_at').eq('scope','shared').eq('status','ready').eq('is_active',true).order('updated_at',{ascending:false}).limit(1).maybeSingle();
      if(error)throw error;if(!data){shared={status:'none',row:null,workbook:null,loadedAt:Date.now(),error:null};return shared}
      const{data:blob,error:de}=await c.storage.from(cfg.bucket||'tkb-private').download(data.storage_path);if(de)throw de;
      if(!window.ExcelJS)throw new Error('ExcelJS chưa sẵn sàng.');
      const wb=new ExcelJS.Workbook();await wb.xlsx.load(await blob.arrayBuffer());
      shared={status:'ready',row:data,workbook:wb,loadedAt:Date.now(),error:null};
    }catch(error){shared={status:'error',row:null,workbook:null,loadedAt:Date.now(),error}}
    return shared;
  }

  function buildPoints(code,key){
    const scanner=window.LBGTeacherIntelligenceV6?.scanSheet,wanted=fold(code),book=shared.workbook;
    if(shared.status!=='ready'||!scanner||!book||!wanted)return[];
    const map=new Map();
    for(const ws of book.worksheets||[]){
      let groups=[];try{groups=scanner(ws)?.groups||[]}catch{continue}
      for(const g of groups){
        if(fold(g.code)!==wanted||txt(g.dateKey)!==key)continue;
        const school=txt(g.school),session=normalizeSession(g.session);if(!school||!['Sáng','Chiều'].includes(session))continue;
        const mapKey=`${session}|${fold(school)}`;
        if(!map.has(mapKey))map.set(mapKey,{school_name:school,session,events:[],periods:[],payPeriods:0});
        const point=map.get(mapKey),period=Number(g.teachingPeriod??g.period);
        if(Number.isFinite(period)&&period>0&&!point.periods.includes(period))point.periods.push(period);
        point.payPeriods+=Number(g.payPeriods)||Math.max(1,Array.isArray(g.source)?g.source.length:1);
        const members=(g.members?.length?g.members:g.classTexts||[]).map(txt).filter(Boolean);
        for(const name of members)point.events.push({name,period:Number.isFinite(period)?period:99,row:Number(g.row)||9999,col:Number(g.col)||9999});
      }
    }
    const rank=s=>s==='Sáng'?0:1;
    return[...map.values()].map(p=>{
      const classes=new Map();
      for(const e of p.events){
        const key=fold(e.name);if(!key)continue;
        const old=classes.get(key);
        if(!old||e.period<old.period||(e.period===old.period&&(e.row<old.row||(e.row===old.row&&e.col<old.col))))classes.set(key,e)
      }
      const ordered=[...classes.values()].sort((a,b)=>a.period-b.period||a.row-b.row||a.col-b.col||a.name.localeCompare(b.name,'vi')).map(x=>x.name);
      return{...p,periods:p.periods.sort((a,b)=>a-b),classes:ordered}
    }).sort((a,b)=>rank(a.session)-rank(b.session)||a.school_name.localeCompare(b.school_name,'vi'));
  }

  function reportText(points,key){
    const blocks=[];
    for(const session of ['Sáng','Chiều']){
      const items=points.filter(p=>p.session===session);if(!items.length)continue;
      const lines=[`${session} ${dayPhrase(key)}`];
      for(const p of items)lines.push(`${p.school_name}: ${p.classes.length?p.classes.map(classLabel).join(', '):'Chưa xác định lớp'}.`);
      blocks.push(lines.join('\n'))
    }
    return blocks.join('\n\n')
  }
  function detailHtml(points,key){
    return points.map(p=>`<article><b>${esc(p.session)} • ${esc(p.school_name)}</b><div class="lbg-checkin-meta">${esc(dateLabel(key))}${p.periods.length?` • Tiết ${esc(p.periods.join(', '))}`:''}${p.classes.length?` • ${esc(p.classes.map(classLabel).join(', '))}`:''}</div></article>`).join('')
  }
  async function copyText(value){if(navigator.clipboard?.writeText)return navigator.clipboard.writeText(value);const ta=document.createElement('textarea');ta.value=value;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove()}

  function patchSelf(points,key){
    const box=q('lbgTomorrowReportV2');if(!box||!points.length)return;
    const sig=JSON.stringify(points.map(p=>[p.session,p.school_name,p.periods,p.classes,p.payPeriods]));
    if(box.dataset.atomicOrderV1===sig)return;
    box.dataset.atomicOrderV1=sig;
    const text=reportText(points,key),preview=box.querySelector('.lbg-tomorrow-preview'),detail=q('lbgTomorrowDetailV2');
    if(preview)preview.textContent=text;if(detail)detail.innerHTML=detailHtml(points,key);
    const copy=q('lbgTomorrowCopyV2');
    if(copy)copy.onclick=async()=>{const label=copy.querySelector('span:last-child'),old=label?.textContent||'Sao chép báo nhóm';copy.disabled=true;try{await copyText(text);if(label)label.textContent='Đã sao chép';setTimeout(()=>{copy.disabled=false;if(label)label.textContent=old},1000)}catch(error){copy.disabled=false;if(label)label.textContent=old;alert('Không sao chép được: '+(error?.message||String(error)))}};
  }

  function patchMonitor(key){
    const table=q('lbgAckMonitorV2');if(!table)return;
    for(const row of table.querySelectorAll('tbody tr')){
      const meta=txt(row.querySelector('td:first-child .lbg-checkin-meta')?.textContent),code=txt(meta.split('•')[0]);if(!code)continue;
      const points=buildPoints(code,key),cell=row.children?.[2];if(!points.length||!cell)continue;
      const text=reportText(points,key);if(cell.textContent!==text)cell.textContent=text;
    }
  }

  async function apply(force=false){
    if(applying)return;applying=true;
    try{
      const code=txt(context()?.teacher_code),key=tomorrowKey();if(!code)return;
      await loadShared(force);if(shared.status!=='ready')return;
      patchSelf(buildPoints(code,key),key);patchMonitor(key)
    }finally{applying=false}
  }
  function queue(force=false){if(queued&&!force)return;queued=true;setTimeout(()=>{queued=false;apply(force).catch(console.error)},100)}
  function start(){queue(true);observer=new MutationObserver(()=>queue(false));observer.observe(document.body,{childList:true,subtree:true});window.addEventListener('beforeunload',()=>observer?.disconnect(),{once:true})}

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  document.addEventListener('lbg-access-ready',()=>queue(true));
  document.addEventListener('lbg-tkb-parser-v2-ready',()=>queue(true));
  document.addEventListener('lbg-atomic-teaching-v1-ready',()=>queue(true));
  document.addEventListener('lbg-cloud-file-opened',e=>{if(e?.detail?.scope==='shared'){shared.status='idle';queue(true)}});
  window.addEventListener('focus',()=>{shared.status='idle';queue(true)});
  window.LBGCheckinTomorrowOrderV1={version:VERSION,refresh:()=>queue(true),buildPoints};
})();
