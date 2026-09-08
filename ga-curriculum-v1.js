'use strict';
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.LBGGaCurriculumV1=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  const VERSION='20260909.2';
  const KNS_SEQUENCE=[1,2,4,5,7,8,9,10,11,12,14,15,17,18,19,21,22,24,25,26,28,29,30,31,33,34];
  const STEM_SEQUENCE=[3,6,13,16,20,23,27,32,35];
  const KNS_SET=new Set(KNS_SEQUENCE),STEM_SET=new Set(STEM_SEQUENCE);
  const txt=v=>String(v??'').replace(/\r/g,'').trim();
  const fold=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase().replace(/\s+/g,' ');
  const keyText=v=>fold(v).replace(/[^A-Z0-9/+&.-]/g,'');

  // Số GA dưới đây là số vận hành của Ban KNS. Khối 4–5 dùng KNS 12 cho bài gốc PDF 13 và STEM 13 cho bài gốc PDF 12.
  const TITLES={
    1:{1:'Chúng mình cùng làm quen',2:'Trường em',3:'Giới thiệu kĩ năng Toán Tư duy Finger Math. Bung tay từ 0 đến 9',4:'Em tự tin',5:'Biết nói lời cảm ơn, xin lỗi',6:'Cộng, trừ trong phạm vi 4',7:'Kĩ năng làm quen bạn mới',8:'Người bạn tốt',9:'Xây dựng tình bạn tốt',10:'Nhớ ơn Thầy Cô',11:'Gia đình em',12:'Thể hiện lễ phép trong gia đình',13:'Cộng, trừ trong phạm vi 9 không bù (+-5)',14:'Thể hiện tình yêu gia đình',15:'Em phụ giúp việc nhà',16:'Cộng, trừ trong phạm vi 9 không bù (+-6)',17:'Cơ thể của em',18:'Chăm sóc bản thân',19:'Ngày Tết quê em',20:'Cộng, trừ trong phạm vi 9 không bù (+-7)',21:'Giữ gìn vệ sinh chung',22:'Em phân loại rác',23:'Cộng, trừ trong phạm vi 9 không bù (+-8, +-9)',24:'Chào mừng ngày quốc tế phụ nữ 8/3',25:'Chuẩn bị đồ dùng học tập, trang phục đến trường',26:'Bảo vệ cây xanh',27:'Bung tay từ 0 đến 99',28:'Giữ an toàn khi gặp người lạ',29:'Phòng tránh xâm hại thân thể',30:'Em đọc sách',31:'Em giới thiệu sách',32:'Cộng, trừ trong phạm vi 99 không bù',33:'An toàn nơi đông người',34:'Ứng phó khi bị lạc',35:'Cộng, trừ số có hai chữ số trong phạm vi 99 không bù bằng hai tay'},
    2:{1:'Nhận biết các mối nguy hiểm',2:'Kĩ năng phòng tránh xâm hại thân thể',3:'Giới thiệu về toán bàn tay, cách bung tay từ 0-99 và phép cộng, trừ trong phạm vi 99 không bù (+-5)',4:'Xây dựng sự tự tin',5:'Thể hiện sự tự tin',6:'Cộng, trừ trong phạm vi 99 không bù (+-6, +-7, +-8, +-9)',7:'Quan tâm giúp đỡ bạn bè',8:'Chia sẻ với bạn bè',9:'Giao tiếp nơi công cộng',10:'Nhớ ơn Thầy Cô',11:'Tình yêu gia đình',12:'Yêu thương mọi người',13:'Cộng, trừ từ 0-99 không bù (MIX)',14:'Thể hiện trách nhiệm khi làm việc nhà',15:'Em phụ giúp việc nhà',16:'Cộng, trừ 0-99 Bù 5 (+1)',17:'Xây dựng nội quy làm việc nhóm',18:'Thực hành làm việc nhóm',19:'Ngày Tết quê em',20:'Cộng, trừ 0-99 Bù 5 (+2)',21:'Tầm quan trọng của giao tiếp',22:'Giao tiếp với Thầy cô, bạn bè',23:'Ôn tập (MIX)',24:'Chào mừng ngày quốc tế phụ nữ 8/3',25:'Khám phá giác quan thị giác',26:'Quan sát hiệu quả',27:'Cộng, trừ 0-99 Bù 5 (+3)',28:'Những nguy hiểm khi ở nhà một mình',29:'Ứng phó khi gặp nguy hiểm',30:'Em đọc sách',31:'Em giới thiệu sách',32:'Cộng, trừ 0-99 Bù 5 (+4)',33:'Nhận biết thực phẩm an toàn',34:'Sử dụng thực phẩm an toàn, hiệu quả',35:'Ôn tập (MIX)'},
    3:{1:'Khám phá bản thân',2:'Phát triển bản thân',3:'Giới thiệu phương pháp Toán tư duy Abacus',4:'Em biết chịu trách nhiệm',5:'Kĩ năng bảo vệ bản thân',6:'Cộng, trừ không bù trong phạm vi 4 và +-5',7:'Kĩ năng kết bạn',8:'Xây dựng tình bạn đẹp',9:'Kĩ năng chia sẻ cùng người thân',10:'Nhớ ơn Thầy Cô',11:'Khám phá giác quan thính giác',12:'Rèn luyện kĩ năng lắng nghe hiệu quả',13:'Cộng, trừ từ 0-99 không bù',14:'Giúp đỡ ông bà, cha mẹ',15:'Em phụ giúp gia đình',16:'Ôn tập (MIX)',17:'Lập kế hoạch học tập',18:'Thực hành lập kế hoạch học tập',19:'Ngày Tết quê em',20:'Bù 5 (+1)',21:'Tầm quan trọng của thủ lĩnh nhóm',22:'Thực hành làm thủ lĩnh',23:'Bù 5 (+2)',24:'Chào mừng ngày quốc tế phụ nữ 8/3',25:'Kĩ năng tự học',26:'Thể hiện lối sống văn minh',27:'Bù 5 (+3)',28:'Nhận biết một số sự cố thường gặp',29:'Kĩ năng ứng xử khi gặp sự cố',30:'Em đọc sách',31:'Em giới thiệu sách',32:'Bù 5 (+4)',33:'Đồ vật và tình huống gây thương tích',34:'Thực hành kĩ năng sơ cứu và băng bó vết thương',35:'Ôn tập (MIX)'},
    4:{1:'Cảm xúc của em',2:'Làm chủ cảm xúc',3:'Bình lọc nước',4:'Giá trị của thời gian',5:'Xây dựng thời gian biểu',6:'Đồng hồ mặt trời',7:'Nhận biết các mâu thuẫn',8:'Giải quyết mâu thuẫn',9:'Nhớ ơn Thầy Cô',10:'Giá trị của tình bạn',11:'Kĩ năng ứng xử với bạn bè',12:'Giá trị của gia đình',13:'Kèn cổ vũ',14:'Trách nhiệm với gia đình',15:'Em hiếu thảo',16:'Thiết bị tăng âm cho điện thoại',17:'Ý nghĩa của tư duy sáng tạo',18:'Thực hành sáng tạo',19:'Ngày Tết quê em',20:'Kính thiên văn',21:'Làm quen với kĩ năng thuyết trình',22:'Thực hành thuyết trình',23:'Làm nến từ dầu ăn',24:'Chào mừng ngày quốc tế phụ nữ 8/3',25:'Môi trường quanh em',26:'Biện pháp bảo vệ môi trường',27:'Mô hình thí nghiệm về sự truyền nhiệt',28:'Nhận diện các mối nguy hiểm',29:'Ứng phó với nguy hiểm',30:'Vai trò của việc đọc sách',31:'Kĩ năng giới thiệu sách',32:'Dụng cụ vắt cam bằng tay',33:'Thoát hiểm khi có cháy',34:'Ứng phó khi gặp mưa to, sấm sét',35:'Sáng tạo đồ dùng học tập'},
    5:{1:'Lòng tự trọng',2:'Xây dựng lòng tự trọng',3:'Mô hình núi lửa phun trào',4:'Nhận biết cảm xúc',5:'Thể hiện cảm xúc',6:'Dụng cụ thổi bóng bay',7:'Nhận biết ưu điểm và khuyết điểm',8:'Kĩ năng chấp nhận người khác',9:'Nhớ ơn Thầy Cô',10:'Trách nhiệm với bạn',11:'Thể hiện trách nhiệm với bạn',12:'Kĩ năng tạo cảm hứng trong học tập',13:'Thiết bị đo độ dẫn điện',14:'Lối sống gia đình em',15:'Bảo vệ gia đình sống lành mạnh',16:'Chiếc máy hút bụi đơn giản',17:'Những vấn đề quanh ta',18:'Kĩ năng giải quyết vấn đề',19:'Ngày Tết quê em',20:'Hệ thống điện gió',21:'Nhận biết các cám dỗ',22:'Kĩ năng vượt qua cám dỗ',23:'Khám phá về hiện tượng lốc xoáy',24:'Chào mừng ngày quốc tế phụ nữ 8/3',25:'Nhận biết các nguy hiểm trên đường đi',26:'Kĩ năng đi đường một mình an toàn',27:'Chế tạo đèn ngủ thân thiện với môi trường',28:'Dấu hiệu nhận biết thiên tai',29:'Ứng phó với thiên tai',30:'Vai trò của việc đọc sách',31:'Kĩ năng giới thiệu sách',32:'Lò nướng năng lượng mặt trời',33:'Kĩ năng tiếp khách đến nhà',34:'Thích nghi với môi trường học tập mới',35:'Nước rửa tay khô diệt khuẩn'}
  };

  function category(role){const r=fold(role);if(r==='STEM')return'STEM';if(r==='KNS'||r==='CTV'||r==='CTV KNS'||r==='CTV DAY KNS')return'KNS';return'UNKNOWN'}
  function sequence(cat){return cat==='STEM'?STEM_SEQUENCE:cat==='KNS'?KNS_SEQUENCE:[]}
  function isGaFor(cat,ga){ga=Number(ga);return cat==='STEM'?STEM_SET.has(ga):cat==='KNS'?KNS_SET.has(ga):false}
  function nextGa(cat,current){const seq=sequence(cat);if(!seq.length)return null;if(current==null||!Number.isFinite(Number(current)))return seq[0];const i=seq.indexOf(Number(current));return i<0?seq.find(x=>x>Number(current))??null:seq[i+1]??null}
  function previousGa(cat,current){const seq=sequence(cat),i=seq.indexOf(Number(current));return i>0?seq[i-1]:null}
  function title(grade,ga){return TITLES[Number(grade)]?.[Number(ga)]||''}
  function gradesOf(...values){const out=[];const add=g=>{g=Number(g);if(g>=1&&g<=5&&!out.includes(g))out.push(g)};for(const value of values){const raw=txt(value);if(!raw)continue;let m;const group=/KHỐI\s*([1-5])/gi;while((m=group.exec(raw)))add(m[1]);const classes=/(?:^|[^0-9])([1-5])\s*\/\s*\d+/g;while((m=classes.exec(raw)))add(m[1]);const named=/LỚP\s*([1-5])(?:\b|\s*\/)/gi;while((m=named.exec(raw)))add(m[1])}return out}
  function memberKey(value){const raw=txt(value),m=raw.match(/KHỐI\s*([1-5])/i);return m?`KHOI${m[1]}`:keyText(raw)}

  function cooperativeKey(e){
    const cat=e.actualCategory||category(e.role),members=[...(e.members||[])].map(memberKey).filter(Boolean).sort().join('+');
    return[e.sheet||'',e.locationKey||fold(e.locationLabel||e.schoolName||e.school),e.dateKey||'',e.day||'',e.session||'',Number(e.teachingPeriod??e.period)||'',cat,members].join('|')
  }
  function coalesce(events){
    const map=new Map();
    for(const src of events||[]){
      const e={...src,actualCategory:src.actualCategory||category(src.role)},k=cooperativeKey(e);
      if(!map.has(k))map.set(k,{...e,source:[...(e.source||[])],addresses:[...(e.addresses||[])],teacherCodes:[e.code].filter(Boolean),teacherNames:[e.teacherName].filter(Boolean),roles:[e.role].filter(Boolean),manualGaValues:new Set(e.manualGa==null?[]:[Number(e.manualGa)])});
      else{
        const g=map.get(k);g.source.push(...(e.source||[]));g.addresses.push(...(e.addresses||[]));
        if(e.code&&!g.teacherCodes.includes(e.code))g.teacherCodes.push(e.code);if(e.teacherName&&!g.teacherNames.includes(e.teacherName))g.teacherNames.push(e.teacherName);if(e.role&&!g.roles.includes(e.role))g.roles.push(e.role);if(e.manualGa!=null)g.manualGaValues.add(Number(e.manualGa));
      }
    }
    const out=[...map.values()];
    for(const e of out){e.addresses=[...new Set(e.addresses.filter(Boolean))];e.source=[...e.source];e.cooperative=e.teacherCodes.length>1;e.cooperationLabel=e.cooperative?e.teacherNames.join(' + '):'';const vals=[...e.manualGaValues].filter(Number.isFinite);e.manualConflict=vals.length>1;e.manualGa=vals.length===1?vals[0]:null}
    return out.sort((a,b)=>(a.date?.getTime?.()||0)-(b.date?.getTime?.()||0)||((a.session==='Sáng'?0:1)-(b.session==='Sáng'?0:1))||Number(a.teachingPeriod??a.period)-Number(b.teachingPeriod??b.period)||Number(a.row)-Number(b.row)||Number(a.col)-Number(b.col))
  }

  function assignProgression(events){
    const states=new Map();
    for(const event of events||[]){
      const cat=event.actualCategory||category(event.role),members=event.members||[];event.actualCategory=cat;event.previousByClass=[];event.historyMismatch=false;event.anchorInvalid=false;
      if(cat==='UNKNOWN'||!event.schoolName||!members.length){event.ga=null;event.gaSource='missing';event.note='Thiếu loại giáo viên, trường hoặc lớp nên chưa thể gợi ý GA.';continue}
      const memberStates=members.map(member=>{const key=`${event.schoolKey||fold(event.schoolName)}|${memberKey(member)}|${cat}`;if(!states.has(key))states.set(key,{ga:null,events:[]});return{member,key,state:states.get(key)}});
      const manual=event.manualGa!=null?Number(event.manualGa):null;
      if(manual!=null&&isGaFor(cat,manual)){event.ga=manual;event.gaSource='manual-anchor'}
      else{
        if(manual!=null)event.anchorInvalid=true;
        const candidates=memberStates.map(x=>nextGa(cat,x.state.ga)),valid=candidates.filter(x=>x!=null),seq=sequence(cat);
        event.ga=valid.length?valid.reduce((best,x)=>seq.indexOf(x)>seq.indexOf(best)?x:best,valid[0]):null;event.gaSource=event.ga==null?'missing':'actual-history';event.historyMismatch=new Set(candidates.map(String)).size>1
      }
      for(const item of memberStates){const prev=item.state.events[item.state.events.length-1]||null;event.previousByClass.push({member:item.member,key:item.key,previous:prev})}
      for(const item of memberStates){if(event.ga!=null)item.state.ga=event.ga;item.state.events.push(event)}
    }
    return events
  }

  return{version:VERSION,KNS_SEQUENCE,STEM_SEQUENCE,TITLES,category,sequence,isGaFor,nextGa,previousGa,title,gradesOf,memberKey,cooperativeKey,coalesce,assignProgression};
});