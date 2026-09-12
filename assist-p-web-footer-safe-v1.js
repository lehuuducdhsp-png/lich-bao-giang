'use strict';
(function(){
  const VERSION='20260912.1';
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  const assistLabel=count=>`${Math.max(0,Number(count)||0)} Trợ (P)`;
  const footerLines=(mainText,count)=>[txt(mainText),assistLabel(count)].filter(Boolean);

  if(typeof module!=='undefined'&&module.exports){
    module.exports={VERSION,assistLabel,footerLines};
    return;
  }

  const q=id=>document.getElementById(id);
  const book=()=>{try{return typeof wb!=='undefined'?wb:null}catch{return null}};
  const currentWs=()=>{const b=book(),name=txt(q('week')?.value);return b&&name?b.getWorksheet(name):null};
  const previewApi=()=>window.LBGAssistPPreviewSafe||null;
  const scan=(ws,code)=>previewApi()?.scanAssist?.(ws,code)||[];

  function clearFooterAssist(){
    document.querySelectorAll('.lbg-assist-p-web-footer').forEach(x=>x.remove());
  }

  function patchFooter(){
    clearFooterAssist();
    const ws=currentWs(),code=txt(q('teacher')?.value);
    const footer=q('preview')?.querySelector('.foot');
    const totalNode=footer?.querySelector('span:first-child');
    if(!ws||!code||!footer||!totalNode)return 0;

    const count=scan(ws,code).length;
    if(!count)return 0;

    totalNode.style.display='flex';
    totalNode.style.flexDirection='column';
    totalNode.style.alignItems='center';
    totalNode.style.justifyContent='center';
    totalNode.style.textAlign='center';
    totalNode.style.lineHeight='1.35';

    const line=document.createElement('span');
    line.className='lbg-assist-p-web-footer';
    line.textContent=assistLabel(count);
    line.style.cssText='display:block;margin-top:2px;font-weight:700;color:inherit';
    line.title=`Đọc tự động từ mã ${txt(code).toUpperCase()}P • không cộng vào tổng tiết chính`;
    totalNode.appendChild(line);
    footer.dataset.lbgAssistPWebFooter=VERSION;
    return count;
  }

  function onClick(event){
    if(!event.target?.closest?.('#analyze'))return;
    setTimeout(patchFooter,260);
    setTimeout(patchFooter,560);
  }
  function onChange(event){if(['week','teacher'].includes(event.target?.id))clearFooterAssist()}
  function install(){
    document.addEventListener('click',onClick,false);
    document.addEventListener('change',onChange,false);
    window.LBGAssistPWebFooterSafe={version:VERSION,assistLabel,footerLines,patchFooter};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
