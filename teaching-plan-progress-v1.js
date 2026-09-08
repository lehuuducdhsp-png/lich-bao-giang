'use strict';
(function(){
  const VERSION='20260909.1';
  const KNS_SEQUENCE=[1,2,4,5,7,8,9,10,11,12,14,15,17,18,19,21,22,24,25,26,28,29,30,31,33,34];
  const STEM_SEQUENCE=[3,6,13,16,20,23,27,32,35];

  const KNS_SOURCE={
    1:{1:'Chúng mình cùng làm quen',2:'Trường em',4:'Em tự tin',5:'Biết nói lời cảm ơn, xin lỗi',7:'Kĩ năng làm quen bạn mới',8:'Người bạn tốt',9:'Xây dựng tình bạn tốt',10:'Nhớ ơn Thầy Cô',11:'Gia đình em',12:'Thể hiện lễ phép trong gia đình',14:'Thể hiện tình yêu gia đình',15:'Em phụ giúp việc nhà',17:'Cơ thể của em',18:'Chăm sóc bản thân',19:'Ngày Tết quê em',21:'Giữ gìn vệ sinh chung',22:'Em phân loại rác',24:'Chào mừng ngày quốc tế phụ nữ 8/3',25:'Chuẩn bị đồ dùng học tập, trang phục đến trường',26:'Bảo vệ cây xanh',28:'Giữ an toàn khi gặp người lạ',29:'Phòng tránh xâm hại thân thể',30:'Em đọc sách',31:'Em giới thiệu sách',33:'An toàn nơi đông người',34:'Ứng phó khi bị lạc'},
    2:{1:'Nhận biết các mối nguy hiểm',2:'Kĩ năng phòng tránh xâm hại thân thể',4:'Xây dựng sự tự tin',5:'Thể hiện sự tự tin',7:'Quan tâm giúp đỡ bạn bè',8:'Chia sẻ với bạn bè',9:'Giao tiếp nơi công cộng',10:'Nhớ ơn Thầy Cô',11:'Tình yêu gia đình',12:'Yêu thương mọi người',14:'Thể hiện trách nhiệm khi làm việc nhà',15:'Em phụ giúp việc nhà',17:'Xây dựng nội quy làm việc nhóm',18:'Thực hành làm việc nhóm',19:'Ngày Tết quê em',21:'Tầm quan trọng của giao tiếp',22:'Giao tiếp với Thầy cô, bạn bè',24:'Chào mừng ngày quốc tế phụ nữ 8/3',25:'Khám phá giác quan thị giác',26:'Quan sát hiệu quả',28:'Những nguy hiểm khi ở nhà một mình',29:'Ứng phó khi gặp nguy hiểm',30:'Em đọc sách',31:'Em giới thiệu sách',33:'Nhận biết thực phẩm an toàn',34:'Sử dụng thực phẩm an toàn, hiệu quả'},
    3:{1:'Khám phá bản thân',2:'Phát triển bản thân',4:'Em biết chịu trách nhiệm',5:'Kĩ năng bảo vệ bản thân',7:'Kĩ năng kết bạn',8:'Xây dựng tình bạn đẹp',9:'Kĩ năng chia sẻ cùng người thân',10:'Nhớ ơn Thầy Cô',11:'Khám phá giác quan thính giác',12:'Rèn luyện kĩ năng lắng nghe hiệu quả',14:'Giúp đỡ ông bà, cha mẹ',15:'Em phụ giúp gia đình',17:'Lập kế hoạch học tập',18:'Thực hành lập kế hoạch học tập',19:'Ngày Tết quê em',21:'Tầm quan trọng của thủ lĩnh nhóm',22:'Thực hành làm thủ lĩnh',24:'Chào mừng ngày quốc tế phụ nữ 8/3',25:'Kĩ năng tự học',26:'Thể hiện lối sống văn minh',28:'Nhận biết một số sự cố thường gặp',29:'Kĩ năng ứng xử khi gặp sự cố',30:'Em đọc sách',31:'Em giới thiệu sách',33:'Đồ vật và tình huống gây thương tích',34:'Thực hành kĩ năng sơ cứu và băng bó vết thương'},
    4:{1:'Cảm xúc của em',2:'Làm chủ cảm xúc',4:'Giá trị của thời gian',5:'Xây dựng thời gian biểu',7:'Nhận biết các mâu thuẫn',8:'Giải quyết mâu thuẫn',9:'Nhớ ơn Thầy Cô',10:'Giá trị của tình bạn',11:'Kĩ năng ứng xử với bạn bè',13:'Giá trị của gia đình',14:'Trách nhiệm với gia đình',15:'Em hiếu thảo',17:'Ý nghĩa của tư duy sáng tạo',18:'Thực hành sáng tạo',19:'Ngày Tết quê em',21:'Làm quen với kĩ năng thuyết trình',22:'Thực hành thuyết trình',24:'Chào mừng ngày quốc tế phụ nữ 8/3',25:'Môi trường quanh em',26:'Biện pháp bảo vệ môi trường',28:'Nhận diện các mối nguy hiểm',29:'Ứng phó với nguy hiểm',30:'Vai trò của việc đọc sách',31:'Kĩ năng giới thiệu sách',33:'Thoát hiểm khi có cháy',34:'Ứng phó khi gặp mưa to, sấm sét'},
    5:{1:'Lòng tự trọng',2:'Xây dựng lòng tự trọng',4:'Nhận biết cảm xúc',5:'Thể hiện cảm xúc',7:'Nhận biết ưu điểm và khuyết điểm',8:'Kĩ năng chấp nhận người khác',9:'Nhớ ơn Thầy Cô',10:'Trách nhiệm với bạn',11:'Thể hiện trách nhiệm với bạn',13:'Kĩ năng tạo cảm hứng trong học tập',14:'Lối sống gia đình em',15:'Bảo vệ gia đình sống lành mạnh',17:'Những vấn đề quanh ta',18:'Kĩ năng giải quyết vấn đề',19:'Ngày Tết quê em',21:'Nhận biết các cám dỗ',22:'Kĩ năng vượt qua cám dỗ',24:'Chào mừng ngày quốc tế phụ nữ 8/3',25:'Nhận biết các nguy hiểm trên đường đi',26:'Kĩ năng đi đường một mình an toàn',28:'Dấu hiệu nhận biết thiên tai',29:'Ứng phó với thiên tai',30:'Vai trò của việc đọc sách',31:'Kĩ năng giới thiệu sách',33:'Kĩ năng tiếp khách đến nhà',34:'Thích nghi với môi trường học tập mới'}
  };

  const STEM_SOURCE={
    1:{3:'Giới thiệu kĩ năng Toán Tư duy Finger Math. Bung tay từ 0 đến 9',6:'Cộng, trừ trong phạm vi 4',13:'Cộng, trừ trong phạm vi 9 không bù (+-5)',16:'Cộng, trừ trong phạm vi 9 không bù (+-6)',20:'Cộng, trừ trong phạm vi 9 không bù (+-7)',23:'Cộng, trừ trong phạm vi 9 không bù (+-8, +-9)',27:'Bung tay từ 0 đến 99',32:'Cộng, trừ trong phạm vi 99 không bù',35:'Cộng, trừ số có hai chữ số trong phạm vi 99 không bù bằng hai tay'},
    2:{3:'Giới thiệu về toán bàn tay, cách bung tay từ 0-99 và phép cộng, trừ trong phạm vi 99 không bù (+-5)',6:'Cộng, trừ trong phạm vi 99 không bù (+-6, +-7, +-8, +-9)',13:'Cộng, trừ từ 0-99 không bù (MIX)',16:'Cộng, trừ 0-99 Bù 5 (+1)',20:'Cộng, trừ 0-99 Bù 5 (+2)',23:'Ôn tập (MIX)',27:'Cộng, trừ 0-99 Bù 5 (+3)',32:'Cộng, trừ 0-99 Bù 5 (+4)',35:'Ôn tập (MIX)'},
    3:{3:'Giới thiệu phương pháp Toán tư duy Abacus',6:'Cộng, trừ không bù trong phạm vi 4 và +-5',13:'Cộng, trừ từ 0-99 không bù',16:'Ôn tập (MIX)',20:'Bù 5 (+1)',23:'Bù 5 (+2)',27:'Bù 5 (+3)',32:'Bù 5 (+4)',35:'Ôn tập (MIX)'},
    4:{3:'Bình lọc nước',6:'Đồng hồ mặt trời',12:'Kèn cổ vũ',16:'Thiết bị tăng âm cho điện thoại',20:'Kính thiên văn',23:'Làm nến từ dầu ăn',27:'Mô hình thí nghiệm về sự truyền nhiệt',32:'Dụng cụ vắt cam bằng tay',35:'Sáng tạo đồ dùng học tập'},
    5:{3:'Mô hình núi lửa phun trào',6:'Dụng cụ thổi bóng bay',12:'Thiết bị đo độ dẫn điện',16:'Chiếc máy hút bụi đơn giản',20:'Hệ thống điện gió',23:'Khám phá về hiện tượng lốc xoáy',27:'Chế tạo đèn ngủ thân thiện với môi trường',32:'Lò nướng năng lượng mặt trời',35:'Nước rửa tay khô diệt khuẩn'}
  };

  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  const fold=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase().replace(/\s+/g,' ');
  const pad=n=>String(Number(n)||0).padStart(2,'0');
  const dateKey=d=>d instanceof Date&&!Number.isNaN(d.getTime())?`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`:'';
  const sequenceFor=track=>track==='stem'?STEM_SEQUENCE:KNS_SEQUENCE;
  const inSequence=(track,ga)=>sequenceFor(track).includes(Number(ga));

  function sourcePeriodFor(grade,track,ga){
    grade=Number(grade);ga=Number(ga);
    if((grade===4||grade===5)&&track==='kns'&&ga===12)return 13;
    if((grade===4||grade===5)&&track==='stem'&&ga===13)return 12;
    return ga;
  }
  function titleFor(grade,track,ga){
    grade=Number(grade);ga=Number(ga);
    if(!inSequence(track,ga))return{kind:'out',grade,track,ga,title:'Không thuộc chuỗi giáo án này'};
    const sourcePeriod=sourcePeriodFor(grade,track,ga),source=track==='stem'?STEM_SOURCE:KNS_SOURCE,title=source[grade]?.[sourcePeriod]||'';
    return title?{kind:'lesson',grade,track,ga,sourcePeriod,title,overridden:sourcePeriod!==ga}:{kind:'unknown',grade,track,ga,sourcePeriod,title:'Chưa có tên bài trong kế hoạch'};
  }

  function gradesOf(...values){
    const out=[],add=g=>{g=Number(g);if(g>=1&&g<=5&&!out.includes(g))out.push(g)};
    for(const value of values){const raw=txt(value);if(!raw)continue;let m;const group=/KHỐI\s*([1-5])/gi;while((m=group.exec(raw)))add(m[1]);const classes=/(?:^|[^0-9])([1-5])\s*\/\s*\d+/g;while((m=classes.exec(raw)))add(m[1]);const named=/LỚP\s*([1-5])(?:\b|\s*\/)/gi;while((m=named.exec(raw)))add(m[1])}
    return out;
  }

  function fontTone(cell){
    try{
      const c=cell?.font?.color||{},indexed=Number(c.indexed);if(indexed===10)return'red';if(indexed===12)return'blue';
      const rgb=String(c.argb||c.rgb||'').slice(-6).toUpperCase();if(/^[0-9A-F]{6}$/.test(rgb)){const[r,g,b]=[rgb.slice(0,2),rgb.slice(2,4),rgb.slice(4,6)].map(x=>parseInt(x,16));if(r>=100&&r>g*1.28&&r>b*1.20)return'red';if(b>=90&&b>r*1.25&&b>g*1.05)return'blue'}
    }catch{}
    return'black';
  }
  function roleFor(entry,ws){
    const code=txt(entry?.sourceCode||entry?.code).toUpperCase();if(/\+$/.test(code))return{tone:'plus',track:'none',role:'plus',label:'Tiết cộng'};
    let cell=null;try{if(ws&&entry?.row&&entry?.col)cell=ws.getCell(entry.row,entry.col)}catch{}
    const tone=fontTone(cell);if(tone==='red')return{tone,track:'stem',role:'stem',label:'STEM'};if(tone==='blue')return{tone,track:'kns',role:'ctv-kns',label:'CTV KNS'};return{tone:'black',track:'kns',role:'kns',label:'KNS'};
  }

  const actualPeriod=e=>Number(e?.teachingPeriod??e?.period??e?.slotPeriod)||null;
  const locationKey=e=>txt(e?.locationKey)||`${fold(e?.schoolName||e?.school)}|${fold(e?.siteDisplay||e?.siteName)}`;
  const classKey=e=>fold(e?.classRaw||e?.className).replace(/\s*-\s*TIET\s*[1-5]\b/g,'').replace(/\s+/g,' ').trim();

  function sheetStart(ws,opts={}){
    if(typeof opts.startDateFor==='function'){const d=opts.startDateFor(ws);if(d instanceof Date&&!Number.isNaN(d.getTime()))return d}
    try{const d=typeof window.startDate==='function'?window.startDate(ws?.name):null;if(d instanceof Date&&!Number.isNaN(d.getTime()))return d}catch{}
    return null;
  }
  function eventDate(ws,e,opts={}){const start=sheetStart(ws,opts);if(!start)return null;const day=Number(e?.day),offset=day===8?6:day-2;if(offset<0||offset>6)return null;const d=new Date(start.getFullYear(),start.getMonth(),start.getDate(),12);d.setDate(d.getDate()+offset);return d}
  function enrichAssignment(entry,ws,opts={}){const role=roleFor(entry,ws),date=eventDate(ws,entry,opts);return{...entry,...role,date,dateKey:dateKey(date),teachingPeriod:actualPeriod(entry),locationKey:locationKey(entry),classKey:classKey(entry),grades:gradesOf(entry?.classRaw,entry?.className)}}

  const eventId=(atom,grade)=>[atom.dateKey,txt(atom.session),atom.teachingPeriod,atom.locationKey,Number(grade),atom.track,atom.classKey].join('|');
  const progressionKey=(atom,grade)=>[atom.locationKey,Number(grade),atom.track].join('|');
  const cycleId=(atom,grade)=>[progressionKey(atom,grade),atom.dateKey].join('|');

  function locationCandidates(e){const schoolName=txt(e?.schoolName||e?.school),siteDisplay=txt(e?.siteDisplay||e?.siteName),canonical=locationKey(e),label=txt(e?.locationLabel)||(siteDisplay?[schoolName,siteDisplay].filter(Boolean).join('\n'):schoolName);return[...new Set([canonical,label,txt(e?.school),schoolName].filter(Boolean))]}
  function activeVersion(){try{return typeof window.activeId!=='undefined'&&window.activeId?window.activeId:'active'}catch{return'active'}}
  function readStore(key){try{if(typeof localStorage==='undefined')return null;const v=JSON.parse(localStorage.getItem(key)||'null');return v&&typeof v==='object'?v:null}catch{return null}}
  function storedGa(sheetName,entry,code){
    const version=activeVersion(),day=Number(entry?.day),session=txt(entry?.session),stores=[readStore(`lbgGaManualV2:${version}:${txt(sheetName)}:${txt(code)}`),readStore(`lbgGaManualV1:${version}:${txt(sheetName)}:${txt(code)}`)].filter(Boolean);
    for(const store of stores)for(const loc of locationCandidates(entry)){const raw=store[`${day}|${session}|${loc}`];if(raw===undefined||raw===null||txt(raw)==='')continue;const n=Number(raw);if(Number.isFinite(n))return Math.round(n)}return null;
  }

  function shiftGa(track,ga,delta){const seq=sequenceFor(track),i=seq.indexOf(Number(ga)),j=i+Number(delta);return i>=0&&j>=0&&j<seq.length?seq[j]:null}
  function assignProgression(cycles,track){
    const seq=sequenceFor(track),ordered=[...cycles].sort((a,b)=>a.time-b.time||a.id.localeCompare(b.id)),anchors=[];
    ordered.forEach((c,i)=>{if(c.anchorGa!=null&&seq.includes(Number(c.anchorGa)))anchors.push({i,ga:Number(c.anchorGa)})});
    ordered.forEach((c,i)=>{
      if(c.anchorGa!=null&&seq.includes(Number(c.anchorGa))){c.ga=Number(c.anchorGa);c.gaSource='manual';c.gaConfidence='manual';return}
      if(anchors.length){let min=Infinity,candidates=[];for(const a of anchors){const d=Math.abs(i-a.i);if(d<min){min=d;candidates=[]}if(d===min){const g=shiftGa(track,a.ga,i-a.i);if(g!=null)candidates.push(g)}}const uniq=[...new Set(candidates)];if(uniq.length===1){c.ga=uniq[0];c.gaSource='nearest';c.gaConfidence='nearest-anchor';return}c.ga=null;c.gaSource='ambiguous';c.gaConfidence='conflict';return}
      c.ga=seq[i]??null;c.gaSource=c.ga==null?'unknown':'counted';c.gaConfidence=c.ga==null?'unknown':'from-first-event';
    });
    return ordered;
  }

  function buildLedger(book,opts={}){
    const parser=opts.parser||window.LBGTkbParserV2,events=new Map(),cycles=new Map(),progressions=new Map(),byAddress=new Map(),warnings=[];
    if(!book||!parser?.scanAssignments)return{events:[],cycles:[],byAddress,warnings:['Bộ đọc TKB chưa sẵn sàng.']};
    for(const ws of book.worksheets||[]){
      let entries=[];try{entries=parser.scanAssignments(ws)||[]}catch(error){warnings.push(`${ws?.name||'Sheet'}: ${error?.message||error}`);continue}
      for(const rawEntry of entries){
        const atom=enrichAssignment({...rawEntry,sheet:ws.name},ws,opts);if(atom.track==='none'||!atom.dateKey||!atom.teachingPeriod)continue;
        for(const grade of atom.grades){
          const eid=eventId(atom,grade),pid=progressionKey(atom,grade),cid=cycleId(atom,grade);let event=events.get(eid);
          if(!event){event={id:eid,sheet:ws.name,date:atom.date,dateKey:atom.dateKey,session:atom.session,teachingPeriod:atom.teachingPeriod,locationKey:atom.locationKey,locationLabel:txt(atom.locationLabel||atom.schoolName||atom.school),grade:Number(grade),track:atom.track,classKey:atom.classKey,classLabel:txt(atom.classRaw||atom.className),participants:new Map(),addresses:new Set(),atoms:[]};events.set(eid,event)}
          event.atoms.push(atom);event.addresses.add(txt(atom.address));const pkey=txt(atom.code).toUpperCase();if(pkey&&!event.participants.has(pkey))event.participants.set(pkey,{code:txt(atom.code),name:txt(atom.teacherName||atom.code),role:atom.role,label:atom.label,tone:atom.tone});
          let cycle=cycles.get(cid);if(!cycle){cycle={id:cid,progressionKey:pid,date:atom.date,dateKey:atom.dateKey,time:atom.date.getTime(),locationKey:atom.locationKey,grade:Number(grade),track:atom.track,eventIds:new Set(),anchorValues:new Set(),anchorConflict:false,anchorGa:null,ga:null,gaSource:'',gaConfidence:''};cycles.set(cid,cycle)}cycle.eventIds.add(eid);
          let anchor=null;if(typeof opts.anchorResolver==='function'){try{anchor=opts.anchorResolver(atom,ws,grade)}catch{}}if(anchor==null)anchor=storedGa(ws.name,atom,atom.code);if(anchor!=null&&Number.isFinite(Number(anchor)))cycle.anchorValues.add(Math.round(Number(anchor)));
          byAddress.set(`${ws.name}|${txt(atom.address)}|${grade}`,eid);
        }
      }
    }
    for(const cycle of cycles.values()){if(cycle.anchorValues.size===1)cycle.anchorGa=[...cycle.anchorValues][0];else if(cycle.anchorValues.size>1){cycle.anchorConflict=true;warnings.push(`Mâu thuẫn số GA tại ${cycle.dateKey}, khối ${cycle.grade}, ${cycle.locationKey}.`)}if(!progressions.has(cycle.progressionKey))progressions.set(cycle.progressionKey,[]);progressions.get(cycle.progressionKey).push(cycle)}
    for(const list of progressions.values())assignProgression(list,list[0]?.track||'kns');
    for(const event of events.values()){const cid=[event.locationKey,event.grade,event.track,event.dateKey].join('|'),cycle=cycles.get(cid);event.ga=cycle?.ga??null;event.gaSource=cycle?.gaSource||'unknown';event.gaConfidence=cycle?.gaConfidence||'unknown';event.participants=[...event.participants.values()];event.addresses=[...event.addresses].filter(Boolean)}
    return{version:VERSION,events:[...events.values()].sort((a,b)=>a.date-b.date||String(a.session).localeCompare(String(b.session))||a.teachingPeriod-b.teachingPeriod),cycles:[...cycles.values()],byAddress,warnings};
  }

  function findEvent(ledger,sheetName,entry,grade){const id=ledger?.byAddress?.get?.(`${txt(sheetName)}|${txt(entry?.address)}|${Number(grade)}`);return id?ledger.events.find(x=>x.id===id)||null:null}
  function detectTeacherConflicts(entries,ws,opts={}){
    const atoms=(entries||[]).map(e=>enrichAssignment(e,ws,opts)).filter(e=>e.track!=='none'),groups=new Map(),red=[],yellow=[],valid=[];
    for(const atom of atoms){const k=[Number(atom.day),txt(atom.session),atom.teachingPeriod].join('|');if(!groups.has(k))groups.set(k,new Map());const byEvent=groups.get(k),eid=[atom.locationKey,atom.track,atom.classKey,atom.teachingPeriod].join('|');if(!byEvent.has(eid))byEvent.set(eid,atom)}
    for(const byEvent of groups.values()){const arr=[...byEvent.values()];if(arr.length<2)continue;const locs=new Set(arr.map(x=>x.locationKey).filter(Boolean));if(locs.size>1)red.push({arr,reason:'Cùng giáo viên, cùng tiết thực dạy nhưng khác điểm dạy/cơ sở'});else if(arr.every(x=>x.classType==='single'))yellow.push({arr,reason:`Có ${arr.length} lớp lẻ cùng một tiết thực dạy; cần kiểm tra có phải dạy gộp hợp lệ`});else valid.push({arr,reason:'Cùng điểm dạy và cùng tiết thực dạy; lớp gộp/ghép hợp lệ'})}
    return{red,yellow,valid};
  }

  window.LBGTeachingPlanProgressV1={version:VERSION,KNS_SEQUENCE,STEM_SEQUENCE,KNS_SOURCE,STEM_SOURCE,sequenceFor,sourcePeriodFor,titleFor,gradesOf,fontTone,roleFor,actualPeriod,locationKey,classKey,eventDate,enrichAssignment,eventId,progressionKey,cycleId,locationCandidates,storedGa,shiftGa,assignProgression,buildLedger,findEvent,detectTeacherConflicts};
})();