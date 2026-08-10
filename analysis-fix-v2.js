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
        const m=String(range).match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);if(!m)continue;
        const c1=l2c(m[1]),r1=Number(m[2]),c2=l2c(m[3]),r2=Number(m[4]);
        if(row>=r1&&row<=r2&&col>=c1&&col<=c2)return ws.getCell(r1,c1);
      }
    }catch{}
    return ws.getCell(row,col);
  }
  function safeSchool(ws,row){for(let r=row;r>=1;r--){const value=norm(safeCellText(safeMaster(ws,r,2))).split('\n')[0].trim();if(value&&value.length<=80&&!/^(trường|lớp|tiết|sáng|chiều)$/i.test(value))return value}return''}
  function safeClass(ws,row,col,teacherCode){for(let r=row-1;r>=Math.max(1,row-5);r--){const value=norm(safeCellText(safeMaster(ws,r,col)));if(!value||value.length>45)continue;if(value.toUpperCase()===String(teacherCode||'').toUpperCase())continue;if(/^(sáng|chiều|tiết|thứ|tên gv|tên giáo viên)$/i.test(value))continue;return value}return''}
  function parseLocalDate(value){const m=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return null;const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),12);return Number.isNaN(d.getTime())?null:d}
  function defaultFirstWeek(yearStart){const sep1=new Date(yearStart,8,1,12),day=sep1.getDay()||7;sep1.setDate(sep1.getDate()-day+1);return sep1}
  function reportWeekNo(start){const yearStart=Number(document.getElementById('year')?.value)||start.getFullYear(),cfg=typeof window.getSchoolYearConfig==='function'?window.getSchoolYearConfig():null,firstWeek=parseLocalDate(cfg?.startDate)||defaultFirstWeek(yearStart);return Math.floor((start-firstWeek)/6048e5)+1}
  function safeAnalyze(ws,code,name){
    const entries=[];if(!ws)throw new Error('Không tìm thấy sheet tuần đã chọn.');if(!code)throw new Error('Chưa chọn giáo viên.');
    ws.eachRow({includeEmpty:false},row=>{for(let c=4;c<=73;c++){const cell=row.getCell(c),value=norm(safeCellText(cell)).toUpperCase();if(value!==String(code).toUpperCase())continue;const info=colInfo(c);if(!info)continue;entries.push({...info,school:safeSchool(ws,row.number),className:safeClass(ws,row.number,c,code),address:cell.address,row:row.number,col:c})}});
    entries.sort((a,b)=>a.day-b.day||((a.session==='Sáng'?0:1)-(b.session==='Sáng'?0:1))||a.period-b.period);
    const warnings=[];if(!entries.length)warnings.push(`Không tìm thấy ô mã ${code} trong vùng thời khóa biểu của sheet ${ws.name}.`);
    for(const entry of entries){if(!entry.school)warnings.push(`Chưa xác định được trường tại ô ${entry.address}.`);if(!entry.className)warnings.push(`Chưa xác định được lớp tại ô ${entry.address}.`)}
    const slots=new Map();for(const entry of entries){const key=`${entry.day}|${entry.session}|${entry.period}`;slots.set(key,(slots.get(key)||0)+1)}for(const[key,count]of slots){if(count>1){const[d,s,p]=key.split('|');warnings.push(`Có ${count} phân công cùng khung ${day(Number(d))} ${s}, tiết ${p}.`)}}
    const start=startDate(ws.name),week=start?reportWeekNo(start):'';if(start&&(!Number.isInteger(week)||week<1))warnings.push('Ngày của tab TKB nằm trước ngày bắt đầu Tuần 01 đã cấu hình.');
    return{sheet:ws.name,code,teacherName:name||code,entries,total:entries.length,warnings,start,week}
  }
  try{analyzeNow=safeAnalyze}catch{}
  const analyzeButton=$('analyze');
  if(analyzeButton){analyzeButton.onclick=function(){const teacherSelect=$('teacher'),weekSelect=$('week'),selected=teacherSelect.options[teacherSelect.selectedIndex],teacherCode=teacherSelect.value,teacherName=selected?.dataset?.name||teacherCode,originalText=analyzeButton.textContent;analyzeButton.disabled=true;analyzeButton.textContent='Đang kiểm tra…';$('export').disabled=true;$('summary').innerHTML='<div class="empty">Đang đọc và đối chiếu thời khóa biểu…</div>';$('warnings').innerHTML='';try{const cfg=typeof window.getSchoolYearConfig==='function'?window.getSchoolYearConfig():null;if(cfg&&!cfg.valid)throw new Error('Cấu hình năm học chưa hợp lệ. Hãy kiểm tra hai ô ngày.');const ws=wb?.getWorksheet(weekSelect.value);result=safeAnalyze(ws,teacherCode,teacherName);render(result);$('export').disabled=result.total<1;if(result.total>0){toast(`Đã kiểm tra ${result.total} tiết. Có thể xuất Excel.`);setTimeout(()=>document.getElementById('previewCard')?.scrollIntoView({behavior:'smooth',block:'start'}),100)}else toast('Không tìm thấy tiết để xuất báo giảng.')}catch(error){console.error(error);result=null;$('summary').innerHTML='<div class="alert warn"><b>Không kiểm tra được lịch:</b> '+esc(error?.message||String(error))+'</div>';$('previewCard').hidden=true;$('detailCard').hidden=true;$('export').disabled=true;toast('Kiểm tra lịch bị lỗi.')}finally{analyzeButton.textContent=originalText;analyzeButton.disabled=!teacherSelect.value}}}
})();

