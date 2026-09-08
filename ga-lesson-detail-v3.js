'use strict';
(function(){
  const VERSION='20260909.1',PLAN_YEAR=2026,PLAN_LABEL='2026–2027';
  const q=id=>document.getElementById(id),txt=v=>String(v??'').replace(/\r/g,'').trim(),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const DAY_NAME={2:'Hai',3:'Ba',4:'Tư',5:'Năm',6:'Sáu',7:'Bảy',8:'Chủ nhật'};
  let lastSignature='',historyCache={sheet:'',sig:'',value:null};
  const curr=()=>window.LBGGaCurriculumV1;
  const intel=()=>window.LBGTeacherIntelligenceV6;
  function currentResult(){try{return typeof result!=='undefined'?result:null}catch{return null}}

  function locationCandidates(e){const schoolName=txt(e?.schoolName||e?.school),siteDisplay=txt(e?.siteDisplay||e?.siteName),fold=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase().replace(/\s+/g,' '),canonical=txt(e?.locationKey)||(schoolName?`${fold(schoolName)}|${fold(siteDisplay)}`:''),label=txt(e?.locationLabel)||(siteDisplay?[schoolName,siteDisplay].filter(Boolean).join('\n'):schoolName);return[...new Set([canonical,label,txt(e?.school),schoolName].filter(Boolean))]}
  function manualGa(a,e){const values=a?.gaValues&&typeof a.gaValues==='object'?a.gaValues:{};for(const location of locationCandidates(e)){const key=`${Number(e?.day)}|${txt(e?.session)}|${location}`,raw=values[key];if(raw===undefined||raw===null||txt(raw)==='')continue;const n=Number(raw);if(Number.isFinite(n))return Math.round(n)}return null}
  function workbookSig(){try{return typeof activeId!=='undefined'?String(activeId||'active'):'active'}catch{return'active'}}
  function history(a){
    if(!a?.sheet||typeof intel()?.buildHistory!=='function')return null;const sig=`${workbookSig()}|${a.sheet}`;if(historyCache.sig===sig)return historyCache.value;
    try{const value=intel().buildHistory(a.sheet);historyCache={sheet:a.sheet,sig,value};return value}catch{return null}
  }
  function eventFor(a,e){return history(a)?.byAddress?.get?.(`${a.sheet}!${e.address}`)||null}
  function gaFor(a,e){const manual=manualGa(a,e);if(manual!==null)return{ga:manual,source:'manual',event:eventFor(a,e)};const event=eventFor(a,e);return{ga:Number.isFinite(Number(event?.ga))?Number(event.ga):null,source:event?.ga!=null?'nearest':'missing',event}}
  function entryDate(a,e){if(!(a?.start instanceof Date)||Number.isNaN(a.start.getTime()))return'';const d=new Date(a.start.getFullYear(),a.start.getMonth(),a.start.getDate(),12);d.setDate(d.getDate()+Math.max(0,Number(e?.day)-2));return d.toLocaleDateString('vi-VN')}
  function roleText(event){const roles=event?.roles||[event?.role].filter(Boolean),cat=event?.actualCategory||curr()?.category(event?.role);if(cat==='STEM')return'🔴 STEM';if(roles.includes('CTV')&&!roles.includes('KNS'))return'🟢 CTV KNS';if(roles.includes('CTV')&&roles.includes('KNS'))return'⚫🟢 KNS + CTV';if(cat==='KNS')return'⚫ KNS';return'Chưa xác định'}
  function lessonInfo(a,e,gaData){
    const c=curr(),startYear=Number(q('year')?.value||0);if(startYear!==PLAN_YEAR)return{kind:'warn',html:`<span class="lbg-ga-warn">Chưa có danh mục cho năm học ${esc(startYear||'—')}–${esc(startYear?startYear+1:'—')}</span>`};
    if(!c)return{kind:'warn',html:'<span class="lbg-ga-warn">Bộ danh mục GA chưa sẵn sàng</span>'};
    if(gaData.ga===null)return{kind:'missing',html:'<span class="lbg-ga-missing">Chưa đủ dữ liệu để gợi ý GA</span>'};
    const grades=c.gradesOf(e?.classRaw,e?.className);if(!grades.length)return{kind:'missing',html:'<span class="lbg-ga-missing">Chưa xác định khối từ tên lớp</span>'};
    const cat=gaData.event?.actualCategory||c.category(gaData.event?.role),valid=cat==='UNKNOWN'||c.isGaFor(cat,gaData.ga);
    const note=gaData.source==='manual'?'GA đã nhập thủ công':'Gợi ý từ lần dạy thực tế gần nhất cùng loại';
    const coop=gaData.event?.cooperative?`<span class="lbg-ga-note">🤝 ${esc(gaData.event.cooperationLabel||'Phối hợp giảng dạy')} • dùng chung 1 GA</span>`:'';
    const rows=grades.map(g=>{const title=c.title(g,gaData.ga);return title?`<div class="lbg-ga-title"><b>Khối ${g}:</b> ${esc(title)}</div>`:`<div class="lbg-ga-warn"><b>Khối ${g}:</b> Chưa có tên bài trong kế hoạch</div>`}).join('');
    return{kind:valid?'ok':'warn',html:`${rows}<span class="lbg-ga-note">${esc(note)}${cat!=='UNKNOWN'?` • ${esc(cat)}`:''}</span>${!valid?`<span class="lbg-ga-warn">GA ${gaData.ga} không thuộc chuỗi ${esc(cat)} đã chốt.</span>`:''}${coop}`}
  }
  function addCss(){if(q('lbgGaLessonDetailV3Css'))return;const s=document.createElement('style');s.id='lbgGaLessonDetailV3Css';s.textContent=`#detailCard .lbg-ga-status{display:inline-flex;align-items:center;gap:5px;padding:7px 10px;border:1px solid #f2d5c4;border-radius:999px;background:#fff8f3;color:#7a4b32;font-size:12px;font-weight:850;white-space:nowrap}#detailCard .lbg-ga-title{min-width:220px;white-space:normal;line-height:1.4;font-weight:750;color:#4b342b}#detailCard .lbg-ga-period,#detailCard .lbg-ga-no{font-weight:900;text-align:center;white-space:nowrap;color:#5b3828}#detailCard .lbg-ga-note{display:block;margin-top:3px;color:#64748b;font-size:11px;font-weight:650}#detailCard .lbg-ga-warn,#detailCard .lbg-ga-missing{color:#a16207;font-weight:800}#detailCard table th,#detailCard table td{vertical-align:top}`;document.head.appendChild(s)}
  function ensureStatus(){const head=q('detailCard')?.querySelector('.head'),actions=head?.querySelector('.lbg-ga-actions');if(!actions)return null;let s=q('gaLessonDetailStatusV3');if(!s){q('knsLessonDetailStatusV2')?.remove();s=document.createElement('span');s.id='gaLessonDetailStatusV3';s.className='lbg-ga-status';actions.insertBefore(s,actions.firstChild)}return s}
  function signature(a){return[a?.sheet,a?.code,q('year')?.value,JSON.stringify(a?.gaValues||{}),(a?.entries||[]).map(e=>[e.address,e.day,e.session,e.period,e.teachingPeriod,e.classRaw,e.className].join('~')).join('|'),workbookSig()].join('||')}
  function sync(){
    addCss();const a=currentResult(),card=q('detailCard'),tbody=q('detail');if(!a||!card||!tbody||card.hidden||!Array.isArray(a.entries))return;const sig=signature(a);if(sig===lastSignature){ensureStatus();return}lastSignature=sig;
    const head=card.querySelector('.head p');if(head)head.textContent=`Tên bài theo Kế hoạch ${PLAN_LABEL}. GA được ưu tiên theo số đã nhập; nếu chưa nhập, hệ thống dò lần dạy thực tế gần nhất theo loại giáo viên: KNS/CTV hoặc STEM.`;
    const tr=card.querySelector('thead tr');if(tr)tr.innerHTML='<th>STT</th><th>Thứ</th><th>Ngày</th><th>Buổi</th><th>Trường</th><th>Lớp</th><th>Tiết thực dạy</th><th>Loại</th><th>Giáo án</th><th>Tên bài dạy</th>';
    let suggested=0,manual=0,missing=0,cooperative=new Set();
    tbody.innerHTML=a.entries.map((e,i)=>{const gd=gaFor(a,e),info=lessonInfo(a,e,gd),ev=gd.event;if(gd.source==='manual')manual++;else if(gd.source==='nearest')suggested++;else missing++;if(ev?.cooperative)cooperative.add(ev.id||ev.cooperationLabel);const school=txt(e?.locationLabel||e?.school)||txt(e?.schoolName),classText=txt(e?.classRaw||e?.className),tp=Number(e?.teachingPeriod??e?.period)||'—';return`<tr><td>${i+1}</td><td>${esc(DAY_NAME[Number(e.day)]||`Thứ ${e.day}`)}</td><td>${esc(entryDate(a,e)||'—')}</td><td>${esc(e.session||'')}</td><td>${esc(school)}</td><td>${esc(classText)}</td><td class="lbg-ga-period">Tiết ${esc(tp)}</td><td>${esc(roleText(ev))}</td><td class="lbg-ga-no">${gd.ga===null?'—':`GA ${gd.ga}`}${gd.source==='nearest'?'<span class="lbg-ga-note">tự dò</span>':''}</td><td>${info.html}</td></tr>`}).join('');
    const status=ensureStatus();if(status){status.textContent=[`📘 Tự dò: ${suggested}`,`Đã nhập: ${manual}`,missing?`Thiếu: ${missing}`:'',cooperative.size?`🤝 Phối hợp: ${cooperative.size}`:''].filter(Boolean).join(' · ');status.title='KNS màu đen + CTV màu xanh dùng chung chuỗi KNS; STEM màu đỏ dùng chuỗi STEM riêng.'}
  }
  document.addEventListener('input',e=>{if(e.target?.classList?.contains('ga-input')||e.target?.classList?.contains('lbg-r3-ga')||e.target?.classList?.contains('lbg-r4-ga'))setTimeout(()=>{lastSignature='';historyCache.sig='';sync()},0)},true);
  document.addEventListener('change',e=>{if(['year','week'].includes(e.target?.id))setTimeout(()=>{lastSignature='';historyCache.sig='';sync()},0)},true);
  const observer=new MutationObserver(()=>sync());function start(){addCss();const card=q('detailCard');if(card)observer.observe(card,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});sync();setInterval(sync,900)}
  window.LBGGaLessonDetailV3={version:VERSION,locationCandidates,manualGa,history,eventFor,gaFor,lessonInfo};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
