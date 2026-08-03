'use strict';
(function(){
  if(!window.LBGAuth)return;
  const q=id=>document.getElementById(id);
  const txt=v=>String(v??'').trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normName=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().replace(/[^a-z0-9]+/g,'');
  let auth=null,profiles=[],bulkRows=[];

  function style(){
    if(q('lbgOwnerStyleV2'))return;
    const s=document.createElement('style');s.id='lbgOwnerStyleV2';
    s.textContent=`.lbg-owner-card{background:#fff;border:1px solid #dbe6eb;border-radius:20px;padding:19px;box-shadow:0 14px 36px rgba(8,47,73,.09);margin-top:18px}.lbg-owner-create{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;align-items:end}.lbg-owner-create input,.lbg-owner-create select,.lbg-bulk-table input,.lbg-bulk-table select{width:100%;padding:9px;border:1px solid #dbe6eb;border-radius:10px}.lbg-owner-actions,.lbg-bulk-actions{display:flex;gap:7px;flex-wrap:wrap}.lbg-owner-table td,.lbg-owner-table th,.lbg-bulk-table td,.lbg-bulk-table th{white-space:normal;vertical-align:top}.lbg-bulk-panel{margin-top:15px;padding:14px;border:1px solid #bfdbfe;border-radius:15px;background:#f8fbff}.lbg-bulk-scroll{max-height:480px;overflow:auto;margin-top:10px;border:1px solid #dbe6eb;border-radius:12px;background:#fff}.lbg-bulk-table{min-width:980px}.lbg-bulk-table .oktxt{color:#166534;font-weight:800}.lbg-bulk-table .errtxt{color:#b91c1c;font-weight:700}.lbg-bulk-table .waittxt{color:#64748b}.lbg-owner-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.lbg-owner-toolbar .badge{margin-left:auto}@media(max-width:760px){.lbg-owner-create{grid-template-columns:1fr}}`;
    document.head.appendChild(s);
  }
  function roleName(role){return role==='owner'?'Chủ sở hữu':role==='uploader'?'Được tải TKB chung':'Người dùng'}

  async function edgeMessage(error){
    let message=error?.message||String(error);
    const response=error?.context;
    if(!response)return message;
    try{
      const copy=typeof response.clone==='function'?response.clone():response;
      const body=await copy.json();
      if(body?.error)message=body.error;
      else if(body?.message)message=body.message;
      return message;
    }catch{}
    try{
      const copy=typeof response.clone==='function'?response.clone():response;
      const body=await copy.text();
      if(body)message=body.slice(0,500);
    }catch{}
    return message;
  }
  async function invoke(body){
    const {data,error}=await auth.client.functions.invoke('admin-users',{body});
    if(error)throw new Error(await edgeMessage(error));
    if(data?.error)throw new Error(data.error);
    return data;
  }

  function card(){
    if(q('lbgOwnerCard'))return;
    style();
    const main=document.querySelector('main.shell');if(!main)return;
    const d=document.createElement('section');d.id='lbgOwnerCard';d.className='lbg-owner-card';
    d.innerHTML=`<div class="head"><div><h3>Quản lý tài khoản</h3><p>Chỉ chủ sở hữu được tạo, khóa, gia hạn hoặc đặt lại mật khẩu.</p></div></div>
      <div class="lbg-owner-toolbar"><button class="btn outline" id="lbgReadTeachers">📋 Lấy danh sách giáo viên từ TKB</button><span class="badge" id="lbgOwnerCount">0 tài khoản</span></div>
      <div class="lbg-owner-create" style="margin-top:13px"><label>Mã đăng nhập<input id="lbgNewUsername" maxlength="32" placeholder="GV001"></label><label>Tên hiển thị<input id="lbgNewDisplay"></label><label>Mật khẩu tạm<input id="lbgNewPassword" type="password" minlength="8"></label><label>Vai trò<select id="lbgNewRole"><option value="user">Người dùng</option><option value="uploader">Được tải TKB chung</option></select></label><label>Hết hạn<input id="lbgNewExpiry" type="datetime-local"></label><button class="btn primary" id="lbgCreateAccount">Tạo tài khoản</button></div>
      <div id="lbgBulkPanel" class="lbg-bulk-panel" hidden><div class="lbg-bulk-actions"><button class="btn outline" id="lbgBulkSelectAll">Chọn tất cả</button><button class="btn outline" id="lbgBulkNewPass">Tạo lại mật khẩu</button><button class="btn outline" id="lbgBulkExport">Xuất Excel tài khoản</button><button class="btn primary" id="lbgBulkCreate">Tạo các tài khoản đã chọn</button><button class="btn outline danger" id="lbgBulkClose">Đóng</button></div><div class="notice" id="lbgBulkStatus">Chưa đọc danh sách.</div><div class="lbg-bulk-scroll"><table class="lbg-bulk-table"><thead><tr><th>Chọn</th><th>STT</th><th>Mã đăng nhập</th><th>Tên giáo viên</th><th>Mã trong TKB</th><th>Mật khẩu tạm</th><th>Trạng thái</th></tr></thead><tbody id="lbgBulkRows"></tbody></table></div></div>
      <div class="notice" id="lbgOwnerStatus">Đang tải danh sách…</div><div class="wrap lbg-owner-table"><table><thead><tr><th>Tài khoản</th><th>Vai trò</th><th>Trạng thái</th><th>Hết hạn</th><th>Lần đăng nhập</th><th>Thao tác</th></tr></thead><tbody id="lbgOwnerRows"></tbody></table></div>`;
    main.appendChild(d);
    q('lbgCreateAccount').onclick=createOne;
    q('lbgReadTeachers').onclick=prepareBulk;
    q('lbgBulkSelectAll').onclick=toggleAll;
    q('lbgBulkNewPass').onclick=regeneratePasswords;
    q('lbgBulkExport').onclick=exportBulk;
    q('lbgBulkCreate').onclick=createBulk;
    q('lbgBulkClose').onclick=()=>q('lbgBulkPanel').hidden=true;
    refresh();
  }

  async function createOne(){
    const b=q('lbgCreateAccount'),old=b.textContent;b.disabled=true;b.textContent='Đang tạo…';
    try{
      const username=txt(q('lbgNewUsername').value).toLowerCase(),password=q('lbgNewPassword').value;
      if(!/^[a-z0-9._-]{3,32}$/.test(username))throw new Error('Mã đăng nhập không hợp lệ.');
      if(password.length<8)throw new Error('Mật khẩu tạm phải có ít nhất 8 ký tự.');
      await invoke({action:'create',username,display_name:txt(q('lbgNewDisplay').value)||username,password,role:q('lbgNewRole').value,can_upload_shared:q('lbgNewRole').value==='uploader',expires_at:q('lbgNewExpiry').value?new Date(q('lbgNewExpiry').value).toISOString():null});
      q('lbgNewUsername').value='';q('lbgNewDisplay').value='';q('lbgNewPassword').value='';
      await refresh();alert('Đã tạo tài khoản. Người dùng phải đổi mật khẩu ở lần đăng nhập đầu.');
    }catch(e){alert('Không tạo được tài khoản: '+(e?.message||String(e)))}
    finally{b.disabled=false;b.textContent=old}
  }

  function sourceTeachers(){
    let book=null;try{book=wb}catch{}
    if(!book||!Array.isArray(book.worksheets)||!book.worksheets.length)throw new Error('Hãy mở một file TKB trước khi lấy danh sách giáo viên.');
    const selected=q('week')?.value;
    const sheet=(selected&&book.getWorksheet(selected))||book.worksheets.find(x=>/\d{1,2}\s*[Tt]\s*\d{1,2}|tuần/i.test(x.name))||book.worksheets[0];
    if(typeof window.teachers!=='function')throw new Error('Bộ đọc danh sách giáo viên chưa sẵn sàng. Hãy tải lại trang rồi thử lại.');
    const seen=new Set(),out=[];
    for(const item of window.teachers(sheet)||[]){
      const name=txt(item.name),code=txt(item.code).toUpperCase();
      if(!name||!code||code==='OFF'||/^Mã\s+/i.test(name))continue;
      const key=normName(name);
      if(!key||seen.has(key))continue;
      seen.add(key);out.push({name,code});
    }
    if(!out.length)throw new Error('Không đọc được danh sách tên giáo viên ở phần tổng hợp bên phải TKB.');
    return out.sort((a,b)=>a.name.localeCompare(b.name,'vi'));
  }
  function randomPassword(){
    const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    const data=new Uint32Array(14);crypto.getRandomValues(data);
    return Array.from(data,n=>chars[n%chars.length]).join('');
  }
  function nextNumbers(count){
    const used=new Set(profiles.map(x=>String(x.username||'').toLowerCase()));
    const values=[];let n=1;
    while(values.length<count){const code='gv'+String(n).padStart(3,'0');if(!used.has(code)){values.push(code);used.add(code)}n++}
    return values;
  }
  function prepareBulk(){
    try{
      const source=sourceTeachers();
      const existingNames=new Set(profiles.map(x=>normName(x.display_name||x.username)));
      const fresh=source.filter(x=>!existingNames.has(normName(x.name)));
      const usernames=nextNumbers(fresh.length);
      bulkRows=fresh.map((x,i)=>({selected:true,username:usernames[i],display_name:x.name,code:x.code,password:randomPassword(),status:'Chưa tạo',state:'wait'}));
      q('lbgBulkPanel').hidden=false;renderBulk();
      q('lbgBulkStatus').textContent=`Đọc được ${source.length} giáo viên từ TKB • ${source.length-fresh.length} người đã có tài khoản • ${fresh.length} tài khoản mới cần tạo.`;
      q('lbgBulkPanel').scrollIntoView({behavior:'smooth',block:'start'});
    }catch(e){alert(e?.message||String(e))}
  }
  function renderBulk(){
    const body=q('lbgBulkRows');
    body.innerHTML=bulkRows.length?bulkRows.map((x,i)=>`<tr><td><input type="checkbox" data-bulk-check="${i}" ${x.selected?'checked':''} ${x.state==='ok'?'disabled':''}></td><td>${i+1}</td><td><input data-bulk-user="${i}" value="${esc(x.username.toUpperCase())}" ${x.state==='ok'?'disabled':''}></td><td><input data-bulk-name="${i}" value="${esc(x.display_name)}" ${x.state==='ok'?'disabled':''}></td><td>${esc(x.code)}</td><td><input data-bulk-pass="${i}" value="${esc(x.password)}" ${x.state==='ok'?'disabled':''}></td><td class="${x.state==='ok'?'oktxt':x.state==='error'?'errtxt':'waittxt'}">${esc(x.status)}</td></tr>`).join(''):'<tr><td colspan="7"><div class="empty">Không có tài khoản mới cần tạo.</div></td></tr>';
    body.querySelectorAll('[data-bulk-check]').forEach(el=>el.onchange=()=>bulkRows[Number(el.dataset.bulkCheck)].selected=el.checked);
    body.querySelectorAll('[data-bulk-user]').forEach(el=>el.onchange=()=>bulkRows[Number(el.dataset.bulkUser)].username=txt(el.value).toLowerCase());
    body.querySelectorAll('[data-bulk-name]').forEach(el=>el.onchange=()=>bulkRows[Number(el.dataset.bulkName)].display_name=txt(el.value));
    body.querySelectorAll('[data-bulk-pass]').forEach(el=>el.onchange=()=>bulkRows[Number(el.dataset.bulkPass)].password=el.value);
  }
  function toggleAll(){
    const candidates=bulkRows.filter(x=>x.state!=='ok');
    const next=!candidates.every(x=>x.selected);candidates.forEach(x=>x.selected=next);renderBulk();
  }
  function regeneratePasswords(){bulkRows.forEach(x=>{if(x.state!=='ok')x.password=randomPassword()});renderBulk()}
  async function exportBulk(){
    if(!bulkRows.length)return alert('Chưa có danh sách để xuất.');
    if(!window.ExcelJS||!window.saveAs)return alert('Thư viện xuất Excel chưa sẵn sàng.');
    const out=new ExcelJS.Workbook(),ws=out.addWorksheet('TAI_KHOAN_GIAO_VIEN');
    ws.addRow(['STT','MÃ ĐĂNG NHẬP','TÊN GIÁO VIÊN','MÃ TRONG TKB','MẬT KHẨU TẠM','VAI TRÒ','YÊU CẦU']);
    bulkRows.forEach((x,i)=>ws.addRow([i+1,x.username.toUpperCase(),x.display_name,x.code,x.password,'Người dùng','Đổi mật khẩu ở lần đăng nhập đầu']));
    ws.columns=[{width:8},{width:18},{width:30},{width:18},{width:24},{width:16},{width:34}];
    const h=ws.getRow(1);h.font={bold:true,color:{argb:'FFFFFFFF'}};h.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF0F766E'}};h.alignment={horizontal:'center',vertical:'middle'};h.height=24;
    ws.views=[{state:'frozen',ySplit:1}];ws.autoFilter={from:'A1',to:'G1'};
    for(let r=2;r<=ws.rowCount;r++){ws.getRow(r).alignment={vertical:'middle'};ws.getRow(r).height=21}
    const buf=await out.xlsx.writeBuffer();saveAs(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`DANH_SACH_TAI_KHOAN_GV_${new Date().toISOString().slice(0,10)}.xlsx`);
    alert('Đã xuất danh sách. Hãy giữ file mật khẩu ở nơi an toàn.');
  }
  async function createBulk(){
    const list=bulkRows.map((x,i)=>({x,i})).filter(o=>o.x.selected&&o.x.state!=='ok');
    if(!list.length)return alert('Chưa chọn tài khoản nào cần tạo.');
    if(!confirm(`Tạo ${list.length} tài khoản? Mỗi người sẽ phải đổi mật khẩu ở lần đăng nhập đầu.`))return;
    const b=q('lbgBulkCreate'),old=b.textContent;b.disabled=true;
    let ok=0,failed=0;
    for(let pos=0;pos<list.length;pos++){
      const {x,i}=list[pos];b.textContent=`Đang tạo ${pos+1}/${list.length}…`;x.status='Đang tạo…';x.state='wait';renderBulk();
      try{
        const username=txt(x.username).toLowerCase();
        if(!/^[a-z0-9._-]{3,32}$/.test(username))throw new Error('Mã đăng nhập không hợp lệ.');
        if(txt(x.display_name).length<2)throw new Error('Thiếu tên hiển thị.');
        if(String(x.password).length<8)throw new Error('Mật khẩu dưới 8 ký tự.');
        await invoke({action:'create',username,display_name:txt(x.display_name),password:String(x.password),role:'user',can_upload_shared:false,expires_at:null,notes:`Tạo từ TKB • mã ${x.code}`});
        x.username=username;x.status='Đã tạo';x.state='ok';x.selected=false;ok++;
      }catch(e){x.status=e?.message||String(e);x.state='error';failed++}
      renderBulk();
    }
    await refresh();b.disabled=false;b.textContent=old;
    q('lbgBulkStatus').textContent=`Hoàn tất: ${ok} tài khoản đã tạo • ${failed} tài khoản lỗi. Các dòng lỗi giữ nguyên để bạn sửa và thử lại.`;
    alert(`Hoàn tất tạo hàng loạt: ${ok} thành công, ${failed} lỗi.`);
  }

  async function refresh(){
    const {data,error}=await auth.client.from('profiles').select('*').order('created_at',{ascending:false});
    if(error){q('lbgOwnerStatus').textContent=error.message;return}
    profiles=data||[];q('lbgOwnerCount').textContent=`${profiles.length} tài khoản`;q('lbgOwnerStatus').textContent='Danh sách đã cập nhật.';
    q('lbgOwnerRows').innerHTML=profiles.map(x=>`<tr><td><b>${esc(x.display_name||x.username)}</b><br><small>${esc(x.username)}</small></td><td>${esc(roleName(x.role))}</td><td>${x.is_active?'Hoạt động':'Đã khóa'}${x.must_change_password?'<br><small>Phải đổi mật khẩu</small>':''}</td><td>${x.expires_at?new Date(x.expires_at).toLocaleString('vi-VN'):'Không thời hạn'}</td><td>${x.last_login_at?new Date(x.last_login_at).toLocaleString('vi-VN'):'Chưa đăng nhập'}</td><td>${x.role==='owner'?'Tài khoản chủ sở hữu':`<div class="lbg-owner-actions"><button class="btn outline mini" data-toggle="${x.id}" data-active="${x.is_active}">${x.is_active?'Khóa':'Mở'}</button><button class="btn outline mini" data-reset="${x.id}">Đặt lại mật khẩu</button><button class="btn outline mini" data-expiry="${x.id}">Gia hạn</button><button class="btn outline danger mini" data-delete="${x.id}">Xóa</button></div>`}</td></tr>`).join('');
    q('lbgOwnerRows').querySelectorAll('[data-toggle]').forEach(b=>b.onclick=async()=>{try{await invoke({action:'update',user_id:b.dataset.toggle,is_active:b.dataset.active!=='true'});await refresh()}catch(e){alert(e.message)}});
    q('lbgOwnerRows').querySelectorAll('[data-reset]').forEach(b=>b.onclick=async()=>{const p=prompt('Nhập mật khẩu tạm mới, ít nhất 8 ký tự:');if(!p)return;try{await invoke({action:'reset_password',user_id:b.dataset.reset,password:p});alert('Đã đặt mật khẩu tạm.')}catch(e){alert(e.message)}});
    q('lbgOwnerRows').querySelectorAll('[data-expiry]').forEach(b=>b.onclick=async()=>{const v=prompt('Nhập ngày hết hạn dạng YYYY-MM-DD, hoặc để trống để không thời hạn:');if(v===null)return;try{await invoke({action:'update',user_id:b.dataset.expiry,expires_at:v?new Date(v+'T23:59:59').toISOString():null});await refresh()}catch(e){alert(e.message)}});
    q('lbgOwnerRows').querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{if(!confirm('Xóa tài khoản này?'))return;try{await invoke({action:'delete',user_id:b.dataset.delete});await refresh()}catch(e){alert(e.message)}});
  }
  window.LBGAuth.onReady(a=>{auth=a;if(a.isOwner())card()});
  window.LBGAuth.onLogout(()=>q('lbgOwnerCard')?.remove());
})();