(function(){
  window.renderPreview=function(a){
    const ds=[2,3,4,5,6,7],end=a.start?new Date(a.start.getTime()+5*864e5):null;let rows='';
    for(const ses of ['Sáng','Chiều']){
      const sch=ds.map(d=>schools(a,d,ses));
      rows+=`<tr><td class="session" rowspan="6">${ses}</td><td class="session">Tiết</td>${sch.map(x=>`<td class="school">${x.map(esc).join(' / ')}${x.length?'\n(GA  )':''}</td>`).join('')}</tr>`;
      for(let p=1;p<=5;p++)rows+=`<tr><td>Tiết ${p}</td>${ds.map((d,i)=>{const pri=sch[i][0];return`<td>${at(a,d,ses,p).map(e=>`<span class="${pri&&e.school!==pri?'red':''}">${esc(e.className)}</span>`).join(' & ')}</td>`}).join('')}</tr>`;
    }
    $('caption').textContent=a.teacherName+' • '+a.total+' tiết';
    $('preview').innerHTML=`<div class="sheet"><div class="title"><h2>LỊCH BÁO GIẢNG NĂM HỌC ${$('year').value} - ${+$('year').value+1}</h2><h3>Tuần ${a.week||'...'}</h3><p>${a.start?'(Từ ngày '+a.start.toLocaleDateString('vi-VN')+' đến ngày '+end.toLocaleDateString('vi-VN')+')':'(Chưa xác định ngày từ tên sheet)'}</p></div><table class="report"><tr>${['Buổi','Tiết',...ds.map(day)].map(x=>`<th style="height:62px;vertical-align:middle">${x}</th>`).join('')}</tr>${rows}</table><div class="foot"><span>TỔNG: ${a.total} tiết</span><span>Giáo viên: ${esc(a.teacherName)}</span></div></div>`;
    $('previewCard').hidden=false;
  };
})();

(function(){
  function appendScript(src,onload){const script=document.createElement('script');script.src=src;script.async=false;if(onload)script.onload=onload;document.body.appendChild(script);return script}
  function loadCommonModules(){appendScript('ga-editor.js?v=20260801.1');appendScript('multi-teacher-v5.js?v=20260803.1');appendScript('conflict-check-v5.js?v=20260803.1');appendScript('teacher-intelligence-v6.js?v=20260803.1');appendScript('weekly-stats-enhancement-v7.js?v=20260803.2')}
  function loadDependentScripts(){
    const startMode=()=>{
      if(window.LBG_SUPABASE_CONFIG?.enabled){
        appendScript('auth-core-v2.js?v=20260810.1',()=>{appendScript('cloud-sync-v1.js?v=20260803.4');appendScript('owner-admin-v2.js?v=20260803.1');appendScript('sheets-sync-owner-v2.js?v=20260803.2')});loadCommonModules();
      }else{appendScript('sheets-sync.js?v=20260801.8');loadCommonModules()}
    };
    const supabaseConfig=document.createElement('script');supabaseConfig.src='supabase-config.js?v=20260803.4';supabaseConfig.async=false;supabaseConfig.onload=startMode;supabaseConfig.onerror=()=>{appendScript('sheets-sync.js?v=20260801.8');loadCommonModules()};document.body.appendChild(supabaseConfig)
  }
  const config=document.createElement('script');config.src='school-year-config.js?v=20260801.1';config.async=false;config.onload=loadDependentScripts;config.onerror=loadDependentScripts;document.body.appendChild(config)
})();
