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
