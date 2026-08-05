'use strict';
(function(){
  if(!window.LBGAuth)return;
  const BUCKET='site-branding',MAX=5*1024*1024;
  const q=id=>document.getElementById(id),txt=v=>String(v??'').trim();
  const escHtml=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const defaults={id:'default',site_title:'CÔNG CỤ LẬP LỊCH BÁO GIẢNG',site_subtitle:'Website độc lập — không liên kết trang quản lý lớp học',show_header_text:true,logo_path:null,icon_path:null,logo_box_width:190,logo_box_height:64,logo_mobile_height:48,logo_align:'left',logo_fit:'contain',logo_background:'transparent',logo_radius:8};
  let auth=null,current={...defaults},pendingLogo=null,pendingIcon=null,removeLogo=false,removeIcon=false,logoObjectUrl='',iconObjectUrl='';

  function style(){
    if(q('lbgBrandingCss'))return;
    const s=document.createElement('style');s.id='lbgBrandingCss';s.textContent=`
      .top.lbg-branded-header{--lbg-logo-width:190px;--lbg-logo-height:64px;--lbg-logo-mobile-height:48px;align-items:center}
      .top .logo.lbg-brand-logo-box{width:var(--lbg-logo-width);height:var(--lbg-logo-height);min-width:48px;display:flex;align-items:center;overflow:hidden;flex:0 0 auto;padding:0}
      .top .logo.lbg-brand-logo-box img{display:block;width:100%;height:100%;object-position:center}
      .lbg-branding-card{background:#fff;border:1px solid #dbe6eb;border-radius:20px;padding:19px;box-shadow:0 14px 36px rgba(8,47,73,.09);margin-top:18px}
      .lbg-branding-grid{display:grid;grid-template-columns:minmax(330px,1fr) minmax(360px,1.15fr);gap:16px}.lbg-branding-fields{display:grid;gap:11px}.lbg-branding-fields label{display:grid;gap:5px;font-size:12px;font-weight:750}.lbg-branding-fields input[type=text],.lbg-branding-fields select{width:100%;padding:10px 11px;border:1px solid #dbe6eb;border-radius:11px;background:#fff}.lbg-branding-fields input[type=range]{width:100%}.lbg-branding-file{border:1px dashed #9ccfc4;border-radius:13px;padding:12px;background:#f7fffc}.lbg-branding-file input{width:100%;margin-top:6px}.lbg-branding-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.lbg-branding-inline{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.lbg-branding-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.lbg-branding-value{font-weight:900;color:#0f766e}.lbg-branding-preview-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.lbg-branding-preview{border:1px solid #dbe6eb;border-radius:15px;overflow:hidden}.lbg-branding-preview.dark{background:#0f172a}.lbg-branding-preview-title{padding:8px 10px;font-size:11px;font-weight:850;background:#f8fafc;border-bottom:1px solid #dbe6eb}.lbg-branding-preview.dark .lbg-branding-preview-title{background:#111827;color:#e5e7eb;border-color:#334155}.lbg-preview-header{display:flex;align-items:center;gap:10px;padding:13px;min-height:88px}.lbg-preview-header.mobile{min-height:76px}.lbg-preview-logo{display:flex;align-items:center;overflow:hidden;flex:0 0 auto}.lbg-preview-logo img{width:100%;height:100%;display:block}.lbg-preview-copy h4{margin:0;color:#082f49;font-size:14px}.lbg-preview-copy p{margin:2px 0 0;color:#64748b;font-size:10px}.dark .lbg-preview-copy h4{color:#f8fafc}.dark .lbg-preview-copy p{color:#cbd5e1}.lbg-branding-note{font-size:11px;color:#64748b;margin-top:4px}.lbg-branding-warning{padding:10px 12px;border:1px solid #fed7aa;background:#fff7ed;color:#9a3412;border-radius:11px;font-size:12px}.lbg-branding-status{margin-top:11px}.lbg-branding-thumb{height:72px;max-width:230px;display:flex;align-items:center;justify-content:center;border:1px solid #dbe6eb;border-radius:10px;background:repeating-conic-gradient(#f1f5f9 0 25%,#fff 0 50%) 50%/16px 16px;overflow:hidden}.lbg-branding-thumb img{max-width:100%;max-height:100%;object-fit:contain}.lbg-branding-icon-thumb{width:72px;height:72px}.lbg-branding-owner-only{color:#0f766e;font-weight:800}@media(max-width:980px){.lbg-branding-grid{grid-template-columns:1fr}}@media(max-width:620px){.top .logo.lbg-brand-logo-box{height:var(--lbg-logo-mobile-height);width:min(var(--lbg-logo-width),45vw)}.lbg-branding-row,.lbg-branding-preview-grid{grid-template-columns:1fr}.lbg-branding-card{padding:14px}}
    `;document.head.appendChild(s);
  }

  function publicUrl(path){
    if(!path||!auth?.client)return'';
    return auth.client.storage.from(BUCKET).getPublicUrl(path).data?.publicUrl||'';
  }

  function alignment(value){return value==='center'?'center':value==='right'?'flex-end':'flex-start'}

  function applyBranding(value){
    const s={...defaults,...(value||{})},header=document.querySelector('header.top'),box=header?.querySelector('.logo'),title=header?.querySelector('h1'),subtitle=header?.querySelector('p');
    if(!header||!box)return;
    header.classList.add('lbg-branded-header');
    header.style.setProperty('--lbg-logo-width',`${Number(s.logo_box_width)||190}px`);
    header.style.setProperty('--lbg-logo-height',`${Number(s.logo_box_height)||64}px`);
    header.style.setProperty('--lbg-logo-mobile-height',`${Number(s.logo_mobile_height)||48}px`);
    box.classList.add('lbg-brand-logo-box');
    box.style.justifyContent=alignment(s.logo_align);
    box.style.borderRadius=`${Number(s.logo_radius)||0}px`;
    box.style.background=s.logo_path?(s.logo_background||'transparent'):'linear-gradient(145deg,#0c4a6e,#0f766e)';
    const logo=publicUrl(s.logo_path);
    if(logo){
      if(box.dataset.lbgLogoSrc!==logo){box.dataset.lbgLogoSrc=logo;box.innerHTML=`<img alt="Logo website" src="${escHtml(logo)}">`;}
      const img=box.querySelector('img');if(img){img.style.objectFit=s.logo_fit||'contain';img.style.objectPosition=s.logo_align==='right'?'right center':s.logo_align==='center'?'center':'left center';img.onerror=()=>{box.innerHTML='BG';box.dataset.lbgLogoSrc='';box.style.background='linear-gradient(145deg,#0c4a6e,#0f766e)'}}
    }else if(box.dataset.lbgLogoSrc||box.querySelector('img')){
      box.dataset.lbgLogoSrc='';box.textContent='BG';
    }
    if(title)title.textContent=s.site_title||defaults.site_title;
    if(subtitle)subtitle.textContent=s.site_subtitle||'';
    const copy=title?.parentElement;if(copy)copy.hidden=!s.show_header_text;
    document.title=s.site_title||'Lập Lịch Báo giảng';
    const icon=publicUrl(s.icon_path);
    let favicon=document.querySelector('link[rel~="icon"]');
    if(icon){if(!favicon){favicon=document.createElement('link');favicon.rel='icon';document.head.appendChild(favicon)}favicon.href=icon}
    else if(favicon?.dataset?.lbgDynamic==='1')favicon.remove();
    if(favicon&&icon)favicon.dataset.lbgDynamic='1';
    window.LBGBranding={settings:s,apply:applyBranding,refresh:loadSettings};
  }

  async function loadSettings(){
    const {data,error}=await auth.client.from('site_branding').select('*').eq('id','default').single();
    if(error)throw error;
    current={...defaults,...data};applyBranding(current);renderOwnerCard();return current;
  }

  function objectUrl(file,type){
    if(type==='logo'){if(logoObjectUrl)URL.revokeObjectURL(logoObjectUrl);logoObjectUrl=file?URL.createObjectURL(file):'';return logoObjectUrl}
    if(iconObjectUrl)URL.revokeObjectURL(iconObjectUrl);iconObjectUrl=file?URL.createObjectURL(file):'';return iconObjectUrl;
  }

  function chosenUrl(type){
    if(type==='logo'){if(removeLogo)return'';return pendingLogo?logoObjectUrl:publicUrl(current.logo_path)}
    if(removeIcon)return'';return pendingIcon?iconObjectUrl:publicUrl(current.icon_path);
  }

  function value(id,fallback=0){return Number(q(id)?.value)||fallback}
  function checked(id){return Boolean(q(id)?.checked)}

  function formSettings(){
    return {...current,
      site_title:txt(q('lbgBrandTitle')?.value)||defaults.site_title,
      site_subtitle:txt(q('lbgBrandSubtitle')?.value),
      show_header_text:checked('lbgBrandShowText'),
      logo_box_width:value('lbgBrandWidth',190),
      logo_box_height:value('lbgBrandHeight',64),
      logo_mobile_height:value('lbgBrandMobileHeight',48),
      logo_align:q('lbgBrandAlign')?.value||'left',
      logo_fit:q('lbgBrandFit')?.value||'contain',
      logo_background:checked('lbgBrandTransparent')?'transparent':(q('lbgBrandBackground')?.value||'#ffffff'),
      logo_radius:value('lbgBrandRadius',0),
      logo_path:removeLogo?null:current.logo_path,
      icon_path:removeIcon?null:current.icon_path
    };
  }

  function preview(){
    if(!q('lbgBrandPreviewGrid'))return;
    const s=formSettings(),logo=chosenUrl('logo'),show=s.show_header_text;
    ['Light','Dark'].forEach(mode=>{
      const root=q(`lbgBrandPreview${mode}`),box=root?.querySelector('.lbg-preview-logo'),copy=root?.querySelector('.lbg-preview-copy');if(!root||!box)return;
      const mobile=mode==='Dark';
      box.style.width=`${Math.min(s.logo_box_width,mobile?170:240)}px`;box.style.height=`${mobile?s.logo_mobile_height:s.logo_box_height}px`;box.style.justifyContent=alignment(s.logo_align);box.style.borderRadius=`${s.logo_radius}px`;box.style.background=logo?s.logo_background:'linear-gradient(145deg,#0c4a6e,#0f766e)';
      box.innerHTML=logo?`<img alt="Xem trước logo" src="${escHtml(logo)}" style="object-fit:${s.logo_fit};object-position:${s.logo_align==='right'?'right center':s.logo_align==='center'?'center':'left center'}">`:'<b style="color:white">BG</b>';
      if(copy){copy.hidden=!show;copy.querySelector('h4').textContent=s.site_title;copy.querySelector('p').textContent=s.site_subtitle}
    });
    const logoThumb=q('lbgBrandLogoThumb'),iconThumb=q('lbgBrandIconThumb'),lu=chosenUrl('logo'),iu=chosenUrl('icon');
    if(logoThumb)logoThumb.innerHTML=lu?`<img alt="Logo đã chọn" src="${escHtml(lu)}">`:'<span class="meta">Chưa chọn logo</span>';
    if(iconThumb)iconThumb.innerHTML=iu?`<img alt="Biểu tượng đã chọn" src="${escHtml(iu)}">`:'<span class="meta">Chưa chọn</span>';
    [['lbgBrandWidthOut',s.logo_box_width],['lbgBrandHeightOut',s.logo_box_height],['lbgBrandMobileHeightOut',s.logo_mobile_height],['lbgBrandRadiusOut',s.logo_radius]].forEach(([id,v])=>{if(q(id))q(id).textContent=String(v)});
    const cover=q('lbgBrandCoverWarning');if(cover)cover.hidden=s.logo_fit!=='cover';
  }

  async function imageInfo(file){
    if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Chỉ nhận ảnh PNG, JPG/JPEG hoặc WebP.');
    if(file.size>MAX)throw new Error('Mỗi ảnh tối đa 5 MB.');
    if('createImageBitmap'in window){const bitmap=await createImageBitmap(file);const info={width:bitmap.width,height:bitmap.height};bitmap.close();return info}
    return new Promise((ok,no)=>{const u=URL.createObjectURL(file),img=new Image();img.onload=()=>{const out={width:img.naturalWidth,height:img.naturalHeight};URL.revokeObjectURL(u);ok(out)};img.onerror=()=>{URL.revokeObjectURL(u);no(new Error('Không đọc được ảnh.'))};img.src=u})
  }

  async function chooseFile(type,file){
    try{
      if(!file)return;
      const info=await imageInfo(file);
      if(type==='logo'){pendingLogo=file;removeLogo=false;objectUrl(file,'logo');q('lbgBrandLogoInfo').textContent=`${file.name} • ${info.width} × ${info.height}px • ${(file.size/1024).toFixed(0)} KB`}
      else{pendingIcon=file;removeIcon=false;objectUrl(file,'icon');const ratio=info.width/info.height;q('lbgBrandIconInfo').textContent=`${file.name} • ${info.width} × ${info.height}px${ratio<.85||ratio>1.15?' • Ảnh chưa vuông, khi thu nhỏ có thể khó nhìn.':''}`}
      preview();
    }catch(e){alert(e?.message||String(e));const input=q(type==='logo'?'lbgBrandLogoFile':'lbgBrandIconFile');if(input)input.value=''}
  }

  function safeName(file,type){const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';return`${type}/${Date.now()}-${crypto.randomUUID?.()||Math.random().toString(36).slice(2)}.${ext}`}
  async function upload(file,type){const path=safeName(file,type);const {error}=await auth.client.storage.from(BUCKET).upload(path,file,{contentType:file.type,cacheControl:'3600',upsert:false});if(error)throw error;return path}
  async function removePaths(paths){const list=[...new Set(paths.filter(Boolean))];if(!list.length)return;const {error}=await auth.client.storage.from(BUCKET).remove(list);if(error)console.warn('Không xóa được ảnh thương hiệu cũ:',error)}

  async function save(){
    const b=q('lbgBrandSave'),old=b.textContent,uploaded=[];b.disabled=true;b.textContent='Đang lưu…';
    try{
      const s=formSettings(),oldLogo=current.logo_path,oldIcon=current.icon_path;
      if(pendingLogo){s.logo_path=await upload(pendingLogo,'logo');uploaded.push(s.logo_path)}
      if(pendingIcon){s.icon_path=await upload(pendingIcon,'icon');uploaded.push(s.icon_path)}
      const args={p_site_title:s.site_title,p_site_subtitle:s.site_subtitle,p_show_header_text:s.show_header_text,p_logo_path:s.logo_path||'',p_icon_path:s.icon_path||'',p_logo_box_width:s.logo_box_width,p_logo_box_height:s.logo_box_height,p_logo_mobile_height:s.logo_mobile_height,p_logo_align:s.logo_align,p_logo_fit:s.logo_fit,p_logo_background:s.logo_background,p_logo_radius:s.logo_radius};
      const {data,error}=await auth.client.rpc('save_site_branding',args);if(error)throw error;
      current={...defaults,...data};pendingLogo=null;pendingIcon=null;removeLogo=false;removeIcon=false;objectUrl(null,'logo');objectUrl(null,'icon');applyBranding(current);renderOwnerCard();
      await removePaths([oldLogo&&oldLogo!==current.logo_path?oldLogo:null,oldIcon&&oldIcon!==current.icon_path?oldIcon:null]);
      alert('Đã lưu giao diện website. Logo mới sẽ đồng bộ trên các thiết bị.');
    }catch(e){await removePaths(uploaded);alert('Không lưu được giao diện: '+(e?.message||String(e)))}finally{b.disabled=false;b.textContent=old}
  }

  async function reset(){
    if(!confirm('Khôi phục tên website, logo, biểu tượng và kích thước về mặc định?'))return;
    const b=q('lbgBrandReset'),old=b.textContent;b.disabled=true;b.textContent='Đang khôi phục…';
    try{const paths=[current.logo_path,current.icon_path],{data,error}=await auth.client.rpc('reset_site_branding');if(error)throw error;current={...defaults,...data};pendingLogo=null;pendingIcon=null;removeLogo=false;removeIcon=false;objectUrl(null,'logo');objectUrl(null,'icon');applyBranding(current);renderOwnerCard();await removePaths(paths);alert('Đã khôi phục giao diện mặc định.')}catch(e){alert(e?.message||String(e))}finally{b.disabled=false;b.textContent=old}
  }

  function card(){
    if(!auth?.isOwner())return null;
    let c=q('lbgBrandingCard');if(c)return c;
    const main=document.querySelector('main.shell');if(!main)return null;
    c=document.createElement('section');c.id='lbgBrandingCard';c.className='lbg-branding-card';main.appendChild(c);return c;
  }

  function renderOwnerCard(){
    const c=card();if(!c)return;
    const bg=current.logo_background&&current.logo_background!=='transparent'?current.logo_background:'#ffffff',transparent=current.logo_background==='transparent';
    c.innerHTML=`<div class="head"><div><h3>8. Cài đặt thương hiệu website</h3><p>Chỉ chủ sở hữu được thay đổi. Logo đầy đủ không bắt buộc hình vuông và mặc định luôn giữ nguyên tỉ lệ.</p></div><span class="badge">Chủ sở hữu</span></div>
      <div class="lbg-branding-grid"><div class="lbg-branding-fields">
        <label>Tên website<input id="lbgBrandTitle" type="text" maxlength="120" value="${escHtml(current.site_title)}"></label>
        <label>Dòng mô tả<input id="lbgBrandSubtitle" type="text" maxlength="220" value="${escHtml(current.site_subtitle)}"></label>
        <label class="lbg-branding-inline"><input id="lbgBrandShowText" type="checkbox" ${current.show_header_text?'checked':''}> Hiện tên và dòng mô tả cạnh logo</label>
        <div class="lbg-branding-file"><b>Logo đầy đủ</b><div class="lbg-branding-note">Nhận logo ngang, dọc, tròn hoặc vuông. PNG nền trong suốt cho kết quả đẹp nhất.</div><input id="lbgBrandLogoFile" type="file" accept="image/png,image/jpeg,image/webp"><div id="lbgBrandLogoInfo" class="lbg-branding-note">Tối đa 5 MB.</div><div class="lbg-branding-inline" style="margin-top:8px"><div id="lbgBrandLogoThumb" class="lbg-branding-thumb"></div><button class="btn outline mini danger" id="lbgBrandRemoveLogo">Bỏ logo</button></div></div>
        <div class="lbg-branding-file"><b>Biểu tượng thu gọn</b><div class="lbg-branding-note">Dùng cho tab trình duyệt; nên là ảnh vuông chỉ gồm hình biểu tượng.</div><input id="lbgBrandIconFile" type="file" accept="image/png,image/jpeg,image/webp"><div id="lbgBrandIconInfo" class="lbg-branding-note">Khuyến nghị 512 × 512 px.</div><div class="lbg-branding-inline" style="margin-top:8px"><div id="lbgBrandIconThumb" class="lbg-branding-thumb lbg-branding-icon-thumb"></div><button class="btn outline mini danger" id="lbgBrandRemoveIcon">Bỏ biểu tượng</button></div></div>
        <div class="lbg-branding-row"><label>Chiều rộng khung: <span><span id="lbgBrandWidthOut" class="lbg-branding-value"></span> px</span><input id="lbgBrandWidth" type="range" min="48" max="420" value="${current.logo_box_width}"></label><label>Chiều cao máy tính: <span><span id="lbgBrandHeightOut" class="lbg-branding-value"></span> px</span><input id="lbgBrandHeight" type="range" min="32" max="160" value="${current.logo_box_height}"></label></div>
        <div class="lbg-branding-row"><label>Chiều cao điện thoại: <span><span id="lbgBrandMobileHeightOut" class="lbg-branding-value"></span> px</span><input id="lbgBrandMobileHeight" type="range" min="28" max="100" value="${current.logo_mobile_height}"></label><label>Bo góc: <span><span id="lbgBrandRadiusOut" class="lbg-branding-value"></span> px</span><input id="lbgBrandRadius" type="range" min="0" max="48" value="${current.logo_radius}"></label></div>
        <div class="lbg-branding-row"><label>Căn logo<select id="lbgBrandAlign"><option value="left" ${current.logo_align==='left'?'selected':''}>Căn trái</option><option value="center" ${current.logo_align==='center'?'selected':''}>Căn giữa</option><option value="right" ${current.logo_align==='right'?'selected':''}>Căn phải</option></select></label><label>Kiểu hiển thị<select id="lbgBrandFit"><option value="contain" ${current.logo_fit==='contain'?'selected':''}>Giữ nguyên toàn bộ logo</option><option value="cover" ${current.logo_fit==='cover'?'selected':''}>Lấp đầy khung, có thể bị cắt</option></select></label></div>
        <div id="lbgBrandCoverWarning" class="lbg-branding-warning" hidden>Chế độ “Lấp đầy khung” có thể cắt mất ngôi sao hoặc dòng chữ của logo ngang. Nên dùng “Giữ nguyên toàn bộ logo”.</div>
        <div class="lbg-branding-row"><label>Màu nền khung logo<input id="lbgBrandBackground" type="color" value="${escHtml(bg)}" ${transparent?'disabled':''}></label><label class="lbg-branding-inline"><input id="lbgBrandTransparent" type="checkbox" ${transparent?'checked':''}> Nền trong suốt</label></div>
        <div class="lbg-branding-actions"><button class="btn primary" id="lbgBrandSave">Lưu thay đổi</button><button class="btn outline" id="lbgBrandCancel">Hủy thay đổi chưa lưu</button><button class="btn outline danger" id="lbgBrandReset">Khôi phục mặc định</button></div>
        <div class="notice lbg-branding-status">Ảnh được lưu trong Supabase và đồng bộ cho mọi thiết bị. Giáo viên không nhìn thấy khu cài đặt này.</div>
      </div><div><div class="head"><div><h3>Xem trước</h3><p>So sánh trên nền sáng và nền tối trước khi lưu.</p></div></div><div id="lbgBrandPreviewGrid" class="lbg-branding-preview-grid"><div class="lbg-branding-preview"><div class="lbg-branding-preview-title">Máy tính • nền sáng</div><div id="lbgBrandPreviewLight" class="lbg-preview-header"><div class="lbg-preview-logo"></div><div class="lbg-preview-copy"><h4></h4><p></p></div></div></div><div class="lbg-branding-preview dark"><div class="lbg-branding-preview-title">Điện thoại • nền tối</div><div id="lbgBrandPreviewDark" class="lbg-preview-header mobile"><div class="lbg-preview-logo"></div><div class="lbg-preview-copy"><h4></h4><p></p></div></div></div></div><div class="lbg-branding-warning" style="margin-top:12px"><b>Với logo “Hoàn thiện tài năng Việt”:</b> hãy dùng “Giữ nguyên toàn bộ logo”, nền trong suốt và tăng chiều rộng khung đến khi dòng chữ hiện đủ.</div></div></div>`;
    const ids=['lbgBrandTitle','lbgBrandSubtitle','lbgBrandShowText','lbgBrandWidth','lbgBrandHeight','lbgBrandMobileHeight','lbgBrandRadius','lbgBrandAlign','lbgBrandFit','lbgBrandBackground','lbgBrandTransparent'];ids.forEach(id=>{q(id)?.addEventListener('input',()=>{if(id==='lbgBrandTransparent')q('lbgBrandBackground').disabled=checked(id);preview()});q(id)?.addEventListener('change',preview)});
    q('lbgBrandLogoFile').onchange=e=>chooseFile('logo',e.target.files?.[0]);q('lbgBrandIconFile').onchange=e=>chooseFile('icon',e.target.files?.[0]);
    q('lbgBrandRemoveLogo').onclick=()=>{pendingLogo=null;removeLogo=true;objectUrl(null,'logo');q('lbgBrandLogoFile').value='';q('lbgBrandLogoInfo').textContent='Logo sẽ bị gỡ khi bấm Lưu thay đổi.';preview()};
    q('lbgBrandRemoveIcon').onclick=()=>{pendingIcon=null;removeIcon=true;objectUrl(null,'icon');q('lbgBrandIconFile').value='';q('lbgBrandIconInfo').textContent='Biểu tượng sẽ bị gỡ khi bấm Lưu thay đổi.';preview()};
    q('lbgBrandSave').onclick=save;q('lbgBrandReset').onclick=reset;q('lbgBrandCancel').onclick=()=>{pendingLogo=null;pendingIcon=null;removeLogo=false;removeIcon=false;objectUrl(null,'logo');objectUrl(null,'icon');renderOwnerCard()};preview();
  }

  function setupFailure(error){
    console.error(error);
    if(auth?.isOwner()&&!q('lbgBrandingSetupWarning')){const main=document.querySelector('main.shell'),n=document.createElement('div');n.id='lbgBrandingSetupWarning';n.className='lbg-branding-warning';n.innerHTML='<b>Chưa kích hoạt phần đổi logo:</b> hãy chạy migration <code>20260805_branding_settings.sql</code> trong Supabase SQL Editor.';main?.prepend(n)}
  }

  window.LBGAuth.onReady(a=>{auth=a;style();loadSettings().catch(setupFailure)});
  window.LBGAuth.onLogout(()=>{auth=null;q('lbgBrandingCard')?.remove();q('lbgBrandingSetupWarning')?.remove();objectUrl(null,'logo');objectUrl(null,'icon')});
})();
