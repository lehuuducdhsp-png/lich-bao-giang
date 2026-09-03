'use strict';
(function(){
  const PLAN_YEAR=2026;
  const PLAN_LABEL='2026–2027';
  const q=id=>document.getElementById(id);
  const escHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // Chỉ lấy bài thuộc Ban Kỹ năng sống trong Kế hoạch dạy học 2026–2027.
  // Không đưa tên bài Finger Math / Abacus / STEM vào bảng này.
  const KNS={
    1:{1:'Chúng mình cùng làm quen',2:'Trường em',4:'Em tự tin',5:'Biết nói lời cảm ơn, xin lỗi',7:'Kĩ năng làm quen bạn mới',8:'Người bạn tốt',9:'Xây dựng tình bạn tốt',10:'Nhớ ơn Thầy Cô',11:'Gia đình em',12:'Thể hiện lễ phép trong gia đình',14:'Thể hiện tình yêu gia đình',15:'Em phụ giúp việc nhà',17:'Cơ thể của em',18:'Chăm sóc bản thân',19:'Ngày Tết quê em',21:'Giữ gìn vệ sinh chung',22:'Em phân loại rác',24:'Chào mừng ngày quốc tế phụ nữ 8/3',25:'Chuẩn bị đồ dùng học tập, trang phục đến trường',26:'Bảo vệ cây xanh',28:'Giữ an toàn khi gặp người lạ',29:'Phòng tránh xâm hại thân thể',30:'Em đọc sách',31:'Em giới thiệu sách',33:'An toàn nơi đông người',34:'Ứng phó khi bị lạc'},
    2:{1:'Nhận biết các mối nguy hiểm',2:'Kĩ năng phòng tránh xâm hại thân thể',4:'Xây dựng sự tự tin',5:'Thể hiện sự tự tin',7:'Quan tâm giúp đỡ bạn bè',8:'Chia sẻ với bạn bè',9:'Giao tiếp nơi công cộng',10:'Nhớ ơn Thầy Cô',11:'Tình yêu gia đình',12:'Yêu thương mọi người',14:'Thể hiện trách nhiệm khi làm việc nhà',15:'Em phụ giúp việc nhà',17:'Xây dựng nội quy làm việc nhóm',18:'Thực hành làm việc nhóm',19:'Ngày Tết quê em',21:'Tầm quan trọng của giao tiếp',22:'Giao tiếp với Thầy cô, bạn bè',24:'Chào mừng ngày quốc tế phụ nữ 8/3',25:'Khám phá giác quan thị giác',26:'Quan sát hiệu quả',28:'Những nguy hiểm khi ở nhà một mình',29:'Ứng phó khi gặp nguy hiểm',30:'Em đọc sách',31:'Em giới thiệu sách',33:'Nhận biết thực phẩm an toàn',34:'Sử dụng thực phẩm an toàn, hiệu quả'},
    3:{1:'Khám phá bản thân',2:'Phát triển bản thân',4:'Em biết chịu trách nhiệm',5:'Kĩ năng bảo vệ bản thân',7:'Kĩ năng kết bạn',8:'Xây dựng tình bạn đẹp',9:'Kĩ năng chia sẻ cùng người thân',10:'Nhớ ơn Thầy Cô',11:'Khám phá giác quan thính giác',12:'Rèn luyện kĩ năng lắng nghe hiệu quả',14:'Giúp đỡ ông bà, cha mẹ',15:'Em phụ giúp gia đình',17:'Lập kế hoạch học tập',18:'Thực hành lập kế hoạch học tập',19:'Ngày Tết quê em',21:'Tầm quan trọng của thủ lĩnh nhóm',22:'Thực hành làm thủ lĩnh',24:'Chào mừng ngày quốc tế phụ nữ 8/3',25:'Kĩ năng tự học',26:'Thể hiện lối sống văn minh',28:'Nhận biết một số sự cố thường gặp',29:'Kĩ năng ứng xử khi gặp sự cố',30:'Em đọc sách',31:'Em giới thiệu sách',33:'Đồ vật và tình huống gây thương tích',34:'Thực hành kĩ năng sơ cứu và băng bó vết thương'},
    4:{1:'Cảm xúc của em',2:'Làm chủ cảm xúc',4:'Giá trị của thời gian',5:'Xây dựng thời gian biểu',7:'Nhận biết các mâu thuẫn',8:'Giải quyết mâu thuẫn',9:'Nhớ ơn Thầy Cô',10:'Giá trị của tình bạn',11:'Kĩ năng ứng xử với bạn bè',13:'Giá trị của gia đình',14:'Trách nhiệm với gia đình',15:'Em hiếu thảo',17:'Ý nghĩa của tư duy sáng tạo',18:'Thực hành sáng tạo',19:'Ngày Tết quê em',21:'Làm quen với kĩ năng thuyết trình',22:'Thực hành thuyết trình',24:'Chào mừng ngày quốc tế phụ nữ 8/3',25:'Môi trường quanh em',26:'Biện pháp bảo vệ môi trường',28:'Nhận diện các mối nguy hiểm',29:'Ứng phó với nguy hiểm',30:'Vai trò của việc đọc sách',31:'Kĩ năng giới thiệu sách',33:'Thoát hiểm khi có cháy',34:'Ứng phó khi gặp mưa to, sấm sét'},
    5:{1:'Lòng tự trọng',2:'Xây dựng lòng tự trọng',4:'Nhận biết cảm xúc',5:'Thể hiện cảm xúc',7:'Nhận biết ưu điểm và khuyết điểm',8:'Kĩ năng chấp nhận người khác',9:'Nhớ ơn Thầy Cô',10:'Trách nhiệm với bạn',11:'Thể hiện trách nhiệm với bạn',13:'Kĩ năng tạo cảm hứng trong học tập',14:'Lối sống gia đình em',15:'Bảo vệ gia đình sống lành mạnh',17:'Những vấn đề quanh ta',18:'Kĩ năng giải quyết vấn đề',19:'Ngày Tết quê em',21:'Nhận biết các cám dỗ',22:'Kĩ năng vượt qua cám dỗ',24:'Chào mừng ngày quốc tế phụ nữ 8/3',25:'Nhận biết các nguy hiểm trên đường đi',26:'Kĩ năng đi đường một mình an toàn',28:'Dấu hiệu nhận biết thiên tai',29:'Ứng phó với thiên tai',30:'Vai trò của việc đọc sách',31:'Kĩ năng giới thiệu sách',33:'Kĩ năng tiếp khách đến nhà',34:'Thích nghi với môi trường học tập mới'}
  };

  // Khối 1–3: các tiết Toán tư duy; Khối 4–5: các tiết STEM.
  const NON_KNS={
    1:new Set([3,6,13,16,20,23,27,32,35]),2:new Set([3,6,13,16,20,23,27,32,35]),3:new Set([3,6,13,16,20,23,27,32,35]),
    4:new Set([3,6,12,16,20,23,27,32,35]),5:new Set([3,6,12,16,20,23,27,32,35])
  };

  const DAY_NAME={2:'Hai',3:'Ba',4:'Tư',5:'Năm',6:'Sáu',7:'Bảy',8:'Chủ nhật'};
  let lastSignature='';

  function addCss(){
    if(q('knsLessonDetailV1Css'))return;
    const style=document.createElement('style');style.id='knsLessonDetailV1Css';style.textContent=`
      #detailCard .lbg-kns-status{display:inline-flex;align-items:center;gap:5px;padding:7px 10px;border:1px solid #f2d5c4;border-radius:999px;background:#fff8f3;color:#7a4b32;font-size:12px;font-weight:850;white-space:nowrap}
      #detailCard .lbg-kns-title{min-width:240px;white-space:normal;line-height:1.4;font-weight:750;color:#4b342b}
      #detailCard .lbg-kns-period{font-weight:850;text-align:center;white-space:nowrap;color:#5b3828}
      #detailCard .lbg-kns-ga{font-weight:900;color:#9a5b36;text-align:center}#detailCard .lbg-kns-missing{color:#a16207;font-weight:800}#detailCard .lbg-kns-out{color:#64748b;font-weight:750}
      #detailCard .lbg-kns-note{display:block;margin-top:2px;color:#8a7569;font-size:11px;font-weight:600}#detailCard .lbg-kns-year-warning{color:#9a3412;font-weight:800}
      #detailCard table th,#detailCard table td{vertical-align:top}@media(max-width:760px){#detailCard .lbg-kns-status{white-space:normal}.lbg-ga-actions{align-items:center}}
    `;document.head.appendChild(style);
  }

  function currentResult(){try{return typeof result!=='undefined'?result:null}catch{return null}}
  function gaValue(a,e){const values=a?.gaValues&&typeof a.gaValues==='object'?a.gaValues:{},key=`${Number(e.day)}|${String(e.session||'')}|${String(e.school||'')}`,raw=values[key];if(raw===undefined||raw===null||String(raw).trim()==='')return null;const n=Number(raw);return Number.isFinite(n)?Math.round(n):null}
  function gradesOf(className){const out=[],raw=String(className||''),re=/(?:^|[^0-9])([1-5])\s*\/\s*\d+/g;let m;while((m=re.exec(raw))){const g=Number(m[1]);if(!out.includes(g))out.push(g)}return out}
  function entryDate(a,e){if(!(a?.start instanceof Date)||Number.isNaN(a.start.getTime()))return'';const d=new Date(a.start.getFullYear(),a.start.getMonth(),a.start.getDate(),12);d.setDate(d.getDate()+Math.max(0,Number(e.day)-2));return d.toLocaleDateString('vi-VN')}

  function lessonInfo(e,ga){
    const startYear=Number(q('year')?.value||0);
    if(startYear!==PLAN_YEAR)return{kind:'year',html:`<span class="lbg-kns-year-warning">Chưa có danh mục KNS cho năm học ${escHtml(startYear||'—')}–${escHtml(startYear?startYear+1:'—')}</span><span class="lbg-kns-note">Danh mục hiện được đối chiếu theo kế hoạch ${PLAN_LABEL}.</span>`};
    if(ga===null)return{kind:'missing',html:'<span class="lbg-kns-missing">Chưa nhập GA</span>'};
    const grades=gradesOf(e.className);if(!grades.length)return{kind:'grade',html:'<span class="lbg-kns-missing">Chưa xác định khối từ tên lớp</span>'};
    const parts=[];let knsCount=0,outCount=0;
    for(const grade of grades){const title=KNS[grade]?.[ga];if(title){knsCount++;parts.push({grade,title,kind:'kns'})}else if(NON_KNS[grade]?.has(ga)){outCount++;parts.push({grade,title:'Không thuộc Ban KNS',kind:'out'})}else parts.push({grade,title:'Chưa có tên bài KNS trong kế hoạch',kind:'unknown'})}
    if(parts.length===1){const p=parts[0];if(p.kind==='kns')return{kind:'kns',html:`<span class="lbg-kns-title">${escHtml(p.title)}</span>`};if(p.kind==='out')return{kind:'out',html:'<span class="lbg-kns-out">— Không thuộc Ban Kỹ năng sống</span>'};return{kind:'unknown',html:'<span class="lbg-kns-missing">Chưa có tên bài KNS trong kế hoạch</span>'}}
    return{kind:knsCount?'kns':outCount===parts.length?'out':'unknown',html:parts.map(p=>`<div class="${p.kind==='kns'?'lbg-kns-title':p.kind==='out'?'lbg-kns-out':'lbg-kns-missing'}"><b>Khối ${p.grade}:</b> ${escHtml(p.title)}</div>`).join('')};
  }

  function ensureStatusHost(){
    const card=q('detailCard'),head=card?.querySelector('.head'),actions=head?.querySelector('.lbg-ga-actions');if(!actions)return null;
    let status=q('knsLessonDetailStatusV1');if(!status){status=document.createElement('span');status.id='knsLessonDetailStatusV1';status.className='lbg-kns-status';actions.insertBefore(status,actions.firstChild)}return status;
  }
  function signature(a){if(!a||!Array.isArray(a.entries))return'';return[q('year')?.value||'',a.sheet||'',a.code||'',a.entries.map(e=>[e.day,e.session,e.period,e.school,e.className,e.address].join('~')).join('|'),JSON.stringify(a.gaValues||{})].join('||')}

  function sync(){
    addCss();const a=currentResult(),card=q('detailCard'),tbody=q('detail');if(!a||!card||!tbody||card.hidden||!Array.isArray(a.entries))return;
    const sig=signature(a);if(sig===lastSignature){ensureStatusHost();return}lastSignature=sig;
    const headText=card.querySelector('.head p');if(headText)headText.textContent=`Tên bài chỉ lấy từ Ban Kỹ năng sống theo Kế hoạch ${PLAN_LABEL}; không hiển thị bài Finger Math / Abacus / STEM.`;
    const tr=card.querySelector('thead tr');if(tr)tr.innerHTML='<th>STT</th><th>Thứ</th><th>Ngày</th><th>Buổi</th><th>Trường</th><th>Lớp</th><th>Tiết</th><th>Giáo án</th><th>Tên bài dạy</th>';
    let kns=0,missing=0,out=0,other=0;
    tbody.innerHTML=a.entries.map((e,i)=>{const ga=gaValue(a,e),info=lessonInfo(e,ga);if(info.kind==='kns')kns++;else if(info.kind==='missing'||info.kind==='grade')missing++;else if(info.kind==='out')out++;else other++;return`<tr><td>${i+1}</td><td>${escHtml(DAY_NAME[Number(e.day)]||`Thứ ${e.day}`)}</td><td>${escHtml(entryDate(a,e)||'—')}</td><td>${escHtml(e.session||'')}</td><td>${escHtml(e.school||'')}</td><td>${escHtml(e.className||'')}</td><td class="lbg-kns-period">Tiết ${escHtml(e.period||'—')}</td><td class="lbg-kns-ga">${escHtml(ga===null?'—':`GA${ga}`)}</td><td>${info.html}</td></tr>`}).join('');
    const status=ensureStatusHost();if(status){const bits=[`📘 KNS: ${kns}`];if(missing)bits.push(`Thiếu GA: ${missing}`);if(out)bits.push(`Ngoài KNS: ${out}`);if(other)bits.push(`Cần kiểm tra: ${other}`);status.textContent=bits.join(' · ');status.title=`Đối chiếu tên bài Ban Kỹ năng sống theo kế hoạch ${PLAN_LABEL}`}
  }

  document.addEventListener('input',event=>{if(event.target?.classList?.contains('ga-input')||event.target?.classList?.contains('lbg-r3-ga'))setTimeout(()=>{lastSignature='';sync()},0)},true);
  document.addEventListener('change',event=>{if(event.target?.id==='year')setTimeout(()=>{lastSignature='';sync()},0)},true);
  const observer=new MutationObserver(()=>sync());
  function start(){addCss();const card=q('detailCard');if(card)observer.observe(card,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});sync();setInterval(sync,900)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();