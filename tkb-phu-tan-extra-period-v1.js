'use strict';
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.LBGTkbPhuTanExtraPeriodV1=api;
  if(root&&root.document)api.install(root);
})(typeof window!=='undefined'?window:globalThis,function(){
  // Nhận diện các cụm học tiết 4/5 bổ sung của PHÚ TÂN, bắt đầu từ sheet 19T10.
  // Không chỉnh sửa dữ liệu Excel, dữ liệu GA, quyền truy cập hay bộ đọc TKB cũ.
  const VERSION='20261017.1';
  const txt=x=>String(x??'').replace(/\r/g,'').trim();
  const fold=x=>txt(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase().replace(/\s+/g,' ');
  const colNumber=x=>[...String(x||'')].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0);
  const maxHeaderDistance=8;
  const memo=new WeakMap();

  function read(cell){
    try{
      const v=cell?.value;
      if(typeof v==='string'||typeof v==='number')return txt(v);
      if(Array.isArray(v?.richText))return txt(v.richText.map(x=>x.text||'').join(''));
      if(v&&v.result!=null)return txt(v.result);
      return txt(cell?.text||v?.text);
    }catch{return''}
  }
  function merges(ws){
    if(memo.has(ws))return memo.get(ws);
    const out=[];
    const add=range=>{
      const ref=typeof range==='string'?range:String(range?.range||range?.ref||'');
      let m=ref.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
      if(m){out.push({c1:colNumber(m[1]),r1:+m[2],c2:colNumber(m[3]),r2:+m[4]});return}
      const t=range?.model||range;
      if([t?.top,t?.left,t?.bottom,t?.right].every(Number.isFinite))out.push({c1:t.left,r1:t.top,c2:t.right,r2:t.bottom});
    };
    for(const m of ws?.model?.merges||[])add(m);
    try{for(const m of Object.values(ws?._merges||{}))add(m)}catch{}
    memo.set(ws,out);return out;
  }
  function headerAt(ws,row,col){
    const merged=merges(ws).find(m=>m.r1<=row&&row<=m.r2&&m.c1<=col&&col<=m.c2);
    if(merged)return{value:read(ws.getCell(merged.r1,merged.c1)),merged,originRow:merged.r1};
    const cell=ws.getCell(row,col),master=cell?.master;
    return{value:read(master&&master!==cell?master:cell),merged:null,originRow:row};
  }
  function readHeader(value){
    const s=fold(value);
    // File Excel có chữ CHỀU (thay vì CHIỀU) và THỨ5 (thiếu khoảng trắng).
    const m=s.match(/\bHOC\s+TIET\s+([1-5])\s+(SANG|CHIEU|CHEU)\s+THU\s*([2-7])\b/);
    if(!m||!/\bMOI\s+(?:GV|GIAO\s+VIEN)\s*\/\s*LOP\b/.test(s))return null;
    return{period:Number(m[1]),session:m[2]==='SANG'?'Sáng':'Chiều',day:Number(m[3])};
  }
  function findHeader(ws,entry,parser){
    if(!ws?.getCell||!entry||!parser?.locationAt)return null;
    const row=Number(entry.row),col=Number(entry.col),day=Number(entry.day),session=txt(entry.session);
    if(!(row>1&&col>0&&day>=2&&day<=7))return null;
    let loc;try{loc=parser.locationAt(ws,row)}catch{return null}
    // Chỉ áp dụng cho khu vực PHÚ TÂN; không làm thay đổi các cụm 'HỌC TIẾT' cũ.
    if(fold(loc?.schoolName||loc?.school)!=='PHU TAN')return null;
    for(let r=row-1;r>=Math.max(1,row-maxHeaderDistance);r--){
      const h=headerAt(ws,r,col),rule=readHeader(h.value);
      if(!rule||rule.day!==day||rule.session!==session)continue;
      if(h.originRow!==r)continue;
      let headerLoc;try{headerLoc=parser.locationAt(ws,r)}catch{return null}
      if(txt(headerLoc?.locationKey)!==txt(loc?.locationKey))continue;
      return{...rule,row:r,col,sourceText:h.value,locationKey:loc.locationKey};
    }
    return null;
  }
  function normalizeEntry(ws,entry,parser){
    const header=findHeader(ws,entry,parser);
    if(!header)return entry;
    const classRow=Number(entry.row)-1;
    // Với nhãn 'MỖI GV/LỚP', mỗi ô mã GV lấy tên lớp tại ô ngay bên trên.
    // Không kéo lùi lên dòng nhãn hay biến mã trợ giảng có hậu tố P thành lớp.
    const raw=read(ws.getCell(classRow,Number(entry.col))).replace(/\s+/g,' ').trim();
    let classMeta;try{classMeta=parser?.classMeta?.(raw)}catch{}
    const valid=classMeta?.classType==='single';
    const slotPeriod=Number(entry.slotPeriod??entry.period)||null;
    const common={
      ...entry,slotPeriod,teachingPeriod:header.period,
      rosterTeachingPeriod:header.period,
      rosterTeachingPeriodSource:header.sourceText,
      rosterTeachingPeriodRow:header.row,
      phuTanExtraPeriod:true,
      phuTanExtraPeriodClassCell:`${entry.address?.match(/^[A-Z]+/)?.[0]||''}${classRow}`
    };
    if(valid)return{
      ...common,className:classMeta.classDisplay,classRaw:classMeta.classRaw,
      classSourceRaw:raw,roomRaw:classMeta.roomRaw||'',classType:'single',classCount:1,
      classRow,groupNote:'',classPending:false
    };
    return{
      ...common,className:'',classRaw:'',classSourceRaw:'',roomRaw:'',classType:'unknown',
      classCount:1,classRow:null,groupNote:'',classPending:true,
      classPendingReason:raw?'Ô phía trên mã GV chưa phải lớp hợp lệ.':'Chưa điền lớp vào ô phía trên mã GV.'
    };
  }
  function install(root){
    let counter=0;
    function once(){
      const parser=root.LBGTkbParserV2;
      if(!parser?.scanAssignments||!parser.__lbgRosterGroupPeriodSafeV1)return false;
      if(parser.__lbgPhuTanExtraPeriodV1===VERSION)return true;
      const oldScan=parser.scanAssignments.bind(parser);
      parser.scanAssignments=function(ws,onlyCode=''){
        return(oldScan(ws,onlyCode)||[]).map(e=>normalizeEntry(ws,e,parser));
      };
      parser.__lbgPhuTanExtraPeriodV1=VERSION;
      return true;
    }
    function tick(){if(once())return;if(++counter<200)root.setTimeout(tick,50)}
    tick();
    root.document.addEventListener?.('lbg-tkb-roster-group-period-ready',once);
    root.document.addEventListener?.('lbg-runtime-ready',once);
  }
  return{VERSION,readHeader,findHeader,normalizeEntry,install};
});
