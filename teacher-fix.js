'use strict';
(function(){
  const blockedCodes=new Set(['SÁNG','CHIỀU','THỨ','TIẾT','TỔNG','TÊN GV','TÊN GIÁO VIÊN']);

  function safeText(cell){
    try{
      if(!cell)return '';
      const value=cell.value;
      if(value===null||value===undefined)return '';
      if(typeof value==='string'||typeof value==='number'||typeof value==='boolean')return String(value);
      if(value instanceof Date)return value.toISOString();
      if(Array.isArray(value?.richText))return value.richText.map(x=>x?.text??'').join('');
      if(value?.result!==null&&value?.result!==undefined){
        const result=value.result;
        if(typeof result==='object'&&Array.isArray(result?.richText))return result.richText.map(x=>x?.text??'').join('');
        return String(result);
      }
      if(typeof value?.text==='string')return value.text;
      if(typeof value?.hyperlink==='string'&&typeof value?.text==='string')return value.text;
      return '';
    }catch{return '';}
  }

  function formulaOf(cell){
    try{
      const value=cell?.value;
      if(value&&typeof value==='object')return String(value.formula||value.sharedFormula||'');
    }catch{}
    return '';
  }

  function codeFromCountFormula(cell){
    const formula=formulaOf(cell);
    const match=formula.match(/COUNTIF\s*\([^,;]+[,;]\s*"([^"]+)"/i);
    return match?norm(match[1]).toUpperCase():'';
  }

  function keyOf(value){
    return norm(value).normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/Đ/g,'D').replace(/đ/g,'d')
      .toUpperCase().replace(/[^A-Z0-9]/g,'');
  }

  function timetableCodeCounts(ws){
    const counts=new Map();
    ws.eachRow({includeEmpty:false},row=>{
      for(let c=4;c<=73;c++){
        const code=norm(safeText(row.getCell(c))).toUpperCase();
        if(!code||code.length>18||blockedCodes.has(code))continue;
        if(/^\d+$/.test(code)||/^\d+\/\d+$/.test(code))continue;
        if(!/^[A-ZÀ-ỸĐ0-9.]+$/.test(code))continue;
        counts.set(code,(counts.get(code)||0)+1);
      }
    });
    return counts;
  }

  function findTeacherRows(ws,counts){
    let header=null;
    ws.eachRow({includeEmpty:false},row=>{
      row.eachCell({includeEmpty:false},cell=>{
        const text=norm(safeText(cell));
        if(!header&&/^(TÊN\s*GV|TÊN\s*GIÁO\s*VIÊN)$/i.test(text))header={row:row.number,col:cell.col};
      });
    });
    if(!header)return [];

    const rows=[];
    let consecutiveBlank=0;
    for(let r=header.row+1;r<=ws.rowCount;r++){
      const raw=norm(safeText(ws.getCell(r,header.col)));
      if(!raw){
        consecutiveBlank++;
        if(consecutiveBlank>=8&&rows.length)break;
        continue;
      }
      consecutiveBlank=0;
      if(/^(off|tc|tổng\s*lớp)/i.test(raw))break;
      if(/^CTV\b/i.test(raw)||/\bCTV$/i.test(raw))continue;

      let directCode='',expected=0;
      for(let c=header.col+1;c<=Math.min(ws.columnCount,header.col+4);c++){
        const cell=ws.getCell(r,c);
        const parsed=codeFromCountFormula(cell);
        if(parsed)directCode=parsed;
        const text=norm(safeText(cell));
        const number=Number(text.replace(/[^0-9.-]/g,''));
        if(Number.isFinite(number)&&number>=0)expected=Math.max(expected,number);
      }
      if(directCode&&counts.has(directCode))expected=counts.get(directCode);
      rows.push({name:raw.replace(/^\d+[.)-]?\s*/,''),expected,directCode});
    }
    return rows;
  }

  function scoreTeacher(teacher,code,count){
    const display=teacher.name.replace(/\([^)]*\)/g,' ').trim();
    const tokens=(display.match(/[A-Za-zÀ-ỹĐđ]+/g)||[]).map(keyOf).filter(Boolean);
    const last=tokens[tokens.length-1]||'';
    const previous=tokens[tokens.length-2]||'';
    const aliases=[...teacher.name.matchAll(/\(([^)]*)\)/g)].map(m=>keyOf(m[1])).filter(Boolean);
    const codeKey=keyOf(code),base=codeKey.replace(/\d+$/,'');
    let score=0;
    if(teacher.expected>0)score+=count===teacher.expected?1400:-500;
    for(const alias of aliases){
      if(alias===codeKey)score+=1300;
      else if(alias.endsWith(codeKey)||codeKey.endsWith(alias))score+=700;
    }
    if(codeKey===last)score+=700;
    if(base===last)score+=620;
    if(last&&codeKey.endsWith(last))score+=350;
    if(previous&&codeKey===previous[0]+last)score+=560;
    if(previous&&base===previous[0]+last)score+=520;
    if(previous&&codeKey===previous+last)score+=380;
    if(tokens.includes(codeKey))score+=320;
    return score;
  }

  window.teachers=function(ws){
    const counts=timetableCodeCounts(ws);
    const summary=findTeacherRows(ws,counts);
    const mapped=[],used=new Set();

    for(const teacher of summary){
      if(teacher.directCode&&counts.has(teacher.directCode)&&!used.has(teacher.directCode)){
        used.add(teacher.directCode);
        mapped.push({name:teacher.name.replace(/\s*\([^)]*\)\s*/g,' ').replace(/\s+/g,' ').trim(),code:teacher.directCode,expected:counts.get(teacher.directCode)});
        continue;
      }
      const ranked=[...counts]
        .filter(([code])=>!used.has(code))
        .map(([code,count])=>({code,count,score:scoreTeacher(teacher,code,count)}))
        .sort((a,b)=>b.score-a.score);
      const best=ranked[0];
      if(best&&best.score>=500){
        used.add(best.code);
        mapped.push({name:teacher.name.replace(/\s*\([^)]*\)\s*/g,' ').replace(/\s+/g,' ').trim(),code:best.code,expected:best.count});
      }
    }

    for(const [code,count] of counts){
      if(!used.has(code))mapped.push({name:'Mã '+code,code,expected:count});
    }
    return mapped.sort((a,b)=>a.name.localeCompare(b.name,'vi'));
  };

  function populateTeachers(){
    const week=$('week'),teacher=$('teacher');
    const ws=wb&&wb.getWorksheet(week.value);
    if(!ws){teacher.disabled=true;teacher.innerHTML='<option>Chọn tuần trước</option>';return;}
    try{
      const list=window.teachers(ws);
      teacher.disabled=false;
      teacher.innerHTML='<option value="">Chọn giáo viên…</option>'+list.map(x=>`<option value="${esc(x.code)}" data-name="${esc(x.name)}">${esc(x.name)} — ${esc(x.code)}${x.expected?` (${x.expected} tiết)`:''}</option>`).join('');
      if(!list.length)teacher.innerHTML='<option value="">Không tìm thấy giáo viên</option>';
    }catch(error){
      console.error(error);
      teacher.disabled=false;
      teacher.innerHTML='<option value="">Không đọc được danh sách giáo viên</option>';
      toast('Có lỗi khi đọc danh sách giáo viên. Hãy thử chọn lại tuần.');
    }
    $('analyze').disabled=true;$('compare').disabled=true;$('export').disabled=true;clearResults();
  }

  window.fillWeeks=function(){
    const found=wb.worksheets.filter(weekLike),list=found.length?found:wb.worksheets;
    const week=$('week');
    week.disabled=false;
    week.innerHTML='<option value="">Chọn tuần…</option>'+list.map(s=>`<option>${esc(s.name)}</option>`).join('');
    $('teacher').disabled=true;$('analyze').disabled=true;$('compare').disabled=true;$('export').disabled=true;clearResults();
    if(list.length){week.value=list[0].name;populateTeachers();}
  };

  $('week').onchange=populateTeachers;
  if(typeof wb!=='undefined'&&wb)window.fillWeeks();
})();
(function(){
  const script=document.createElement('script');
  script.src='analysis-fix.js?v=20260718.4';
  script.defer=true;
  document.body.appendChild(script);
})();

