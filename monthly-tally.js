'use strict';
(function(){
  const VERSION='20260801.1';
  const STORAGE_PREFIX='lbgMonthlyTally';
  const state={
    built:null,
    teacherCacheKey:'',
    teachers:[]
  };

  const q=id=>document.getElementById(id);
  const pad2=n=>String(Number(n)||0).padStart(2,'0');
  const keyDate=d=>`${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  const viDay=d=>['CN','Thứ hai','Thứ ba','Thứ tư','Thứ năm','Thứ sáu','Thứ bảy'][d.getDay()];
  const excelCol=n=>{let s='';for(let x=n;x>0;x=Math.floor((x-1)/26))s=String.fromCharCode(65+(x-1)%26)+s;return s;};
  const safeNumber=v=>{const n=Number(v);return Number.isFinite(n)&&n>=0?Math.round(n):0;};
  const html=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function yearStart(){
    return Number(q('year')?.value)||new Date().getFullYear();
  }

  function calendarYear(month){
    const y=yearStart();
    return Number(month)>=8?y:y+1;
  }

  function defaultMonth(){
    try{
      const selected=q('week')?.value;
      const d=selected&&typeof startDate==='function'?startDate(selected):null;
      if(d instanceof Date&&!Number.isNaN(d.getTime()))return d.getMonth()+1;
    }catch{}
    const now=new Date();
    const y=yearStart();
    if(now.getFullYear()===y||now.getFullYear()===y+1)return now.getMonth()+1;
    return 9;
  }

  function mondayStarts(year,month){
    const starts=[];
    const end=new Date(year,month,0,12);
    for(let d=new Date(year,month-1,1,12);d<=end;d.setDate(d.getDate()+1)){
      if(d.getDay()===1)starts.push(new Date(d));
    }
    return starts;
  }

  function datesForWeek(start,month){
    const dates=[];
    for(let offset=0;offset<7;offset++){
      const d=new Date(start);d.setDate(start.getDate()+offset);
      if(d.getMonth()+1===month)dates.push(d);
    }
    return dates;
  }

  function weekSheets(){
    try{
      if(!wb)return [];
      return wb.worksheets
        .map(ws=>({ws,start:typeof startDate==='function'?startDate(ws.name):null}))
        .filter(x=>x.start instanceof Date&&!Number.isNaN(x.start.getTime()))
        .sort((a,b)=>a.start-b.start);
    }catch{return [];}
  }

  function storageKey(year,month,code){
    const version=typeof activeId!=='undefined'&&activeId?activeId:'active';
    return `${STORAGE_PREFIX}:${version}:${year}-${pad2(month)}:${code||'teacher'}`;
  }

  function loadManual(year,month,code){
    const fallback={overrides:{},addedSchools:[],weeklyAssist:{},extras:{thcsMain:'',thcsAssist:'',topicCount:'',topicLead:'',tripCount:'',tripLead:'',hdnt:''}};
    try{
      const raw=localStorage.getItem(storageKey(year,month,code));
      if(!raw)return fallback;
      const parsed=JSON.parse(raw)||{};
      return {
        ...fallback,
        ...parsed,
        overrides:{...fallback.overrides,...(parsed.overrides||{})},
        addedSchools:Array.isArray(parsed.addedSchools)?parsed.addedSchools:[],
        weeklyAssist:{...fallback.weeklyAssist,...(parsed.weeklyAssist||{})},
        extras:{...fallback.extras,...(parsed.extras||{})}
      };
    }catch{return fallback;}
  }

  function saveManual(built){
    try{localStorage.setItem(storageKey(built.year,built.month,built.teacherCode),JSON.stringify(built.manual));}catch{}
  }

  function teacherUnion(){
    const cacheKey=(typeof activeId!=='undefined'?activeId:'')+'|'+(typeof wb!=='undefined'&&wb?wb.worksheets.length:0);
    if(state.teacherCacheKey===cacheKey&&state.teachers.length)return state.teachers;
    const map=new Map();
    try{
      if(wb&&typeof window.teachers==='function'){
        for(const ws of wb.worksheets){
          if(typeof weekLike==='function'&&!weekLike(ws))continue;
          let list=[];
          try{list=window.teachers(ws)||[];}catch{}
          for(const item of list){
            if(!item?.code)continue;
            const code=String(item.code).trim();
            const name=String(item.name||code).trim();
            if(!map.has(code))map.set(code,{code,name});
            else if(/^Mã\s+/i.test(map.get(code).name)&&!/^Mã\s+/i.test(name))map.set(code,{code,name});
          }
        }
      }
    }catch{}
    state.teacherCacheKey=cacheKey;
    state.teachers=[...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'vi'));
    return state.teachers;
  }

  function populateMonthTeachers(preferCode){
    const select=q('monthTeacher');
    if(!select)return;
    const list=teacherUnion();
    const previous=preferCode||select.value||q('teacher')?.value||'';
    select.innerHTML='<option value="">Chọn giáo viên…</option>'+list.map(x=>`<option value="${html(x.code)}" data-name="${html(x.name)}">${html(x.name)} — ${html(x.code)}</option>`).join('');
    if(previous&&list.some(x=>x.code===previous))select.value=previous;
    select.disabled=!list.length;
  }

  function monthTeacherInfo(){
    const select=q('monthTeacher');
    const option=select?.options?.[select.selectedIndex];
    return {code:select?.value||'',name:option?.dataset?.name||select?.value||''};
  }

  function deriveSchoolOrder(sheetAnalyses,counts){
    const ordered=[];const seen=new Set();
    for(const a of sheetAnalyses){
      const rows=[...(a.entries||[])].sort((x,y)=>(Number(x.row)||9999)-(Number(y.row)||9999));
      for(const e of rows){
        const school=String(e.school||'').trim();
        if(school&&!seen.has(school)){seen.add(school);ordered.push(school);}
      }
    }
    for(const school of counts.keys())if(!seen.has(school)){seen.add(school);ordered.push(school);}
    return ordered;
  }

  function buildMonthData(){
    if(typeof wb==='undefined'||!wb)throw new Error('Hãy tải và chọn một file TKB trước.');
    const month=Number(q('monthSelect')?.value);
    const teacher=monthTeacherInfo();
    if(!month||month<1||month>12)throw new Error('Chưa chọn tháng.');
    if(!teacher.code)throw new Error('Chưa chọn giáo viên.');
    if(typeof analyzeNow!=='function')throw new Error('Bộ đọc TKB chưa sẵn sàng. Hãy tải lại trang rồi thử lại.');

    const year=calendarYear(month);
    const expectedStarts=mondayStarts(year,month);
    const allSheets=weekSheets();
    const selectedSheets=allSheets.filter(x=>x.start.getFullYear()===year&&x.start.getMonth()+1===month);
    const sheetByStart=new Map(selectedSheets.map(x=>[keyDate(x.start),x]));
    const missingStarts=expectedStarts.filter(d=>!sheetByStart.has(keyDate(d)));
    const counts=new Map();
    const sheetAnalyses=[];
    const warnings=[];

    function addCount(school,dateKey,amount=1){
      const name=String(school||'').trim();
      if(!name)return;
      if(!counts.has(name))counts.set(name,new Map());
      const byDate=counts.get(name);
      byDate.set(dateKey,(byDate.get(dateKey)||0)+amount);
    }

    for(const item of selectedSheets){
      let a;
      try{a=analyzeNow(item.ws,teacher.code,teacher.name);}catch(error){warnings.push(`${item.ws.name}: ${error.message||error}`);continue;}
      sheetAnalyses.push(a);
      for(const e of a.entries||[]){
        const offset=Number(e.day)===8?6:Number(e.day)-2;
        if(offset<0||offset>6)continue;
        const date=new Date(item.start);date.setDate(item.start.getDate()+offset);
        if(date.getFullYear()!==year||date.getMonth()+1!==month)continue;
        addCount(e.school,keyDate(date),1);
      }
    }

    const manual=loadManual(year,month,teacher.code);
    const schools=deriveSchoolOrder(sheetAnalyses,counts);
    for(const school of manual.addedSchools){
      const name=String(school||'').trim();
      if(name&&!schools.includes(name))schools.push(name);
    }

    const weeks=expectedStarts.map(start=>({
      start,
      key:keyDate(start),
      label:start.getDate()===30&&datesForWeek(start,month).length<=2?`T${start.getDate()}-${new Date(year,month,0).getDate()}`:`TUẦN (${pad2(start.getDate())}T${pad2(month)})`,
      dates:datesForWeek(start,month),
      sheet:sheetByStart.get(keyDate(start))?.ws?.name||''
    }));
    const dates=weeks.flatMap(w=>w.dates);

    const built={year,month,teacherCode:teacher.code,teacherName:teacher.name,weeks,dates,counts,schools,manual,missingStarts,warnings,sourceSheets:selectedSheets.map(x=>x.ws.name)};
    state.built=built;
    return built;
  }

  function autoValue(built,school,date){
    return built.counts.get(school)?.get(keyDate(date))||0;
  }

  function finalValue(built,school,date){
    const k=`${school}|||${keyDate(date)}`;
    if(Object.prototype.hasOwnProperty.call(built.manual.overrides,k))return safeNumber(built.manual.overrides[k]);
    return autoValue(built,school,date);
  }

  function weekMainTotal(built,week){
    let total=0;
    for(const school of built.schools)for(const d of week.dates)total+=finalValue(built,school,d);
    return total;
  }

  function monthMainTotal(built){
    return built.weeks.reduce((sum,w)=>sum+weekMainTotal(built,w),0);
  }

  function monthAssistTotal(built){
    return built.weeks.reduce((sum,w)=>sum+safeNumber(built.manual.weeklyAssist[w.key]||0),0);
  }

  function renderSummary(built){
    const el=q('monthSummary');if(!el)return;
    const missing=built.missingStarts.map(d=>`${d.getDate()}/${d.getMonth()+1}`).join(', ');
    const warn=[...built.warnings];
    if(missing)warn.unshift(`Thiếu tab TKB cho tuần bắt đầu: ${missing}.`);
    el.innerHTML=`
      <div class="sumgrid monthly-sums">
        <div class="sum"><b id="monthMainTotal">${monthMainTotal(built)}</b><span>Tiết chính</span></div>
        <div class="sum"><b id="monthAssistTotal">${monthAssistTotal(built)}</b><span>Trợ giảng</span></div>
        <div class="sum"><b>${built.schools.length}</b><span>Số trường</span></div>
        <div class="sum"><b>${built.sourceSheets.length}/${built.weeks.length}</b><span>Tuần TKB đã có</span></div>
      </div>
      ${warn.length?`<div class="alert warn"><b>Cần kiểm tra:</b><br>${warn.map(html).join('<br>')}</div>`:'<div class="alert ok">Đã đủ các tuần bắt đầu trong tháng và có thể xuất bảng kê.</div>'}`;
  }

  function renderGrid(built){
    const preview=q('monthPreview');if(!preview)return;
    if(!built.schools.length){preview.innerHTML='<div class="empty">Không tìm thấy tiết dạy của giáo viên trong các tuần thuộc tháng này.</div>';return;}
    const weekHeaders=built.weeks.map(w=>`<th class="mt-week" colspan="${w.dates.length}">${html(w.label)}${w.sheet?`<small>${html(w.sheet)}</small>`:'<small>Chưa có tab TKB</small>'}</th>`).join('');
    const dateHeaders=built.dates.map(d=>`<th class="mt-date"><b>${d.getDate()}</b><small>${html(viDay(d))}</small></th>`).join('');
    const schoolRows=built.schools.map((school,rowIndex)=>{
      const cells=built.dates.map(d=>{
        const auto=autoValue(built,school,d),value=finalValue(built,school,d),changed=value!==auto;
        return `<td class="mt-cell"><input class="mt-count ${changed?'changed':''}" type="number" min="0" step="1" value="${value||''}" data-school="${html(school)}" data-date="${keyDate(d)}" data-auto="${auto}" title="Tự động từ TKB: ${auto}"></td>`;
      }).join('');
      return `<tr><td class="mt-teacher">${rowIndex===0?html(built.teacherName):''}</td><td class="mt-school">${html(school)}</td>${cells}</tr>`;
    }).join('');
    const totals=built.weeks.map(w=>`<td class="mt-week-total" colspan="${w.dates.length}"><b>${weekMainTotal(built,w)} Chính (T)</b><label>Trợ (P) <input class="mt-assist" type="number" min="0" step="1" value="${safeNumber(built.manual.weeklyAssist[w.key]||0)||''}" data-week="${w.key}"></label></td>`).join('');

    preview.innerHTML=`
      <div class="mt-sheet">
        <div class="mt-title"><h2>BẢNG KÊ KHAI TIẾT DẠY THÁNG ${pad2(built.month)}</h2><h3>NĂM HỌC ${yearStart()}-${yearStart()+1}</h3></div>
        <div class="mt-scroll"><table class="mt-table"><thead><tr><th class="mt-fixed-a" rowspan="2">HỌ & TÊN<br>GIÁO VIÊN</th><th class="mt-fixed-b" rowspan="2">GIẢNG DẠY<br>TRƯỜNG</th>${weekHeaders}</tr><tr>${dateHeaders}</tr></thead><tbody>${schoolRows}<tr class="mt-total-row"><td class="mt-fixed-a" colspan="2"><b>CỘNG TUẦN</b></td>${totals}</tr></tbody></table></div>
      </div>`;

    preview.querySelectorAll('.mt-count').forEach(input=>input.addEventListener('input',onCountEdit));
    preview.querySelectorAll('.mt-assist').forEach(input=>input.addEventListener('input',onAssistEdit));
  }

  function renderExtras(built){
    const el=q('monthExtras');if(!el)return;
    const x=built.manual.extras;
    el.innerHTML=`
      <div class="mt-extra-grid">
        <div class="mt-extra-box"><h4>PHẦN DÀNH RIÊNG CHO THCS</h4><div class="mt-extra-fields"><label>Tổng chính<input data-extra="thcsMain" type="number" min="0" value="${html(x.thcsMain)}"></label><label>Tổng trợ<input data-extra="thcsAssist" type="number" min="0" value="${html(x.thcsAssist)}"></label></div></div>
        <div class="mt-extra-box"><h4>PHẦN DÀNH RIÊNG CHO CHUYÊN ĐỀ</h4><div class="mt-extra-fields"><label>Tổng số chuyên đề có tham gia<input data-extra="topicCount" type="number" min="0" value="${html(x.topicCount)}"></label><label>Làm nhóm trưởng bao nhiêu chuyên đề<input data-extra="topicLead" type="number" min="0" value="${html(x.topicLead)}"></label></div></div>
        <div class="mt-extra-box"><h4>PHẦN DÀNH RIÊNG CHO TNST</h4><div class="mt-extra-fields"><label>Tổng số chuyến có tham gia<input data-extra="tripCount" type="number" min="0" value="${html(x.tripCount)}"></label><label>Làm trưởng đoàn bao nhiêu chuyến<input data-extra="tripLead" type="number" min="0" value="${html(x.tripLead)}"></label></div></div>
        <div class="mt-extra-box"><h4>PHẦN DÀNH RIÊNG CHO HĐNT</h4><label>Ghi chú<textarea data-extra="hdnt" rows="3">${html(x.hdnt)}</textarea></label></div>
      </div>`;
    el.querySelectorAll('[data-extra]').forEach(input=>input.addEventListener('input',()=>{
      if(!state.built)return;
      state.built.manual.extras[input.dataset.extra]=input.value;
      saveManual(state.built);
    }));
  }

  function renderAll(built){
    renderSummary(built);renderGrid(built);renderExtras(built);
    q('monthExport').disabled=!built.schools.length;
    q('monthAddSchool').disabled=false;
    q('monthReset').disabled=false;
    q('monthStatus').textContent=`${pad2(built.month)}/${built.year} • ${monthMainTotal(built)} tiết`;
  }

  function onCountEdit(event){
    const built=state.built;if(!built)return;
    const input=event.currentTarget;
    const school=input.dataset.school,date=input.dataset.date,auto=safeNumber(input.dataset.auto);
    const value=safeNumber(input.value||0),k=`${school}|||${date}`;
    if(value===auto)delete built.manual.overrides[k];else built.manual.overrides[k]=value;
    input.classList.toggle('changed',value!==auto);
    saveManual(built);refreshTotals(built);
  }

  function onAssistEdit(event){
    const built=state.built;if(!built)return;
    const input=event.currentTarget;
    built.manual.weeklyAssist[input.dataset.week]=safeNumber(input.value||0);
    saveManual(built);refreshTotals(built);
  }

  function refreshTotals(built){
    const main=q('monthMainTotal'),assist=q('monthAssistTotal');
    if(main)main.textContent=monthMainTotal(built);
    if(assist)assist.textContent=monthAssistTotal(built);
    q('monthStatus').textContent=`${pad2(built.month)}/${built.year} • ${monthMainTotal(built)} tiết`;
    const cells=q('monthPreview')?.querySelectorAll('.mt-week-total');
    if(cells)built.weeks.forEach((w,i)=>{
      const cell=cells[i];if(!cell)return;
      const b=cell.querySelector('b');if(b)b.textContent=`${weekMainTotal(built,w)} Chính (T)`;
    });
  }

  function addSchool(){
    const built=state.built;if(!built)return;
    const name=(prompt('Nhập tên trường cần bổ sung:')||'').trim();
    if(!name)return;
    if(!built.schools.includes(name))built.schools.push(name);
    if(!built.manual.addedSchools.includes(name))built.manual.addedSchools.push(name);
    saveManual(built);renderAll(built);
  }

  function resetManual(){
    const built=state.built;if(!built)return;
    if(!confirm('Xóa toàn bộ số điều chỉnh, trường bổ sung và thông tin phụ của tháng này?'))return;
    localStorage.removeItem(storageKey(built.year,built.month,built.teacherCode));
    built.manual=loadManual(built.year,built.month,built.teacherCode);
    built.schools=deriveSchoolOrder([],built.counts);
    renderAll(built);
    if(typeof toast==='function')toast('Đã xóa điều chỉnh bảng kê tháng.');
  }

  function styleCell(cell,opts={}){
    cell.font={name:'Times New Roman',size:opts.size||11,bold:!!opts.bold,italic:!!opts.italic,color:{argb:(opts.color||'FF000000').replace('#','').padStart(8,'F')}};
    cell.alignment={horizontal:opts.align||'center',vertical:'middle',wrapText:true};
    if(opts.fill)cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:opts.fill.replace('#','').padStart(8,'F')}};
    if(opts.border!==false)cell.border={top:{style:'thin'},left:{style:'thin'},bottom:{style:'thin'},right:{style:'thin'}};
  }

  async function exportMonthly(){
    const built=state.built;if(!built)return;
    if(typeof ExcelJS==='undefined'||typeof saveAs==='undefined'){alert('Thư viện xuất Excel chưa sẵn sàng.');return;}
    const button=q('monthExport');const old=button.textContent;button.disabled=true;button.textContent='Đang tạo Excel…';
    try{
      const book=new ExcelJS.Workbook();
      book.creator='Công cụ Lịch Báo giảng';book.created=new Date();
      const ws=book.addWorksheet('Tiết dạy',{views:[{showGridLines:false}]});
      const n=built.dates.length;
      const firstDateCol=3,lastDateCol=2+n,totalMainCol=3+n,totalAssistCol=4+n,spacerCol=5+n,sideA=6+n,sideB=7+n;
      ws.pageSetup={orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0,margins:{left:0.2,right:0.2,top:0.3,bottom:0.3,header:0.1,footer:0.1}};

      ws.mergeCells(1,1,2,lastDateCol);
      const title=ws.getCell(1,1);title.value=`BẢNG KÊ KHAI TIẾT DẠY THÁNG ${pad2(built.month)}\nNĂM HỌC ${yearStart()}-${yearStart()+1}`;styleCell(title,{size:18,bold:true,border:false});
      ws.getRow(1).height=34;ws.getRow(2).height=26;

      ws.mergeCells(3,1,5,1);ws.getCell(3,1).value='HỌ & TÊN\nGIÁO VIÊN';styleCell(ws.getCell(3,1),{bold:true,italic:true});
      ws.mergeCells(3,2,5,2);ws.getCell(3,2).value='GIẢNG DẠY\nTRƯỜNG';styleCell(ws.getCell(3,2),{bold:true,italic:true});

      let cursor=firstDateCol;
      for(const week of built.weeks){
        const startCol=cursor,endCol=cursor+week.dates.length-1;
        ws.mergeCells(3,startCol,3,endCol);
        const c=ws.getCell(3,startCol);c.value=week.label.replace(' (','\n(');styleCell(c,{bold:true,size:12,color:'FFFF0000'});
        week.dates.forEach((d,i)=>{
          const col=startCol+i;
          const dcell=ws.getCell(4,col);dcell.value=d.getDate();styleCell(dcell,{bold:true,fill:'FFF4B183'});
          const wcell=ws.getCell(5,col);wcell.value=viDay(d);styleCell(wcell,{size:8,border:false});
        });
        cursor=endCol+1;
      }

      ws.mergeCells(3,totalMainCol,14,totalAssistCol);
      const totalTitle=ws.getCell(3,totalMainCol);totalTitle.value=`Tổng Kết Tháng\n${pad2(built.month)}/${built.year}`;styleCell(totalTitle,{bold:true,italic:true,size:12,fill:'FFF4B183'});
      for(let r=3;r<=20;r++)for(let c=totalMainCol;c<=totalAssistCol;c++){ws.getCell(r,c).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF4B183'}};}
      ws.getCell(17,totalMainCol).value='Tiết\nChính';styleCell(ws.getCell(17,totalMainCol),{bold:true,italic:true,fill:'FFF4B183',border:false});
      ws.getCell(17,totalAssistCol).value='Trợ\nGiảng';styleCell(ws.getCell(17,totalAssistCol),{bold:true,italic:true,fill:'FFF4B183',border:false});

      ws.getColumn(spacerCol).width=3;
      ws.mergeCells(3,sideA,3,sideB);ws.getCell(3,sideA).value='PHẦN DÀNH RIÊNG CHO THCS';styleCell(ws.getCell(3,sideA),{bold:true,color:'FFFF0000',size:12,border:false});
      ws.mergeCells(4,sideA,4,sideB);ws.getCell(4,sideA).value='(chỉ cần kê Tổng chính và Tổng trợ)';styleCell(ws.getCell(4,sideA),{italic:true,border:false});
      ws.getCell(5,sideA).value='Tổng chính';styleCell(ws.getCell(5,sideA),{bold:true,border:false});
      ws.getCell(5,sideB).value='Tổng trợ';styleCell(ws.getCell(5,sideB),{bold:true,border:false});
      ws.getCell(6,sideA).value=built.manual.extras.thcsMain===''?'':safeNumber(built.manual.extras.thcsMain);styleCell(ws.getCell(6,sideA),{border:false});
      ws.getCell(6,sideB).value=built.manual.extras.thcsAssist===''?'':safeNumber(built.manual.extras.thcsAssist);styleCell(ws.getCell(6,sideB),{border:false});

      ws.mergeCells(8,sideA,8,sideB);ws.getCell(8,sideA).value='PHẦN DÀNH RIÊNG CHO CHUYÊN ĐỀ';styleCell(ws.getCell(8,sideA),{bold:true,color:'FFFF0000',size:12,border:false});
      ws.getCell(9,sideA).value='Tổng số chuyên đề\ncó tham gia';styleCell(ws.getCell(9,sideA),{bold:true,border:false});
      ws.getCell(9,sideB).value='Có làm nhóm trưởng\nbao nhiêu chuyên đề';styleCell(ws.getCell(9,sideB),{bold:true,border:false});
      ws.getCell(10,sideA).value=built.manual.extras.topicCount===''?'':safeNumber(built.manual.extras.topicCount);styleCell(ws.getCell(10,sideA),{border:false});
      ws.getCell(10,sideB).value=built.manual.extras.topicLead===''?'':safeNumber(built.manual.extras.topicLead);styleCell(ws.getCell(10,sideB),{border:false});

      ws.mergeCells(13,sideA,13,sideB);ws.getCell(13,sideA).value='PHẦN DÀNH RIÊNG CHO TNST';styleCell(ws.getCell(13,sideA),{bold:true,color:'FFFF0000',size:12,border:false});
      ws.getCell(14,sideA).value='Tổng số chuyến có tham gia';styleCell(ws.getCell(14,sideA),{bold:true,border:false});
      ws.getCell(14,sideB).value='Có làm trưởng đoàn\nbao nhiêu chuyến';styleCell(ws.getCell(14,sideB),{bold:true,border:false});
      ws.getCell(15,sideA).value=built.manual.extras.tripCount===''?'':safeNumber(built.manual.extras.tripCount);styleCell(ws.getCell(15,sideA),{border:false});
      ws.getCell(15,sideB).value=built.manual.extras.tripLead===''?'':safeNumber(built.manual.extras.tripLead);styleCell(ws.getCell(15,sideB),{border:false});

      ws.mergeCells(18,sideA,18,sideB);ws.getCell(18,sideA).value='PHẦN DÀNH RIÊNG CHO HĐNT';styleCell(ws.getCell(18,sideA),{bold:true,color:'FFFF0000',size:12,border:false});
      ws.mergeCells(19,sideA,20,sideB);ws.getCell(19,sideA).value=String(built.manual.extras.hdnt||'');styleCell(ws.getCell(19,sideA),{italic:true,border:false});

      const schoolStart=6;
      const schoolEnd=Math.max(17,schoolStart+built.schools.length-1);
      if(built.schools.length)ws.mergeCells(schoolStart,1,schoolStart+built.schools.length-1,1);
      ws.getCell(schoolStart,1).value=built.teacherName.toUpperCase();styleCell(ws.getCell(schoolStart,1),{bold:true,italic:true,border:false});

      built.schools.forEach((school,index)=>{
        const row=schoolStart+index;
        const sc=ws.getCell(row,2);sc.value=school;styleCell(sc,{italic:true,border:false});
        built.dates.forEach((date,i)=>{
          const c=ws.getCell(row,firstDateCol+i);const v=finalValue(built,school,date);c.value=v||'';styleCell(c,{border:false});
        });
      });

      const totalRow=Math.max(20,schoolStart+built.schools.length+2);
      ws.mergeCells(totalRow,1,totalRow,2);ws.getCell(totalRow,1).value='CỘNG TUẦN';styleCell(ws.getCell(totalRow,1),{bold:true,border:false});
      cursor=firstDateCol;
      for(const week of built.weeks){
        const startCol=cursor,endCol=cursor+week.dates.length-1;
        ws.mergeCells(totalRow,startCol,totalRow,endCol);
        const assist=safeNumber(built.manual.weeklyAssist[week.key]||0);
        ws.getCell(totalRow,startCol).value=`${weekMainTotal(built,week)} Chính (T)\n${assist?assist:'..........'} Trợ (P)`;
        styleCell(ws.getCell(totalRow,startCol),{bold:true,size:10,border:false});
        cursor=endCol+1;
      }
      ws.getCell(totalRow,totalMainCol).value=monthMainTotal(built);styleCell(ws.getCell(totalRow,totalMainCol),{fill:'FF203315'});
      ws.getCell(totalRow,totalAssistCol).value=monthAssistTotal(built);styleCell(ws.getCell(totalRow,totalAssistCol),{fill:'FF203315'});

      const grandStart=totalRow+1,grandEnd=totalRow+3;
      ws.mergeCells(grandStart,1,grandEnd,totalAssistCol);
      const grand=ws.getCell(grandStart,1);grand.value=`TỔNG CỘNG SỐ TIẾT THÁNG ${pad2(built.month)}/${built.year}: ${monthMainTotal(built)}`;styleCell(grand,{bold:true,italic:true,size:16,fill:'FF20BCE5',border:false});
      const noteRow=grandEnd+1;
      ws.mergeCells(noteRow,1,noteRow,11);ws.getCell(noteRow,1).value='Trong đó :  ( T : Tiết chính , P : Trợ giảng )';styleCell(ws.getCell(noteRow,1),{bold:true,align:'left',border:false});
      if(totalAssistCol>=12){ws.mergeCells(noteRow,12,noteRow,totalAssistCol);ws.getCell(noteRow,12).value='Lưu ý: các CLB STEAM GV tự tính là 3 tiết cho thời lượng 1h30 phút dạy';styleCell(ws.getCell(noteRow,12),{bold:true,color:'FFFF0000',border:false});}

      ws.getColumn(1).width=22;ws.getColumn(2).width=24;
      for(let c=firstDateCol;c<=lastDateCol;c++)ws.getColumn(c).width=4.4;
      ws.getColumn(totalMainCol).width=9;ws.getColumn(totalAssistCol).width=9;ws.getColumn(sideA).width=24;ws.getColumn(sideB).width=26;
      for(let r=3;r<=5;r++)ws.getRow(r).height=r===3?45:24;
      for(let r=schoolStart;r<=schoolEnd;r++)ws.getRow(r).height=23;
      ws.getRow(totalRow).height=38;ws.getRow(grandStart).height=26;

      const buffer=await book.xlsx.writeBuffer();
      const filename=`${built.teacherName} - Bảng kê tiết dạy tháng ${pad2(built.month)} năm ${built.year}.xlsx`;
      saveAs(new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),filename);
      if(typeof toast==='function')toast('Đã xuất bảng kê tiết dạy tháng.');
    }catch(error){console.error(error);alert('Không xuất được bảng kê: '+(error.message||String(error)));}
    finally{button.disabled=false;button.textContent=old;}
  }

  function buildAndRender(){
    try{
      const built=buildMonthData();renderAll(built);
      if(typeof toast==='function')toast(`Đã tổng hợp tháng ${pad2(built.month)}: ${monthMainTotal(built)} tiết chính.`);
      setTimeout(()=>q('monthCard')?.scrollIntoView({behavior:'smooth',block:'start'}),50);
    }catch(error){alert(error.message||String(error));}
  }

  function syncFromMainTeacher(){
    const main=q('teacher'),select=q('monthTeacher');if(!main||!select||!main.value)return;
    if([...select.options].some(o=>o.value===main.value))select.value=main.value;
  }

  function injectStyle(){
    if(q('monthlyTallyStyle'))return;
    const style=document.createElement('style');style.id='monthlyTallyStyle';
    style.textContent=`
      .month-controls{display:grid;grid-template-columns:minmax(120px,.5fr) minmax(230px,1.2fr) auto auto auto;gap:9px;align-items:end}
      .month-controls label,.mt-extra-box label{display:grid;gap:5px;font-size:12px;font-weight:750}
      .month-controls select,.mt-extra-box input,.mt-extra-box textarea{width:100%;padding:10px 11px;border:1px solid var(--l);border-radius:11px;background:#fff;font:inherit}
      .mt-sheet{margin-top:15px;border:1px solid #1f2937;background:#fff;font-family:"Times New Roman",serif}.mt-title{text-align:center;padding:12px}.mt-title h2{margin:0;font-size:22px}.mt-title h3{margin:2px 0 0;font-size:16px}.mt-scroll{overflow:auto;max-width:100%}
      .mt-table{border-collapse:collapse;width:max-content;min-width:100%}.mt-table th,.mt-table td{border:1px solid #1f2937;padding:4px;text-align:center;height:34px}.mt-table th{background:#fff;color:#111827;font-size:11px}.mt-week{font-size:13px!important;color:#dc2626!important;min-width:70px}.mt-week small{display:block;color:#64748b;font-size:9px;font-weight:500}.mt-date{min-width:46px}.mt-date b,.mt-date small{display:block}.mt-date b{background:#f6c9ae;margin:-4px -4px 2px;padding:3px}.mt-date small{font-size:9px;font-weight:500}.mt-fixed-a{min-width:150px;position:sticky;left:0;z-index:3;background:#fff!important}.mt-fixed-b{min-width:160px;position:sticky;left:150px;z-index:3;background:#fff!important}.mt-teacher{position:sticky;left:0;z-index:2;background:#fff;min-width:150px;font-weight:800;font-style:italic}.mt-school{position:sticky;left:150px;z-index:2;background:#fff;min-width:160px;font-style:italic}.mt-cell{padding:2px!important}.mt-count{width:42px;border:0;background:transparent;text-align:center;font:700 13px "Times New Roman",serif;padding:4px}.mt-count:focus{outline:2px solid #0f766e;border-radius:4px}.mt-count.changed{background:#fff7ed;color:#c2410c}.mt-total-row td{background:#f8fafc}.mt-week-total{min-width:90px}.mt-week-total label{display:block;font-size:10px;margin-top:3px}.mt-assist{width:48px;border:1px solid #cbd5e1;border-radius:5px;text-align:center}.mt-extra-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:15px}.mt-extra-box{border:1px solid var(--l);border-radius:14px;padding:13px;background:#fff}.mt-extra-box h4{margin:0 0 10px;color:#dc2626;text-align:center;font-family:"Times New Roman",serif}.mt-extra-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px}.monthly-note{margin-top:12px}.monthly-sums{margin-top:14px}
      @media(max-width:950px){.month-controls{grid-template-columns:1fr 1fr}.mt-extra-grid{grid-template-columns:1fr}}@media(max-width:620px){.month-controls,.mt-extra-fields{grid-template-columns:1fr}.mt-fixed-a,.mt-teacher{min-width:120px}.mt-fixed-b,.mt-school{left:120px;min-width:130px}}
    `;document.head.appendChild(style);
  }

  function injectUI(){
    if(q('monthCard'))return;
    injectStyle();
    const main=document.querySelector('main.shell');if(!main)return;
    const section=document.createElement('section');section.className='card';section.id='monthCard';
    section.innerHTML=`
      <div class="head"><div><h3>4. Bảng kê tiết dạy tháng</h3><p>Tự tổng hợp trực tiếp từ các tab tuần của TKB đang áp dụng; có thể chỉnh số trước khi xuất Excel.</p></div><span class="badge" id="monthStatus">Chưa tổng hợp</span></div>
      <div class="month-controls">
        <label>Tháng<select id="monthSelect">${Array.from({length:12},(_,i)=>`<option value="${i+1}">Tháng ${pad2(i+1)}</option>`).join('')}</select></label>
        <label>Giáo viên<select id="monthTeacher" disabled><option value="">Chọn file TKB trước…</option></select></label>
        <button class="btn primary" id="monthBuild">∑ Tổng hợp tháng</button>
        <button class="btn success" id="monthExport" disabled>⇩ Xuất bảng kê Excel</button>
        <button class="btn outline" id="monthAddSchool" disabled>+ Thêm trường</button>
      </div>
      <div class="notice monthly-note">Quy tắc giống mẫu bảng kê: lấy các <b>tuần có Thứ Hai bắt đầu trong tháng</b>; tuần cuối chỉ tính các ngày còn nằm trong tháng. Mỗi ô mã giáo viên trong TKB = 1 tiết chính. Các trường hợp đặc biệt như <b>CLB STEAM 1h30 = 3 tiết</b> có thể sửa trực tiếp trong ô trước khi xuất.</div>
      <div id="monthSummary"><div class="empty">Chọn tháng và giáo viên rồi nhấn <b>Tổng hợp tháng</b>.</div></div>
      <div id="monthPreview"></div>
      <div id="monthExtras"></div>
      <div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn outline danger" id="monthReset" disabled>Xóa điều chỉnh tháng này</button></div>`;
    main.appendChild(section);
    q('monthSelect').value=String(defaultMonth());
    q('monthBuild').addEventListener('click',buildAndRender);
    q('monthExport').addEventListener('click',exportMonthly);
    q('monthAddSchool').addEventListener('click',addSchool);
    q('monthReset').addEventListener('click',resetManual);
    q('teacher')?.addEventListener('change',syncFromMainTeacher);
    q('week')?.addEventListener('change',()=>setTimeout(()=>{populateMonthTeachers();syncFromMainTeacher();},50));
    q('year')?.addEventListener('change',()=>{state.built=null;q('monthStatus').textContent='Chưa tổng hợp';});
    setInterval(()=>{
      const hasBook=typeof wb!=='undefined'&&wb;
      if(hasBook&&q('monthTeacher')?.disabled){populateMonthTeachers();syncFromMainTeacher();}
      if(hasBook&&state.teacherCacheKey&&!state.teacherCacheKey.startsWith((typeof activeId!=='undefined'?activeId:'')+'|')){state.teacherCacheKey='';populateMonthTeachers();}
    },1200);
    if(typeof wb!=='undefined'&&wb){populateMonthTeachers();syncFromMainTeacher();}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',injectUI);else injectUI();
})();
