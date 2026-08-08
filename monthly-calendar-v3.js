'use strict';
(function(){
  const VERSION='20260808.12';
  const PREFIX='lbgMonthlyCalendarV3';
  const UNKNOWN_SCHOOL='⚠ CHƯA XÁC ĐỊNH TRƯỜNG';
  const S={built:null,teacherKey:'',teacherSig:'',teachers:[],contextSig:'',timer:null};
  const q=id=>document.getElementById(id);
  const raw=v=>String(v??'').replace(/\r/g,'').trim();
  const h=v=>raw(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pad=n=>String(Number(n)||0).padStart(2,'0');
  const dateKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const n0=v=>{const n=Number(v);return Number.isFinite(n)&&n>=0?Math.round(n):0};
  const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);x.setHours(12,0,0,0);return x};
  const viDay=d=>['CN','Thứ hai','Thứ ba','Thứ tư','Thứ năm','Thứ sáu','Thứ bảy'][d.getDay()];
  const wbNow=()=>{try{return typeof wb!=='undefined'?wb:null}catch{return null}};
  const activeVersion=()=>{try{return typeof activeId!=='undefined'&&activeId?activeId:'active'}catch{return'active'}};
  const yearStart=()=>Number(q('year')?.value)||new Date().getFullYear();
  const yearOfMonth=m=>Number(m)>=8?yearStart():yearStart()+1;
  const dedupe=a=>[...new Set(a.filter(Boolean))];

  function workbookSignature(){
    const book=wbNow();
    if(!book)return 'none';
    return `${activeVersion()}|${book.worksheets.map(s=>`${s.name}:${s.rowCount}:${s.columnCount}`).join('|')}`;
  }
  function currentContextKey(){
    return `${workbookSignature()}|${q('month2Select')?.value||''}|${q('month2Teacher')?.value||''}`;
  }
  function setButton(id,enabled){const el=q(id);if(el)el.disabled=!enabled}
  function invalidate(message=''){
    S.built=null;
    setButton('month2Export',false);setButton('month2AddSchool',false);setButton('month2Reset',false);
    const status=q('month2Status');if(status)status.textContent='Chưa tổng hợp';
    const summary=q('month2Summary');if(summary)summary.innerHTML=`<div class="empty">${h(message||'Chọn tháng và giáo viên rồi nhấn Tổng hợp tháng.')}</div>`;
    const preview=q('month2Preview');if(preview)preview.innerHTML='';
    const extras=q('month2Extras');if(extras)extras.innerHTML='';
  }

  function mondayOf(date){
    const d=new Date(date);d.setHours(12,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d;
  }
  function monthSegments(year,month){
    const first=new Date(year,month-1,1,12),last=new Date(year,month,0,12),out=[];
    for(let start=mondayOf(first);start<=last;start=addDays(start,7)){
      const dates=[];
      for(let i=0;i<7;i++){
        const d=addDays(start,i);
        if(d.getFullYear()===year&&d.getMonth()+1===month)dates.push(d);
      }
      if(!dates.length)continue;
      const label=dates.length===7?`TUẦN (${pad(dates[0].getDate())}T${pad(month)})`:dates.length===1?`T${dates[0].getDate()}`:`T${dates[0].getDate()}-${dates[dates.length-1].getDate()}`;
      out.push({start,key:dateKey(start),dates,label,sheet:'',usable:false});
    }
    return out;
  }
  function sourceWeekGroups(){
    const book=wbNow(),groups=new Map();if(!book)return groups;
    book.worksheets.forEach((ws,index)=>{
      let start=null;try{start=typeof startDate==='function'?startDate(ws.name):null}catch{}
      if(!(start instanceof Date)||Number.isNaN(start.getTime()))return;
      const key=dateKey(start),item={ws,start,index};
      if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item);
    });
    return groups;
  }

  function teacherUnion(force=false){
    const book=wbNow(),key=workbookSignature();
    if(!force&&S.teacherKey===key&&S.teachers.length)return S.teachers;
    const map=new Map();
    if(book&&typeof window.teachers==='function'){
      for(const ws of book.worksheets){
        let list=[];try{list=window.teachers(ws)||[]}catch{}
        for(const t of list){
          const code=raw(t?.code),name=raw(t?.name||t?.teacherName||code);if(!code)continue;
          const old=map.get(code.toUpperCase());
          if(!old||(/^Mã\s+/i.test(old.name)&&!/^Mã\s+/i.test(name)))map.set(code.toUpperCase(),{code,name});
        }
      }
    }
    S.teacherKey=key;S.teachers=[...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'vi'));return S.teachers;
  }
  function populateTeachers(force=false){
    const sel=q('month2Teacher');if(!sel)return;
    const list=teacherUnion(force),prefer=sel.value||q('teacher')?.value||'';
    const sig=list.map(t=>`${t.code}\u0001${t.name}`).join('\u0002');
    if(force||sig!==S.teacherSig){
      sel.innerHTML='<option value="">Chọn giáo viên…</option>'+list.map(t=>`<option value="${h(t.code)}" data-name="${h(t.name)}">${h(t.name)} — ${h(t.code)}</option>`).join('');
      S.teacherSig=sig;
    }
    if(prefer&&list.some(t=>t.code===prefer))sel.value=prefer;
    sel.disabled=!list.length;
  }
  function selectedTeacher(){const s=q('month2Teacher'),o=s?.selectedOptions?.[0];return{code:raw(s?.value),name:raw(o?.dataset?.name||s?.value)}}

  function blankManual(){return{overrides:{},weeklyAssist:{},addedSchools:[],extras:{thcsMain:'',thcsAssist:'',topicCount:'',topicLead:'',tripCount:'',tripLead:'',hdnt:''}}}
  function storeKey(b){return`${PREFIX}:${activeVersion()}:${b.year}-${pad(b.month)}:${b.teacherCode}`}
  function loadManual(b){
    const base=blankManual();
    try{const p=JSON.parse(localStorage.getItem(storeKey(b))||'null')||{};return{...base,...p,overrides:{...(p.overrides||{})},weeklyAssist:{...(p.weeklyAssist||{})},addedSchools:Array.isArray(p.addedSchools)?p.addedSchools:[],extras:{...base.extras,...(p.extras||{})}}}catch{return base}
  }
  function saveManual(){try{if(S.built)localStorage.setItem(storeKey(S.built),JSON.stringify(S.built.manual))}catch{}}

  function build(){
    const book=wbNow();if(!book)throw new Error('Hãy tải và chọn một file TKB trước.');
    if(typeof analyzeNow!=='function')throw new Error('Bộ đọc TKB chưa sẵn sàng.');
    const month=Number(q('month2Select')?.value),teacher=selectedTeacher();
    if(month<1||month>12)throw new Error('Tháng không hợp lệ.');
    if(!teacher.code)throw new Error('Chưa chọn giáo viên.');
    const year=yearOfMonth(month),segments=monthSegments(year,month),groups=sourceWeekGroups();
    const counts=new Map(),schools=[],seen=new Set(),warnings=[],usableSheets=[];
    let sourceEntryTotal=0;
    const add=(school,date)=>{
      let name=raw(school);if(!name)name=UNKNOWN_SCHOOL;
      if(!seen.has(name)){seen.add(name);schools.push(name)}
      if(!counts.has(name))counts.set(name,new Map());
      const m=counts.get(name),key=dateKey(date);m.set(key,(m.get(key)||0)+1);
    };

    for(const seg of segments){
      const candidates=groups.get(seg.key)||[];
      if(!candidates.length){warnings.push(`Thiếu tab TKB của tuần bắt đầu ${seg.start.toLocaleDateString('vi-VN')}.`);continue}
      const item=candidates[candidates.length-1];seg.sheet=item.ws.name;
      if(candidates.length>1)warnings.push(`Có ${candidates.length} tab cùng tuần ${seg.start.toLocaleDateString('vi-VN')}; đang dùng tab cuối: ${item.ws.name}.`);
      let a;
      try{a=analyzeNow(item.ws,teacher.code,teacher.name)}catch(error){warnings.push(`${item.ws.name}: không đọc được dữ liệu (${error?.message||error}).`);continue}
      seg.usable=true;usableSheets.push(item.ws.name);
      for(const w of a.warnings||[])warnings.push(`${item.ws.name}: ${w}`);
      for(const e of a.entries||[]){
        const day=Number(e.day),off=day===8?6:day-2;
        if(off<0||off>6){warnings.push(`${item.ws.name}: ngày không hợp lệ tại ${e.address||'ô nguồn'}.`);continue}
        const d=addDays(seg.start,off);
        if(d.getFullYear()!==year||d.getMonth()+1!==month)continue;
        sourceEntryTotal++;
        if(!raw(e.school))warnings.push(`${item.ws.name}: chưa xác định trường tại ${e.address||`${viDay(d)} ${d.getDate()}/${month}`}.`);
        add(e.school,d);
      }
    }
    const dates=segments.flatMap(s=>s.dates),daysInMonth=new Date(year,month,0).getDate();
    if(dates.length!==daysInMonth)warnings.push(`Lỗi lịch tháng: tạo được ${dates.length}/${daysInMonth} ngày.`);
    let autoTotal=0;for(const m of counts.values())for(const v of m.values())autoTotal+=v;
    if(autoTotal!==sourceEntryTotal)warnings.push(`Đối chiếu nội bộ lệch: đọc ${sourceEntryTotal} tiết nhưng bảng tự động có ${autoTotal} tiết.`);
    const built={version:VERSION,contextKey:currentContextKey(),year,month,teacherCode:teacher.code,teacherName:teacher.name,segments,dates,counts,schools,warnings:dedupe(warnings),sourceSheets:usableSheets,sourceEntryTotal,autoTotal};
    built.manual=loadManual(built);
    for(const s of built.manual.addedSchools){const name=raw(s);if(name&&!built.schools.includes(name))built.schools.push(name)}
    S.built=built;return built;
  }

  const autoVal=(b,school,date)=>b.counts.get(school)?.get(dateKey(date))||0;
  function val(b,school,date){const key=`${school}|||${dateKey(date)}`;return Object.prototype.hasOwnProperty.call(b.manual.overrides,key)?n0(b.manual.overrides[key]):autoVal(b,school,date)}
  function weekTotal(b,seg){let t=0;for(const school of b.schools)for(const d of seg.dates)t+=val(b,school,d);return t}
  function monthTotal(b){let t=0;for(const school of b.schools)for(const d of b.dates)t+=val(b,school,d);return t}
  const assistTotal=b=>b.segments.reduce((t,s)=>t+n0(b.manual.weeklyAssist[s.key]||0),0);

  function refreshTotals(){
    const b=S.built;if(!b)return;
    if(q('month2Main'))q('month2Main').textContent=monthTotal(b);
    if(q('month2Assist'))q('month2Assist').textContent=assistTotal(b);
    if(q('month2Status'))q('month2Status').textContent=`${pad(b.month)}/${b.year} • ${monthTotal(b)} tiết`;
    q('month2Preview')?.querySelectorAll('.mt-week-total').forEach((cell,i)=>{const strong=cell.querySelector('b');if(strong&&b.segments[i])strong.textContent=`${weekTotal(b,b.segments[i])} Chính (T)`});
  }

  function renderExtras(){
    const b=S.built,box=q('month2Extras');if(!b||!box)return;const e=b.manual.extras;
    box.innerHTML=`<div class="mt-extra-grid"><div class="mt-extra-box"><h4>PHẦN DÀNH RIÊNG CHO THCS</h4><div class="mt-extra-fields"><label>Tổng chính<input data-x="thcsMain" type="number" min="0" value="${h(e.thcsMain)}"></label><label>Tổng trợ<input data-x="thcsAssist" type="number" min="0" value="${h(e.thcsAssist)}"></label></div></div><div class="mt-extra-box"><h4>PHẦN DÀNH RIÊNG CHO CHUYÊN ĐỀ</h4><div class="mt-extra-fields"><label>Số chuyên đề tham gia<input data-x="topicCount" type="number" min="0" value="${h(e.topicCount)}"></label><label>Làm nhóm trưởng<input data-x="topicLead" type="number" min="0" value="${h(e.topicLead)}"></label></div></div><div class="mt-extra-box"><h4>PHẦN DÀNH RIÊNG CHO TNST</h4><div class="mt-extra-fields"><label>Số chuyến tham gia<input data-x="tripCount" type="number" min="0" value="${h(e.tripCount)}"></label><label>Làm trưởng đoàn<input data-x="tripLead" type="number" min="0" value="${h(e.tripLead)}"></label></div></div><div class="mt-extra-box"><h4>PHẦN DÀNH RIÊNG CHO HĐNT</h4><label>Ghi chú<textarea data-x="hdnt" rows="3">${h(e.hdnt)}</textarea></label></div></div>`;
    box.querySelectorAll('[data-x]').forEach(el=>el.addEventListener('input',()=>{b.manual.extras[el.dataset.x]=el.value;saveManual()}));
  }

  function render(){
    const b=S.built;if(!b)return;
    const total=monthTotal(b),delta=total-b.autoTotal,summary=q('month2Summary');
    if(summary)summary.innerHTML=`<div class="sumgrid monthly-sums"><div class="sum"><b id="month2Main">${total}</b><span>Tiết chính trong tháng</span></div><div class="sum"><b id="month2Assist">${assistTotal(b)}</b><span>Trợ giảng</span></div><div class="sum"><b>${b.schools.length}</b><span>Số trường</span></div><div class="sum"><b>${b.sourceSheets.length}/${b.segments.length}</b><span>Tuần đọc thành công</span></div></div>${delta?`<div class="alert info">Điều chỉnh thủ công đang làm tổng thay đổi ${delta>0?'+':''}${delta} tiết so với TKB (${b.autoTotal} → ${total}).</div>`:''}${b.warnings.length?`<div class="alert warn"><b>Cần kiểm tra:</b><br>${b.warnings.map(h).join('<br>')}</div>`:'<div class="alert ok">Đã đọc đủ các tuần liên quan và đối chiếu số tiết không phát hiện lệch.</div>'}`;
    const p=q('month2Preview');if(!p)return;
    const wh=b.segments.map(s=>`<th class="mt-week" colspan="${s.dates.length}">${h(s.label)}<small>${s.usable?h(s.sheet):s.sheet?`Lỗi đọc: ${h(s.sheet)}`:'Thiếu tab TKB'}</small></th>`).join('');
    const dh=b.dates.map(d=>`<th class="mt-date"><b>${d.getDate()}</b><small>${h(viDay(d))}</small></th>`).join('');
    const rows=b.schools.map((school,i)=>`<tr><td class="mt-teacher">${i===0?h(b.teacherName):''}</td><td class="mt-school">${h(school)}</td>${b.dates.map(d=>{const a=autoVal(b,school,d),v=val(b,school,d);return`<td class="mt-cell"><input class="mt-count ${v!==a?'changed':''}" type="number" min="0" step="1" value="${v||''}" data-school="${encodeURIComponent(school)}" data-date="${dateKey(d)}" data-auto="${a}"></td>`}).join('')}</tr>`).join('');
    const totals=b.segments.map(s=>`<td class="mt-week-total" colspan="${s.dates.length}"><b>${weekTotal(b,s)} Chính (T)</b><label>Trợ (P) <input class="mt-assist" type="number" min="0" step="1" value="${n0(b.manual.weeklyAssist[s.key]||0)||''}" data-week="${s.key}"></label></td>`).join('');
    p.innerHTML=b.schools.length?`<div class="mt-sheet"><div class="mt-title"><h2>BẢNG KÊ KHAI TIẾT DẠY THÁNG ${pad(b.month)}</h2><h3>NĂM HỌC ${yearStart()}-${yearStart()+1}</h3></div><div class="mt-scroll"><table class="mt-table"><thead><tr><th class="mt-fixed-a" rowspan="2">HỌ & TÊN<br>GIÁO VIÊN</th><th class="mt-fixed-b" rowspan="2">GIẢNG DẠY<br>TRƯỜNG</th>${wh}</tr><tr>${dh}</tr></thead><tbody>${rows}<tr class="mt-total-row"><td class="mt-fixed-a" colspan="2"><b>CỘNG TUẦN</b></td>${totals}</tr></tbody></table></div></div>`:'<div class="empty">Không tìm thấy tiết dạy trong tháng này. Có thể dùng “+ Thêm trường” để nhập ngoại lệ thủ công.</div>';
    p.querySelectorAll('.mt-count').forEach(input=>input.addEventListener('input',()=>{const school=decodeURIComponent(input.dataset.school||''),key=`${school}|||${input.dataset.date}`,v=n0(input.value||0),a=n0(input.dataset.auto);if(v===a)delete b.manual.overrides[key];else b.manual.overrides[key]=v;input.classList.toggle('changed',v!==a);saveManual();refreshTotals()}));
    p.querySelectorAll('.mt-assist').forEach(input=>input.addEventListener('input',()=>{b.manual.weeklyAssist[input.dataset.week]=n0(input.value||0);saveManual();refreshTotals()}));
    renderExtras();
    setButton('month2AddSchool',true);setButton('month2Reset',true);setButton('month2Export',b.schools.length>0||total>0);
    q('month2Status').textContent=`${pad(b.month)}/${b.year} • ${total} tiết`;
  }

  function addSchool(){const b=S.built;if(!b)return;const name=raw(prompt('Nhập tên trường cần bổ sung:')||'');if(!name)return;if(!b.schools.includes(name))b.schools.push(name);if(!b.manual.addedSchools.includes(name))b.manual.addedSchools.push(name);saveManual();render()}
  function resetManual(){const b=S.built;if(!b||!confirm('Xóa toàn bộ điều chỉnh thủ công của tháng này?'))return;localStorage.removeItem(storeKey(b));b.manual=loadManual(b);b.schools=[...b.counts.keys()];render()}

  function styleCell(cell,o={}){cell.font={name:'Times New Roman',size:o.size||10,bold:!!o.bold,italic:!!o.italic,color:{argb:o.color||'FF000000'}};cell.alignment={horizontal:o.align||'center',vertical:'middle',wrapText:true};if(o.fill)cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:o.fill}};if(o.border!==false)cell.border={top:{style:'thin'},left:{style:'thin'},bottom:{style:'thin'},right:{style:'thin'}}}
  const colLetter=n=>{let s='';for(;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s};
  const fileSafe=v=>raw(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').replace(/[^A-Za-z0-9._-]+/g,'_').replace(/^_+|_+$/g,'')||'GIAO_VIEN';
  async function exportExcel(){
    const b=S.built;if(!b)return alert('Hãy tổng hợp tháng trước khi xuất.');
    if(b.contextKey!==currentContextKey())return alert('Tháng, giáo viên hoặc phiên bản TKB đã thay đổi. Hãy bấm “Tổng hợp tháng” lại trước khi xuất.');
    if(typeof ExcelJS==='undefined'||typeof saveAs==='undefined')return alert('Thư viện xuất Excel chưa sẵn sàng.');
    const btn=q('month2Export'),old=btn.textContent;btn.disabled=true;btn.textContent='Đang tạo Excel…';
    try{
      const book=new ExcelJS.Workbook(),ws=book.addWorksheet('Tiết dạy',{views:[{state:'frozen',xSplit:2,ySplit:5,showGridLines:false}]});
      const firstCol=3,lastDateCol=2+b.dates.length,mainCol=lastDateCol+1,assistCol=lastDateCol+2,lastCol=assistCol;
      ws.pageSetup={orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0,margins:{left:.2,right:.2,top:.35,bottom:.35,header:.1,footer:.1}};
      ws.mergeCells(1,1,2,lastCol);ws.getCell(1,1).value=`BẢNG KÊ KHAI TIẾT DẠY THÁNG ${pad(b.month)}\nNĂM HỌC ${yearStart()}-${yearStart()+1}`;styleCell(ws.getCell(1,1),{bold:true,size:18,border:false});ws.getRow(1).height=26;ws.getRow(2).height=22;
      ws.mergeCells(3,1,5,1);ws.getCell(3,1).value='HỌ & TÊN\nGIÁO VIÊN';styleCell(ws.getCell(3,1),{bold:true});
      ws.mergeCells(3,2,5,2);ws.getCell(3,2).value='GIẢNG DẠY\nTRƯỜNG';styleCell(ws.getCell(3,2),{bold:true});
      let col=firstCol;
      for(const seg of b.segments){const z=col+seg.dates.length-1;ws.mergeCells(3,col,3,z);ws.getCell(3,col).value=seg.label+(seg.sheet?`\n${seg.sheet}`:'\nThiếu tab TKB');styleCell(ws.getCell(3,col),{bold:true,color:'FFB42318',fill:'FFF9EEE7'});seg.dates.forEach((d,i)=>{ws.getCell(4,col+i).value=d.getDate();styleCell(ws.getCell(4,col+i),{bold:true,fill:'FFF9EEE7'});ws.getCell(5,col+i).value=viDay(d);styleCell(ws.getCell(5,col+i),{size:8,fill:'FFF9EEE7'})});col=z+1}
      ws.mergeCells(3,mainCol,5,mainCol);ws.getCell(3,mainCol).value='TỔNG\nCHÍNH';styleCell(ws.getCell(3,mainCol),{bold:true,fill:'FFF9EEE7'});
      ws.mergeCells(3,assistCol,5,assistCol);ws.getCell(3,assistCol).value='TRỢ\nGIẢNG';styleCell(ws.getCell(3,assistCol),{bold:true,fill:'FFF9EEE7'});
      const row0=6;
      b.schools.forEach((school,i)=>{const r=row0+i;ws.getCell(r,1).value=i===0?b.teacherName:'';ws.getCell(r,2).value=school;styleCell(ws.getCell(r,1),{bold:i===0});styleCell(ws.getCell(r,2),{bold:true});b.dates.forEach((d,j)=>{const v=val(b,school,d);ws.getCell(r,firstCol+j).value=v||'';styleCell(ws.getCell(r,firstCol+j))});styleCell(ws.getCell(r,mainCol),{border:true});styleCell(ws.getCell(r,assistCol),{border:true})});
      const tr=row0+b.schools.length;ws.mergeCells(tr,1,tr,2);ws.getCell(tr,1).value='CỘNG TUẦN';styleCell(ws.getCell(tr,1),{bold:true,fill:'FFFAFAFA'});col=firstCol;
      for(const seg of b.segments){const z=col+seg.dates.length-1;ws.mergeCells(tr,col,tr,z);ws.getCell(tr,col).value=`${weekTotal(b,seg)} Chính (T)\n${n0(b.manual.weeklyAssist[seg.key]||0)||'..........'} Trợ (P)`;styleCell(ws.getCell(tr,col),{bold:true,fill:'FFFAFAFA'});col=z+1}
      ws.getCell(tr,mainCol).value=monthTotal(b);styleCell(ws.getCell(tr,mainCol),{bold:true,fill:'FFEAF7EE'});ws.getCell(tr,assistCol).value=assistTotal(b);styleCell(ws.getCell(tr,assistCol),{bold:true,fill:'FFEAF7EE'});
      const gr=tr+2;ws.mergeCells(gr,1,gr,lastCol);ws.getCell(gr,1).value=`TỔNG CỘNG SỐ TIẾT THÁNG ${pad(b.month)}/${b.year}: ${monthTotal(b)} TIẾT CHÍNH • ${assistTotal(b)} TIẾT TRỢ GIẢNG`;styleCell(ws.getCell(gr,1),{bold:true,size:14,fill:'FFEAF7EE'});ws.getRow(gr).height=25;
      const e=b.manual.extras;let r=gr+2;
      const addSection=(title,fields)=>{ws.mergeCells(r,1,r,lastCol);ws.getCell(r,1).value=title;styleCell(ws.getCell(r,1),{bold:true,color:'FFB42318',fill:'FFF9EEE7'});r++;for(const [label,value] of fields){ws.mergeCells(r,1,r,4);ws.getCell(r,1).value=label;styleCell(ws.getCell(r,1),{bold:true,align:'left'});ws.mergeCells(r,5,r,lastCol);ws.getCell(r,5).value=value===''?'':value;styleCell(ws.getCell(r,5),{align:'left'});r++}r++};
      addSection('PHẦN DÀNH RIÊNG CHO THCS',[['Tổng chính',e.thcsMain],['Tổng trợ',e.thcsAssist]]);
      addSection('PHẦN DÀNH RIÊNG CHO CHUYÊN ĐỀ',[['Số chuyên đề tham gia',e.topicCount],['Làm nhóm trưởng',e.topicLead]]);
      addSection('PHẦN DÀNH RIÊNG CHO TNST',[['Số chuyến tham gia',e.tripCount],['Làm trưởng đoàn',e.tripLead]]);
      addSection('PHẦN DÀNH RIÊNG CHO HĐNT',[['Ghi chú',e.hdnt]]);
      ws.getColumn(1).width=22;ws.getColumn(2).width=23;for(let c=firstCol;c<=lastDateCol;c++)ws.getColumn(c).width=5.3;ws.getColumn(mainCol).width=10;ws.getColumn(assistCol).width=10;
      ws.pageSetup.printArea=`A1:${colLetter(lastCol)}${r-1}`;
      const buffer=await book.xlsx.writeBuffer();saveAs(new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`${fileSafe(b.teacherName)}_BANG_KE_TIET_DAY_THANG_${pad(b.month)}_${b.year}.xlsx`);if(typeof toast==='function')toast('Đã xuất bảng kê tháng V3.')
    }catch(error){console.error(error);alert('Không xuất được bảng kê: '+(error?.message||error))}finally{btn.disabled=false;btn.textContent=old}
  }

  function addStyle(){
    if(q('lbgMonthlyV3Css'))return;const s=document.createElement('style');s.id='lbgMonthlyV3Css';s.textContent=`
      #monthCardFixed .month2-note{margin-top:12px}.month-controls{display:grid;grid-template-columns:minmax(120px,.5fr) minmax(230px,1.2fr) auto auto auto;gap:9px;align-items:end}.month-controls label{display:grid;gap:5px;font-size:12px;font-weight:750}.month-controls select{width:100%}.mt-sheet{margin-top:15px;border:1px solid #66727e;background:#fff;font-family:"Times New Roman",serif}.mt-title{text-align:center;padding:12px;border-bottom:1px solid #66727e}.mt-title h2{margin:0}.mt-title h3{margin:3px 0 0}.mt-scroll{overflow:auto}.mt-table{border-collapse:collapse;width:max-content;min-width:100%}.mt-table th,.mt-table td{border:1px solid #66727e;padding:4px;text-align:center;height:36px}.mt-week{color:#b42318!important}.mt-week small,.mt-date small{display:block;font-size:9px;color:#64748b}.mt-date{min-width:48px}.mt-cell{padding:0!important}.mt-count{width:100%;height:35px;border:0!important;border-radius:0!important;box-shadow:none!important;text-align:center;background:transparent!important}.mt-count.changed{background:#fff7ed!important;color:#b45309!important}.mt-teacher,.mt-school{font-weight:700}.mt-extra-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:15px}.mt-extra-box{border:1px solid #d2d8de;border-radius:4px;padding:13px;background:#fff}.mt-extra-box h4{margin:0 0 10px;color:#b42318;text-align:center;font-family:"Times New Roman",serif}.mt-extra-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px}.mt-extra-box label{display:grid;gap:5px;font-size:12px;font-weight:750}@media(max-width:950px){.month-controls{grid-template-columns:1fr 1fr}.mt-extra-grid{grid-template-columns:1fr}}@media(max-width:620px){.month-controls{grid-template-columns:1fr}.mt-extra-fields{grid-template-columns:1fr}}`;
    document.head.appendChild(s);
  }

  function inject(){
    addStyle();document.getElementById('monthCardFixed')?.remove();
    const main=document.querySelector('main.shell');if(!main)return;
    const card=document.createElement('section');card.className='card';card.id='monthCardFixed';card.innerHTML=`<div class="head"><div><h3>4. Bảng kê tiết dạy tháng</h3><p>Tổng hợp đúng theo tháng dương lịch và khóa dữ liệu theo tháng • giáo viên • phiên bản TKB.</p></div><span class="badge" id="month2Status">Chưa tổng hợp</span></div><div class="month-controls"><label>Tháng<select id="month2Select">${Array.from({length:12},(_,i)=>`<option value="${i+1}">Tháng ${pad(i+1)}</option>`).join('')}</select></label><label>Giáo viên<select id="month2Teacher" disabled><option>Chọn file TKB trước…</option></select></label><button class="btn primary" id="month2Build">∑ Tổng hợp tháng</button><button class="btn success" id="month2Export" disabled>⇩ Xuất bảng kê Excel</button><button class="btn outline" id="month2AddSchool" disabled>+ Thêm trường</button></div><div class="notice month2-note"><b>Kiểm tra V3:</b> đổi tháng, đổi giáo viên hoặc đổi phiên bản TKB sẽ hủy kết quả cũ để tránh xuất nhầm. Hệ thống chỉ tính các ngày thực sự thuộc tháng đang chọn; tuần lỗi/thiếu tab sẽ được cảnh báo rõ.</div><div id="month2Summary"><div class="empty">Chọn tháng và giáo viên rồi nhấn <b>Tổng hợp tháng</b>.</div></div><div id="month2Preview"></div><div id="month2Extras"></div><div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn outline danger" id="month2Reset" disabled>Xóa điều chỉnh tháng này</button></div>`;main.appendChild(card);
    let dm=9;try{const d=q('week')?.value&&typeof startDate==='function'?startDate(q('week').value):null;if(d instanceof Date&&!Number.isNaN(d.getTime()))dm=d.getMonth()+1}catch{}q('month2Select').value=String(dm);
    populateTeachers(true);
    q('month2Build').onclick=()=>{S.built=null;setButton('month2Export',false);try{S.built=build();render();setTimeout(()=>card.scrollIntoView({behavior:'smooth',block:'start'}),30)}catch(error){invalidate(error?.message||String(error));alert(error?.message||error)}};
    q('month2Export').onclick=exportExcel;q('month2AddSchool').onclick=addSchool;q('month2Reset').onclick=resetManual;
    q('month2Select').addEventListener('change',()=>invalidate('Đã đổi tháng. Hãy tổng hợp lại để tránh dùng dữ liệu cũ.'));
    q('month2Teacher').addEventListener('change',()=>invalidate('Đã đổi giáo viên. Hãy tổng hợp lại để tránh dùng dữ liệu cũ.'));
    q('teacher')?.addEventListener('change',()=>{populateTeachers();const v=q('teacher')?.value;if(v&&[...q('month2Teacher').options].some(o=>o.value===v)){q('month2Teacher').value=v;invalidate('Đã đổi giáo viên. Hãy tổng hợp lại.')}});
    S.contextSig=workbookSignature();
    S.timer=setInterval(()=>{const sig=workbookSignature();if(sig!==S.contextSig){S.contextSig=sig;S.teacherKey='';S.teacherSig='';populateTeachers(true);invalidate('Phiên bản TKB đang dùng đã thay đổi. Hãy tổng hợp tháng lại.')}else populateTeachers(false)},1500);
  }

  if(window.LBGMonthlyV3?.destroy)try{window.LBGMonthlyV3.destroy()}catch{}
  window.LBGMonthlyV3={version:VERSION,destroy(){if(S.timer)clearInterval(S.timer);S.timer=null;q('monthCardFixed')?.remove()},rebuild(){if(!q('monthCardFixed'))inject()}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(inject,0),{once:true});else setTimeout(inject,0);
})();
