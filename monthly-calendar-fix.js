'use strict';
(function(){
  const PREFIX='lbgMonthlyCalendarV2';
  const S={built:null,teacherKey:'',teachers:[]};
  const $m=id=>document.getElementById(id);
  const pad=n=>String(Number(n)||0).padStart(2,'0');
  const kd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const txt=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const n0=v=>{const n=Number(v);return Number.isFinite(n)&&n>=0?Math.round(n):0;};
  const viDay=d=>['CN','Thứ hai','Thứ ba','Thứ tư','Thứ năm','Thứ sáu','Thứ bảy'][d.getDay()];
  const yearStart=()=>Number(document.getElementById('year')?.value)||new Date().getFullYear();
  const yearOfMonth=m=>Number(m)>=8?yearStart():yearStart()+1;
  const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x;};

  function mondayOf(date){
    const d=new Date(date);d.setHours(12,0,0,0);
    const shift=(d.getDay()+6)%7;
    d.setDate(d.getDate()-shift);
    return d;
  }

  function monthSegments(year,month){
    const first=new Date(year,month-1,1,12);
    const last=new Date(year,month,0,12);
    const out=[];
    for(let start=mondayOf(first);start<=last;start=addDays(start,7)){
      const dates=[];
      for(let i=0;i<7;i++){
        const d=addDays(start,i);
        if(d.getFullYear()===year&&d.getMonth()+1===month)dates.push(d);
      }
      if(!dates.length)continue;
      let label;
      if(dates.length===7) label=`TUẦN (${pad(dates[0].getDate())}T${pad(month)})`;
      else if(dates.length===1) label=`T${dates[0].getDate()}`;
      else label=`T${dates[0].getDate()}-${dates[dates.length-1].getDate()}`;
      out.push({start:new Date(start),key:kd(start),dates,label});
    }
    return out;
  }

  function sourceWeeks(){
    try{
      if(typeof wb==='undefined'||!wb)return [];
      return wb.worksheets.map(ws=>{
        let start=null;
        try{start=typeof startDate==='function'?startDate(ws.name):null;}catch{}
        return {ws,start};
      }).filter(x=>x.start instanceof Date&&!Number.isNaN(x.start.getTime())).sort((a,b)=>a.start-b.start);
    }catch{return [];}
  }

  function teacherUnion(){
    const key=(typeof activeId!=='undefined'?activeId:'')+'|'+(typeof wb!=='undefined'&&wb?wb.worksheets.length:0);
    if(S.teacherKey===key&&S.teachers.length)return S.teachers;
    const map=new Map();
    try{
      if(typeof wb!=='undefined'&&wb&&typeof window.teachers==='function'){
        for(const ws of wb.worksheets){
          if(typeof weekLike==='function'&&!weekLike(ws))continue;
          let list=[];try{list=window.teachers(ws)||[];}catch{}
          for(const t of list){
            if(!t?.code)continue;
            const code=String(t.code).trim(),name=String(t.name||code).trim();
            if(!map.has(code)||(/^Mã\s+/i.test(map.get(code).name)&&!/^Mã\s+/i.test(name)))map.set(code,{code,name});
          }
        }
      }
    }catch{}
    S.teacherKey=key;
    S.teachers=[...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'vi'));
    return S.teachers;
  }

  function populateTeachers(){
    const s=$m('month2Teacher');if(!s)return;
    const list=teacherUnion();
    const prefer=s.value||document.getElementById('teacher')?.value||'';
    s.innerHTML='<option value="">Chọn giáo viên…</option>'+list.map(t=>`<option value="${txt(t.code)}" data-name="${txt(t.name)}">${txt(t.name)} — ${txt(t.code)}</option>`).join('');
    if(prefer&&list.some(t=>t.code===prefer))s.value=prefer;
    s.disabled=!list.length;
  }

  function selectedTeacher(){
    const s=$m('month2Teacher'),o=s?.options?.[s.selectedIndex];
    return {code:s?.value||'',name:o?.dataset?.name||s?.value||''};
  }

  function storeKey(b){
    const version=typeof activeId!=='undefined'&&activeId?activeId:'active';
    return `${PREFIX}:${version}:${b.year}-${pad(b.month)}:${b.teacherCode}`;
  }
  function loadManual(b){
    const base={overrides:{},weeklyAssist:{},addedSchools:[],extras:{thcsMain:'',thcsAssist:'',topicCount:'',topicLead:'',tripCount:'',tripLead:'',hdnt:''}};
    try{const p=JSON.parse(localStorage.getItem(storeKey(b))||'null')||{};return {...base,...p,overrides:{...base.overrides,...(p.overrides||{})},weeklyAssist:{...base.weeklyAssist,...(p.weeklyAssist||{})},addedSchools:Array.isArray(p.addedSchools)?p.addedSchools:[],extras:{...base.extras,...(p.extras||{})}};}catch{return base;}
  }
  function saveManual(){try{if(S.built)localStorage.setItem(storeKey(S.built),JSON.stringify(S.built.manual));}catch{}}

  function build(){
    if(typeof wb==='undefined'||!wb)throw new Error('Hãy tải và chọn một file TKB trước.');
    if(typeof analyzeNow!=='function')throw new Error('Bộ đọc TKB chưa sẵn sàng.');
    const month=Number($m('month2Select')?.value),teacher=selectedTeacher();
    if(!month)throw new Error('Chưa chọn tháng.');
    if(!teacher.code)throw new Error('Chưa chọn giáo viên.');
    const year=yearOfMonth(month),segments=monthSegments(year,month),all=sourceWeeks();
    const byStart=new Map(all.map(x=>[kd(x.start),x]));
    const counts=new Map(),order=[],seen=new Set(),warnings=[];
    const matched=[];
    const add=(school,date,amount=1)=>{
      const name=String(school||'').trim();if(!name)return;
      if(!seen.has(name)){seen.add(name);order.push(name);}
      if(!counts.has(name))counts.set(name,new Map());
      const m=counts.get(name),k=kd(date);m.set(k,(m.get(k)||0)+amount);
    };
    for(const seg of segments){
      const item=byStart.get(seg.key);
      seg.sheet=item?.ws?.name||'';
      if(!item){warnings.push(`Thiếu tab TKB của tuần bắt đầu ${seg.start.toLocaleDateString('vi-VN')} nên có thể thiếu dữ liệu ngày ${seg.dates[0].getDate()}-${seg.dates[seg.dates.length-1].getDate()}/${month}.`);continue;}
      matched.push(item.ws.name);
      let a;try{a=analyzeNow(item.ws,teacher.code,teacher.name);}catch(e){warnings.push(`${item.ws.name}: ${e.message||e}`);continue;}
      for(const e of a.entries||[]){
        const day=Number(e.day),off=day===8?6:day-2;
        if(off<0||off>6)continue;
        const d=addDays(seg.start,off);
        if(d.getFullYear()!==year||d.getMonth()+1!==month)continue;
        add(e.school,d,1);
      }
    }
    const built={year,month,teacherCode:teacher.code,teacherName:teacher.name,segments,dates:segments.flatMap(s=>s.dates),counts,schools:order,warnings,sourceSheets:matched};
    built.manual=loadManual(built);
    for(const s of built.manual.addedSchools){const name=String(s||'').trim();if(name&&!built.schools.includes(name))built.schools.push(name);}
    S.built=built;return built;
  }

  function autoVal(b,school,date){return b.counts.get(school)?.get(kd(date))||0;}
  function val(b,school,date){const k=`${school}|||${kd(date)}`;return Object.prototype.hasOwnProperty.call(b.manual.overrides,k)?n0(b.manual.overrides[k]):autoVal(b,school,date);}
  function weekTotal(b,seg){let t=0;for(const s of b.schools)for(const d of seg.dates)t+=val(b,s,d);return t;}
  function monthTotal(b){return b.segments.reduce((a,s)=>a+weekTotal(b,s),0);}
  function assistTotal(b){return b.segments.reduce((a,s)=>a+n0(b.manual.weeklyAssist[s.key]||0),0);}

  function render(){
    const b=S.built;if(!b)return;
    const summary=$m('month2Summary');
    summary.innerHTML=`<div class="sumgrid monthly-sums"><div class="sum"><b id="month2Main">${monthTotal(b)}</b><span>Tiết chính từ ngày 1 đến ${new Date(b.year,b.month,0).getDate()}</span></div><div class="sum"><b id="month2Assist">${assistTotal(b)}</b><span>Trợ giảng</span></div><div class="sum"><b>${b.schools.length}</b><span>Số trường</span></div><div class="sum"><b>${b.sourceSheets.length}/${b.segments.length}</b><span>Tuần TKB đã có</span></div></div>${b.warnings.length?`<div class="alert warn"><b>Cần kiểm tra:</b><br>${b.warnings.map(txt).join('<br>')}</div>`:'<div class="alert ok">Đã đủ các tab tuần giao với tháng; tổng tháng bao phủ đầy đủ ngày 1 đến ngày cuối tháng.</div>'}`;
    const p=$m('month2Preview');
    if(!b.schools.length){p.innerHTML='<div class="empty">Không tìm thấy tiết dạy của giáo viên trong tháng này.</div>';return;}
    const wh=b.segments.map(s=>`<th class="mt-week" colspan="${s.dates.length}">${txt(s.label)}<small>${s.sheet?txt(s.sheet):'Thiếu tab TKB'}</small></th>`).join('');
    const dh=b.dates.map(d=>`<th class="mt-date"><b>${d.getDate()}</b><small>${txt(viDay(d))}</small></th>`).join('');
    const rows=b.schools.map((s,i)=>`<tr><td class="mt-teacher">${i===0?txt(b.teacherName):''}</td><td class="mt-school">${txt(s)}</td>${b.dates.map(d=>{const a=autoVal(b,s,d),v=val(b,s,d);return `<td class="mt-cell"><input class="mt-count ${v!==a?'changed':''}" type="number" min="0" step="1" value="${v||''}" data-school="${txt(s)}" data-date="${kd(d)}" data-auto="${a}"></td>`;}).join('')}</tr>`).join('');
    const totals=b.segments.map(s=>`<td class="mt-week-total" colspan="${s.dates.length}"><b>${weekTotal(b,s)} Chính (T)</b><label>Trợ (P) <input class="mt-assist" type="number" min="0" step="1" value="${n0(b.manual.weeklyAssist[s.key]||0)||''}" data-week="${s.key}"></label></td>`).join('');
    p.innerHTML=`<div class="mt-sheet"><div class="mt-title"><h2>BẢNG KÊ KHAI TIẾT DẠY THÁNG ${pad(b.month)}</h2><h3>NĂM HỌC ${yearStart()}-${yearStart()+1}</h3></div><div class="mt-scroll"><table class="mt-table"><thead><tr><th class="mt-fixed-a" rowspan="2">HỌ & TÊN<br>GIÁO VIÊN</th><th class="mt-fixed-b" rowspan="2">GIẢNG DẠY<br>TRƯỜNG</th>${wh}</tr><tr>${dh}</tr></thead><tbody>${rows}<tr class="mt-total-row"><td class="mt-fixed-a" colspan="2"><b>CỘNG TUẦN</b></td>${totals}</tr></tbody></table></div></div>`;
    p.querySelectorAll('.mt-count').forEach(inp=>inp.addEventListener('input',e=>{
      const k=`${e.currentTarget.dataset.school}|||${e.currentTarget.dataset.date}`,v=n0(e.currentTarget.value||0),a=n0(e.currentTarget.dataset.auto);
      if(v===a)delete b.manual.overrides[k];else b.manual.overrides[k]=v;
      e.currentTarget.classList.toggle('changed',v!==a);saveManual();refresh();
    }));
    p.querySelectorAll('.mt-assist').forEach(inp=>inp.addEventListener('input',e=>{b.manual.weeklyAssist[e.currentTarget.dataset.week]=n0(e.currentTarget.value||0);saveManual();refresh();}));
    renderExtras();
    $m('month2Export').disabled=false;$m('month2AddSchool').disabled=false;$m('month2Reset').disabled=false;
    $m('month2Status').textContent=`${pad(b.month)}/${b.year} • ${monthTotal(b)} tiết`;
  }

  function refresh(){const b=S.built;if(!b)return;const x=$m('month2Main'),y=$m('month2Assist');if(x)x.textContent=monthTotal(b);if(y)y.textContent=assistTotal(b);$m('month2Status').textContent=`${pad(b.month)}/${b.year} • ${monthTotal(b)} tiết`;const cells=$m('month2Preview')?.querySelectorAll('.mt-week-total');if(cells)b.segments.forEach((s,i)=>{const z=cells[i]?.querySelector('b');if(z)z.textContent=`${weekTotal(b,s)} Chính (T)`;});}

  function renderExtras(){
    const b=S.built,e=b.manual.extras,box=$m('month2Extras');
    box.innerHTML=`<div class="mt-extra-grid"><div class="mt-extra-box"><h4>PHẦN DÀNH RIÊNG CHO THCS</h4><div class="mt-extra-fields"><label>Tổng chính<input data-x="thcsMain" type="number" min="0" value="${txt(e.thcsMain)}"></label><label>Tổng trợ<input data-x="thcsAssist" type="number" min="0" value="${txt(e.thcsAssist)}"></label></div></div><div class="mt-extra-box"><h4>PHẦN DÀNH RIÊNG CHO CHUYÊN ĐỀ</h4><div class="mt-extra-fields"><label>Số chuyên đề tham gia<input data-x="topicCount" type="number" min="0" value="${txt(e.topicCount)}"></label><label>Làm nhóm trưởng<input data-x="topicLead" type="number" min="0" value="${txt(e.topicLead)}"></label></div></div><div class="mt-extra-box"><h4>PHẦN DÀNH RIÊNG CHO TNST</h4><div class="mt-extra-fields"><label>Số chuyến tham gia<input data-x="tripCount" type="number" min="0" value="${txt(e.tripCount)}"></label><label>Làm trưởng đoàn<input data-x="tripLead" type="number" min="0" value="${txt(e.tripLead)}"></label></div></div><div class="mt-extra-box"><h4>PHẦN DÀNH RIÊNG CHO HĐNT</h4><label>Ghi chú<textarea data-x="hdnt" rows="3">${txt(e.hdnt)}</textarea></label></div></div>`;
    box.querySelectorAll('[data-x]').forEach(i=>i.addEventListener('input',()=>{b.manual.extras[i.dataset.x]=i.value;saveManual();}));
  }

  function addSchool(){const b=S.built;if(!b)return;const name=(prompt('Nhập tên trường cần bổ sung:')||'').trim();if(!name)return;if(!b.schools.includes(name))b.schools.push(name);if(!b.manual.addedSchools.includes(name))b.manual.addedSchools.push(name);saveManual();render();}
  function resetManual(){const b=S.built;if(!b||!confirm('Xóa toàn bộ điều chỉnh thủ công của tháng này?'))return;localStorage.removeItem(storeKey(b));b.manual=loadManual(b);b.schools=[...b.counts.keys()];render();}

  function style(c,o={}){c.font={name:'Times New Roman',size:o.size||10,bold:!!o.bold,italic:!!o.italic,color:{argb:o.color||'FF000000'}};c.alignment={horizontal:o.align||'center',vertical:'middle',wrapText:true};if(o.fill)c.fill={type:'pattern',pattern:'solid',fgColor:{argb:o.fill}};if(o.border!==false)c.border={top:{style:'thin'},left:{style:'thin'},bottom:{style:'thin'},right:{style:'thin'}};}
  async function exportExcel(){
    const b=S.built;if(!b)return;if(typeof ExcelJS==='undefined'||typeof saveAs==='undefined'){alert('Thư viện xuất Excel chưa sẵn sàng.');return;}
    const btn=$m('month2Export'),old=btn.textContent;btn.disabled=true;btn.textContent='Đang tạo Excel…';
    try{
      const book=new ExcelJS.Workbook(),ws=book.addWorksheet('Tiết dạy',{views:[{showGridLines:false}]});
      const firstCol=3,lastCol=2+b.dates.length,mainCol=lastCol+1,assistCol=lastCol+2;
      ws.pageSetup={orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0};
      ws.mergeCells(1,1,2,lastCol);ws.getCell(1,1).value=`BẢNG KÊ KHAI TIẾT DẠY THÁNG ${pad(b.month)}\nNĂM HỌC ${yearStart()}-${yearStart()+1}`;style(ws.getCell(1,1),{bold:true,size:18,border:false});
      ws.mergeCells(3,1,5,1);ws.getCell(3,1).value='HỌ & TÊN\nGIÁO VIÊN';style(ws.getCell(3,1),{bold:true,italic:true});
      ws.mergeCells(3,2,5,2);ws.getCell(3,2).value='GIẢNG DẠY\nTRƯỜNG';style(ws.getCell(3,2),{bold:true,italic:true});
      let col=firstCol;
      for(const seg of b.segments){const a=col,z=col+seg.dates.length-1;ws.mergeCells(3,a,3,z);ws.getCell(3,a).value=seg.label;style(ws.getCell(3,a),{bold:true,color:'FFFF0000'});seg.dates.forEach((d,i)=>{ws.getCell(4,a+i).value=d.getDate();style(ws.getCell(4,a+i),{bold:true,fill:'FFF4B183'});ws.getCell(5,a+i).value=viDay(d);style(ws.getCell(5,a+i),{size:8,border:false});});col=z+1;}
      const row0=6;
      b.schools.forEach((s,i)=>{const r=row0+i;ws.getCell(r,1).value=i===0?b.teacherName:'';ws.getCell(r,2).value=s;style(ws.getCell(r,1),{italic:true});style(ws.getCell(r,2),{italic:true});b.dates.forEach((d,j)=>{const v=val(b,s,d);ws.getCell(r,firstCol+j).value=v||'';style(ws.getCell(r,firstCol+j));});});
      const tr=row0+b.schools.length;ws.mergeCells(tr,1,tr,2);ws.getCell(tr,1).value='CỘNG TUẦN';style(ws.getCell(tr,1),{bold:true});col=firstCol;for(const seg of b.segments){const z=col+seg.dates.length-1;ws.mergeCells(tr,col,tr,z);ws.getCell(tr,col).value=`${weekTotal(b,seg)} Chính (T)\n${n0(b.manual.weeklyAssist[seg.key]||0)||'..........'} Trợ (P)`;style(ws.getCell(tr,col),{bold:true});col=z+1;}
      ws.getCell(3,mainCol).value='Tổng\nChính';ws.getCell(3,assistCol).value='Trợ\nGiảng';style(ws.getCell(3,mainCol),{bold:true,fill:'FFF4B183'});style(ws.getCell(3,assistCol),{bold:true,fill:'FFF4B183'});ws.getCell(tr,mainCol).value=monthTotal(b);ws.getCell(tr,assistCol).value=assistTotal(b);style(ws.getCell(tr,mainCol),{bold:true,fill:'FFB9E6A5'});style(ws.getCell(tr,assistCol),{bold:true,fill:'FFB9E6A5'});
      const gr=tr+2;ws.mergeCells(gr,1,gr,lastCol);ws.getCell(gr,1).value=`TỔNG CỘNG SỐ TIẾT THÁNG ${pad(b.month)}/${b.year}: ${monthTotal(b)}`;style(ws.getCell(gr,1),{bold:true,size:15,fill:'FF20BCE5',border:false});
      ws.getColumn(1).width=22;ws.getColumn(2).width=24;for(let c=firstCol;c<=lastCol;c++)ws.getColumn(c).width=4.4;ws.getColumn(mainCol).width=10;ws.getColumn(assistCol).width=10;
      const buf=await book.xlsx.writeBuffer();saveAs(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`${b.teacherName} - Bảng kê tiết dạy tháng ${pad(b.month)} năm ${b.year}.xlsx`);if(typeof toast==='function')toast('Đã xuất bảng kê tháng.');
    }catch(e){console.error(e);alert('Không xuất được bảng kê: '+(e.message||e));}finally{btn.disabled=false;btn.textContent=old;}
  }

  function inject(){
    document.getElementById('monthCard')?.remove();
    if($m('monthCardFixed'))return;
    const main=document.querySelector('main.shell');if(!main)return;
    const styleEl=document.createElement('style');styleEl.textContent='.month2-note{margin-top:12px}.month-controls{display:grid;grid-template-columns:minmax(120px,.5fr) minmax(230px,1.2fr) auto auto auto;gap:9px;align-items:end}.month-controls label{display:grid;gap:5px;font-size:12px;font-weight:750}.month-controls select{width:100%;padding:10px 11px;border:1px solid var(--l);border-radius:11px;background:#fff}.mt-sheet{margin-top:15px;border:1px solid #1f2937;background:#fff;font-family:"Times New Roman",serif}.mt-title{text-align:center;padding:12px}.mt-title h2{margin:0}.mt-title h3{margin:2px 0}.mt-scroll{overflow:auto}.mt-table{border-collapse:collapse;width:max-content;min-width:100%}.mt-table th,.mt-table td{border:1px solid #1f2937;padding:4px;text-align:center;height:34px}.mt-week{color:#dc2626!important}.mt-week small,.mt-date small{display:block;font-size:9px;color:#64748b}.mt-date{min-width:44px}.mt-cell{padding:2px!important}.mt-count{width:40px;border:0;text-align:center;background:transparent}.mt-count.changed{background:#fff7ed;color:#c2410c}.mt-teacher,.mt-school{font-weight:700}.mt-extra-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:15px}.mt-extra-box{border:1px solid var(--l);border-radius:14px;padding:13px}.mt-extra-box h4{margin:0 0 10px;color:#dc2626;text-align:center}.mt-extra-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px}.mt-extra-box label{display:grid;gap:5px;font-size:12px;font-weight:750}.mt-extra-box input,.mt-extra-box textarea{width:100%;padding:9px;border:1px solid var(--l);border-radius:9px}@media(max-width:950px){.month-controls{grid-template-columns:1fr 1fr}.mt-extra-grid{grid-template-columns:1fr}}';document.head.appendChild(styleEl);
    const card=document.createElement('section');card.className='card';card.id='monthCardFixed';card.innerHTML=`<div class="head"><div><h3>4. Bảng kê tiết dạy tháng</h3><p>Tổng hợp theo đúng tháng dương lịch: từ ngày 1 đến ngày cuối tháng.</p></div><span class="badge" id="month2Status">Chưa tổng hợp</span></div><div class="month-controls"><label>Tháng<select id="month2Select">${Array.from({length:12},(_,i)=>`<option value="${i+1}">Tháng ${pad(i+1)}</option>`).join('')}</select></label><label>Giáo viên<select id="month2Teacher" disabled><option>Chọn file TKB trước…</option></select></label><button class="btn primary" id="month2Build">∑ Tổng hợp tháng</button><button class="btn success" id="month2Export" disabled>⇩ Xuất bảng kê Excel</button><button class="btn outline" id="month2AddSchool" disabled>+ Thêm trường</button></div><div class="notice month2-note"><b>Quy tắc mới:</b> tháng được tính đủ từ <b>ngày 1 đến ngày 28/29/30/31</b>. Nếu ngày đầu tháng nằm trong một tuần bắt đầu từ tháng trước, hệ thống vẫn lấy tab TKB của tuần đó nhưng chỉ cộng những ngày thuộc tháng đang chọn. Tuần cuối cũng chỉ cộng đến ngày cuối tháng.</div><div id="month2Summary"><div class="empty">Chọn tháng và giáo viên rồi nhấn <b>Tổng hợp tháng</b>.</div></div><div id="month2Preview"></div><div id="month2Extras"></div><div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn outline danger" id="month2Reset" disabled>Xóa điều chỉnh tháng này</button></div>`;main.appendChild(card);
    const mainWeek=document.getElementById('week');let dm=9;try{const d=mainWeek?.value&&typeof startDate==='function'?startDate(mainWeek.value):null;if(d instanceof Date&&!isNaN(d))dm=d.getMonth()+1;}catch{}$m('month2Select').value=String(dm);
    $m('month2Build').onclick=()=>{try{S.built=build();render();setTimeout(()=>card.scrollIntoView({behavior:'smooth',block:'start'}),30);}catch(e){alert(e.message||e);}};
    $m('month2Export').onclick=exportExcel;$m('month2AddSchool').onclick=addSchool;$m('month2Reset').onclick=resetManual;
    document.getElementById('teacher')?.addEventListener('change',()=>{populateTeachers();const v=document.getElementById('teacher')?.value;if(v&&[...$m('month2Teacher').options].some(o=>o.value===v))$m('month2Teacher').value=v;});
    setInterval(()=>{if(typeof wb!=='undefined'&&wb){populateTeachers();}},1500);populateTeachers();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(inject,0));else setTimeout(inject,0);
})();
