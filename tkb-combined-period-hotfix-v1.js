'use strict';
(function(){
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  const fold=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase().replace(/\s+/g,' ');
  const dayRank=d=>Number(d)||99;
  const sessionRank=s=>s==='Sáng'?0:s==='Chiều'?1:2;

  function groupPeriod(e){
    if(e?.classType!=='combined')return null;
    const m=txt(e.groupNote||e.classRaw).match(/(?:^|[-–\s])TIẾT\s*([1-5])(?:\b|$)/i);
    return m?Number(m[1]):null;
  }

  function normalize(entries){
    const out=[],combined=new Map();
    for(const source of entries||[]){
      const actual=groupPeriod(source);
      if(!actual){out.push(source);continue}

      const e={...source,
        sourceColumnPeriod:Number(source.period)||null,
        sourceColumnPeriods:[Number(source.period)].filter(Number.isFinite),
        sourceAddresses:[txt(source.address)].filter(Boolean),
        period:actual,
        periodSource:'combined-label'
      };
      // Trong TKB lớp gộp, nhiều ô mã GV cùng một hàng dưới cùng nhãn khối
      // chỉ là phân công GV cho khối, không phải nhiều tiết dạy riêng.
      const key=[txt(e.code).toUpperCase(),e.locationKey||fold(e.schoolName||e.school),dayRank(e.day),txt(e.session),actual,Number(e.row)||0,fold(e.classRaw||e.className)].join('|');
      const old=combined.get(key);
      if(!old){combined.set(key,e);out.push(e);continue}

      old.makeUp=Boolean(old.makeUp||e.makeUp);
      for(const p of e.sourceColumnPeriods)if(!old.sourceColumnPeriods.includes(p))old.sourceColumnPeriods.push(p);
      for(const a of e.sourceAddresses)if(!old.sourceAddresses.includes(a))old.sourceAddresses.push(a);
      old.sourceColumnPeriods.sort((a,b)=>a-b);
    }
    out.sort((a,b)=>dayRank(a.day)-dayRank(b.day)||sessionRank(a.session)-sessionRank(b.session)||Number(a.period)-Number(b.period)||Number(a.row)-Number(b.row)||Number(a.col)-Number(b.col));
    return out;
  }

  function install(){
    const api=window.LBGTkbParserV2;
    if(!api?.scanAssignments||api.__lbgCombinedPeriodHotfixV1)return false;
    const originalScan=api.scanAssignments.bind(api);
    const originalAnalyze=api.analyze?.bind(api);
    const originalTeachers=api.teachers?.bind(api);

    function scanAssignments(ws,onlyCode=''){
      return normalize(originalScan(ws,onlyCode));
    }
    function analyze(ws,code,name){
      const base=originalAnalyze?originalAnalyze(ws,code,name):{sheet:ws?.name||'',code,teacherName:name||code,warnings:[],start:null,week:''};
      const entries=scanAssignments(ws,code);
      return{...base,entries,total:entries.length};
    }
    function teachers(ws){
      const list=originalTeachers?originalTeachers(ws):[];
      return(list||[]).map(t=>({...t,expected:scanAssignments(ws,t.code).length}));
    }

    api.scanAssignments=scanAssignments;
    api.analyze=analyze;
    api.teachers=teachers;
    api.__lbgCombinedPeriodHotfixV1=true;
    window.analyzeNow=analyze;
    window.teachers=teachers;
    window.LBGAllTeachers=teachers;

    function refreshTeachers(){
      try{
        const book=typeof wb!=='undefined'?wb:null,week=document.getElementById('week'),sel=document.getElementById('teacher');
        if(!book||!week?.value||!sel)return;
        const ws=book.getWorksheet(week.value);if(!ws)return;
        const list=teachers(ws),prev=sel.value;
        const esc=v=>typeof window.esc==='function'?window.esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        sel.innerHTML='<option value="">Chọn giáo viên…</option>'+list.map(x=>`<option value="${esc(x.code)}" data-name="${esc(x.name)}">${esc(x.name)} — ${esc(x.code)} (${x.expected} tiết)</option>`).join('');
        sel.disabled=!list.length;if(prev&&list.some(x=>x.code===prev))sel.value=prev;
      }catch(error){console.error('Combined period hotfix: không làm mới được danh sách giáo viên',error)}
    }

    const btn=document.getElementById('analyze');
    if(btn){
      btn.onclick=function(){
        const sel=document.getElementById('teacher'),week=document.getElementById('week'),opt=sel?.selectedOptions?.[0],code=sel?.value||'',name=opt?.dataset?.name||code,old=btn.textContent;
        btn.disabled=true;btn.textContent='Đang kiểm tra…';
        try{
          const book=typeof wb!=='undefined'?wb:null,ws=book?.getWorksheet(week?.value);
          window.result=analyze(ws,code,name);window.render?.(window.result);
          const ex=document.getElementById('export');if(ex)ex.disabled=!window.result.total;
          if(typeof window.toast==='function')window.toast(`Đã kiểm tra ${window.result.total} tiết.`);
        }catch(error){console.error(error);alert('Không kiểm tra được lịch: '+(error?.message||error))}
        finally{btn.textContent=old;btn.disabled=!sel?.value}
      };
    }

    setTimeout(refreshTeachers,140);
    document.addEventListener('lbg-cloud-file-opened',()=>setTimeout(refreshTeachers,140));
    document.getElementById('week')?.addEventListener('change',()=>setTimeout(refreshTeachers,80));
    document.dispatchEvent(new CustomEvent('lbg-tkb-combined-period-hotfix-ready'));
    return true;
  }

  if(install())return;
  let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>300)clearInterval(timer)},50);
})();
