'use strict';
(function(){
  const VERSION='20260909.1',PLAN_YEAR=2026,PLAN_LABEL='2026–2027';
  const q=id=>document.getElementById(id),txt=v=>String(v??'').replace(/\r/g,'').trim(),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let lastSignature='';
  const H=()=>window.LBGTeachingPlanProgressV1;
  const currentResult=()=>{try{return typeof result!=='undefined'?result:null}catch{return null}};
  const currentBook=()=>{try{return typeof wb!=='undefined'?wb:null}catch{return null}};
  const worksheet=name=>currentBook()&&name?currentBook().getWorksheet(name):null;

  function locationCandidates(e){return H()?.locationCandidates?.(e)||[txt(e?.locationKey),txt(e?.locationLabel),txt(e?.school)].filter(Boolean)}
  function gaValue(a,e){
    const values=a?.gaValues&&typeof a.gaValues==='object'?a.gaValues:{};
    for(const location of locationCandidates(e)){const raw=values[`${Number(e?.day)}|${txt(e?.session)}|${location}`];if(raw===undefined||raw===null||txt(raw)==='')continue;const n=Number(raw);if(Number.isFinite(n))return Math.round(n)}return null;
  }
  function gradesOf(...values){return H()?.gradesOf?.(...values)||[]}
  function lookupLesson(grade,ga,track='kns'){
    grade=Number(grade);ga=Number(ga);
    if(track==='kns'&&(grade===4||grade===5)&&ga===13)return{kind:'moved',grade,ga,track,movedTo:12,title:`GA ${ga} đã chuyển thành GA 12`};
    const x=H()?.titleFor?.(grade,track,ga);if(!x)return{kind:'unknown',grade,ga,track,title:'Chưa có tên bài trong kế hoạch'};
    return x.kind==='lesson'?{kind:track==='kns'?'kns':'stem',...x}:x;
  }
  function entryDate(a,e){if(!(a?.start instanceof Date)||Number.isNaN(a.start.getTime()))return'';const d=new Date(a.start.getFullYear(),a.start.getMonth(),a.start.getDate(),12),off=Number(e?.day)===8?6:Number(e?.day)-2;d.setDate(d.getDate()+Math.max(0,off));return d.toLocaleDateString('vi-VN')}

  function addCss(){
    if(q('knsLessonDetailV2Css'))return;const s=document.createElement('style');s.id='knsLessonDetailV2Css';s.textContent=`
      #detailCard .lbg-kns-status{display:inline-flex;align-items:center;gap:5px;padding:7px 10px;border:1px solid #f2d5c4;border-radius:999px;background:#fff8f3;color:#7a4b32;font-size:12px;font-weight:850;white-space:normal}
      #detailCard .lbg-plan-title{min-width:220px;white-space:normal;line-height:1.35;font-weight:800;color:#4b342b}#detailCard .lbg-plan-ga{font-weight:900;color:#9a5b36;text-align:center;white-space:nowrap}
      #detailCard .lbg-plan-track{font-weight:900;white-space:nowrap}.lbg-plan-track.kns{color:#111827}.lbg-plan-track.stem{color:#b91c1c}.lbg-plan-track.ctv{color:#1d4ed8}
      #detailCard .lbg-plan-note{display:block;margin-top:2px;color:#806b61;font-size:11px;font-weight:650;line-height:1.3}#detailCard .lbg-plan-collab{color:#0f766e;font-weight:800}
      #detailCard .lbg-plan-warn{color:#a16207;font-weight:800}#detailCard table th,#detailCard table td{vertical-align:top}@media(max-width:760px){#detailCard .lbg-kns-status{white-space:normal}}`;
    document.head.appendChild(s);
  }
  function ensureStatusHost(){const card=q('detailCard'),head=card?.querySelector('.head'),actions=head?.querySelector('.lbg-ga-actions');if(!actions)return null;let s=q('knsLessonDetailStatusV1');if(!s){s=document.createElement('span');s.id='knsLessonDetailStatusV1';s.className='lbg-kns-status';actions.insertBefore(s,actions.firstChild)}return s}

  function anchorResolver(a){return(atom,ws)=>{if(ws?.name!==a?.sheet||txt(atom?.code).toUpperCase()!==txt(a?.code).toUpperCase())return null;return gaValue(a,atom)}}
  function buildLedger(a){const helper=H(),book=currentBook();return helper?.buildLedger&&book?helper.buildLedger(book,{anchorResolver:anchorResolver(a)}):null}
  function trackLabel(role,track){if(role==='ctv-kns')return{label:'CTV KNS',cls:'ctv'};if(track==='stem')return{label:'STEM',cls:'stem'};return{label:'KNS',cls:'kns'}}
  function gaSourceLabel(source,manual){if(manual!=null)return'Đã nhập thủ công';if(source==='nearest')return'Dò từ GA gần nhất';if(source==='counted')return'Đếm theo lần dạy thực tế trong file';if(source==='manual')return'Dò từ GA đã xác nhận';if(source==='ambiguous')return'Có mâu thuẫn mốc GA';return'Chưa đủ dữ liệu'}

  function rowRecords(a,ledger){
    const helper=H(),ws=worksheet(a?.sheet),seen=new Set(),rows=[];
    for(const e of a?.entries||[]){
      const role=helper?.roleFor?.(e,ws)||{track:'kns',role:'kns',label:'KNS'},grades=gradesOf(e?.classRaw,e?.className);
      for(const grade of grades.length?grades:[null]){
        const ev=grade?helper?.findEvent?.(ledger,a.sheet,e,grade):null,id=ev?.id||`${e.address}|${grade||'?'}`;if(seen.has(id))continue;seen.add(id);
        const manual=gaValue(a,e),ga=manual??ev?.ga??null,track=ev?.track||role.track,title=grade&&ga!=null?lookupLesson(grade,ga,track):{kind:'unknown',title:'Chưa xác định tên bài'},participants=ev?.participants||[{code:a.code,name:a.teacherName,role:role.role,label:role.label}],tl=trackLabel(role.role,track);
        rows.push({e,ev,grade,manual,ga,track,title,participants,trackLabel:tl,source:gaSourceLabel(ev?.gaSource,manual)});
      }
    }
    return rows;
  }

  function lessonInfo(e,ga,track='kns'){
    if(Number(q('year')?.value||0)!==PLAN_YEAR)return{kind:'year',html:`<span class="lbg-plan-warn">Chưa có danh mục cho năm học này.</span>`};
    const grades=gradesOf(e?.classRaw,e?.className);if(ga==null)return{kind:'missing',html:'<span class="lbg-plan-warn">Chưa xác định GA</span>'};if(!grades.length)return{kind:'grade',html:'<span class="lbg-plan-warn">Chưa xác định khối</span>'};
    const parts=grades.map(g=>lookupLesson(g,ga,track));return{kind:parts.some(x=>x.kind==='kns'||x.kind==='stem')?track:'unknown',html:parts.map(x=>esc(x.title)).join(' / ')};
  }

  function signature(a){if(!a||!Array.isArray(a.entries))return'';return[q('year')?.value||'',a.sheet||'',a.code||'',a.entries.map(e=>[e.day,e.session,e.period,e.teachingPeriod,e.locationKey,e.classRaw,e.address].join('~')).join('|'),JSON.stringify(a.gaValues||{})].join('||')}
  function sync(){
    addCss();const a=currentResult(),card=q('detailCard'),tbody=q('detail');if(!a||!card||!tbody||card.hidden||!Array.isArray(a.entries)||!H())return;
    const sig=signature(a);if(sig===lastSignature){ensureStatusHost();return}lastSignature=sig;
    const ledger=buildLedger(a),rows=rowRecords(a,ledger),headText=card.querySelector('.head p');if(headText)headText.textContent=`Tên bài đối chiếu Kế hoạch ${PLAN_LABEL}. Mã đen = KNS • đỏ = STEM • xanh = CTV KNS. GA tự dò theo lần dạy thực tế gần nhất, không theo ranh giới tuần.`;
    const tr=card.querySelector('thead tr');if(tr)tr.innerHTML='<th>STT</th><th>Thứ / Ngày</th><th>Buổi</th><th>Trường</th><th>Lớp</th><th>Tiết thực dạy</th><th>Luồng</th><th>Giáo án</th><th>Tên bài dạy</th><th>Phối hợp</th>';
    tbody.innerHTML=rows.map((r,i)=>{
      const e=r.e,lesson=r.title,collab=r.participants.length>1?r.participants.map(p=>p.name||p.code).join(' + '):'—',override=lesson?.overridden?`<span class="lbg-plan-note">Quy ước vận hành: GA ${r.ga} lấy tên bài gốc tiết ${lesson.sourcePeriod}.</span>`:'',source=`<span class="lbg-plan-note">${esc(r.source)}</span>`;
      return`<tr><td>${i+1}</td><td>Thứ ${Number(e.day)===8?'CN':esc(e.day)}<br><small>${esc(entryDate(a,e)||'—')}</small></td><td>${esc(e.session||'')}</td><td style="white-space:pre-line">${esc(e.locationLabel||e.schoolName||e.school||'—')}</td><td>${esc(e.classRaw||e.className||'—')}</td><td><b>Tiết ${esc(r.ev?.teachingPeriod||H().actualPeriod(e)||'—')}</b></td><td><span class="lbg-plan-track ${r.trackLabel.cls}">${esc(r.trackLabel.label)}</span></td><td class="lbg-plan-ga">${r.ga==null?'—':`GA ${esc(r.ga)}`}${source}</td><td class="lbg-plan-title">${lesson?.kind==='kns'||lesson?.kind==='stem'?esc(lesson.title):`<span class="lbg-plan-warn">${esc(lesson?.title||'Chưa xác định')}</span>`}${override}</td><td>${collab==='—'?'—':`<span class="lbg-plan-collab">🤝 ${esc(collab)}</span>`}</td></tr>`;
    }).join('');
    const status=ensureStatusHost();if(status){const k=rows.filter(r=>r.track==='kns'&&r.participants.some(p=>p.role!=='ctv-kns')).length,c=rows.filter(r=>r.participants.some(p=>p.role==='ctv-kns')).length,s=rows.filter(r=>r.track==='stem').length,auto=rows.filter(r=>r.manual==null&&r.ga!=null).length;status.textContent=`📘 KNS ${k} · 🔴 STEM ${s} · 🔵 CTV KNS ${c} · GA tự dò ${auto}`;status.title='GA tự dò ưu tiên mốc đã nhập gần nhất; lớp phối hợp chỉ dùng một GA chung.'}
  }

  document.addEventListener('input',event=>{if(event.target?.classList?.contains('ga-input')||event.target?.classList?.contains('lbg-r3-ga')||event.target?.classList?.contains('lbg-r4-ga'))setTimeout(()=>{lastSignature='';sync()},0)},true);
  document.addEventListener('change',event=>{if(['year','week','teacher'].includes(event.target?.id))setTimeout(()=>{lastSignature='';sync()},20)},true);
  const observer=new MutationObserver(()=>sync());function start(){addCss();const card=q('detailCard');if(card)observer.observe(card,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});sync();setInterval(sync,900)}
  window.LBGKnsLessonDetailV2={version:VERSION,gradesOf,locationCandidates,gaValue,lookupLesson,lessonInfo,buildLedger,rowRecords};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();