'use strict';
(function(root,factory){
  const api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.LBGTkbAssignmentCacheSafeV1=api;
  if(root&&root.document)api.install();
})(typeof window!=='undefined'?window:globalThis,function(root){
  const VERSION='20260913.1';
  const txt=v=>String(v??'').replace(/\r/g,'').trim().toUpperCase();
  const cache=new WeakMap();

  function filterAssignments(all,onlyCode=''){
    const want=txt(onlyCode);
    const list=Array.isArray(all)?all:[];
    return want?list.filter(e=>txt(e?.code)===want):list.slice();
  }

  if(typeof module==='object'&&module.exports){
    return{VERSION,filterAssignments};
  }

  function installOnce(){
    const parser=root.LBGTkbParserV2;
    // Chờ toàn bộ lớp chuẩn hóa hiện hành cài xong rồi mới cache kết quả cuối cùng.
    // Nhờ vậy /31 -> 3/1, atomic teaching, lớp/địa điểm và cảnh báo vẫn giữ nguyên.
    if(!parser?.scanAssignments||!parser.__lbgAtomicTeachingV1||!parser.__lbgClassTypoFixV1)return false;
    if(parser.scanAssignments.__lbgAssignmentCacheSafe===VERSION)return true;

    const original=parser.scanAssignments.bind(parser);
    const wrapped=function(ws,onlyCode=''){
      if(!ws)return[];
      let all=cache.get(ws);
      if(!all){
        // Quét toàn bộ worksheet đúng một lần. Các lần kiểm tra từng giáo viên sau đó chỉ lọc mảng đã chuẩn hóa.
        all=original(ws,'')||[];
        cache.set(ws,all);
      }
      return filterAssignments(all,onlyCode);
    };
    wrapped.__lbgAssignmentCacheSafe=VERSION;
    wrapped.__lbgOriginalScanAssignments=original;
    parser.scanAssignments=wrapped;
    parser.clearAssignmentCache=ws=>{if(ws)cache.delete(ws)};
    parser.__lbgAssignmentCacheSafe=VERSION;
    root.document.dispatchEvent(new CustomEvent('lbg-tkb-assignment-cache-ready',{detail:{version:VERSION}}));
    return true;
  }

  function install(){
    let tries=0;
    const tick=()=>{
      tries++;
      if(installOnce())return;
      if(tries<600)setTimeout(tick,50);
    };
    tick();
    root.document.addEventListener('lbg-atomic-teaching-v1-ready',installOnce);
    root.document.addEventListener('lbg-runtime-ready',installOnce);
    return true;
  }

  return{VERSION,filterAssignments,install};
});
