'use strict';
(function(){
  const VERSION='20260912.1';
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  const pad2=v=>String(Number(v)||0).padStart(2,'0');
  const dateKey=d=>d instanceof Date&&!Number.isNaN(d.getTime())?`${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`:'';
  const dayOffset=day=>Number(day)===8?6:Number(day)-2;
  const weekAssistLabel=count=>`${Math.max(0,Number(count)||0)} Trợ (P)`;
  function entryDateForWeek(weekStart,day){
    if(!(weekStart instanceof Date)||Number.isNaN(weekStart.getTime()))return null;
    const offset=dayOffset(day);if(!Number.isFinite(offset)||offset<0||offset>6)return null;
    const d=new Date(weekStart.getFullYear(),weekStart.getMonth(),weekStart.getDate(),12,0,0,0);d.setDate(d.getDate()+offset);return d;
  }
  function countEntriesInMonth(entries,weekStart,year,month){
    return(entries||[]).filter(e=>{const d=entryDateForWeek(weekStart,e?.day);return d&&d.getFullYear()===Number(year)&&d.getMonth()+1===Number(month)}).length;
  }

  if(typeof module!=='undefined'&&module.exports){
    module.exports={VERSION,dateKey,dayOffset,weekAssistLabel,entryDateForWeek,countEntriesInMonth};
    return;
  }

  const q=id=>document.getElementById(id);
  const book=()=>{try{return typeof wb!=='undefined'?wb:null}catch{return null}};
  const previewApi=()=>window.LBGAssistPPreviewSafe||null;
  const currentWs=()=>{const b=book(),name=txt(q('week')?.value);return b&&name?b.getWorksheet(name):null};
  const scan=(ws,code)=>previewApi()?.scanAssist?.(ws,code)||[];

  function weekStart(ws){
    if(!ws)return null;
    try{
      const d=typeof startDate==='function'?startDate(ws.name):null;
      return d instanceof Date&&!Number.isNaN(d.getTime())?d:null;
    }catch{return null}
  }
  function selectedSchoolYearStart(){return Number(q('year')?.value)||new Date().getFullYear()}
  function calendarYearForMonth(month){const y=selectedSchoolYearStart();return Number(month)>=8?y:y+1}

  function clearWeekTotal(){q('lbgAssistPWeekTotal')?.remove()}
  function renderWeekTotal(){
    clearWeekTotal();
    const ws=currentWs(),code=txt(q('teacher')?.value),summary=q('summary');
    if(!ws||!code||!summary)return 0;
    const count=scan(ws,code).length;
    if(!count)return 0;
    const line=document.createElement('div');line.id='lbgAssistPWeekTotal';
    line.style.cssText='grid-column:1/-1;margin-top:7px;padding-top:7px;border-top:1px dashed #e7b98f;text-align:center;font-weight:900;color:#9a5b36';
    line.textContent=weekAssistLabel(count);
    line.title=`Đọc tự động từ mã ${txt(code).toUpperCase()}P • không cộng vào tổng tiết chính`;
    summary.appendChild(line);return count;
  }

  function worksheetForWeekKey(key){
    const b=book();if(!b||!key)return null;
    const found=[];
    for(const ws of b.worksheets){const d=weekStart(ws);if(d&&dateKey(d)===key)found.push(ws)}
    return found[found.length-1]||null;
  }
  function countWeekForMonth(ws,code,year,month){
    const start=weekStart(ws);return start?countEntriesInMonth(scan(ws,code),start,year,month):0;
  }
  function markMonthlyInput(input,count,code){
    const shown=count?String(count):'';
    if(input.value!==shown)input.value=shown;
    input.readOnly=true;input.dataset.lbgAssistPAuto=String(count);
    input.title=`Tự động đọc từ mã ${txt(code).toUpperCase()}P`;
    input.dispatchEvent(new Event('input',{bubbles:true}));
    const label=input.closest('label');
    if(label){
      let small=label.querySelector('.lbg-assist-p-auto-note');
      if(!small){small=document.createElement('small');small.className='lbg-assist-p-auto-note';small.style.cssText='display:block;margin-top:3px;color:#9a5b36;font-size:10px;font-weight:800';label.appendChild(small)}
      small.textContent=`Tự động: ${weekAssistLabel(count)}`;
    }
  }
  function syncMonthlyAssist(){
    const code=txt(q('month2Teacher')?.value),month=Number(q('month2Select')?.value),preview=q('month2Preview');
    if(!code||month<1||month>12||!preview)return{weeks:0,total:0};
    const year=calendarYearForMonth(month),inputs=[...preview.querySelectorAll('.mt-assist')];
    let total=0,weeks=0;
    for(const input of inputs){
      const ws=worksheetForWeekKey(txt(input.dataset.week));
      const count=ws?countWeekForMonth(ws,code,year,month):0;
      markMonthlyInput(input,count,code);total+=count;weeks++;
    }
    const totalNode=q('month2Assist');if(totalNode)totalNode.textContent=String(total);
    return{weeks,total};
  }

  function updateBanner(){
    const box=q('lbgAssistPTestBanner');if(!box)return;
    box.innerHTML='<b>🧪 PR TEST — TRỢ GIẢNG (P), GIAI ĐOẠN 2</b><br>Đã thêm <b>(P)</b> đúng ô, dòng tổng riêng <b>“n Trợ (P)”</b> và tự điền Trợ (P) trong Bảng kê tháng. Vẫn không sửa tính tiết chính, GA, dấu +, dấu &, Excel, Google Sheets, check-in hay phân quyền.';
  }
  function onClick(event){
    const button=event.target?.closest?.('button');if(!button)return;
    if(button.id==='analyze'){
      setTimeout(renderWeekTotal,180);setTimeout(renderWeekTotal,430);return;
    }
    if(button.id==='month2Build'){
      setTimeout(syncMonthlyAssist,180);setTimeout(syncMonthlyAssist,480);setTimeout(syncMonthlyAssist,900);
    }
  }
  function onChange(event){
    if(['week','teacher'].includes(event.target?.id))clearWeekTotal();
  }
  function install(){
    document.addEventListener('click',onClick,false);document.addEventListener('change',onChange,false);
    setTimeout(updateBanner,120);setTimeout(updateBanner,500);
    window.LBGAssistPSummaryMonthlySafe={version:VERSION,weekAssistLabel,entryDateForWeek,countEntriesInMonth,renderWeekTotal,syncMonthlyAssist,countWeekForMonth};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
