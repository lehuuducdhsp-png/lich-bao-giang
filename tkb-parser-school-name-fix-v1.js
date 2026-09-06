'use strict';
(function(){
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  const fold=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase().replace(/\s+/g,' ');
  function cellText(cell){try{const v=cell?.value;if(v==null)return'';if(typeof v==='string'||typeof v==='number'||typeof v==='boolean')return String(v);if(Array.isArray(v?.richText))return v.richText.map(x=>x?.text??'').join('');if(v?.result!=null)return typeof v.result==='object'?'':String(v.result);if(typeof v?.text==='string')return v.text;return''}catch{return''}}
  function schoolNameAt(ws,row){
    const raw=txt(cellText(ws?.getCell?.(row,2)));if(!raw)return'';
    const lines=raw.split(/\n+/).map(x=>txt(x).replace(/\s+/g,' ')).filter(Boolean);if(!lines.length)return'';
    if(lines.length>=2){
      const a=lines[0],b=lines[1];
      const shortContinuation=a.length<=8&&b.length<=12&&!/\d|\(|\)|ÁP\s*DỤNG|VÀO\s*HỌC|TIẾT|GV|GIÁO VIÊN/i.test(b);
      if(shortContinuation)return`${a} ${b}`.replace(/\s+/g,' ').trim();
    }
    return lines[0];
  }
  function patchEntry(ws,e){
    const school=schoolNameAt(ws,e?.row);if(!school||school===e.schoolName)return e;
    const site=txt(e.siteDisplay||e.siteName),schoolKey=fold(school),locationLabel=site?`${school}\n${site}`:school,locationKey=`${schoolKey}|${fold(site)}`;
    return{...e,school,schoolName:school,schoolKey,locationLabel,locationKey};
  }
  function install(){
    const api=window.LBGTkbParserV2;if(!api?.scanAssignments||api.__lbgSchoolNameFixV1)return false;
    const originalScan=api.scanAssignments.bind(api),originalAnalyze=api.analyze?.bind(api);
    api.scanAssignments=function(ws,onlyCode=''){return(originalScan(ws,onlyCode)||[]).map(e=>patchEntry(ws,e))};
    function analyze(ws,code,name){
      if(!ws)throw new Error('Không tìm thấy sheet tuần đã chọn.');if(!code)throw new Error('Chưa chọn giáo viên.');
      const base=originalAnalyze?originalAnalyze(ws,code,name):{sheet:ws.name,code,teacherName:name||code,entries:[],total:0,warnings:[],start:null,week:''};
      const entries=api.scanAssignments(ws,code),warnings=[...(base.warnings||[])];
      const slots=new Map();for(const e of entries){const k=`${e.day}|${e.session}|${e.period}`;if(!slots.has(k))slots.set(k,[]);slots.get(k).push(e)}
      for(const[k,a]of slots)if(a.length>1){const places=new Set(a.map(x=>x.locationKey).filter(Boolean)),[d,s,p]=k.split('|');const label=Number(d)===8?'Chủ nhật':`Thứ ${Number(d)}`;const msg=places.size>1?`CẢNH BÁO: ${a.length} phân công cùng khung ${label} ${s}, tiết ${p} nhưng khác điểm dạy/cơ sở.`:`Có ${a.length} phân công cùng khung ${label} ${s}, tiết ${p}; cần xác nhận đây có phải lớp gộp/ghép hợp lệ.`;if(!warnings.includes(msg))warnings.push(msg)}
      return{...base,entries,total:entries.length,warnings:[...new Set(warnings)]};
    }
    api.analyze=analyze;window.analyzeNow=analyze;api.__lbgSchoolNameFixV1=true;
    const btn=document.getElementById('analyze');if(btn){btn.dataset.lbgParserV2='1';btn.onclick=function(){const sel=document.getElementById('teacher'),week=document.getElementById('week'),opt=sel?.selectedOptions?.[0],code=sel?.value||'',name=opt?.dataset?.name||code,old=btn.textContent;btn.disabled=true;btn.textContent='Đang kiểm tra…';try{const localBook=typeof wb!=='undefined'?wb:null,ws=localBook?.getWorksheet(week?.value);window.result=analyze(ws,code,name);window.render?.(window.result);const ex=document.getElementById('export');if(ex)ex.disabled=!window.result.total;if(typeof window.toast==='function')window.toast(`Đã kiểm tra ${window.result.total} tiết.`)}catch(error){console.error(error);alert('Không kiểm tra được lịch: '+(error?.message||error))}finally{btn.textContent=old;btn.disabled=!sel?.value}}}
    document.dispatchEvent(new CustomEvent('lbg-tkb-school-name-fix-ready'));return true;
  }
  if(install())return;let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>300)clearInterval(timer)},50);
})();
