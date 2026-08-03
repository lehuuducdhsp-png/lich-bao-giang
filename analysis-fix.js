'use strict';
(function(){
  function safeCellText(cell){
    try{
      if(!cell)return '';
      const value=cell.value;
      if(value===null||value===undefined)return '';
      if(typeof value==='string'||typeof value==='number'||typeof value==='boolean')return String(value);
      if(value instanceof Date)return value.toISOString();
      if(Array.isArray(value?.richText))return value.richText.map(x=>x?.text??'').join('');
      if(value?.result!==null&&value?.result!==undefined){
        const result=value.result;
        if(Array.isArray(result?.richText))return result.richText.map(x=>x?.text??'').join('');
        return typeof result==='object'?'':String(result);
      }
      if(typeof value?.text==='string')return value.text;
      return '';
    }catch{return '';}
  }

  function safeMaster(ws,row,col){
    try{
      for(const range of ws.model.merges||[]){
        const m=String(range).match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
        if(!m)continue;
        const c1=l2c(m[1]),r1=Number(m[2]),c2=l2c(m[3]),r2=Number(m[4]);
        if(row>=r1&&row<=r2&&col>=c1&&col<=c2)return ws.getCell(r1,c1);
      }
    }catch{}
    return ws.getCell(row,col);
  }

  function safeSchool(ws,row){
    for(let r=row;r>=1;r--){
      const value=norm(safeCellText(safeMaster(ws,r,2))).split('\n')[0].trim();
      if(value&&value.length<=80&&!/^(trường|lớp|tiết|sáng|chiều)$/i.test(value))return value;
    }
    return '';
  }

  function safeClass(ws,row,col,teacherCode){
    for(let r=row-1;r>=Math.max(1,row-5);r--){
      const value=norm(safeCellText(safeMaster(ws,r,col)));
      if(!value||value.length>45)continue;
      if(value.toUpperCase()===String(teacherCode||'').toUpperCase())continue;
      if(/^(sáng|chiều|tiết|thứ|tên gv|tên giáo viên)$/i.test(value))continue;
      return value;
    }
    return '';
  }

  function parseLocalDate(value){
    const m=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!m)return null;
    const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),12);
    return Number.isNaN(d.getTime())?null:d;
  }

  function defaultFirstWeek(yearStart){
    const sep1=new Date(yearStart,8,1,12);
    const day=sep1.getDay()||7;
    sep1.setDate(sep1.getDate()-day+1);
    return sep1;
  }

  function reportWeekNo(start){
    const yearStart=Number(document.getElementById('year')?.value)||start.getFullYear();
    const cfg=typeof window.getSchoolYearConfig==='function'?window.getSchoolYearConfig():null;
    const firstWeek=parseLocalDate(cfg?.startDate)||defaultFirstWeek(yearStart);
    return Math.floor((start-firstWeek)/6048e5)+1;
  }

  function safeAnalyze(ws,code,name){
    const entries=[];
    if(!ws)throw new Error('Không tìm thấy sheet tuần đã chọn.');
    if(!code)throw new Error('Chưa chọn giáo viên.');

    ws.eachRow({includeEmpty:false},row=>{
      for(let c=4;c<=73;c++){
        const cell=row.getCell(c);
        const value=norm(safeCellText(cell)).toUpperCase();
        if(value!==String(code).toUpperCase())continue;
        const info=colInfo(c);
        if(!info)continue;
        entries.push({
          ...info,
          school:safeSchool(ws,row.number),
          className:safeClass(ws,row.number,c,code),
          address:cell.address,
          row:row.number,
          col:c
        });
      }
    });

    entries.sort((a,b)=>a.day-b.day||((a.session==='Sáng'?0:1)-(b.session==='Sáng'?0:1))||a.period-b.period);

    const warnings=[];
    if(!entries.length)warnings.push(`Không tìm thấy ô mã ${code} trong vùng thời khóa biểu của sheet ${ws.name}.`);
    for(const entry of entries){
      if(!entry.school)warnings.push(`Chưa xác định được trường tại ô ${entry.address}.`);
      if(!entry.className)warnings.push(`Chưa xác định được lớp tại ô ${entry.address}.`);
    }
    const slots=new Map();
    for(const entry of entries){
      const key=`${entry.day}|${entry.session}|${entry.period}`;
      slots.set(key,(slots.get(key)||0)+1);
    }
    for(const [key,count] of slots){
      if(count>1){
        const [d,s,p]=key.split('|');
        warnings.push(`Có ${count} phân công cùng khung ${day(Number(d))} ${s}, tiết ${p}.`);
      }
    }

    const start=startDate(ws.name);
    const week=start?reportWeekNo(start):'';
    if(start&&(!Number.isInteger(week)||week<1))warnings.push('Ngày của tab TKB nằm trước ngày bắt đầu Tuần 01 đã cấu hình.');

    return {sheet:ws.name,code,teacherName:name||code,entries,total:entries.length,warnings,start,week};
  }

  try{analyzeNow=safeAnalyze;}catch{}

  const analyzeButton=$('analyze');
  if(analyzeButton){
    analyzeButton.onclick=function(){
      const teacherSelect=$('teacher');
      const weekSelect=$('week');
      const selected=teacherSelect.options[teacherSelect.selectedIndex];
      const teacherCode=teacherSelect.value;
      const teacherName=selected?.dataset?.name||teacherCode;
      const originalText=analyzeButton.textContent;

      analyzeButton.disabled=true;
      analyzeButton.textContent='Đang kiểm tra…';
      $('export').disabled=true;
      $('summary').innerHTML='<div class="empty">Đang đọc và đối chiếu thời khóa biểu…</div>';
      $('warnings').innerHTML='';

      try{
        const cfg=typeof window.getSchoolYearConfig==='function'?window.getSchoolYearConfig():null;
        if(cfg&&!cfg.valid)throw new Error('Cấu hình năm học chưa hợp lệ. Hãy kiểm tra hai ô ngày.');
        const ws=wb?.getWorksheet(weekSelect.value);
        result=safeAnalyze(ws,teacherCode,teacherName);
        render(result);
        $('export').disabled=result.total<1;
        if(result.total>0){
          toast(`Đã kiểm tra ${result.total} tiết. Có thể xuất Excel.`);
          setTimeout(()=>document.getElementById('previewCard')?.scrollIntoView({behavior:'smooth',block:'start'}),100);
        }else toast('Không tìm thấy tiết để xuất báo giảng.');
      }catch(error){
        console.error(error);
        result=null;
        $('summary').innerHTML='<div class="alert warn"><b>Không kiểm tra được lịch:</b> '+esc(error?.message||String(error))+'</div>';
        $('previewCard').hidden=true;
        $('detailCard').hidden=true;
        $('export').disabled=true;
        toast('Kiểm tra lịch bị lỗi.');
      }finally{
        analyzeButton.textContent=originalText;
        analyzeButton.disabled=!teacherSelect.value;
      }
    };
  }
})();

