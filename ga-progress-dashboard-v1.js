'use strict';
(function(root,factory){
  const api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.LBGGaProgressDashboardV1=api;
  if(root&&root.document)api.install();
})(typeof window!=='undefined'?window:globalThis,function(root){
  const VERSION='20261004.1';
  const KNS_SEQUENCE=[1,2,4,5,7,8,9,10,11,12,14,15,17,18,19,21,22,24,25,26,28,29,30,31,33,34];
  const STEM_SEQUENCE=[3,6,13,16,20,23,27,32,35];
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  const fold=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase().replace(/\s+/g,' ');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sourceCache=new Map();

  function seqFor(track){return track==='stem'?STEM_SEQUENCE:KNS_SEQUENCE}
  function nextGa(track,ga){
    const seq=seqFor(track);
    if(ga===null||ga===undefined||txt(ga)==='')return seq[0]??null;
    const i=seq.indexOf(Number(ga));
    return i>=0?(seq[i+1]??null):(seq.find(x=>x>Number(ga))??seq[0]??null);
  }
  function dateValue(v){
    if(v instanceof Date&&!Number.isNaN(v.getTime()))return v.getTime();
    const n=Date.parse(v||'');return Number.isFinite(n)?n:0;
  }
  function classMember(value){
    const m=txt(value).match(/^([1-5])\s*\/\s*([A-ZÀ-Ỹ0-9]{1,5})$/i);
    return m?`${Number(m[1])}/${String(m[2]).toUpperCase()}`:'';
  }
  function classSortValue(value){
    const m=txt(value).match(/^([1-5])\/([0-9]+)$/);if(m)return[Number(m[1]),Number(m[2]),''];
    const n=txt(value).match(/^([1-5])\/(.+)$/);if(n)return[Number(n[1]),9999,n[2]];
    const g=txt(value).match(/KHỐI\s*([1-5])/i);return[g?Number(g[1]):99,9999,txt(value)];
  }
  function compareClass(a,b){
    const aa=classSortValue(a),bb=classSortValue(b);
    return aa[0]-bb[0]||aa[1]-bb[1]||String(aa[2]).localeCompare(String(bb[2]),'vi');
  }
  function isWholeGradeEvent(ev){
    const f=fold(ev?.classDisplay||ev?.classId);
    return new RegExp(`\\b(?:KHOI|LOP)\\s*${Number(ev?.grade)}\\s*\\(\\s*\\d+\\s*LOP\\s*\\)`).test(f)||new RegExp(`^G${Number(ev?.grade)}:KHOI\\s*${Number(ev?.grade)}\\b`).test(f);
  }
  function specificMembers(ev){
    const out=[];
    for(const raw of Array.isArray(ev?.members)?ev.members:[]){const key=classMember(raw);if(key&&!out.includes(key))out.push(key)}
    return out;
  }
  function locationMeta(ev){
    const atom=Array.isArray(ev?.atoms)&&ev.atoms.length?ev.atoms[0]:{};
    let school=txt(atom?.schoolName||atom?.school),site=txt(atom?.siteDisplay||atom?.siteName);
    if(!school){
      const label=txt(ev?.school),parts=label.split(/\n+/).map(txt).filter(Boolean);school=parts[0]||'Chưa xác định';if(!site&&parts.length>1)site=parts.slice(1).join(' • ');
    }
    return{school:school||'Chưa xác định',site,locationKey:txt(ev?.locationKey)};
  }
  function compactTrackEvents(events,track){
    const sorted=[...(events||[])].filter(e=>e?.track===track).sort((a,b)=>dateValue(a?.date)-dateValue(b?.date)||Number(a?.period||0)-Number(b?.period||0));
    const out=[],seen=new Set();
    for(const ev of sorted){const k=`${txt(ev?.sheet)}|${ev?.ga??'?'}`;if(seen.has(k))continue;seen.add(k);out.push(ev)}
    return out;
  }
  function summarizeTrack(events,track){
    const compact=compactTrackEvents(events,track),known=compact.filter(e=>Number.isFinite(Number(e?.ga))),lastEvent=compact[compact.length-1]||null,lastKnown=known[known.length-1]||null;
    const lastGa=lastKnown?Number(lastKnown.ga):null,next=nextGa(track,lastGa);
    return{
      track,count:compact.length,lastGa,nextGa:next,lastSheet:txt(lastEvent?.sheet),lastDate:txt(lastEvent?.dateKey),done:lastGa!==null&&next===null,
      history:compact.map(ev=>({sheet:txt(ev?.sheet),dateKey:txt(ev?.dateKey),ga:Number.isFinite(Number(ev?.ga))?Number(ev.ga):null,source:txt(ev?.gaSource),period:Number(ev?.period)||null}))
    };
  }
  function buildKnownClasses(events){
    const known=new Map();
    for(const ev of events||[]){
      const meta=locationMeta(ev),key=`${meta.locationKey}|${Number(ev?.grade)}`;
      if(!known.has(key))known.set(key,new Set());
      for(const member of specificMembers(ev))known.get(key).add(member);
    }
    return known;
  }
  function memberListForEvent(ev,known){
    const specific=specificMembers(ev);if(specific.length)return specific;
    const meta=locationMeta(ev),key=`${meta.locationKey}|${Number(ev?.grade)}`;
    if(isWholeGradeEvent(ev)){
      const members=[...(known.get(key)||[])].sort(compareClass);
      if(members.length)return members;
      return[`KHỐI ${Number(ev?.grade)}`];
    }
    const raw=txt(ev?.classDisplay),single=classMember(raw);if(single)return[single];
    return[raw||`KHỐI ${Number(ev?.grade)}`];
  }
  function recentRhythm(events,limit=6){
    const sorted=[...(events||[])].sort((a,b)=>dateValue(a?.date)-dateValue(b?.date)||Number(a?.period||0)-Number(b?.period||0)),seen=new Set(),out=[];
    for(const ev of sorted){
      const k=`${txt(ev?.sheet)}|${txt(ev?.track)}|${ev?.ga??'?'}`;if(seen.has(k))continue;seen.add(k);
      out.push({track:ev?.track==='stem'?'stem':'kns',ga:Number.isFinite(Number(ev?.ga))?Number(ev.ga):null,sheet:txt(ev?.sheet)});
    }
    return out.slice(-Math.max(1,Number(limit)||6));
  }
  function buildClassProgress(history){
    const events=[...(history?.events||[])].sort((a,b)=>dateValue(a?.date)-dateValue(b?.date)||Number(a?.period||0)-Number(b?.period||0)||txt(a?.id).localeCompare(txt(b?.id))),known=buildKnownClasses(events),rows=new Map();
    for(const ev of events){
      const meta=locationMeta(ev),members=memberListForEvent(ev,known);
      for(const member of members){
        const key=[meta.locationKey,Number(ev?.grade),member].join('|');
        if(!rows.has(key))rows.set(key,{key,locationKey:meta.locationKey,school:meta.school,site:meta.site,grade:Number(ev?.grade)||null,className:member,events:[],warnings:[],notes:[]});
        const row=rows.get(key);row.events.push(ev);if(!row.site&&meta.site)row.site=meta.site;if((ev?.gaSource==='conflict'||ev?.historyMismatch===true)&&!row.warnings.includes('Mâu thuẫn lịch sử GA'))row.warnings.push('Mâu thuẫn lịch sử GA');if(ev?.ga===null||ev?.ga===undefined){if(!row.warnings.includes('Có lần dạy chưa xác định GA'))row.warnings.push('Có lần dạy chưa xác định GA')}if(ev?.partialHistory===true&&!row.notes.includes('Có giai đoạn lớp gộp/tách được nối theo lịch sử'))row.notes.push('Có giai đoạn lớp gộp/tách được nối theo lịch sử');
      }
    }
    const out=[];
    for(const row of rows.values()){
