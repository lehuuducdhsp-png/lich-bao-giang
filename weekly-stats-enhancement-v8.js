'use strict';
(function(root,factory){
  const api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.LBGWeeklyStatsEnhancementV8=api;
  if(root&&root.document)api.install();
})(typeof window!=='undefined'?window:globalThis,function(root){
  const VERSION='20261005.1';
  const ROLE_LABEL={KNS:'GV KNS',STEM:'GV STEM',CTV:'CTV',UNKNOWN:'Chưa xác định'};
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const upper=v=>txt(v).toUpperCase();
  const q=id=>root.document?.getElementById?.(id)||null;
  let current=null,lastKey='';

  function roleLabel(role){return ROLE_LABEL[role]||ROLE_LABEL.UNKNOWN}
  function safeFile(v){return txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').replace(/[^A-Za-z0-9._-]+/g,'_').replace(/^_+|_+$/g,'')||'TKB'}
  function formatDate(d){return d instanceof Date&&!Number.isNaN(d.getTime())?d.toLocaleDateString('vi-VN'):'Chưa xác định ngày'}
  function dayLabel(day){return Number(day)===8?'Chủ nhật':`Thứ ${day}`}
  function schoolList(values){return[...(values||[])].filter(Boolean).join(' / ')||'Chưa xác định'}
  function classList(values){return[...(values||[])].filter(Boolean).join(', ')||'Chưa xác định'}
  function cellText(cell){
    try{
      const v=cell?.value;
      if(v===null||v===undefined)return'';
      if(typeof v==='string'||typeof v==='number'||typeof v==='boolean')return String(v);
      if(Array.isArray(v?.richText))return v.richText.map(x=>x?.text??'').join('');
      if(v?.result!==null&&v?.result!==undefined){
        const r=v.result;if(Array.isArray(r?.richText))return r.richText.map(x=>x?.text??'').join('');
        return typeof r==='object'?'':String(r);
      }
      if(typeof v?.text==='string')return v.text;
      return'';
    }catch{return''}
  }
  function detailsOf(entries){
    return(entries||[]).map(e=>`${formatDate(e.date)} • ${e.session} • Tiết ${e.period} • ${e.school||'Chưa xác định trường'} • ${e.className||'Chưa xác định lớp'}${e.makeUp?' • Dạy bù':''}`).join('\n');
  }
  function exactCode(value){return upper(value).replace(/\s+/g,' ')}
  function codeLike(value){
    const code=exactCode(value);
    if(!code||code==='OFF'||code.length>24||/^\d+$/.test(code)||/^\d+\s*\/\s*\d+$/.test(code))return false;
    return /^[A-ZÀ-ỸĐ0-9.]+$/.test(code)||(/^[A-ZÀ-ỸĐ0-9. ]+$/.test(code)&&/(^| )CTV($| )/.test(code));
  }
  function splitTokens(value){
    return txt(value).split(/\s*(?:\+|&)\s*/).map(exactCode).filter(Boolean);
  }
  function roleBuckets(list){
    const out={KNS:[],STEM:[],CTV:[],UNKNOWN:[]};
    for(const item of list||[])(out[item?.role]||out.UNKNOWN).push(item);
    return out;
  }
  function getSheet(){
    if(typeof wb==='undefined'||!wb)throw new Error('Hãy tải và chọn một file TKB trước.');
    const name=q('weeklyStatsWeek')?.value||q('week')?.value,ws=wb.getWorksheet(name);
    if(!ws)throw new Error('Không tìm thấy tuần đang chọn.');
    return ws;
  }
  function timetableInfo(ws,col){
    try{
      const parser=root.LBGTkbParserV2,info=parser?.colInfoFor?.(ws,col);
      if(info)return info;
    }catch{}
    try{return typeof colInfo==='function'?colInfo(col):null}catch{return null}
  }
  function timetableColumns(ws){
    try{
      const cols=root.LBGTkbParserV2?.timetableColumns?.(ws);
      if(Array.isArray(cols)&&cols.length)return cols;
    }catch{}
    const out=[];for(let c=4;c<=73;c++){if(timetableInfo(ws,c))out.push(c)}return out;
  }

  function rawCodeAudit(ws,roles){
    const known=new Set([...(roles?.keys?.()||[])].map(exactCode)),cols=timetableColumns(ws),rawRows=[],allTokens=new Set();
    ws.eachRow({includeEmpty:false},row=>{
      for(const col of cols){
        const info=timetableInfo(ws,col);if(!info)continue;
        const raw=txt(cellText(row.getCell(col)));if(!raw)continue;
        for(const token of splitTokens(raw))if(codeLike(token)){allTokens.add(token);rawRows.push({token,row:row.number,col,address:row.getCell(col).address,day:Number(info.day),session:txt(info.session),period:Number(info.period)})}
      }
    });
    const unknown=[],seen=new Set();
    for(const item of rawRows){
      if(known.has(item.token))continue;
      const base=item.token.endsWith('P')?item.token.slice(0,-1):'';
      if(base&&(known.has(base)||allTokens.has(base)))continue; // P là hàng phối hợp/trợ của đúng mã gốc, không tính GV chính.
      const key=`${item.token}|${item.address}`;if(seen.has(key))continue;seen.add(key);unknown.push(item);
    }
    return{known,rawRows,unknown};
  }

  function buildData(){
    const api=root.LBGTeacherIntelligenceV6;
    if(!api?.scanSheet||!api?.summaryRoles)throw new Error('Mô-đun thống kê chưa sẵn sàng. Hãy tải lại trang.');
    const ws=getSheet(),scan=api.scanSheet(ws),roles=api.summaryRoles(ws),teachers=new Map();
    for(const e of scan.source||[]){
      if(!teachers.has(e.code))teachers.set(e.code,{code:e.code,name:e.teacherName,role:e.role||'UNKNOWN',periods:0,makeUp:0,schools:new Set(),classes:new Set(),entries:[]});
      const t=teachers.get(e.code);t.periods++;if(e.makeUp)t.makeUp++;if(e.school)t.schools.add(e.school);if(e.className)t.classes.add(e.className);t.entries.push(e);
    }
    const list=[...teachers.values()].sort((a,b)=>a.name.localeCompare(b.name,'vi'));
    const roster=[...roles.values()].filter(x=>x.code&&x.code!=='OFF').sort((a,b)=>a.name.localeCompare(b.name,'vi'));
    const byRole=role=>list.filter(x=>x.role===role),rosterByRole=role=>roster.filter(x=>x.role===role),countPeriods=role=>(scan.source||[]).filter(x=>x.role===role).length;
    const audit=rawCodeAudit(ws,roles);
    return{
      ws,scan,roles,roster,list,audit,sheet:ws.name,file:txt(q('active')?.textContent||'TKB'),
      totalRoster:roster.length,totalTeachers:list.length,totalPeriods:(scan.source||[]).length,
      byRole:{KNS:byRole('KNS'),STEM:byRole('STEM'),CTV:byRole('CTV'),UNKNOWN:byRole('UNKNOWN')},
      rosterByRole:{KNS:rosterByRole('KNS'),STEM:rosterByRole('STEM'),CTV:rosterByRole('CTV'),UNKNOWN:rosterByRole('UNKNOWN')},
      periodByRole:{KNS:countPeriods('KNS'),STEM:countPeriods('STEM'),CTV:countPeriods('CTV'),UNKNOWN:countPeriods('UNKNOWN')}
    };
  }

  function sessionData(data,day,session){
    const entries=(data.scan.source||[]).filter(e=>Number(e.day)===Number(day)&&txt(e.session)===txt(session));
    const activeCodes=new Set(entries.map(e=>exactCode(e.code))),active=[];
    for(const teacher of data.roster)if(activeCodes.has(exactCode(teacher.code))){
      const own=entries.filter(e=>exactCode(e.code)===exactCode(teacher.code));
      active.push({...teacher,entries:own,periods:own.length});
    }
    const absent=data.roster.filter(t=>!activeCodes.has(exactCode(t.code)));
    const unknown=data.audit.unknown.filter(x=>Number(x.day)===Number(day)&&txt(x.session)===txt(session));
    return{day,session,entries,active,absent,activeByRole:roleBuckets(active),absentByRole:roleBuckets(absent),unknown,total:data.roster.length};
  }
  function entryShort(e){return`Tiết ${e.period} • ${e.school||'Chưa rõ trường'} • ${e.className||'Chưa rõ lớp'}`}
  function personList(list,{active=false}={}){
    if(!list?.length)return'<div class="lbg-v8-empty">Không có.</div>';
    return`<div class="lbg-v8-people">${list.map(x=>{
      const details=active?(x.entries||[]).map(entryShort).join(' | '):'';
      return`<div class="lbg-v8-person"><span><b>${esc(x.name)}</b> <small>(${esc(x.code)})</small></span>${details?`<em>${esc(details)}</em>`:''}</div>`;
    }).join('')}</div>`;
  }
  function roleSection(title,list,active=false){
    return`<details class="lbg-v8-role" ${list?.length&&active?'open':''}><summary><span>${esc(title)}</span><b>${list?.length||0}</b></summary>${personList(list,{active})}</details>`;
  }
  function unknownBlock(list){
    if(!list?.length)return'';
    return`<div class="lbg-v8-unknown"><b>⚠ Mã trong TKB chưa có trong bảng tổng: ${list.length}</b><div>${list.map(x=>`<span><strong>${esc(x.token)}</strong> • Tiết ${x.period} • ô ${esc(x.address)}</span>`).join('')}</div><small>Không tự đổi dấu hay gộp tên. Ví dụ HẠ và HÀ luôn được xem là hai mã khác nhau.</small></div>`;
  }
  function sessionBlock(label,result){
    const absent=result.absent.length;
    return`<section class="lbg-v8-session">
      <div class="lbg-v8-session-head"><div><h4>${esc(label)}</h4><small>${result.entries.length} ô dạy đã nhận diện</small></div><div class="lbg-v8-counters"><span class="on"><b>${result.active.length}</b> Có tiết</span><span class="off"><b>${absent}</b> Không có tiết</span></div></div>
      <div class="lbg-v8-two">
        <div><h5>Đang có tiết</h5>${roleSection('GV KNS có tiết',result.activeByRole.KNS,true)}${roleSection('GV STEM có tiết',result.activeByRole.STEM,true)}${roleSection('CTV có tiết',result.activeByRole.CTV,true)}${result.activeByRole.UNKNOWN.length?roleSection('Chưa xác định nhóm',result.activeByRole.UNKNOWN,true):''}</div>
        <div><h5>Không có tiết</h5>${roleSection('GV KNS không có tiết',result.absentByRole.KNS)}${roleSection('GV STEM không có tiết',result.absentByRole.STEM)}${roleSection('CTV không có tiết',result.absentByRole.CTV)}${result.absentByRole.UNKNOWN.length?roleSection('Chưa xác định nhóm',result.absentByRole.UNKNOWN):''}</div>
      </div>
      ${unknownBlock(result.unknown)}
    </section>`;
  }
  function summaryCards(data){
    const unknown=data.audit.unknown.length;
    return`<div class="lbg-v8-summary">
      <div><b>${data.totalRoster}</b><span>GV/CTV trong bảng tổng</span></div>
      <div><b>${data.totalTeachers}</b><span>Người có phát sinh tiết</span></div>
      <div><b>${data.totalPeriods}</b><span>Tổng ô dạy được tính</span></div>
      <div><b>${data.byRole.KNS.length}</b><span>GV KNS có dạy • ${data.periodByRole.KNS} tiết</span></div>
      <div><b>${data.byRole.STEM.length}</b><span>GV STEM có dạy • ${data.periodByRole.STEM} tiết</span></div>
      <div class="${unknown?'warn':''}"><b>${unknown}</b><span>Mã TKB cần kiểm tra</span></div>
    </div>`;
  }
  function overviewHtml(data){
    return`${summaryCards(data)}
      <div class="lbg-v8-note"><b>Nguyên tắc kiểm tra mã:</b> so khớp đúng mã giáo viên trong bảng tổng. <b>Không bỏ dấu để tự gộp người</b>; vì vậy <b>HẠ ≠ HÀ</b>. Dòng hậu tố <b>P</b> như HẠP, LIÊNP… là dòng phối hợp/trợ và không tự tạo thêm một giáo viên chính.</div>
      ${data.audit.unknown.length?`<div class="lbg-v8-audit"><b>⚠ Có ${data.audit.unknown.length} mã/ô trong vùng TKB chưa ghép được với bảng tổng giáo viên.</b><div class="lbg-v8-audit-list">${data.audit.unknown.slice(0,18).map(x=>`<span><strong>${esc(x.token)}</strong> • ${esc(dayLabel(x.day))} ${esc(x.session)} • Tiết ${x.period} • ${esc(x.address)}</span>`).join('')}</div>${data.audit.unknown.length>18?`<small>Còn ${data.audit.unknown.length-18} mục khác; xem Excel xuất ra để đối chiếu đầy đủ.</small>`:''}</div>`:''}`;
  }

  function style(){
    if(q('weeklyStatsV8Css'))return;
    const s=root.document.createElement('style');s.id='weeklyStatsV8Css';s.textContent=`
      #weeklyStatsV6 .head p{max-width:860px}.lbg-v8-principle{margin-top:7px;font-size:12px;color:#7a6559}
      .lbg-v8-summary{display:grid;grid-template-columns:repeat(6,minmax(125px,1fr));gap:9px;margin:12px 0}
      .lbg-v8-summary>div{border:1px solid #ead8cc;border-radius:13px;padding:11px;background:#fff}.lbg-v8-summary b{display:block;font-size:21px;color:#73432b}.lbg-v8-summary span{font-size:12px;color:#77655b}.lbg-v8-summary .warn{background:#fff7ed;border-color:#fdba74}
      .lbg-v8-note,.lbg-v8-audit{padding:10px 12px;border-radius:12px;margin:10px 0;line-height:1.5}.lbg-v8-note{background:#f8fafc;border:1px solid #e2e8f0;color:#55443b}.lbg-v8-audit{background:#fff7ed;border:1px solid #fdba74;color:#9a4b12}.lbg-v8-audit-list{display:flex;gap:6px;flex-wrap:wrap;margin-top:7px}.lbg-v8-audit-list span{background:#fff;border:1px solid #fed7aa;border-radius:8px;padding:5px 7px;font-size:11px}
      .lbg-v8-controls{display:flex;gap:8px;flex-wrap:wrap;align-items:end;margin-top:10px}.lbg-v8-controls label{display:grid;gap:5px;min-width:210px;font-size:12px;font-weight:800}.lbg-v8-controls select{min-height:40px;border:1px solid #dfc8b8;border-radius:10px;background:#fff;padding:7px 10px}
      .lbg-v8-panel{margin-top:14px;border:1px solid #e5d6cc;border-radius:15px;overflow:hidden;background:#fff}.lbg-v8-panel-head{padding:12px 14px;background:#fff8f3;border-bottom:1px solid #ead8cc}.lbg-v8-panel-head b{font-size:15px}.lbg-v8-panel-head small{display:block;margin-top:3px;color:#78665b}
      .lbg-v8-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px}.lbg-v8-session{border:1px solid #e4d9d1;border-radius:13px;overflow:hidden}.lbg-v8-session-head{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:11px 12px;background:#f8fbff}.lbg-v8-session-head h4{margin:0;color:#1e3a8a}.lbg-v8-session-head small{color:#6b7280}.lbg-v8-counters{display:flex;gap:6px;flex-wrap:wrap}.lbg-v8-counters span{padding:5px 8px;border-radius:999px;font-size:11px;font-weight:850}.lbg-v8-counters .on{background:#ecfdf5;color:#047857}.lbg-v8-counters .off{background:#f1f5f9;color:#475569}
      .lbg-v8-two{display:grid;grid-template-columns:1fr 1fr;gap:0;border-top:1px solid #edf0f2}.lbg-v8-two>div{padding:10px}.lbg-v8-two>div+div{border-left:1px solid #edf0f2}.lbg-v8-two h5{margin:0 0 7px;color:#523c31}
      .lbg-v8-role{border:1px solid #edf0f2;border-radius:9px;margin:6px 0;background:#fff}.lbg-v8-role summary{cursor:pointer;display:flex;justify-content:space-between;gap:8px;padding:7px 8px;font-size:12px;font-weight:800;list-style:none}.lbg-v8-role summary::-webkit-details-marker{display:none}.lbg-v8-role summary b{min-width:22px;text-align:center;border-radius:999px;background:#f4eee9;color:#724b36}
      .lbg-v8-people{border-top:1px solid #edf0f2}.lbg-v8-person{padding:7px 8px;border-top:1px dashed #eee}.lbg-v8-person:first-child{border-top:0}.lbg-v8-person span{display:block;font-size:12px}.lbg-v8-person small{color:#76665c}.lbg-v8-person em{display:block;margin-top:3px;font-style:normal;font-size:11px;color:#64748b}.lbg-v8-empty{padding:7px 8px;color:#94a3b8;font-size:11px}
      .lbg-v8-unknown{margin:10px;border:1px solid #fdba74;background:#fff7ed;border-radius:10px;padding:9px;color:#9a4b12}.lbg-v8-unknown div{display:flex;gap:5px;flex-wrap:wrap;margin-top:6px}.lbg-v8-unknown span{background:#fff;border-radius:7px;padding:4px 6px;font-size:11px}.lbg-v8-unknown small{display:block;margin-top:6px}
      @media(max-width:1200px){.lbg-v8-summary{grid-template-columns:repeat(3,1fr)}.lbg-v8-two{grid-template-columns:1fr}.lbg-v8-two>div+div{border-left:0;border-top:1px solid #edf0f2}}
      @media(max-width:800px){.lbg-v8-grid{grid-template-columns:1fr}.lbg-v8-summary{grid-template-columns:repeat(2,1fr)}.lbg-v8-controls{display:grid;grid-template-columns:1fr}.lbg-v8-controls label{min-width:0}}
    `;root.document.head.appendChild(s);
  }
