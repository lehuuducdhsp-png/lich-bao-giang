'use strict';
(function(){
  const q=id=>document.getElementById(id);
  const text=v=>String(v??'').replace(/\r/g,'').trim();
  const html=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const CODE_RE=/^[A-ZÀ-ỸĐ]{2,12}$/;
  const STOP=new Set(['SÁNG','CHIỀU','THỨ','TIẾT','TỔNG','BUỔI','CHỦ NHẬT']);

  function currentWorksheet(){
    try{
      if(typeof wb==='undefined'||!wb)return null;
      const name=q('week')?.value;if(!name)return null;
      return wb.getWorksheet(name)||null;
    }catch{return null}
  }

  function weekHasSunday(ws){
    if(!ws)return false;
    let found=false;
    ws.eachRow({includeEmpty:false},row=>{
      if(found)return;
      for(let c=64;c<=73;c++){
        const value=text(row.getCell(c).text).toUpperCase();
        if(value&&CODE_RE.test(value)&&!STOP.has(value)){found=true;break}
      }
    });
    return found;
  }

  function reportDays(){return weekHasSunday(currentWorksheet())?[2,3,4,5,6,7,8]:[2,3,4,5,6,7]}
  function dayLabel(d){return d===8?'Chủ nhật':'Thứ '+d}
  function dateEnd(start,hasSunday){return start?new Date(start.getTime()+(hasSunday?6:5)*864e5):null}

  function installStyle(){
    if(q('lbgSundayDynamicCss'))return;
    const s=document.createElement('style');s.id='lbgSundayDynamicCss';
    s.textContent='.sheet.lbg-has-sunday{min-width:1120px}.lbg-sunday-badge{display:inline-flex;align-items:center;margin-left:7px;padding:3px 7px;border-radius:999px;background:#fff7ed;color:#9a3412;border:1px solid #fed7aa;font:700 10px/1.2 system-ui,sans-serif}';
    document.head.appendChild(s);
  }

  function installPreview(){
    if(typeof renderPreview!=='function'||typeof schools!=='function'||typeof at!=='function')return false;
    renderPreview=function(a){
      const ds=reportDays(),hasSunday=ds.includes(8),end=dateEnd(a.start,hasSunday);
      let rows='';
      for(const ses of ['Sáng','Chiều']){
        const sch=ds.map(d=>schools(a,d,ses));
        rows+=`<tr><td class="session" rowspan="6">${ses}</td><td class="session">Tiết</td>${sch.map(x=>`<td class="school">${x.map(html).join(' / ')}${x.length?'\n(GA  )':''}</td>`).join('')}</tr>`;
        for(let p=1;p<=5;p++){
          rows+=`<tr><td>Tiết ${p}</td>${ds.map((d,i)=>{const pri=sch[i][0];return`<td>${at(a,d,ses,p).map(e=>`<span class="${pri&&e.school!==pri?'red':''}">${html(e.className)}</span>`).join(' & ')}</td>`}).join('')}</tr>`;
        }
      }
      q('caption').innerHTML=`${html(a.teacherName)} • ${a.total} tiết${hasSunday?'<span class="lbg-sunday-badge">Tuần có Chủ nhật</span>':''}`;
      q('preview').innerHTML=`<div class="sheet ${hasSunday?'lbg-has-sunday':''}"><div class="title"><h2>LỊCH BÁO GIẢNG NĂM HỌC ${q('year').value} - ${+q('year').value+1}</h2><h3>Tuần ${a.week||'...'}</h3><p>${a.start?'(Từ ngày '+a.start.toLocaleDateString('vi-VN')+' đến ngày '+end.toLocaleDateString('vi-VN')+')':'(Chưa xác định ngày từ tên sheet)'}</p></div><table class="report"><tr><th rowspan="2">Buổi</th><th rowspan="2">Tiết</th>${ds.map(dayLabel).map(x=>'<th>'+x+'</th>').join('')}</tr><tr>${ds.map(()=>'<th></th>').join('')}</tr>${rows}</table><div class="foot"><span>TỔNG: ${a.total} tiết</span><span>Giáo viên: ${html(a.teacherName)}</span></div></div>`;
      q('previewCard').hidden=false;
    };
    return true;
  }

  function installExport(){
    const button=q('export');
    if(!button||button.dataset.lbgSundayDynamic==='1')return false;
    button.dataset.lbgSundayDynamic='1';
    button.onclick=async()=>{
      try{
        if(typeof result==='undefined'||!result)return;
        const a=result,ds=reportDays(),hasSunday=ds.includes(8),lastCol=2+ds.length;
        const out=new ExcelJS.Workbook(),ws=out.addWorksheet('TUẦN '+(a.week||''));
        ws.pageSetup={orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:1};
        const endCol=String.fromCharCode(64+lastCol);
        [`A1:${endCol}1`,`A2:${endCol}2`,`A3:${endCol}3`,'A5:A10','A11:A16',`A18:${endCol}18`].forEach(x=>ws.mergeCells(x));
        ws.getCell('A1').value=`LỊCH BÁO GIẢNG NĂM HỌC ${q('year').value} - ${+q('year').value+1}`;
        ws.getCell('A2').value='Tuần '+(a.week||'');
        if(a.start){const e=dateEnd(a.start,hasSunday);ws.getCell('A3').value='(Từ ngày '+a.start.toLocaleDateString('vi-VN')+' đến ngày '+e.toLocaleDateString('vi-VN')+')'}
        ws.getRow(4).values=['Buổi','Tiết',...ds.map(dayLabel)];
        for(const [ses,base] of [['Sáng',5],['Chiều',11]]){
          for(let i=0;i<6;i++){
            const r=base+i;ws.getCell(r,1).value=i?'':ses;ws.getCell(r,2).value=i?'Tiết '+i:'Tiết';
            ds.forEach((d,j)=>{
              const c=ws.getCell(r,j+3);
              if(!i){const x=schools(a,d,ses);c.value=x.length?x.join(' / ')+'\n(GA  )':''}
              else{
                const x=schools(a,d,ses),pri=x[0],items=at(a,d,ses,i);
                c.value={richText:items.flatMap((e,k)=>[{text:(k?' & ':'')+e.className,font:{name:'Times New Roman',size:12,color:{argb:pri&&e.school!==pri?'FFFF0000':'FF000000'}}}])};
              }
            });
          }
        }
        ws.getCell('A18').value='TỔNG: '+a.total+' tiết                         Giáo viên: '+a.teacherName;
        ws.columns=[{width:9},{width:10},...ds.map(()=>({width:18}))];
        for(let r=1;r<=18;r++){
          ws.getRow(r).height=r<=3?25:(r===5||r===11?42:24);
          for(let c=1;c<=lastCol;c++)style(ws.getCell(r,c),[1,2,3,18].includes(r)?'FFB9E6A5':(r===4||c<=2?'FFF6C9AE':'FFDFF5E4'),[1,2,4,5,11,18].includes(r),r===1?18:12);
        }
        const buf=await out.xlsx.writeBuffer();
        saveAs(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),'LICH_BAO_GIANG_'+a.teacherName.replace(/\s+/g,'_')+'_'+a.sheet+'.xlsx');
        if(typeof toast==='function')toast(hasSunday?'Đã xuất Excel có cột Chủ nhật':'Đã xuất file Excel');
      }catch(error){alert('Không xuất được Excel: '+(error?.message||String(error)))}
    };
    return true;
  }

  function refreshCurrentPreview(){
    try{
      if(typeof result!=='undefined'&&result&&q('previewCard')&&!q('previewCard').hidden&&typeof renderPreview==='function')renderPreview(result);
    }catch{}
  }

  function install(){installStyle();const p=installPreview(),e=installExport();if(p)refreshCurrentPreview();return p&&e}
  let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>120)clearInterval(timer)},100);
  document.addEventListener('change',event=>{if(event.target?.id==='week')setTimeout(refreshCurrentPreview,80)});
})();
