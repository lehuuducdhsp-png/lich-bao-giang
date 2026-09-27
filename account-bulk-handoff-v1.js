'use strict';
(function(root,factory){
  const api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.LBGAccountBulkHandoffV1=api;
  if(root&&root.document)api.install();
})(typeof window!=='undefined'?window:globalThis,function(root){
  const VERSION='20260927.1';
  const PREFIX='hoannang';
  const LOGIN_URL='https://lehuuducdhsp-png.github.io/lich-bao-giang/';
  const txt=v=>String(v??'').trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
  const q=id=>root.document?.getElementById(id)||null;
  const selected=new Set();
  let issued=[],observer=null,busy=false;

  function tempPasswordForUsername(username){
    const m=txt(username).toLowerCase().match(/^gv(\d+)$/);
    return m?PREFIX+m[1]:'';
  }
  function eligibleUsername(username){return Boolean(tempPasswordForUsername(username))}
  function rowInfo(row){
    if(!row)return null;
    const first=row.querySelector?.('td:first-child'),reset=row.querySelector?.('[data-reset]');
    const username=txt(first?.querySelector?.('small')?.textContent).toLowerCase();
    const displayName=txt(first?.querySelector?.('b')?.textContent)||username.toUpperCase();
    const userId=txt(reset?.dataset?.reset);
    if(!userId||!eligibleUsername(username))return null;
    return{row,userId,username,displayName,password:tempPasswordForUsername(username),loginUrl:LOGIN_URL};
  }
  function eligibleRows(){
    return[...(q('lbgOwnerRows')?.querySelectorAll?.('tr')||[])].map(rowInfo).filter(Boolean);
  }
  function selectedRows(){return eligibleRows().filter(x=>selected.has(x.userId))}
  function status(text,kind=''){
    const el=q('lbgAccountHandoffStatus');if(!el)return;
    el.textContent=text;el.dataset.kind=kind;
  }
  function updateCount(){
    const count=selectedRows().length,el=q('lbgAccountHandoffCount');
    if(el)el.textContent=`${count} đã chọn`;
    const reset=q('lbgAccountHandoffIssue'),print=q('lbgAccountHandoffPrint');
    if(reset)reset.disabled=busy||count===0;
    if(print)print.disabled=busy||issued.length===0;
  }
  function decorateRows(){
    for(const info of eligibleRows()){
      const first=info.row.querySelector('td:first-child');
      if(!first||first.querySelector('[data-lbg-handoff-check]'))continue;
      const label=root.document.createElement('label');
      label.className='lbg-account-handoff-check';
      label.title='Chọn để cấp lại mật khẩu tạm và xuất tài khoản';
      label.innerHTML=`<input type="checkbox" data-lbg-handoff-check="${esc(info.userId)}"> <span>Chọn cấp TK</span>`;
      first.prepend(label);
      const input=label.querySelector('input');
      input.checked=selected.has(info.userId);
      input.addEventListener('change',()=>{
        if(input.checked)selected.add(info.userId);else selected.delete(info.userId);
        updateCount();
      });
    }
    for(const id of [...selected])if(!eligibleRows().some(x=>x.userId===id))selected.delete(id);
    updateCount();
  }
  function ensureStyle(){
    if(q('lbgAccountHandoffStyle'))return;
    const s=root.document.createElement('style');s.id='lbgAccountHandoffStyle';
    s.textContent=`
      .lbg-account-handoff{margin:12px 0;padding:12px;border:1px solid #fed7aa;border-radius:14px;background:#fff7ed}
      .lbg-account-handoff-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
      .lbg-account-handoff-actions .badge{margin-left:auto}
      .lbg-account-handoff small{display:block;margin-top:7px;color:#806b61;line-height:1.4}
      .lbg-account-handoff-check{display:flex;gap:6px;align-items:center;margin-bottom:5px;font-size:11px;color:#9a5b36;font-weight:800}
      .lbg-account-handoff-check input{width:15px;height:15px}
      #lbgAccountHandoffStatus[data-kind="ok"]{color:#166534}
      #lbgAccountHandoffStatus[data-kind="error"]{color:#b91c1c}
    `;root.document.head.appendChild(s);
  }
  function ensureBar(){
    const card=q('lbgOwnerCard');if(!card||!root.LBGAuth?.isOwner?.())return false;
    ensureStyle();
    let bar=q('lbgAccountHandoffBar');
    if(!bar){
      bar=root.document.createElement('div');bar.id='lbgAccountHandoffBar';bar.className='lbg-account-handoff';
      bar.innerHTML=`<div class="lbg-account-handoff-actions">
        <button class="btn outline" type="button" id="lbgAccountHandoffSelectAll">☑ Chọn tất cả GV</button>
        <button class="btn primary" type="button" id="lbgAccountHandoffIssue" disabled>🔑 Cấp MK tạm + Xuất Excel</button>
        <button class="btn outline" type="button" id="lbgAccountHandoffPrint" disabled>🖨️ In phiếu vừa cấp</button>
        <span class="badge" id="lbgAccountHandoffCount">0 đã chọn</span>
      </div>
      <small><b>Cấp tài khoản hàng loạt:</b> chỉ tài khoản GV###. Khi bấm “Cấp MK tạm + Xuất Excel”, mật khẩu cũ của các tài khoản đã chọn sẽ ngừng dùng và được đưa về quy tắc GV035 → hoannang035; giáo viên phải đổi mật khẩu sau khi đăng nhập.</small>
      <small id="lbgAccountHandoffStatus">Chưa chọn giáo viên.</small>`;
      const anchor=q('lbgTempPasswordPolicyBox')||card.querySelector('.lbg-owner-toolbar');
      if(anchor)anchor.insertAdjacentElement('afterend',bar);else card.querySelector('.head')?.insertAdjacentElement('afterend',bar);
      q('lbgAccountHandoffSelectAll').onclick=toggleAll;
      q('lbgAccountHandoffIssue').onclick=issueAndExport;
      q('lbgAccountHandoffPrint').onclick=printIssued;
    }
    const rows=q('lbgOwnerRows');
    if(rows&&!observer){
      observer=new MutationObserver(()=>decorateRows());
      observer.observe(rows,{childList:true});
    }
    decorateRows();return true;
  }
  function toggleAll(){
    const rows=eligibleRows(),all=rows.length&&rows.every(x=>selected.has(x.userId));
    for(const x of rows){if(all)selected.delete(x.userId);else selected.add(x.userId)}
    decorateRows();
    status(all?'Đã bỏ chọn tất cả.':`Đã chọn ${rows.length} tài khoản GV.`);
  }
  async function invokeReset(info){
    const api=root.LBGAuth;if(!api?.client)throw new Error('Hệ thống đăng nhập chưa sẵn sàng.');
    const {data,error}=await api.client.functions.invoke('admin-users',{body:{action:'reset_password',user_id:info.userId,password:info.password}});
    if(error){
      let message=error?.message||String(error);
      try{const response=error?.context,copy=typeof response?.clone==='function'?response.clone():response,payload=await copy?.json?.();if(payload?.error)message=payload.error}catch{}
      throw new Error(message);
    }
    if(data?.error)throw new Error(data.error);
    return data||{};
  }
  async function issueSelected(list){
    const ok=[],failed=[];
    for(let i=0;i<list.length;i++){
      const info=list[i];status(`Đang cấp ${i+1}/${list.length}: ${info.displayName}…`);
      try{await invokeReset(info);ok.push({...info,issuedAt:new Date().toISOString()})}
      catch(error){failed.push({...info,error:error?.message||String(error)})}
    }
    return{ok,failed};
  }
  function workbookRows(list){
    return list.map((x,i)=>[i+1,x.displayName,x.username.toUpperCase(),x.password,x.loginUrl,'Đổi mật khẩu ở lần đăng nhập đầu']);
  }
  async function exportExcel(list){
    if(!list.length)throw new Error('Không có tài khoản vừa cấp để xuất.');
    if(!root.ExcelJS||!root.saveAs)throw new Error('Thư viện xuất Excel chưa sẵn sàng.');
    const out=new root.ExcelJS.Workbook(),ws=out.addWorksheet('TAI_KHOAN_GIAO_VIEN');
    ws.addRow(['STT','HỌ VÀ TÊN','TÊN ĐĂNG NHẬP','MẬT KHẨU TẠM','TRANG ĐĂNG NHẬP','LƯU Ý']);
    workbookRows(list).forEach(row=>ws.addRow(row));
    ws.columns=[{width:7},{width:30},{width:20},{width:22},{width:48},{width:38}];
    const h=ws.getRow(1);h.font={name:'Times New Roman',size:12,bold:true,color:{argb:'FFFFFFFF'}};h.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF4A261'}};h.alignment={horizontal:'center',vertical:'middle'};h.height=25;
    for(let r=2;r<=ws.rowCount;r++){ws.getRow(r).font={name:'Times New Roman',size:12};ws.getRow(r).alignment={vertical:'middle',wrapText:true};ws.getRow(r).height=25}
    ws.views=[{state:'frozen',ySplit:1}];ws.autoFilter={from:'A1',to:'F1'};
    const buf=await out.xlsx.writeBuffer();
    root.saveAs(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`TAI_KHOAN_GIAO_VIEN_${new Date().toISOString().slice(0,10)}.xlsx`);
    return true;
  }
  async function issueAndExport(){
    if(busy)return;const list=selectedRows();if(!list.length)return root.alert?.('Hãy chọn ít nhất một tài khoản GV.');
    const names=list.slice(0,6).map(x=>x.username.toUpperCase()).join(', ')+(list.length>6?', …':'');
    if(!root.confirm?.(`Cấp lại mật khẩu tạm cho ${list.length} tài khoản (${names})?\n\nMật khẩu cũ của các tài khoản này sẽ NGỪNG dùng ngay. Mật khẩu mới theo quy tắc GV### → hoannang### và giáo viên buộc đổi mật khẩu khi đăng nhập.\n\nTiếp tục?`))return;
    busy=true;updateCount();issued=[];
    const button=q('lbgAccountHandoffIssue'),old=button?.textContent;if(button)button.textContent='Đang cấp…';
    try{
      const result=await issueSelected(list);issued=result.ok;
      if(issued.length)await exportExcel(issued);
      const msg=`Đã cấp và xuất ${issued.length}/${list.length} tài khoản.`+(result.failed.length?` Có ${result.failed.length} tài khoản lỗi: ${result.failed.map(x=>x.username.toUpperCase()).join(', ')}.`:'');
      status(msg,result.failed.length?'error':'ok');
      if(result.failed.length)root.alert?.(msg);
    }catch(error){status('Không hoàn tất được: '+(error?.message||String(error)),'error');root.alert?.('Không cấp/xuất được tài khoản: '+(error?.message||String(error)))}
    finally{busy=false;if(button)button.textContent=old||'🔑 Cấp MK tạm + Xuất Excel';updateCount()}
  }
  function printHtml(list){
    const cards=list.map(x=>`<section class="card"><h2>TÀI KHOẢN HỆ THỐNG LỊCH BÁO GIẢNG</h2><p><b>Giáo viên:</b> ${esc(x.displayName)}</p><p><b>Tên đăng nhập:</b> <code>${esc(x.username.toUpperCase())}</code></p><p><b>Mật khẩu tạm:</b> <code>${esc(x.password)}</code></p><p><b>Trang đăng nhập:</b> ${esc(x.loginUrl)}</p><p class="note">Vui lòng đổi mật khẩu ngay sau lần đăng nhập đầu tiên.</p></section>`).join('');
    return`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Phiếu tài khoản giáo viên</title><style>@page{size:A4;margin:12mm}body{font-family:"Times New Roman",serif;color:#222}.card{box-sizing:border-box;border:1px solid #777;border-radius:10px;padding:16px 18px;margin:0 0 12px;break-inside:avoid;page-break-inside:avoid}h2{text-align:center;font-size:17px;margin:0 0 14px}p{font-size:14px;margin:8px 0}code{font-family:"Courier New",monospace;font-size:14px;font-weight:bold}.note{font-style:italic} @media print{.card{min-height:115mm;margin-bottom:8mm}}</style></head><body>${cards}<script>window.onload=()=>window.print()<\/script></body></html>`;
  }
  function printIssued(){
    if(!issued.length)return root.alert?.('Chưa có đợt cấp mật khẩu tạm trong phiên này.');
    const w=root.open?.('','_blank','noopener,noreferrer');if(!w)return root.alert?.('Trình duyệt đang chặn cửa sổ in. Hãy cho phép pop-up rồi thử lại.');
    w.document.open();w.document.write(printHtml(issued));w.document.close();
  }
  function install(){
    let tries=0;
    const tick=()=>{tries++;if(ensureBar()||tries>120)return;setTimeout(tick,250)};
    tick();
    root.document?.addEventListener?.('lbg-access-ready',()=>setTimeout(ensureBar,0));
    return true;
  }
  return{VERSION,PREFIX,LOGIN_URL,tempPasswordForUsername,eligibleUsername,workbookRows,printHtml,install};
});
