'use strict';
(function(){
  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').trim();
  const escHtml=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ROLE_LABEL={KNS:'GV KNS',STEM:'GV STEM',CTV:'CTV',UNKNOWN:'Chưa xác định'};
  let current=null,lastKey='';

  function roleLabel(role){return ROLE_LABEL[role]||ROLE_LABEL.UNKNOWN}
  function safeFile(v){return txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').replace(/[^A-Za-z0-9._-]+/g,'_').replace(/^_+|_+$/g,'')||'TKB'}
  function formatDate(d){return d instanceof Date&&!Number.isNaN(d.getTime())?d.toLocaleDateString('vi-VN'):'Chưa xác định ngày'}
  function dayLabel(day){return Number(day)===8?'Chủ nhật':`Thứ ${day}`}
  function schoolList(values){return [...values].filter(Boolean).join(' / ')||'Chưa xác định'}
  function classList(values){return [...values].filter(Boolean).join(', ')||'Chưa xác định'}
  function detailsOf(entries){
    return entries.map(e=>`${formatDate(e.date)} • ${e.session} • Tiết ${e.period} • ${e.school||'Chưa xác định trường'} • ${e.className||'Chưa xác định lớp'}${e.makeUp?' • Dạy bù':''}`).join('\n');
  }

  function getSheet(){
    if(typeof wb==='undefined'||!wb)throw new Error('Hãy tải và chọn một file TKB trước.');
    const name=q('weeklyStatsWeek')?.value||q('week')?.value;
    const ws=wb.getWorksheet(name);
    if(!ws)throw new Error('Không tìm thấy tuần đang chọn.');
    return ws;
  }

  function buildData(){
    const api=window.LBGTeacherIntelligenceV6;
    if(!api?.scanSheet||!api?.summaryRoles)throw new Error('Mô-đun thống kê chưa sẵn sàng. Hãy tải lại trang.');
    const ws=getSheet(),scan=api.scanSheet(ws),roles=api.summaryRoles(ws),teachers=new Map();
    for(const e of scan.source){
      if(!teachers.has(e.code))teachers.set(e.code,{code:e.code,name:e.teacherName,role:e.role||'UNKNOWN',periods:0,makeUp:0,schools:new Set(),classes:new Set(),entries:[]});
      const t=teachers.get(e.code);t.periods++;if(e.makeUp)t.makeUp++;if(e.school)t.schools.add(e.school);if(e.className)t.classes.add(e.className);t.entries.push(e);
    }
    const list=[...teachers.values()].sort((a,b)=>a.name.localeCompare(b.name,'vi'));
    const roster=[...roles.values()].filter(x=>x.code&&x.code!=='OFF').sort((a,b)=>a.name.localeCompare(b.name,'vi'));
    const byRole=role=>list.filter(x=>x.role===role);
    const countPeriods=role=>scan.source.filter(x=>x.role===role).length;
    return{
      ws,scan,roles,roster,list,
      sheet:ws.name,
      file:txt(q('active')?.textContent||'TKB'),
      totalTeachers:list.length,
      totalPeriods:scan.source.length,
      byRole:{KNS:byRole('KNS'),STEM:byRole('STEM'),CTV:byRole('CTV'),UNKNOWN:byRole('UNKNOWN')},
      periodByRole:{KNS:countPeriods('KNS'),STEM:countPeriods('STEM'),CTV:countPeriods('CTV'),UNKNOWN:countPeriods('UNKNOWN')}
    };
  }

  function style(){
    if(q('weeklyStatsV7Css'))return;
    const s=document.createElement('style');s.id='weeklyStatsV7Css';s.textContent=`
      .lbg-off-panel{margin-top:14px;border:1px solid #dbe6eb;border-radius:15px;overflow:hidden;background:#fff}.lbg-off-head{padding:12px 14px;background:#f8fafc;border-bottom:1px solid #dbe6eb;display:flex;justify-content:space-between;gap:10px;align-items:center}.lbg-off-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px}.lbg-off-session{border:1px solid #dbe6eb;border-radius:13px;overflow:hidden}.lbg-off-session h4{margin:0;padding:10px 12px;background:#eff6ff;color:#1e3a8a}.lbg-off-role{padding:10px 12px;border-top:1px solid #eef2f7}.lbg-off-role:first-of-type{border-top:0}.lbg-off-role b{display:block;margin-bottom:4px}.lbg-off-empty{color:#64748b;font-size:12px}.lbg-stats-v7-controls{display:flex;gap:8px;flex-wrap:wrap;align-items:end}.lbg-stats-v7-controls label{display:grid;gap:5px;font-size:12px;font-weight:750;min-width:180px}.lbg-stats-v7-controls select{width:100%;padding:10px 11px;border:1px solid #dbe6eb;border-radius:11px;background:#fff}@media(max-width:760px){.lbg-off-grid{grid-template-columns:1fr}.lbg-stats-v7-controls{display:grid;grid-template-columns:1fr}.lbg-stats-v7-controls label{min-width:0}}
    `;document.head.appendChild(s);
  }

  function populateDays(){
    const select=q('weeklyOffDay');if(!select)return;
    let ws=null;try{ws=getSheet()}catch{}
    if(!ws){select.innerHTML='<option>Chọn tuần trước</option>';select.disabled=true;return}
    const start=typeof startDate==='function'?startDate(ws.name):null;
    select.innerHTML=[2,3,4,5,6,7].map(day=>{
      let label=dayLabel(day);
      if(start instanceof Date&&!Number.isNaN(start.getTime())){const d=new Date(start.getFullYear(),start.getMonth(),start.getDate(),12);d.setDate(d.getDate()+day-2);label+=` – ${d.toLocaleDateString('vi-VN')}`}
      return`<option value="${day}">${escHtml(label)}</option>`;
    }).join('');
    select.disabled=false;
  }

  function enhanceUi(){
    const card=q('weeklyStatsV6');if(!card)return false;
    style();
    const controls=card.querySelector('.controls');
    if(controls&&!q('weeklyOffDay')){
      const wrap=document.createElement('div');wrap.className='lbg-stats-v7-controls';wrap.style.gridColumn='1 / -1';
      wrap.innerHTML='<label>Ngày cần xem<select id="weeklyOffDay" disabled><option>Chọn tuần trước</option></select></label><button class="btn outline" id="weeklyOffView" disabled>👥 Xem GV không có tiết sáng/chiều</button>';
      controls.appendChild(wrap);
      q('weeklyOffView').onclick=renderAbsence;
      q('weeklyOffDay').onchange=()=>{const p=q('weeklyOffPanel');if(p)p.hidden=true};
    }
    if(!q('weeklyOffPanel')){
      const p=document.createElement('div');p.id='weeklyOffPanel';p.className='lbg-off-panel';p.hidden=true;card.appendChild(p);
    }
    const week=q('weeklyStatsWeek');
    if(week&&!week.dataset.v7Bound){week.dataset.v7Bound='1';week.addEventListener('change',()=>{current=null;populateDays();q('weeklyOffView').disabled=!week.value;const p=q('weeklyOffPanel');if(p)p.hidden=true})}
    populateDays();
    if(q('weeklyOffView'))q('weeklyOffView').disabled=!q('weeklyStatsWeek')?.value;

    const run=q('weeklyStatsRun');
    if(run&&!run.dataset.v7Bound){run.dataset.v7Bound='1';run.addEventListener('click',()=>setTimeout(()=>{try{current=buildData()}catch{}},120))}
    const exp=q('weeklyStatsExport');
    if(exp&&!exp.dataset.v7Export){exp.dataset.v7Export='1';exp.onclick=exportGroupedExcel}
    return true;
  }

  function absentByRole(data,day,session){
    const taught=new Set(data.scan.source.filter(e=>Number(e.day)===Number(day)&&e.session===session).map(e=>e.code));
    const out={KNS:[],STEM:[],CTV:[],UNKNOWN:[]};
    for(const teacher of data.roster){if(!taught.has(teacher.code))(out[teacher.role]||out.UNKNOWN).push(teacher)}
    return{taught,total:data.roster.length,out};
  }

  function roleBlock(title,list){
    return`<div class="lbg-off-role"><b>${escHtml(title)}: ${list.length}</b>${list.length?`<div>${list.map(x=>`${escHtml(x.name)} <small>(${escHtml(x.code)})</small>`).join(', ')}</div>`:'<div class="lbg-off-empty">Không có giáo viên nào.</div>'}</div>`;
  }

  function sessionBlock(label,result){
    const active=result.total-[...result.out.KNS,...result.out.STEM,...result.out.CTV,...result.out.UNKNOWN].length;
    return`<div class="lbg-off-session"><h4>${escHtml(label)} • Có tiết: ${active} • Không có tiết: ${result.total-active}</h4>${roleBlock('GV KNS không có tiết',result.out.KNS)}${roleBlock('GV STEM không có tiết',result.out.STEM)}${roleBlock('CTV không có tiết',result.out.CTV)}${result.out.UNKNOWN.length?roleBlock('Chưa xác định nhóm',result.out.UNKNOWN):''}</div>`;
  }

  function renderAbsence(){
    const panel=q('weeklyOffPanel'),button=q('weeklyOffView');if(!panel||!button)return;
    const old=button.textContent;button.disabled=true;button.textContent='Đang kiểm tra…';
    setTimeout(()=>{
      try{
        const data=buildData(),day=Number(q('weeklyOffDay').value),morning=absentByRole(data,day,'Sáng'),afternoon=absentByRole(data,day,'Chiều');current=data;
        let date='';const start=typeof startDate==='function'?startDate(data.sheet):null;if(start instanceof Date&&!Number.isNaN(start.getTime())){const d=new Date(start.getFullYear(),start.getMonth(),start.getDate(),12);d.setDate(d.getDate()+day-2);date=d.toLocaleDateString('vi-VN')}
        panel.hidden=false;panel.innerHTML=`<div class="lbg-off-head"><div><b>${escHtml(dayLabel(day))}${date?' – '+escHtml(date):''}</b><div class="meta">Danh sách lấy từ bảng tổng giáo viên bên phải Excel. “Không có tiết” nghĩa là giáo viên không xuất hiện trong bất kỳ ô dạy nào của buổi đó; chữ OFF vẫn là lớp nghỉ.</div></div></div><div class="lbg-off-grid">${sessionBlock('Buổi sáng',morning)}${sessionBlock('Buổi chiều',afternoon)}</div>`;
        panel.scrollIntoView({behavior:'smooth',block:'start'});toast('Đã xác định giáo viên không có tiết theo buổi.');
      }catch(error){console.error(error);panel.hidden=false;panel.innerHTML=`<div class="alert warn"><b>Không kiểm tra được giáo viên nghỉ:</b> ${escHtml(error?.message||String(error))}</div>`;toast('Kiểm tra giáo viên nghỉ bị lỗi.');}
      finally{button.textContent=old;button.disabled=false}
    },30);
  }

  function border(){return{top:{style:'thin',color:{argb:'FFD1D5DB'}},left:{style:'thin',color:{argb:'FFD1D5DB'}},bottom:{style:'thin',color:{argb:'FFD1D5DB'}},right:{style:'thin',color:{argb:'FFD1D5DB'}}}}
  function styleSheet(ws,header=1){ws.eachRow((row,n)=>row.eachCell(cell=>{cell.font={name:'Arial',size:10,bold:n===header,color:n===header?{argb:'FFFFFFFF'}:undefined};cell.alignment={vertical:'middle',wrapText:true};cell.border=border();if(n===header)cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF0F766E'}}}));ws.views=[{state:'frozen',ySplit:header}]}
  function addTeacherSheet(book,name,list){
    const ws=book.addWorksheet(name);ws.columns=[{header:'STT',key:'i',width:7},{header:'GIÁO VIÊN',key:'name',width:30},{header:'MÃ',key:'code',width:16},{header:'NHÓM',key:'role',width:18},{header:'TỔNG TIẾT',key:'periods',width:12},{header:'TIẾT BÙ',key:'makeUp',width:11},{header:'TRƯỜNG',key:'schools',width:34},{header:'LỚP ĐÃ DẠY',key:'classes',width:38},{header:'CHI TIẾT NGÀY – BUỔI – TIẾT',key:'details',width:58}];
    list.forEach((x,i)=>ws.addRow({i:i+1,name:x.name,code:x.code,role:roleLabel(x.role),periods:x.periods,makeUp:x.makeUp,schools:schoolList(x.schools),classes:classList(x.classes),details:detailsOf(x.entries)}));
    styleSheet(ws);return ws;
  }

  async function exportGroupedExcel(){
    const button=q('weeklyStatsExport');if(!button)return;
    const old=button.textContent;button.disabled=true;button.textContent='Đang xuất…';
    try{
      const data=buildData();current=data;const book=new ExcelJS.Workbook(),sum=book.addWorksheet('TỔNG QUAN');
      sum.columns=[{width:31},{width:18},{width:31},{width:18}];sum.mergeCells('A1:D1');sum.getCell('A1').value='THỐNG KÊ GIÁO VIÊN VÀ TIẾT DẠY TRONG TUẦN';sum.getCell('A1').font={bold:true,size:16,color:{argb:'FFFFFFFF'}};sum.getCell('A1').fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF0F766E'}};sum.getCell('A1').alignment={horizontal:'center',vertical:'middle'};
      sum.addRows([['File TKB',data.file,'Tuần',data.sheet],['Tổng mã GV có phát sinh tiết',data.totalTeachers,'Tổng tiết tính lương',data.totalPeriods],['GV KNS',data.byRole.KNS.length,'Tiết KNS',data.periodByRole.KNS],['GV STEM',data.byRole.STEM.length,'Tiết STEM',data.periodByRole.STEM],['CTV',data.byRole.CTV.length,'Tiết CTV',data.periodByRole.CTV],['Chưa xác định nhóm',data.byRole.UNKNOWN.length,'Tiết chưa xác định',data.periodByRole.UNKNOWN],[],['Ghi chú','Mỗi mã giáo viên không trùng tính một người; mỗi ô mã giáo viên thực dạy tính một tiết. OFF không tính.','','']]);
      sum.eachRow((row,n)=>row.eachCell(cell=>{cell.alignment={vertical:'middle',wrapText:true};cell.border=border();if(n===1)cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF0F766E'}}}));
      addTeacherSheet(book,'GV KNS',data.byRole.KNS);addTeacherSheet(book,'GV STEM',data.byRole.STEM);addTeacherSheet(book,'CTV',data.byRole.CTV);addTeacherSheet(book,'CHƯA XÁC ĐỊNH',data.byRole.UNKNOWN);
      const detail=book.addWorksheet('CHI TIẾT TIẾT DẠY');detail.columns=[{header:'STT',key:'i',width:7},{header:'NGÀY',key:'date',width:14},{header:'THỨ',key:'day',width:10},{header:'BUỔI',key:'session',width:11},{header:'TIẾT',key:'period',width:9},{header:'GIÁO VIÊN',key:'name',width:28},{header:'MÃ',key:'code',width:15},{header:'NHÓM',key:'role',width:18},{header:'TRẠNG THÁI',key:'status',width:14},{header:'TRƯỜNG',key:'school',width:30},{header:'LỚP',key:'className',width:24},{header:'Ô NGUỒN',key:'address',width:14}];
      data.scan.source.forEach((e,i)=>detail.addRow({i:i+1,date:formatDate(e.date),day:dayLabel(e.day),session:e.session,period:e.period,name:e.teacherName,code:e.code,role:roleLabel(e.role),status:e.makeUp?'Dạy bù':'Bình thường',school:e.school||'Chưa xác định',className:e.className||'Chưa xác định',address:e.address}));styleSheet(detail);
      const buffer=await book.xlsx.writeBuffer();saveAs(new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`THONG_KE_TACH_NHOM_${safeFile(data.sheet)}.xlsx`);toast('Đã xuất Excel tách riêng KNS, STEM, CTV.');
    }catch(error){console.error(error);toast('Xuất thống kê Excel bị lỗi.');alert('Không xuất được Excel: '+(error?.message||String(error)))}finally{button.textContent=old;button.disabled=false}
  }

  function tick(){
    if(!enhanceUi())return;
    const key=`${typeof activeId==='undefined'?'':activeId}|${q('weeklyStatsWeek')?.value||''}`;
    if(key!==lastKey){lastKey=key;current=null;populateDays();const panel=q('weeklyOffPanel');if(panel)panel.hidden=true}
    const exp=q('weeklyStatsExport');if(exp&&exp.onclick!==exportGroupedExcel)exp.onclick=exportGroupedExcel;
  }
  setInterval(tick,700);tick();
})();
