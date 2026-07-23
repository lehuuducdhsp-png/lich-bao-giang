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
      const text=norm(safeCellText(safeMaster(ws,r,2))).split('\n')[0].trim();
      if(text&&text.length<=80&&!/^(trường|lớp|tiết|sáng|chiều)$/i.test(text))return text;
    }
    return '';
  }

  function safeClass(ws,row,col,teacherCode){
    for(let r=row-1;r>=Math.max(1,row-5);r--){
      const text=norm(safeCellText(safeMaster(ws,r,col)));
      if(!text||text.length>45)continue;
      if(text.toUpperCase()===String(teacherCode||'').toUpperCase())continue;
      if(/^(sáng|chiều|tiết|thứ|tên gv|tên giáo viên)$/i.test(text))continue;
      return text;
    }
    return '';
  }

  function safeAnalyze(ws,code,name){
    const entries=[];
    if(!ws)throw new Error('Không tìm thấy sheet tuần đã chọn.');
    if(!code)throw new Error('Chưa chọn giáo viên.');

    ws.eachRow({includeEmpty:false},row=>{
      for(let c=4;c<=73;c++){
        const cell=row.getCell(c);
        const text=norm(safeCellText(cell)).toUpperCase();
        if(text!==String(code).toUpperCase())continue;
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

    entries.sort((a,b)=>a.day-b.day||
      ((a.session==='Sáng'?0:1)-(b.session==='Sáng'?0:1))||
      a.period-b.period);

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
    return {
      sheet:ws.name,
      code,
      teacherName:name||code,
      entries,
      total:entries.length,
      warnings,
      start,
      week:start?weekNo(start):''
    };
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
        const ws=wb?.getWorksheet(weekSelect.value);
        result=safeAnalyze(ws,teacherCode,teacherName);
        render(result);
        $('export').disabled=result.total<1;
        if(result.total>0){
          toast(`Đã kiểm tra ${result.total} tiết. Có thể xuất Excel.`);
          setTimeout(()=>document.getElementById('previewCard')?.scrollIntoView({behavior:'smooth',block:'start'}),100);
        }else{
          toast('Không tìm thấy tiết để xuất báo giảng.');
        }
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
  const script=document.createElement('script');
  script.src='sheets-sync.js?v=20260723.1';
  script.defer=true;
  document.body.appendChild(script);
})();
