'use strict';
(function(){
  const STEM_GA=new Set([3,6,10,13,16,20,23,27,32]);
  const ROLE={KNS:'KNS',STEM:'STEM',CTV:'CTV',UNKNOWN:'UNKNOWN'};
  const roleCache=new WeakMap(),scanCache=new WeakMap();
  let gaHistory=null,statsResult=null,lastResultSignature='',lastWorkbook=null,lastWeekSignature='';
  const q=id=>document.getElementById(id);
  const text=v=>String(v??'').replace(/\r/g,'').trim();
  const html=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fold=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase().replace(/\s+/g,' ');
  const keyText=v=>fold(v).replace(/[^A-Z0-9/+&.-]/g,'');
  const fileSafe=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').replace(/[^A-Za-z0-9._-]+/g,'_').replace(/^_+|_+$/g,'')||'TKB';

  function cellText(cell){
    try{
      const v=cell?.value;
      if(v===null||v===undefined)return'';
      if(typeof v==='string'||typeof v==='number'||typeof v==='boolean')return String(v);
      if(v instanceof Date)return v.toISOString();
      if(Array.isArray(v?.richText))return v.richText.map(x=>x?.text??'').join('');
      if(v?.result!==null&&v?.result!==undefined){
        const r=v.result;
        if(Array.isArray(r?.richText))return r.richText.map(x=>x?.text??'').join('');
        return typeof r==='object'?'':String(r);
      }
      if(typeof v?.text==='string')return v.text;
      return'';
    }catch{return'';}
  }
  function formula(cell){try{return String(cell?.value?.formula||cell?.value?.sharedFormula||'')}catch{return''}}
  function formulaCode(cell){const m=formula(cell).match(/COUNTIF\s*\([^,;]+[,;]\s*"([^"]+)"/i);return m?text(m[1]).toUpperCase():''}
  function rgb(cell){
    try{
      const c=cell?.font?.color||{};
      if(c.argb)return String(c.argb).slice(-6).toUpperCase();
      if(Number(c.indexed)===10)return'FF0000';
      if(Number(c.indexed)===12)return'0000FF';
      return'';
    }catch{return'';}
  }
  function rgbParts(value){if(!/^[0-9A-F]{6}$/.test(value))return null;return[value.slice(0,2),value.slice(2,4),value.slice(4,6)].map(x=>parseInt(x,16))}
  function isRed(cell){const p=rgbParts(rgb(cell));return !!p&&p[0]>=150&&p[0]>p[1]*1.45&&p[0]>p[2]*1.35}
  function isGreen(cell){const p=rgbParts(rgb(cell));return !!p&&p[1]>=90&&p[1]>p[0]*1.35&&p[1]>p[2]*1.12}
  function isBlue(cell){const p=rgbParts(rgb(cell));return !!p&&p[2]>=90&&p[2]>p[0]*1.25&&p[2]>p[1]*1.05}
  function master(ws,row,col){
    try{
      for(const range of ws.model.merges||[]){
        const m=String(range).match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
        if(!m)continue;
        const c1=typeof l2c==='function'?l2c(m[1]):lettersToColumn(m[1]),r1=+m[2],c2=typeof l2c==='function'?l2c(m[3]):lettersToColumn(m[3]),r2=+m[4];
        if(row>=r1&&row<=r2&&col>=c1&&col<=c2)return ws.getCell(r1,c1);
      }
    }catch{}
    return ws.getCell(row,col);
  }
  function lettersToColumn(s){let n=0;for(const ch of String(s))n=n*26+ch.charCodeAt(0)-64;return n}
  function schoolAt(ws,row){
    for(let r=row;r>=1;r--){
      const value=text(cellText(master(ws,r,2))).split('\n')[0].trim();
      if(!value||value.length>100)continue;
      if(/^(TRƯỜNG|LỚP|TIẾT|SÁNG|CHIỀU|THỨ)$/i.test(value))continue;
      return value;
    }
    return'';
  }
  function classAt(ws,row,col,codes){
    let fallback='';
    for(let r=row-1;r>=Math.max(1,row-7);r--){
      const value=text(cellText(master(ws,r,col)));
      if(!value||value.length>70)continue;
      const up=value.toUpperCase();
      if(codes.has(up)||/^(SÁNG|CHIỀU|TIẾT|THỨ|TÊN GV|TÊN GIÁO VIÊN|OFF)$/i.test(value))continue;
      if(!fallback)fallback=value;
      if(/\d{1,2}\s*\/\s*\d{1,2}/.test(value)||/[+&]/.test(value))return value;
    }
    return fallback;
  }
  function roleLabel(role){return role===ROLE.STEM?'STEM':role===ROLE.CTV?'CTV dạy KNS':role===ROLE.KNS?'KNS':'Chưa xác định'}
  function categoryOf(role){return role===ROLE.STEM?'STEM':(role===ROLE.KNS||role===ROLE.CTV)?'KNS':'UNKNOWN'}
  function summaryRoles(ws){
    if(roleCache.has(ws))return roleCache.get(ws);
    let header=null;
    ws.eachRow({includeEmpty:false},row=>{
      if(header)return;
      row.eachCell({includeEmpty:false},cell=>{if(!header&&/^(TÊN\s*GV|TÊN\s*GIÁO\s*VIÊN)$/i.test(text(cellText(cell))))header={row:row.number,col:cell.col}});
    });
    const map=new Map();
    if(header){
      let blanks=0;
      for(let r=header.row+1;r<=ws.rowCount;r++){
        const nameCell=ws.getCell(r,header.col),raw=text(cellText(nameCell));
        if(!raw){if(++blanks>=10&&map.size)break;continue}
        blanks=0;
        if(/^(OFF|TC|TỔNG\s*LỚP)$/i.test(raw))break;
        let code='';
        for(let c=header.col+1;c<=Math.min(ws.columnCount,header.col+6);c++){code=formulaCode(ws.getCell(r,c));if(code)break}
        if(!code||code==='OFF')continue;
        let role=ROLE.KNS;
        if(/\bCTV\b/i.test(raw)||/\bCTV\b/i.test(code)||isGreen(nameCell))role=ROLE.CTV;
        else if(isRed(nameCell))role=ROLE.STEM;
        map.set(code.toUpperCase(),{code:code.toUpperCase(),name:raw.replace(/^\d+[.)-]?\s*/,''),role,row:r,color:rgb(nameCell)});
      }
    }
    try{
      for(const item of window.teachers?.(ws)||[]){
        const code=text(item.code).toUpperCase();
        if(code&&code!=='OFF'&&!map.has(code))map.set(code,{code,name:item.name||code,role:ROLE.UNKNOWN,row:0,color:''});
      }
    }catch{}
    roleCache.set(ws,map);return map;
  }
  function dateKey(d){return d instanceof Date&&!Number.isNaN(d.getTime())?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`:''}
  function dateFor(ws,dayNo){
    try{
      const start=typeof startDate==='function'?startDate(ws.name):null;
      if(!(start instanceof Date)||Number.isNaN(start.getTime()))return null;
      const d=new Date(start.getFullYear(),start.getMonth(),start.getDate(),12);
      d.setDate(d.getDate()+Math.max(0,Number(dayNo)-2));return d;
    }catch{return null}
  }
  function splitClasses(value){
    const raw=text(value);
    if(!raw)return[];
    return raw.split(/\s*(?:\+|&)\s*/).map(x=>text(x)).filter(Boolean);
  }
  function classKey(school,className){return`${fold(school)}|${keyText(className)}`}
  function scanSheet(ws){
    if(scanCache.has(ws))return scanCache.get(ws);
    const roles=summaryRoles(ws),codes=new Set(roles.keys()),source=[];
    ws.eachRow({includeEmpty:false},row=>{
      for(let c=4;c<=73;c++){
        const cell=row.getCell(c),code=text(cellText(cell)).toUpperCase();
        if(!code||code==='OFF'||!codes.has(code))continue;
        const info=typeof colInfo==='function'?colInfo(c):null;
        if(!info)continue;
        const meta=roles.get(code),school=schoolAt(ws,row.number),className=classAt(ws,row.number,c,codes),date=dateFor(ws,info.day);
        source.push({sheet:ws.name,code,teacherName:meta?.name||code,role:meta?.role||ROLE.UNKNOWN,makeUp:isBlue(cell),day:Number(info.day),session:info.session,period:Number(info.period),school,className,address:cell.address,row:row.number,col:c,date,dateKey:dateKey(date)});
      }
    });
    source.sort((a,b)=>(a.date?.getTime()||0)-(b.date?.getTime()||0)||((a.session==='Sáng'?0:1)-(b.session==='Sáng'?0:1))||a.period-b.period||a.row-b.row||a.col-b.col);
    const grouped=new Map();
    for(const e of source){
      const k=[e.code,fold(e.school),e.dateKey,e.day,e.session,e.period].join('|');
      if(!grouped.has(k))grouped.set(k,{id:`${ws.name}|${k}`,sheet:ws.name,code:e.code,teacherName:e.teacherName,role:e.role,makeUp:false,day:e.day,session:e.session,period:e.period,school:e.school,date:e.date,dateKey:e.dateKey,source:[],addresses:[],classTexts:[],members:[],row:e.row,col:e.col});
      const g=grouped.get(k);g.source.push(e);g.addresses.push(e.address);g.makeUp=g.makeUp||e.makeUp;g.row=Math.min(g.row,e.row);g.col=Math.min(g.col,e.col);
      if(e.className&&!g.classTexts.includes(e.className))g.classTexts.push(e.className);
      for(const member of splitClasses(e.className))if(!g.members.some(x=>keyText(x)===keyText(member)))g.members.push(member);
    }
    const groups=[...grouped.values()];
    groups.forEach(g=>{g.classDisplay=g.classTexts.join(' & ');g.payPeriods=g.source.length});
    groups.sort((a,b)=>(a.date?.getTime()||0)-(b.date?.getTime()||0)||((a.session==='Sáng'?0:1)-(b.session==='Sáng'?0:1))||a.period-b.period||a.row-b.row||a.col-b.col);
    const out={ws,roles,source,groups};scanCache.set(ws,out);return out;
  }
  function orderedWeekSheets(){
    if(typeof wb==='undefined'||!wb)return[];
    const all=wb.worksheets.map((ws,index)=>({ws,index,start:typeof startDate==='function'?startDate(ws.name):null})).filter(x=>typeof weekLike==='function'?weekLike(x.ws):true);
    return all.sort((a,b)=>{
      const at=a.start instanceof Date&&!Number.isNaN(a.start.getTime())?a.start.getTime():null,bt=b.start instanceof Date&&!Number.isNaN(b.start.getTime())?b.start.getTime():null;
      if(at!==null&&bt!==null&&at!==bt)return at-bt;
      if(at!==null&&bt===null)return-1;if(at===null&&bt!==null)return 1;return a.index-b.index;
    }).map(x=>x.ws);
  }
  function buildHistory(selectedSheet){
    const sheets=orderedWeekSheets(),idx=sheets.findIndex(x=>x.name===selectedSheet);
    if(idx<0)throw new Error('Không tìm thấy tuần đang chọn trong file TKB.');
    const events=sheets.slice(0,idx+1).flatMap(ws=>scanSheet(ws).groups);
    events.sort((a,b)=>(a.date?.getTime()||0)-(b.date?.getTime()||0)||((a.session==='Sáng'?0:1)-(b.session==='Sáng'?0:1))||a.period-b.period||a.row-b.row||a.col-b.col);
    const states=new Map(),byAddress=new Map();
    for(const event of events){
      event.actualCategory=categoryOf(event.role);event.previousByClass=[];event.historyMismatch=false;
      const memberStates=[];
      for(const member of event.members){
        const k=classKey(event.school,member);
        if(!states.has(k))states.set(k,{ga:0,events:[]});
        memberStates.push({member,key:k,state:states.get(k)});
      }
      if(!event.school||!event.members.length){event.ga=null;event.expectedCategory='UNKNOWN';event.note='Thiếu trường hoặc lớp nên chưa thể gợi ý GA.'}
      else{
        const candidates=memberStates.map(x=>x.state.ga+1),ga=Math.max(...candidates);
        event.ga=ga;event.historyMismatch=new Set(candidates).size>1;
        event.expectedCategory=ga>32?'ADDITIONAL':STEM_GA.has(ga)?'STEM':'KNS';
        for(const item of memberStates){
          const prev=[...item.state.events].reverse().find(x=>x.actualCategory===event.actualCategory)||null;
          event.previousByClass.push({member:item.member,key:item.key,previous:prev});
        }
        for(const item of memberStates){item.state.ga=ga;item.state.events.push(event)}
      }
      for(const a of event.addresses)byAddress.set(`${event.sheet}!${a}`,event);
    }
    return{selectedSheet,sheets:sheets.slice(0,idx+1).map(x=>x.name),events,byAddress};
  }
  function formatDate(d){return d instanceof Date&&!Number.isNaN(d.getTime())?d.toLocaleDateString('vi-VN'):'chưa xác định ngày'}
  function currentType(event){
    const base=roleLabel(event.role),makeup=event.makeUp?' – Dạy bù':'';return base+makeup;
  }
  function gaText(event){
    if(!event||event.ga===null)return'Chưa đủ dữ liệu';
    if(event.ga>32)return'Giáo án bổ sung – cần xác nhận';
    return`GA ${event.ga} – ${event.expectedCategory==='STEM'?'STEM':'Kỹ năng sống'}`;
  }
  function matchMessage(event){
    if(!event||event.ga===null)return'Không thể đối chiếu vì thiếu tên trường hoặc lớp.';
    if(event.ga>32)return'Sau GA 32: giáo viên cần kiểm tra kế hoạch bổ sung thực tế.';
    if(event.actualCategory==='UNKNOWN')return'Chưa xác định nhóm giáo viên ở bảng tổng bên phải Excel.';
    if(event.actualCategory!==event.expectedCategory)return`Cần kiểm tra: phân công ${event.actualCategory} nhưng tiến trình gợi ý đang tới ${event.expectedCategory}.`;
    return event.historyMismatch?'Các lớp trong nhóm đang có lịch sử GA khác nhau – cần kiểm tra trước khi dùng.':'Phân công phù hợp với loại GA gợi ý.';
  }
  function questionLines(event){
    if(!event)return['Chưa tìm thấy dữ liệu nguồn để đối chiếu.'];
    const cat=event.actualCategory;
    if(cat==='UNKNOWN')return['Chưa xác định giáo viên thuộc KNS, STEM hay CTV nên chưa thể chọn đúng người cần hỏi.'];
    const grouped=new Map(),missing=[];
    for(const item of event.previousByClass||[]){
      if(!item.previous){missing.push(item.member);continue}
      const p=item.previous,k=p.id;
      if(!grouped.has(k))grouped.set(k,{event:p,classes:[]});
      grouped.get(k).classes.push(item.member);
    }
    const lines=[];
    for(const {event:p,classes} of grouped.values()){
      lines.push(`Cần hỏi giáo viên ${p.teacherName}: ngày ${formatDate(p.date)}, buổi ${String(p.session||'').toLowerCase()} – tiết ${p.period}, tại ${p.school||'chưa xác định trường'}, đã dạy ${cat} lớp ${classes.join(' + ')} đến GA nào rồi?`);
    }
    if(missing.length)lines.push(`Chưa tìm thấy lần dạy ${cat} trước đó của lớp ${missing.join(' + ')} trong dữ liệu từ tuần đầu đến tuần đang chọn – cần kiểm tra sổ GA.`);
    return lines.length?lines:['Chưa có lịch sử phù hợp để xác định người cần hỏi.'];
  }
  function addCss(){
    if(q('teacherIntelV6Css'))return;
    const s=document.createElement('style');s.id='teacherIntelV6Css';s.textContent=`
      .lbg-ga-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.lbg-ga-panel{margin-top:14px;border-top:1px solid #dbe6eb;padding-top:14px}.lbg-ga-panel th,.lbg-ga-panel td{white-space:normal;vertical-align:top}.lbg-ga-main{font-weight:900;color:#0f766e}.lbg-ga-warn{color:#9a3412;font-weight:750}.lbg-ga-ok{color:#166534;font-weight:750}.lbg-question{margin:0 0 6px}.lbg-role-pill{display:inline-block;border-radius:999px;padding:3px 8px;font-size:11px;font-weight:850;background:#eef2ff;color:#3730a3}.lbg-stats-card .controls{grid-template-columns:minmax(220px,1fr) auto auto}.lbg-stat-role{font-weight:850}.lbg-stat-table td,.lbg-stat-table th{white-space:normal;vertical-align:top}.lbg-stat-note{margin-top:12px;color:#64748b;font-size:12px}@media(max-width:620px){.lbg-stats-card .controls{grid-template-columns:1fr}.lbg-ga-actions{width:100%;justify-content:flex-start}}
    `;document.head.appendChild(s);
  }
  function initGaUi(){
    const card=q('detailCard');if(!card||q('gaSuggestV6'))return false;
    const head=card.querySelector('.head');if(!head)return false;
    const actions=document.createElement('div');actions.className='lbg-ga-actions';
    actions.innerHTML='<button class="btn outline" id="gaSuggestV6" disabled>💡 Phân tích giáo án gợi ý</button>';
    head.appendChild(actions);
    const panel=document.createElement('div');panel.id='gaSuggestionV6Panel';panel.className='lbg-ga-panel';panel.hidden=true;card.appendChild(panel);
    q('gaSuggestV6').onclick=runGaSuggestion;return true;
  }
  function resultSignature(){
    try{return result?`${activeId}|${result.sheet}|${result.code}|${result.entries?.map(x=>x.address).join(',')}`:''}catch{return''}
  }
  function syncGaButton(){
    const b=q('gaSuggestV6'),p=q('gaSuggestionV6Panel');if(!b)return;
    const sig=resultSignature(),ready=!!(typeof wb!=='undefined'&&wb&&result?.sheet&&result?.entries?.length);
    b.disabled=!ready;
    if(sig!==lastResultSignature){lastResultSignature=sig;gaHistory=null;if(p){p.hidden=true;p.innerHTML=''}b.textContent='💡 Phân tích giáo án gợi ý'}
  }
  function runGaSuggestion(){
    const b=q('gaSuggestV6'),panel=q('gaSuggestionV6Panel');if(!b||!panel)return;
    if(!(typeof wb!=='undefined'&&wb&&result?.sheet&&result?.entries?.length)){toast('Hãy kiểm tra lịch của giáo viên trước.');return}
    const old=b.textContent;b.disabled=true;b.textContent='Đang phân tích…';panel.hidden=false;panel.innerHTML='<div class="empty">Đang dò lịch sử từ tuần đầu đến tuần đang chọn…</div>';
    setTimeout(()=>{
      try{
        gaHistory=buildHistory(result.sheet);
        const unique=new Map();
        for(const entry of result.entries){const e=gaHistory.byAddress.get(`${result.sheet}!${entry.address}`);if(e&&!unique.has(e.id))unique.set(e.id,e)}
        const rows=[...unique.values()];
        panel.innerHTML=`<div class="alert info"><b>Giáo án gợi ý:</b> hệ thống đã quét ${gaHistory.sheets.length} tuần, từ tuần đầu có trong file đến <b>${html(result.sheet)}</b>. Đây là dữ liệu hỗ trợ đối chiếu, không thay thế việc hỏi lại giáo viên.</div>${rows.length?`<div class="wrap"><table><thead><tr><th>STT</th><th>Ngày – buổi – tiết</th><th>Trường</th><th>Lớp</th><th>Giáo viên / phân công</th><th>GA gợi ý</th><th>Cần hỏi và kiểm tra</th></tr></thead><tbody>${rows.map((e,i)=>`<tr><td>${i+1}</td><td>${html(formatDate(e.date))}<br>${html(e.session)} – Tiết ${e.period}</td><td>${html(e.school||'Chưa xác định')}</td><td>${html(e.classDisplay||'Chưa xác định')}<br><small>Ô nguồn: ${html(e.addresses.join(', '))}${e.payPeriods>1?` • ${e.payPeriods} tiết tính lương`:''}</small></td><td><span class="lbg-role-pill">${html(currentType(e))}</span><br>${html(e.teacherName)} (${html(e.code)})</td><td><div class="lbg-ga-main">${html(gaText(e))}</div><div class="${e.actualCategory===e.expectedCategory||e.ga>32?'lbg-ga-ok':'lbg-ga-warn'}">${html(matchMessage(e))}</div></td><td>${questionLines(e).map(x=>`<p class="lbg-question">${html(x)}</p>`).join('')}</td></tr>`).join('')}</tbody></table></div>`:'<div class="alert warn">Không ghép được các ô nguồn hiện tại với lịch sử TKB.</div>'}`;
        toast(`Đã tạo ${rows.length} gợi ý giáo án.`);
      }catch(error){console.error(error);panel.innerHTML=`<div class="alert warn"><b>Không phân tích được giáo án:</b> ${html(error?.message||String(error))}</div>`;toast('Phân tích giáo án bị lỗi.');}
      finally{b.textContent=old;b.disabled=false}
    },40);
  }
  function statsCard(){
    if(q('weeklyStatsV6'))return true;
    const conflict=document.querySelector('.lbg-conflict-card');
    if(!conflict)return false;
    const section=document.createElement('section');section.className='card lbg-stats-card';section.id='weeklyStatsV6';
    section.innerHTML=`<div class="head"><div><h3>6. Thống kê giáo viên và tiết dạy trong tuần</h3><p>Nhóm giáo viên lấy từ bảng tổng bên phải Excel; màu xanh dương trong TKB chỉ là trạng thái dạy bù.</p></div><span class="badge" id="weeklyStatsStatus">Chưa thống kê</span></div><div class="controls"><label>Tuần cần thống kê<select id="weeklyStatsWeek" disabled><option>Chọn file trước</option></select></label><button class="btn primary" id="weeklyStatsRun" disabled>▦ Thống kê tuần</button><button class="btn success" id="weeklyStatsExport" disabled>⇩ Xuất Excel</button></div><div id="weeklyStatsResults"><div class="empty">Chọn tuần rồi nhấn Thống kê tuần.</div></div>`;
    conflict.insertAdjacentElement('afterend',section);
    q('weeklyStatsRun').onclick=runWeeklyStats;q('weeklyStatsExport').onclick=exportWeeklyStats;return true;
  }
  function syncStatsWeeks(force=false){
    const select=q('weeklyStatsWeek');if(!select)return;
    const sheets=orderedWeekSheets(),sig=(typeof wb==='undefined'||!wb)?'':`${activeId}|${sheets.map(x=>x.name).join('|')}`;
    if(!force&&sig===lastWeekSignature&&wb===lastWorkbook)return;
    lastWorkbook=typeof wb==='undefined'?null:wb;lastWeekSignature=sig;statsResult=null;
    const current=q('week')?.value||select.value;
    select.innerHTML=sheets.length?sheets.map(x=>`<option value="${html(x.name)}">${html(x.name)}</option>`).join(''):'<option>Chọn file trước</option>';
    if(current&&sheets.some(x=>x.name===current))select.value=current;
    select.disabled=!sheets.length;q('weeklyStatsRun').disabled=!sheets.length;q('weeklyStatsExport').disabled=true;q('weeklyStatsStatus').textContent='Chưa thống kê';q('weeklyStatsResults').innerHTML='<div class="empty">Chọn tuần rồi nhấn Thống kê tuần.</div>';
  }
  function computeStats(sheetName){
    if(typeof wb==='undefined'||!wb)throw new Error('Hãy tải và chọn một file TKB trước.');
    const ws=wb.getWorksheet(sheetName);if(!ws)throw new Error('Không tìm thấy sheet tuần đã chọn.');
    const scan=scanSheet(ws),teachers=new Map();
    for(const e of scan.source){
      if(!teachers.has(e.code))teachers.set(e.code,{code:e.code,name:e.teacherName,role:e.role,periods:0,makeUp:0,schools:new Set(),classes:new Set(),entries:[]});
      const t=teachers.get(e.code);t.periods++;if(e.makeUp)t.makeUp++;if(e.school)t.schools.add(e.school);if(e.className)t.classes.add(e.className);t.entries.push(e);
    }
    const list=[...teachers.values()].sort((a,b)=>a.name.localeCompare(b.name,'vi'));
    const people=role=>new Set(list.filter(x=>x.role===role).map(x=>x.code)).size;
    const periods=role=>scan.source.filter(x=>x.role===role).length;
    const makeup=role=>scan.source.filter(x=>x.role===role&&x.makeUp).length;
    return{sheet:sheetName,file:text(q('active')?.textContent||'TKB'),totalTeachers:list.length,totalPeriods:scan.source.length,knsTeachers:people(ROLE.KNS),stemTeachers:people(ROLE.STEM),ctvTeachers:people(ROLE.CTV),unknownTeachers:people(ROLE.UNKNOWN),knsPeriods:periods(ROLE.KNS),stemPeriods:periods(ROLE.STEM),ctvPeriods:periods(ROLE.CTV),unknownPeriods:periods(ROLE.UNKNOWN),makeUpTotal:scan.source.filter(x=>x.makeUp).length,makeUpKns:makeup(ROLE.KNS),makeUpStem:makeup(ROLE.STEM),makeUpCtv:makeup(ROLE.CTV),teachers:list,entries:scan.source};
  }
  function renderStats(r){
    q('weeklyStatsStatus').textContent=`${r.sheet} • ${r.totalTeachers} GV • ${r.totalPeriods} tiết`;
    q('weeklyStatsResults').innerHTML=`<div class="sumgrid"><div class="sum"><b>${r.totalTeachers}</b><span>Tổng giáo viên thực dạy</span></div><div class="sum"><b>${r.totalPeriods}</b><span>Tổng tiết tính lương</span></div><div class="sum"><b>${r.knsTeachers}</b><span>GV KNS • ${r.knsPeriods} tiết</span></div><div class="sum"><b>${r.stemTeachers}</b><span>GV STEM • ${r.stemPeriods} tiết</span></div><div class="sum"><b>${r.ctvTeachers}</b><span>CTV KNS • ${r.ctvPeriods} tiết</span></div><div class="sum"><b>${r.makeUpTotal}</b><span>Tiết dạy bù</span></div><div class="sum"><b>${r.makeUpKns}/${r.makeUpStem}/${r.makeUpCtv}</b><span>Bù KNS / STEM / CTV</span></div><div class="sum"><b>${r.unknownTeachers}</b><span>Chưa xác định nhóm • ${r.unknownPeriods} tiết</span></div></div><div class="alert info">Mỗi mã giáo viên chỉ tính một người trong tổng giáo viên; mỗi ô mã giáo viên thực dạy tính một tiết lương. <b>OFF không tính.</b> Màu xanh dương được ghi là dạy bù nhưng vai trò gốc vẫn lấy ở bảng tổng bên phải.</div><div class="wrap lbg-stat-table"><table><thead><tr><th>STT</th><th>Giáo viên</th><th>Mã</th><th>Nhóm gốc</th><th>Tổng tiết</th><th>Tiết bù</th><th>Trường</th><th>Lớp đã dạy</th></tr></thead><tbody>${r.teachers.map((x,i)=>`<tr><td>${i+1}</td><td>${html(x.name)}</td><td><b>${html(x.code)}</b></td><td class="lbg-stat-role">${html(roleLabel(x.role))}</td><td>${x.periods}</td><td>${x.makeUp}</td><td>${html([...x.schools].join(' / ')||'Chưa xác định')}</td><td>${html([...x.classes].join(', ')||'Chưa xác định')}</td></tr>`).join('')}</tbody></table></div><div class="lbg-stat-note">Lớp có dấu + trong một ô tính một tiết. Các ô mã giáo viên riêng biệt vẫn được tính riêng từng tiết, kể cả khi được hiển thị gộp bằng dấu & trong báo giảng.</div>`;
  }
  function runWeeklyStats(){
    const b=q('weeklyStatsRun'),old=b.textContent;b.disabled=true;b.textContent='Đang thống kê…';q('weeklyStatsExport').disabled=true;q('weeklyStatsResults').innerHTML='<div class="empty">Đang đọc màu và đối chiếu bảng giáo viên…</div>';
    setTimeout(()=>{try{statsResult=computeStats(q('weeklyStatsWeek').value);renderStats(statsResult);q('weeklyStatsExport').disabled=false;toast(`Đã thống kê ${statsResult.totalTeachers} giáo viên, ${statsResult.totalPeriods} tiết.`)}catch(error){console.error(error);q('weeklyStatsResults').innerHTML=`<div class="alert warn"><b>Không thống kê được:</b> ${html(error?.message||String(error))}</div>`;toast('Thống kê tuần bị lỗi.')}finally{b.textContent=old;b.disabled=false}},30);
  }
  function border(){return{top:{style:'thin',color:{argb:'FFD1D5DB'}},left:{style:'thin',color:{argb:'FFD1D5DB'}},bottom:{style:'thin',color:{argb:'FFD1D5DB'}},right:{style:'thin',color:{argb:'FFD1D5DB'}}}}
  function styleTable(ws,headerRow=1){ws.eachRow((row,n)=>row.eachCell(c=>{c.font={name:'Arial',size:10,bold:n===headerRow,color:n===headerRow?{argb:'FFFFFFFF'}:undefined};c.alignment={vertical:'middle',wrapText:true};c.border=border();if(n===headerRow)c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF0F766E'}}}))}
  async function exportWeeklyStats(){
    if(!statsResult)return;const r=statsResult,b=new ExcelJS.Workbook();
    const o=b.addWorksheet('TỔNG QUAN');o.columns=[{width:30},{width:20},{width:30},{width:20}];o.mergeCells('A1:D1');o.getCell('A1').value='THỐNG KÊ GIÁO VIÊN VÀ TIẾT DẠY TRONG TUẦN';o.getCell('A1').font={bold:true,size:16,color:{argb:'FFFFFFFF'}};o.getCell('A1').fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF0F766E'}};o.getCell('A1').alignment={horizontal:'center',vertical:'middle'};o.addRows([['File TKB',r.file,'Tuần',r.sheet],['Tổng giáo viên thực dạy',r.totalTeachers,'Tổng tiết tính lương',r.totalPeriods],['GV KNS',r.knsTeachers,'Tiết KNS',r.knsPeriods],['GV STEM',r.stemTeachers,'Tiết STEM',r.stemPeriods],['CTV KNS',r.ctvTeachers,'Tiết CTV',r.ctvPeriods],['Tổng tiết dạy bù',r.makeUpTotal,'Bù KNS / STEM / CTV',`${r.makeUpKns} / ${r.makeUpStem} / ${r.makeUpCtv}`],['Chưa xác định nhóm',r.unknownTeachers,'Số tiết chưa xác định',r.unknownPeriods],[],['Ghi chú','Mỗi ô mã giáo viên thực dạy tính 1 tiết; OFF tính 0 tiết. Màu xanh dương là dạy bù, vai trò gốc lấy từ bảng tổng bên phải Excel.','','']]);o.eachRow((row,n)=>row.eachCell(c=>{c.alignment={vertical:'middle',wrapText:true};c.border=border();if(n===1)c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF0F766E'}}}));
    const t=b.addWorksheet('THEO GIÁO VIÊN');t.columns=[{header:'STT',key:'i',width:7},{header:'GIÁO VIÊN',key:'name',width:30},{header:'MÃ',key:'code',width:14},{header:'NHÓM GỐC',key:'role',width:18},{header:'TỔNG TIẾT',key:'periods',width:12},{header:'TIẾT BÙ',key:'makeUp',width:11},{header:'TRƯỜNG',key:'schools',width:34},{header:'LỚP ĐÃ DẠY',key:'classes',width:42}];r.teachers.forEach((x,i)=>t.addRow({i:i+1,name:x.name,code:x.code,role:roleLabel(x.role),periods:x.periods,makeUp:x.makeUp,schools:[...x.schools].join(' / '),classes:[...x.classes].join(', ')}));t.views=[{state:'frozen',ySplit:1}];styleTable(t);
    const d=b.addWorksheet('CHI TIẾT TIẾT DẠY');d.columns=[{header:'STT',key:'i',width:7},{header:'NGÀY',key:'date',width:14},{header:'THỨ',key:'day',width:10},{header:'BUỔI',key:'session',width:11},{header:'TIẾT',key:'period',width:9},{header:'GIÁO VIÊN',key:'name',width:28},{header:'MÃ',key:'code',width:14},{header:'NHÓM GỐC',key:'role',width:18},{header:'TRẠNG THÁI',key:'status',width:14},{header:'TRƯỜNG',key:'school',width:30},{header:'LỚP',key:'className',width:24},{header:'Ô NGUỒN',key:'address',width:13}];r.entries.forEach((x,i)=>d.addRow({i:i+1,date:formatDate(x.date),day:Number(x.day)===8?'Chủ nhật':`Thứ ${x.day}`,session:x.session,period:x.period,name:x.teacherName,code:x.code,role:roleLabel(x.role),status:x.makeUp?'Dạy bù':'Bình thường',school:x.school,className:x.className,address:x.address}));d.views=[{state:'frozen',ySplit:1}];styleTable(d);
    const buffer=await b.xlsx.writeBuffer();saveAs(new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`THONG_KE_GIAO_VIEN_TIET_DAY_${fileSafe(r.sheet)}.xlsx`);toast('Đã xuất thống kê tuần ra Excel.');
  }
  function start(){addCss();initGaUi();statsCard();syncGaButton();syncStatsWeeks();}
  const timer=setInterval(start,700);start();
  window.addEventListener('beforeunload',()=>clearInterval(timer));
  window.LBGTeacherIntelligenceV6={summaryRoles,scanSheet,buildHistory,STEM_GA:[...STEM_GA]};
})();
