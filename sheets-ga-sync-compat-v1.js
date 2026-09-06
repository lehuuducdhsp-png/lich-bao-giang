'use strict';
(function(){
  const VERSION='20260906.1';
  const txt=v=>String(v??'').trim();
  const current=()=>{try{return result||null}catch{return null}};
  const fullLocation=e=>{
    const explicit=txt(e?.locationLabel);if(explicit)return explicit;
    const school=txt(e?.schoolName||e?.school),site=txt(e?.siteDisplay||e?.siteName);
    return site?[school,site].filter(Boolean).join('\n'):school;
  };
  const gaKey=(day,session,location)=>`${Number(day)}|${txt(session)}|${txt(location)}`;
  const validValue=v=>{const s=txt(v);if(!/^\d+$/.test(s))return null;const n=Number(s);return Number.isSafeInteger(n)&&n>=0?String(n):null};

  function findValue(data,e){
    const candidates=[txt(e?.locationKey),fullLocation(e),txt(e?.schoolName),txt(e?.school)].filter(Boolean);
    for(const location of candidates){
      const key=gaKey(e?.day,e?.session,location);
      if(!Object.prototype.hasOwnProperty.call(data,key))continue;
      const value=validValue(data[key]);if(value!==null)return value;
    }
    return null;
  }

  // Website hiện lưu GA theo locationKey chuẩn hoá, trong khi Apps Script cũ
  // tra GA bằng chuỗi trường/điểm dạy hiển thị. Trước lúc gửi, tạo thêm alias
  // tương thích; không xoá key mới và không làm thay đổi số GA đang hiển thị.
  function hydrate(a=current()){
    if(!a||!Array.isArray(a.entries)||!a.entries.length)return{added:0,total:0};
    const data=a.gaValues&&typeof a.gaValues==='object'?a.gaValues:(a.gaValues={});
    let added=0;
    for(const e of a.entries){
      const value=findValue(data,e);if(value===null)continue;
      const aliases=[txt(e?.locationKey),fullLocation(e)].filter(Boolean);
      for(const location of aliases){
        const key=gaKey(e?.day,e?.session,location);
        if(data[key]===value)continue;
        data[key]=value;added++;
      }
    }
    return{added,total:Object.keys(data).length};
  }

  document.addEventListener('click',event=>{
    const target=event.target?.closest?.('#sheetSaveOverwriteV2,#sheetSaveCopyV2');
    if(!target)return;
    hydrate();
  },true);

  window.LBGSheetsGaSyncCompatV1={version:VERSION,hydrate,gaKey,fullLocation};
})();
