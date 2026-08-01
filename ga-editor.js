'use strict';
(function(){
  const STORE_PREFIX='lbgGaManualV1';
  const $g=id=>document.getElementById(id);

  function reportKey(a){
    const version=typeof activeId!=='undefined'&&activeId?activeId:'active';
    return `${STORE_PREFIX}:${version}:${String(a?.sheet||'')}:${String(a?.code||a?.teacherName||'')}`;
  }

  function gaKey(day,session,school){
    return `${Number(day)}|${String(session||'')}|${String(school||'')}`;
  }

  function ensureGa(a){
    if(!a)return {};
    if(a.gaValues&&typeof a.gaValues==='object')return a.gaValues;
    try{
      const saved=JSON.parse(localStorage.getItem(reportKey(a))||'{}');
      a.gaValues=saved&&typeof saved==='object'?saved:{};
    }catch{a.gaValues={};}
    return a.gaValues;
  }

  function saveGa(a){
    try{localStorage.setItem(reportKey(a),JSON.stringify(ensureGa(a)));}catch{}
  }

  function hasGa(a,day,session,school){
    return Object.prototype.hasOwnProperty.call(ensureGa(a),gaKey(day,session,school));
  }

  function gaValue(a,day,session,school){
    const value=ensureGa(a)[gaKey(day,session,school)];
    return value===undefined||value===null?'':String(value);
  }

  function safeGa(value){
    if(value===null||value===undefined||String(value).trim()==='')return '';
    const number=Number(value);
    if(!Number.isFinite(number)||number<0)return '';
    return String(Math.round(number));
  }

  function encode(value){return encodeURIComponent(String(value||''));}
  function decode(value){try{return decodeURIComponent(value||'');}catch{return value||'';}}

  function schoolEditor(a,dayNumber,session){
    const list=schools(a,dayNumber,session);
    if(!list.length)return '';
    return list.map(school=>{
      const value=gaValue(a,dayNumber,session,school);
      return `<div class="ga-school-item"><div class="ga-school-name">${esc(school)}</div><label class="ga-label">(GA <input class="ga-input" type="number" min="0" step="1" inputmode="numeric" placeholder="..." value="${esc(value)}" data-day="${dayNumber}" data-session="${encode(session)}" data-school="${encode(school)}" aria-label="Số GA của ${esc(school)}">)</label></div>`;
    }).join('<div class="ga-separator">/</div>');
  }

  function bindGaInputs(a){
    document.querySelectorAll('#preview .ga-input').forEach(input=>{
      input.addEventListener('input',event=>{
        const el=event.currentTarget;
        const dayNumber=Number(el.dataset.day);
        const session=decode(el.dataset.session);
        const school=decode(el.dataset.school);
        const key=gaKey(dayNumber,session,school);
        const value=safeGa(el.value);
        if(value==='')delete ensureGa(a)[key];
        else ensureGa(a)[key]=value;
        el.value=value;
        saveGa(a);
      });
    });
  }

  function injectStyle(){
    if($g('gaEditorStyle'))return;
    const style=document.createElement('style');
    style.id='gaEditorStyle';
    style.textContent=`
      .ga-school-item{display:grid;justify-items:center;gap:2px;padding:3px 2px}.ga-school-name{font-weight:800;line-height:1.2}.ga-label{font-weight:800;white-space:nowrap}.ga-input{width:44px;padding:2px 3px;border:1px solid #94a3b8;border-radius:5px;background:#fff;text-align:center;font:700 13px "Times New Roman",serif;color:#0f172a}.ga-input:focus{outline:2px solid #0f766e;border-color:#0f766e}.ga-separator{font-weight:800;line-height:1}.ga-help{margin:0 0 9px;padding:8px 11px;border:1px solid #bfdbfe;border-radius:10px;background:#eff6ff;color:#1e40af;font-size:12px}.school:has(.ga-input){white-space:normal;height:auto;min-height:58px}
    `;
    document.head.appendChild(style);
  }

  window.renderPreview=function(a){
    injectStyle();
    ensureGa(a);
    const ds=[2,3,4,5,6,7];
    const end=a.start?new Date(a.start.getTime()+5*864e5):null;
    let rows='';

    for(const session of ['Sáng','Chiều']){
      rows+=`<tr><td class="session" rowspan="6">${session}</td><td class="session">Tiết</td>${ds.map(d=>`<td class="school">${schoolEditor(a,d,session)}</td>`).join('')}</tr>`;
      for(let period=1;period<=5;period++){
        rows+=`<tr><td>Tiết ${period}</td>${ds.map(dayNumber=>{
          const primary=schools(a,dayNumber,session)[0];
          return `<td>${at(a,dayNumber,session,period).map(entry=>`<span class="${primary&&entry.school!==primary?'red':''}">${esc(entry.className)}</span>`).join(' & ')}</td>`;
        }).join('')}</tr>`;
      }
    }

    $('caption').textContent=a.teacherName+' • '+a.total+' tiết';
    $('preview').innerHTML=`<div class="ga-help"><b>Có thể chỉnh thủ công số GA:</b> nhập số trực tiếp vào từng ô <b>GA</b>. Số đã nhập được lưu trên máy và sẽ đi vào file Excel khi xuất.</div><div class="sheet"><div class="title"><h2>LỊCH BÁO GIẢNG NĂM HỌC ${$('year').value} - ${+$('year').value+1}</h2><h3>Tuần ${a.week||'...'}</h3><p>${a.start?'(Từ ngày '+a.start.toLocaleDateString('vi-VN')+' đến ngày '+end.toLocaleDateString('vi-VN')+')':'(Chưa xác định ngày từ tên sheet)'}</p></div><table class="report"><tr>${['Buổi','Tiết',...ds.map(day)].map(x=>`<th style="height:62px;vertical-align:middle">${x}</th>`).join('')}</tr>${rows}</table><div class="foot"><span>TỔNG: ${a.total} tiết</span><span>Giáo viên: ${esc(a.teacherName)}</span></div></div>`;
    bindGaInputs(a);
    $('previewCard').hidden=false;
  };

  function gaSchoolText(a,dayNumber,session){
    return schools(a,dayNumber,session).map(school=>{
      const value=gaValue(a,dayNumber,session,school);
      return `${school}\n(GA ${value})`;
    }).join('\n/\n');
  }

  function styleCell(cell,fill,bold=false,size=12){
    cell.alignment={horizontal:'center',vertical:'middle',wrapText:true};
    cell.font={name:'Times New Roman',size,bold};
    cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:fill}};
    cell.border={top:{style:'thin'},left:{style:'thin'},bottom:{style:'thin'},right:{style:'thin'}};
  }

  async function exportWithGa(){
    const a=typeof result!=='undefined'?result:null;
    if(!a||!Array.isArray(a.entries)||!a.entries.length){alert('Hãy nhấn Kiểm tra trước khi xuất.');return;}
    ensureGa(a);
    const button=$('export');
    const old=button.textContent;
    button.disabled=true;
    button.textContent='Đang tạo Excel…';
    try{
      const out=new ExcelJS.Workbook();
      const ws=out.addWorksheet('TUẦN '+(a.week||''));
      const ds=[2,3,4,5,6,7];
      ws.pageSetup={orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:1};
      ['A1:H1','A2:H2','A3:H3','A5:A10','A11:A16','A18:H18'].forEach(range=>ws.mergeCells(range));
      ws.getCell('A1').value=`LỊCH BÁO GIẢNG NĂM HỌC ${$('year').value} - ${+$('year').value+1}`;
      ws.getCell('A2').value='Tuần '+(a.week||'');
      if(a.start){
        const end=new Date(a.start.getTime()+5*864e5);
        ws.getCell('A3').value='(Từ ngày '+a.start.toLocaleDateString('vi-VN')+' đến ngày '+end.toLocaleDateString('vi-VN')+')';
      }
      ws.getRow(4).values=['Buổi','Tiết','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'];

      for(const [session,base] of [['Sáng',5],['Chiều',11]]){
        for(let i=0;i<6;i++){
          const row=base+i;
          ws.getCell(row,1).value=i?'':session;
          ws.getCell(row,2).value=i?'Tiết '+i:'Tiết';
          ds.forEach((dayNumber,index)=>{
            const cell=ws.getCell(row,index+3);
            if(!i){
              cell.value=gaSchoolText(a,dayNumber,session);
            }else{
              const primary=schools(a,dayNumber,session)[0];
              const items=at(a,dayNumber,session,i);
              cell.value={richText:items.flatMap((entry,k)=>[{text:(k?' & ':'')+entry.className,font:{name:'Times New Roman',size:12,color:{argb:primary&&entry.school!==primary?'FFFF0000':'FF000000'}}}])};
            }
          });
        }
      }

      ws.getCell('A18').value='TỔNG: '+a.total+' tiết                         Giáo viên: '+a.teacherName;
      ws.columns=[{width:9},{width:10},...ds.map(()=>({width:18}))];
      for(let row=1;row<=18;row++){
        ws.getRow(row).height=row<=3?25:(row===5||row===11?64:24);
        for(let col=1;col<=8;col++)styleCell(ws.getCell(row,col),[1,2,3,18].includes(row)?'FFB9E6A5':(row===4||col<=2?'FFF6C9AE':'FFDFF5E4'),[1,2,4,5,11,18].includes(row),row===1?18:12);
      }
      const buffer=await out.xlsx.writeBuffer();
      saveAs(new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),'LICH_BAO_GIANG_'+a.teacherName.replace(/\s+/g,'_')+'_'+a.sheet+'.xlsx');
      toast('Đã xuất Excel kèm số GA đã nhập.');
    }catch(error){
      console.error(error);
      alert('Không xuất được Excel: '+(error?.message||String(error)));
    }finally{
      button.disabled=false;
      button.textContent=old;
    }
  }

  function bindExport(){
    const button=$g('export');
    if(button)button.onclick=exportWithGa;
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindExport);
  else bindExport();
  setTimeout(bindExport,500);
})();