(function(){
  window.renderPreview=function(a){
    const ds=[2,3,4,5,6,7];
    const end=a.start?new Date(a.start.getTime()+5*864e5):null;
    let rows='';

    for(const ses of ['Sáng','Chiều']){
      const sch=ds.map(d=>schools(a,d,ses));
      rows+=`<tr><td class="session" rowspan="6">${ses}</td><td class="session">Tiết</td>${sch.map(x=>`<td class="school">${x.map(esc).join(' / ')}${x.length?'\n(GA  )':''}</td>`).join('')}</tr>`;
      for(let p=1;p<=5;p++){
        rows+=`<tr><td>Tiết ${p}</td>${ds.map((d,i)=>{
          const pri=sch[i][0];
          return `<td>${at(a,d,ses,p).map(e=>`<span class="${pri&&e.school!==pri?'red':''}">${esc(e.className)}</span>`).join(' & ')}</td>`;
        }).join('')}</tr>`;
      }
    }

    $('caption').textContent=a.teacherName+' • '+a.total+' tiết';
    $('preview').innerHTML=`<div class="sheet"><div class="title"><h2>LỊCH BÁO GIẢNG NĂM HỌC ${$('year').value} - ${+$('year').value+1}</h2><h3>Tuần ${a.week||'...'}</h3><p>${a.start?'(Từ ngày '+a.start.toLocaleDateString('vi-VN')+' đến ngày '+end.toLocaleDateString('vi-VN')+')':'(Chưa xác định ngày từ tên sheet)'}</p></div><table class="report"><tr>${['Buổi','Tiết',...ds.map(day)].map(x=>`<th style="height:62px;vertical-align:middle">${x}</th>`).join('')}</tr>${rows}</table><div class="foot"><span>TỔNG: ${a.total} tiết</span><span>Giáo viên: ${esc(a.teacherName)}</span></div></div>`;
    $('previewCard').hidden=false;
  };
})();
