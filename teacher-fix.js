'use strict';
(function(){
  const blockedCodes=new Set(['SÁNG','CHIỀU','THỨ','TIẾT','TỔNG']);

  function keyOf(value){
    return norm(value).normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/Đ/g,'D').replace(/đ/g,'d')
      .toUpperCase().replace(/[^A-Z0-9]/g,'');
  }

  function timetableCodeCounts(ws){
    const counts=new Map();
    ws.eachRow({includeEmpty:false},row=>{
      for(let c=4;c<=Math.min(row.cellCount,73);c++){
        const code=norm(row.getCell(c).text).toUpperCase();
        if(!code||code.length>18||blockedCodes.has(code))continue;
        if(/^\d+$/.test(code)||/^\d+\/\d+$/.test(code))continue;
        if(!/^[A-ZÀ-ỸĐ0-9.]+$/.test(code))continue;
        counts.set(code,(counts.get(code)||0)+1);
      }
    });
    return counts;
  }

  function findTeacherRows(ws){
    let header=null;
    ws.eachRow({includeEmpty:false},row=>{
      row.eachCell({includeEmpty:false},cell=>{
        if(!header&&/^TÊN\s*GV$/i.test(norm(cell.text)))header={row:row.number,col:cell.col};
      });
    });
    if(!header)return [];
    const rows=[];
    for(let r=header.row+1;r<=ws.rowCount;r++){
      const raw=norm(ws.getCell(r,header.col).text);
      if(!raw)continue;
      if(/^(off|tc|tổng\s*lớp)/i.test(raw))break;
      if(/^CTV\b/i.test(raw)||/\bCTV$/i.test(raw))continue;
      const countCell=ws.getCell(r,header.col+1);
      const expected=Number(String(countCell.value??countCell.text).replace(/[^0-9.-]/g,''))||0;
      rows.push({name:raw.replace(/^\d+[.)-]?\s*/,''),expected});
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
    if(teacher.expected>0)score+=count===teacher.expected?1400:-850;
    for(const alias of aliases){
      if(alias===codeKey)score+=1100;
      else if(alias.endsWith(codeKey)||codeKey.endsWith(alias))score+=650;
      else if(last&&alias.endsWith(last)&&codeKey.endsWith(last))score+=300;
    }
    if(codeKey===last)score+=600;
    if(base===last)score+=540;
    if(last&&codeKey.endsWith(last))score+=320;
    if(previous&&codeKey===previous[0]+last)score+=500;
    if(previous&&base===previous[0]+last)score+=460;
    if(previous&&codeKey===previous+last)score+=350;
    if(tokens.includes(codeKey))score+=300;
    if(last&&codeKey.includes(last))score+=190;
    if(previous&&codeKey.includes(previous))score+=90;
    return score;
  }

  window.teachers=function(ws){
    const counts=timetableCodeCounts(ws);
    const summary=findTeacherRows(ws);
    const mapped=[],used=new Set();

    for(const teacher of summary.filter(x=>x.expected>0)){
      const ranked=[...counts]
        .filter(([code])=>!used.has(code))
        .map(([code,count])=>({code,count,score:scoreTeacher(teacher,code,count)}))
        .sort((a,b)=>b.score-a.score);
      const best=ranked[0];
      if(best&&best.score>=500){
        used.add(best.code);
        mapped.push({
          name:teacher.name.replace(/\s*\([^)]*\)\s*/g,' ').replace(/\s+/g,' ').trim(),
          code:best.code,
          expected:teacher.expected
        });
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
    if(!ws){
      teacher.disabled=true;
      teacher.innerHTML='<option>Chọn tuần trước</option>';
      return;
    }
    const list=window.teachers(ws);
    teacher.disabled=false;
    teacher.innerHTML='<option value="">Chọn giáo viên…</option>'+list.map(x=>
      `<option value="${esc(x.code)}" data-name="${esc(x.name)}">${esc(x.name)} — ${esc(x.code)}${x.expected?` (${x.expected} tiết)`:''}</option>`
    ).join('');
    if(!list.length)teacher.innerHTML='<option value="">Không tìm thấy giáo viên</option>';
    $('analyze').disabled=true;
    $('compare').disabled=true;
    $('export').disabled=true;
    clearResults();
  }

  window.fillWeeks=function(){
    const found=wb.worksheets.filter(weekLike),list=found.length?found:wb.worksheets;
    const week=$('week');
    week.disabled=false;
    week.innerHTML='<option value="">Chọn tuần…</option>'+list.map(s=>`<option>${esc(s.name)}</option>`).join('');
    $('teacher').disabled=true;
    $('analyze').disabled=true;
    $('compare').disabled=true;
    $('export').disabled=true;
    clearResults();
    if(list.length){week.value=list[0].name;populateTeachers();}
  };

  $('week').onchange=populateTeachers;
  if(typeof wb!=='undefined'&&wb)window.fillWeeks();
})();
