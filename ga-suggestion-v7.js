'use strict';
(function(root,factory){
  const api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.LBGGaSuggestionV7=api;
  if(root&&root.document)api.install();
})(typeof window!=='undefined'?window:globalThis,function(root){
  const VERSION='20260909.1';
  const KNS_SEQUENCE=[1,2,4,5,7,8,9,10,11,12,14,15,17,18,19,21,22,24,25,26,28,29,30,31,33,34];
  const STEM_SEQUENCE=[3,6,13,16,20,23,27,32,35];
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  const fold=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase().replace(/\s+/g,' ');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dayRank=s=>txt(s).toLowerCase().startsWith('sáng')?0:1;
  const seqFor=track=>track==='stem'?STEM_SEQUENCE:KNS_SEQUENCE;
  const nextGa=(track,ga)=>{const seq=seqFor(track),i=seq.indexOf(Number(ga));return i<0?seq.find(x=>x>Number(ga))??seq[0]??null:seq[i+1]??null};
  const dateKey=d=>d instanceof Date&&!Number.isNaN(d.getTime())?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`:'';

  function gradesOf(...values){
    const out=[],add=n=>{n=Number(n);if(n>=1&&n<=5&&!out.includes(n))out.push(n)};
    for(const value of values){const raw=txt(value);if(!raw)continue;let m;const a=/KHỐI\s*([1-5])/gi;while((m=a.exec(raw)))add(m[1]);const b=/(?:^|[^0-9])([1-5])\s*\/\s*\d+/g;while((m=b.exec(raw)))add(m[1]);const c=/LỚP\s*([1-5])(?:\b|\s*\/)/gi;while((m=c.exec(raw)))add(m[1])}
    return out;
  }
  function normalizeClass(v){return fold(v).replace(/\s*-\s*TIẾT\s*[1-5]\b/g,'').replace(/\s+/g,' ').trim()}
  function classMembers(v,grade){
    const raw=txt(v),out=[],seen=new Set();let m;const re=/([1-5])\s*\/\s*(\d+)/g;
    while((m=re.exec(raw))){const k=`${Number(m[1])}/${Number(m[2])}`;if(!seen.has(k)){seen.add(k);out.push(k)}}
    if(out.length)return out;
    const base=normalizeClass(raw);return base?[`G${Number(grade)}:${base}`]:[`G${Number(grade)}:CHƯA-XÁC-ĐỊNH`];
  }
  function actualPeriod(e){const n=Number(e?.teachingPeriod);if(Number.isFinite(n)&&n>0)return n;const m=txt(e?.groupNote||e?.classRaw).match(/\bTIẾT\s*([1-5])\b/i);return m?Number(m[1]):Number(e?.period)||null}
  function roleTrack(role){const r=String(role||'').toUpperCase();if(r==='STEM')return{track:'stem',role:'STEM',label:'STEM'};if(r==='CTV')return{track:'kns',role:'CTV',label:'CTV KNS'};return{track:'kns',role:'KNS',label:'KNS'}}
  function locationKey(e){return txt(e?.locationKey)||`${fold(e?.schoolName||e?.school)}|${fold(e?.siteDisplay||e?.siteName)}`}
  function schoolLabel(e){return txt(e?.locationLabel||e?.schoolName||e?.school)||'Chưa xác định'}
  function classLabel(e){return txt(e?.classRaw||e?.className)||'Chưa xác định'}
  function eventDate(ws,e,opts={}){let start=null;try{start=opts.startDateFor?opts.startDateFor(ws):null}catch{}if(!(start instanceof Date)||Number.isNaN(start.getTime()))return null;const day=Number(e?.day),off=day===8?6:day-2;if(off<0||off>6)return null;const d=new Date(start.getFullYear(),start.getMonth(),start.getDate(),12);d.setDate(d.getDate()+off);return d}
  function orderedSheets(book,selectedSheet,opts={}){
    const rows=(book?.worksheets||[]).map((ws,index)=>{let start=null;try{start=opts.startDateFor?opts.startDateFor(ws):null}catch{}return{ws,index,start}}).filter(x=>opts.weekLike?opts.weekLike(x.ws):true);
    rows.sort((a,b)=>{const at=a.start instanceof Date&&!Number.isNaN(a.start.getTime())?a.start.getTime():Infinity,bt=b.start instanceof Date&&!Number.isNaN(b.start.getTime())?b.start.getTime():Infinity;return at-bt||a.index-b.index});
    const idx=rows.findIndex(x=>x.ws.name===selectedSheet);if(idx<0)throw new Error('Không tìm thấy tuần đang chọn trong file TKB.');return rows.slice(0,idx+1).map(x=>x.ws)
  }

  function buildHistory(book,selectedSheet,opts={}){
    const parser=opts.parser,roleResolver=opts.roleResolver;if(!book||!parser?.scanAssignments)throw new Error('Bộ đọc TKB chưa sẵn sàng.');
    const sheets=orderedSheets(book,selectedSheet,opts),events=new Map(),byAddress=new Map(),warnings=[];
    for(const ws of sheets){
      let entries=[];try{entries=parser.scanAssignments(ws)||[]}catch(error){warnings.push(`${ws.name}: ${error?.message||error}`);continue}
      for(const e of entries){
        const code=txt(e?.code).toUpperCase();if(!code||/\+$/.test(code))continue;
        let role='KNS';try{role=roleResolver?.(ws,code,e)||'KNS'}catch{}
        const rt=roleTrack(role),date=eventDate(ws,e,opts),dk=dateKey(date),period=actualPeriod(e),loc=locationKey(e),grades=gradesOf(e?.classRaw,e?.className);if(!dk||!period||!loc||!grades.length)continue;
        for(const grade of grades){
          const cl=classLabel(e),classId=normalizeClass(cl),id=[dk,txt(e.session),period,loc,grade,rt.track,classId].join('|');
          let ev=events.get(id);if(!ev){ev={id,sheet:ws.name,date,dateKey:dk,day:Number(e.day),session:txt(e.session),period,teachingPeriod:period,locationKey:loc,school:schoolLabel(e),classDisplay:cl,classId,grade:Number(grade),track:rt.track,addresses:new Set(),participants:new Map(),atoms:[],members:new Set(),manualValues:new Set(),ga:null,gaSource:'',previousEvents:[],historyMismatch:false,partialHistory:false};events.set(id,ev)}
          ev.atoms.push(e);if(e.address)ev.addresses.add(txt(e.address));for(const m of classMembers(cl,grade))ev.members.add(m);
          if(!ev.participants.has(code))ev.participants.set(code,{code,name:txt(e.teacherName||code),role:rt.role,label:rt.label});
          if(typeof opts.manualResolver==='function'){let g=null;try{g=opts.manualResolver(e,ws,grade)}catch{}if(g!==null&&g!==undefined&&txt(g)!==''){const n=Math.round(Number(g));if(Number.isFinite(n))ev.manualValues.add(n)}}
        }
      }
    }
    const list=[...events.values()].sort((a,b)=>a.date-b.date||dayRank(a.session)-dayRank(b.session)||a.period-b.period||a.id.localeCompare(b.id)),states=new Map();
    for(const ev of list){
      ev.addresses=[...ev.addresses];ev.participants=[...ev.participants.values()];ev.members=[...ev.members];
      const seq=seqFor(ev.track),manual=[...ev.manualValues].filter(x=>seq.includes(Number(x))),prior=[];
      for(const member of ev.members){const st=states.get([ev.locationKey,ev.grade,ev.track,member].join('|'));if(st)prior.push(st)}
      ev.previousEvents=[...new Map(prior.map(x=>[x.event.id,x.event])).values()];
      if(manual.length===1){ev.ga=manual[0];ev.gaSource='manual'}
      else if(manual.length>1){ev.ga=null;ev.gaSource='conflict';ev.historyMismatch=true;warnings.push(`Mâu thuẫn GA đã nhập tại ${ev.dateKey}, ${ev.school}, ${ev.classDisplay}.`)}
      else if(!prior.length){ev.ga=seq[0]??null;ev.gaSource='first'}
      else{
        const candidates=prior.map(x=>nextGa(ev.track,x.ga)).filter(x=>x!==null),uniq=[...new Set(candidates)];
        const knownMembers=new Set(prior.map(x=>x.member));ev.partialHistory=knownMembers.size<ev.members.length;
        if(uniq.length===1){ev.ga=uniq[0];ev.gaSource='previous'}else{ev.ga=null;ev.gaSource='conflict';ev.historyMismatch=true;warnings.push(`Lịch sử GA các lớp trong nhóm không đồng nhất tại ${ev.dateKey}, ${ev.school}.`)}
      }
      if(ev.ga!==null)for(const member of ev.members)states.set([ev.locationKey,ev.grade,ev.track,member].join('|'),{member,ga:ev.ga,event:ev});
      for(const address of ev.addresses)byAddress.set(`${ev.sheet}!${address}`,ev);
    }
    return{version:VERSION,sheets:sheets.map(x=>x.name),events:list,byAddress,warnings};
  }

  function bookNow(){try{return typeof wb!=='undefined'?wb:null}catch{return null}}
  function resultNow(){try{return typeof result!=='undefined'?result:null}catch{return null}}
  function startDateFor(ws){try{return typeof startDate==='function'?startDate(ws.name):null}catch{return null}}
  function weekLikeFor(ws){try{return typeof weekLike==='function'?weekLike(ws):true}catch{return true}}
  function roleResolver(ws,code){const m=root.LBGTeacherIntelligenceV6?.summaryRoles?.(ws)?.get?.(txt(code).toUpperCase());return m?.role||'KNS'}
  function currentManualResolver(a){return(e,ws)=>{if(ws?.name!==a?.sheet||txt(e?.code).toUpperCase()!==txt(a?.code).toUpperCase())return null;const values=a?.gaValues&&typeof a.gaValues==='object'?a.gaValues:{};const locations=[txt(e?.locationKey),txt(e?.locationLabel),txt(e?.school),txt(e?.schoolName)].filter(Boolean);for(const loc of locations){const raw=values[`${Number(e.day)}|${txt(e.session)}|${loc}`];if(raw===undefined||raw===null||txt(raw)==='')continue;const n=Number(raw);if(Number.isFinite(n))return Math.round(n)}return null}}
  function fmtDate(d){return d instanceof Date&&!Number.isNaN(d.getTime())?d.toLocaleDateString('vi-VN'):'—'}
  function titleFor(ev){const h=root.LBGTeachingPlanProgressV1,x=h?.titleFor?.(ev.grade,ev.track,ev.ga);if(x?.kind==='lesson')return x;return{title:ev.ga==null?'Chưa xác định GA':'Chưa có tên bài trong kế hoạch',kind:'unknown'}}
  function trackText(ev){return ev.track==='stem'?'STEM':'Kỹ năng sống'}
  function participantText(ev){return(ev.participants||[]).map(p=>`${p.name||p.code} (${p.code})${p.role==='CTV'?' – CTV KNS':''}`).join(' + ')}
  function basisText(ev){
    if(ev.gaSource==='manual')return'GA đã được nhập/xác nhận thủ công cho sự kiện này.';
    if(ev.gaSource==='conflict')return'Lịch sử hoặc mốc GA đang mâu thuẫn — cần xác nhận trước khi dùng.';
    if(ev.gaSource==='first')return`Chưa có lần dạy ${trackText(ev)} trước đó của đúng lớp/nhóm lớp tại điểm dạy này trong dữ liệu từ tuần đầu; dùng GA đầu chuỗi.`;
    const prev=(ev.previousEvents||[]).sort((a,b)=>b.date-a.date)[0];if(!prev)return'Dò theo lần dạy thực tế gần nhất.';
    const extra=ev.partialHistory?' Một phần lớp trong nhóm chưa có lịch sử riêng, nên lấy mốc từ các lớp đã có dữ liệu.':'';
    return`GA gần nhất của đúng lớp/nhóm lớp: ${fmtDate(prev.date)} • ${prev.session} • Tiết ${prev.period} • GA ${prev.ga}. Sự kiện hiện tại là lần dạy ${trackText(ev)} kế tiếp → GA ${ev.ga}.${extra}`;
  }
  function renderPanel(panel,history,a){
    const unique=new Map();for(const entry of a.entries||[]){const ev=history.byAddress.get(`${a.sheet}!${entry.address}`);if(ev&&!unique.has(ev.id))unique.set(ev.id,ev)}const rows=[...unique.values()].sort((x,y)=>x.date-y.date||dayRank(x.session)-dayRank(y.session)||x.period-y.period);
    panel.innerHTML=`<div class="alert info"><b>GA gợi ý V7:</b> đếm theo <b>sự kiện dạy thực tế</b>, không đếm theo ô nguồn. Mã đen = KNS • mã đỏ = STEM • CTV xanh dùng chung tiến trình KNS. Lớp gộp/phối hợp cùng tiết chỉ dùng <b>1 GA</b>; học bù vẫn được tính là một lần dạy thực tế mới.</div>${rows.length?`<div class="wrap"><table><thead><tr><th>STT</th><th>Ngày – buổi – tiết thực dạy</th><th>Trường</th><th>Lớp / nhóm lớp</th><th>Giáo viên / phối hợp</th><th>Luồng</th><th>GA gợi ý & tên bài</th><th>Căn cứ</th></tr></thead><tbody>${rows.map((ev,i)=>{const lesson=titleFor(ev),collab=(ev.participants||[]).length>1,src=ev.addresses.join(', ');return`<tr><td>${i+1}</td><td>${esc(fmtDate(ev.date))}<br>${esc(ev.session)} – <b>Tiết ${esc(ev.period)}</b></td><td>${esc(ev.school)}</td><td>${esc(ev.classDisplay)}<br><small>Ô nguồn: ${esc(src)}${ev.atoms.length>1?` • ${ev.atoms.length} ô cùng sự kiện (không tăng GA)`:''}</small></td><td>${collab?'<b style="color:#0f766e">🤝 Phối hợp</b><br>':''}${esc(participantText(ev))}</td><td><b style="color:${ev.track==='stem'?'#b91c1c':'#1d4ed8'}">${esc(trackText(ev))}</b></td><td><div class="lbg-ga-main">${ev.ga==null?'Chưa xác định':`GA ${esc(ev.ga)} – ${esc(trackText(ev))}`}</div><div style="margin-top:4px;font-weight:700;color:#4b342b">${esc(lesson.title)}</div>${lesson.overridden?`<small>Quy ước vận hành: GA ${esc(ev.ga)} lấy tên bài gốc tiết ${esc(lesson.sourcePeriod)}.</small>`:''}</td><td>${esc(basisText(ev))}</td></tr>`}).join('')}</tbody></table></div>`:'<div class="alert warn">Không ghép được các ô nguồn hiện tại với sự kiện dạy thực tế.</div>'}`;
  }
  function run(){
    const b=root.document?.getElementById('gaSuggestV6'),panel=root.document?.getElementById('gaSuggestionV6Panel'),a=resultNow(),book=bookNow();if(!b||!panel)return;if(!book||!a?.sheet||!a?.entries?.length){if(typeof toast==='function')toast('Hãy kiểm tra lịch của giáo viên trước.');return}
    const old=b.textContent;b.disabled=true;b.textContent='Đang phân tích đúng luồng GA…';panel.hidden=false;panel.innerHTML='<div class="empty">Đang gộp sự kiện thực dạy và dò GA gần nhất…</div>';
    setTimeout(()=>{try{const history=buildHistory(book,a.sheet,{parser:root.LBGTkbParserV2,roleResolver,startDateFor,weekLike:weekLikeFor,manualResolver:currentManualResolver(a)});renderPanel(panel,history,a);if(typeof toast==='function')toast('Đã phân tích GA theo sự kiện dạy thực tế.')}catch(error){console.error(error);panel.innerHTML=`<div class="alert warn"><b>Không phân tích được GA:</b> ${esc(error?.message||String(error))}</div>`}finally{b.textContent=old;b.disabled=false}},30);
  }
  function bind(){const b=root.document?.getElementById('gaSuggestV6');if(!b||!root.LBGTkbParserV2||!root.LBGTeacherIntelligenceV6)return false;if(b.dataset.gaV7==='1')return true;b.dataset.gaV7='1';b.onclick=run;b.textContent='💡 Phân tích giáo án gợi ý';return true}
  function install(){let tries=0;const timer=setInterval(()=>{tries++;if(bind()||tries>240)clearInterval(timer)},100);bind();return true}
  return{version:VERSION,KNS_SEQUENCE,STEM_SEQUENCE,seqFor,nextGa,gradesOf,normalizeClass,classMembers,actualPeriod,roleTrack,buildHistory,basisText,install};
});