(function(){
  function loadDependentScripts(){
    const sync=document.createElement('script');
    sync.src='sheets-sync.js?v=20260801.8';
    sync.async=false;
    document.body.appendChild(sync);

    const ga=document.createElement('script');
    ga.src='ga-editor.js?v=20260801.1';
    ga.async=false;
    document.body.appendChild(ga);

    const multi=document.createElement('script');
    multi.src='multi-teacher-v5.js?v=20260803.1';
    multi.async=false;
    document.body.appendChild(multi);

    const conflict=document.createElement('script');
    conflict.src='conflict-check-v5.js?v=20260803.1';
    conflict.async=false;
    document.body.appendChild(conflict);

    const intelligence=document.createElement('script');
    intelligence.src='teacher-intelligence-v6.js?v=20260803.1';
    intelligence.async=false;
    document.body.appendChild(intelligence);

    const statsV7=document.createElement('script');
    statsV7.src='weekly-stats-enhancement-v7.js?v=20260803.2';
    statsV7.async=false;
    document.body.appendChild(statsV7);

    const supabaseConfig=document.createElement('script');
    supabaseConfig.src='supabase-config.js?v=20260803.1';
    supabaseConfig.async=false;
    supabaseConfig.onload=()=>{
      const authCore=document.createElement('script');
      authCore.src='auth-core-v1.js?v=20260803.1';
      authCore.async=false;
      authCore.onload=()=>{
        const cloudSync=document.createElement('script');
        cloudSync.src='cloud-sync-v1.js?v=20260803.1';
        cloudSync.async=false;
        document.body.appendChild(cloudSync);
        const ownerAdmin=document.createElement('script');
        ownerAdmin.src='owner-admin-v1.js?v=20260803.1';
        ownerAdmin.async=false;
        document.body.appendChild(ownerAdmin);
      };
      document.body.appendChild(authCore);
    };
    document.body.appendChild(supabaseConfig);
  }

  const config=document.createElement('script');
  config.src='school-year-config.js?v=20260801.1';
  config.async=false;
  config.onload=loadDependentScripts;
  config.onerror=loadDependentScripts;
  document.body.appendChild(config);
})();
