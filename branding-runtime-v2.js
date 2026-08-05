'use strict';
(function(){
  const BUCKET='site-branding';
  const defaults={
    site_title:'CÔNG CỤ LẬP LỊCH BÁO GIẢNG',
    site_subtitle:'Website độc lập — không liên kết trang quản lý lớp học',
    logo_path:null,
    icon_path:null,
    logo_box_width:190,
    logo_box_height:64,
    logo_mobile_height:48,
    logo_align:'left',
    logo_fit:'contain',
    logo_background:'transparent',
    logo_radius:8
  };
  const q=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let settings={...defaults},client=null,observer=null,syncQueued=false,loaded=false;

  function addStyle(){
    if(q('lbgBrandRuntimeCss'))return;
    const style=document.createElement('style');
    style.id='lbgBrandRuntimeCss';
    style.textContent=`
      .top .logo.lbg-brand-icon-fallback{width:48px!important;height:48px!important;min-width:48px!important;flex-basis:48px!important;border-radius:15px!important;justify-content:center!important;background:transparent!important}
      .top .logo.lbg-brand-icon-fallback img{width:100%!important;height:100%!important;object-fit:contain!important;object-position:center!important}
      .top .logo.lbg-brand-text-fallback{width:48px!important;height:48px!important;min-width:48px!important;flex-basis:48px!important;border-radius:15px!important;justify-content:center!important;background:linear-gradient(145deg,#0c4a6e,#0f766e)!important;color:#fff!important}
      .lbg-login-brand{display:flex;align-items:center;justify-content:center;min-height:76px;margin:0 0 14px;text-align:center}
      .lbg-login-brand img{display:block;max-width:min(310px,100%);max-height:130px;width:auto;height:auto;object-fit:contain}
      .lbg-login-brand.compact img{width:92px;height:92px;max-width:92px;max-height:92px}
      .lbg-login-brand-fallback{width:76px;height:76px;border-radius:22px;background:linear-gradient(145deg,#0c4a6e,#0f766e);display:grid;place-items:center;color:#fff;font-size:24px;font-weight:950;box-shadow:0 12px 30px rgba(8,47,73,.22)}
      .lbg-login-brand-title{text-align:center;margin:0 0 5px!important;font-size:20px!important;line-height:1.25}
      .lbg-login-brand-subtitle{text-align:center;margin:0 0 18px!important;font-size:12px!important;line-height:1.45}
      @media(max-width:620px){
        .top .logo.lbg-brand-icon-fallback,.top .logo.lbg-brand-text-fallback{width:44px!important;height:44px!important;min-width:44px!important;flex-basis:44px!important}
        .lbg-login-brand img{max-width:250px;max-height:108px}.lbg-login-brand.compact img{width:82px;height:82px}
      }
    `;
    document.head.appendChild(style);
  }

  function publicUrl(path){
    if(!path||!client)return'';
    try{return client.storage.from(BUCKET).getPublicUrl(path).data?.publicUrl||''}catch{return''}
  }

  function desiredImage(){
    const full=publicUrl(settings.logo_path);
    if(full)return{url:full,type:'logo'};
    const icon=publicUrl(settings.icon_path);
    if(icon)return{url:icon,type:'icon'};
    return{url:'',type:'fallback'};
  }

  function setText(element,value){
    if(element&&element.textContent!==value)element.textContent=value;
  }

  function syncHeader(){
    const header=document.querySelector('header.top');
    const box=header?.querySelector('.logo');
    if(!header||!box)return;
    const desired=desiredImage();
    box.classList.add('lbg-brand-logo-box');
    box.classList.toggle('lbg-brand-icon-fallback',desired.type==='icon');
    box.classList.toggle('lbg-brand-text-fallback',desired.type==='fallback');
    box.classList.toggle('lbg-brand-has-image',desired.type==='logo');

    if(desired.url){
      const current=box.querySelector('img');
      if(!current||current.dataset.lbgRuntimeSrc!==desired.url){
        box.innerHTML=`<img alt="Logo website" data-lbg-runtime-src="${esc(desired.url)}" src="${esc(desired.url)}">`;
      }
      const img=box.querySelector('img');
      if(img){
        img.style.objectFit=desired.type==='icon'?'contain':(settings.logo_fit||'contain');
        img.style.objectPosition=desired.type==='icon'?'center':(settings.logo_align==='right'?'right center':settings.logo_align==='center'?'center':'left center');
        img.onerror=()=>{
          if(desired.type==='logo'&&settings.icon_path){settings={...settings,logo_path:null};queueSync();return}
          box.classList.remove('lbg-brand-icon-fallback','lbg-brand-has-image');
          box.classList.add('lbg-brand-text-fallback');
          setText(box,'BG');
        };
      }
      if(desired.type==='logo'){
        box.style.background=settings.logo_background||'transparent';
        box.style.borderRadius=`${Number(settings.logo_radius)||0}px`;
      }
    }else if(box.querySelector('img')||box.textContent.trim()!=='BG'){
      setText(box,'BG');
    }
  }

  function syncLogin(){
    const form=q('lbgLoginForm');
    if(!form)return;
    let brand=q('lbgLoginBrand');
    if(!brand){
      brand=document.createElement('div');
      brand.id='lbgLoginBrand';
      brand.className='lbg-login-brand';
      form.prepend(brand);
    }
    const desired=desiredImage();
    brand.classList.toggle('compact',desired.type==='icon');
    if(desired.url){
      const img=brand.querySelector('img');
      if(!img||img.dataset.lbgRuntimeSrc!==desired.url){brand.innerHTML=`<img alt="Logo đơn vị" data-lbg-runtime-src="${esc(desired.url)}" src="${esc(desired.url)}">`}
      const current=brand.querySelector('img');
      if(current)current.onerror=()=>{brand.className='lbg-login-brand';brand.innerHTML='<div class="lbg-login-brand-fallback">BG</div>'};
    }else if(!brand.querySelector('.lbg-login-brand-fallback')){
      brand.innerHTML='<div class="lbg-login-brand-fallback">BG</div>';
    }

    const title=form.querySelector('h2');
    const subtitle=form.querySelector('p');
    if(title){title.classList.add('lbg-login-brand-title');setText(title,settings.site_title||defaults.site_title)}
    if(subtitle){subtitle.classList.add('lbg-login-brand-subtitle');setText(subtitle,'Đăng nhập bằng mã tài khoản và mật khẩu do chủ sở hữu cấp.')}
  }

  function syncDocument(){
    const title=settings.site_title||defaults.site_title;
    const next=`Kiểm thử — ${title}`;
    if(document.title.includes('Kiểm thử')&&document.title!==next)document.title=next;
  }

  function sync(){syncQueued=false;syncHeader();syncLogin();syncDocument()}
  function queueSync(){
    if(syncQueued)return;
    syncQueued=true;
    if(typeof requestAnimationFrame==='function')requestAnimationFrame(sync);else setTimeout(sync,0);
  }

  async function loadPublicSettings(){
    if(!client||loaded)return;
    loaded=true;
    try{
      const {data,error}=await client.from('site_branding').select('*').eq('id','default').single();
      if(error)throw error;
      settings={...defaults,...(data||{})};
    }catch(error){
      console.warn('Không tải được thương hiệu công khai, dùng giao diện mặc định:',error?.message||error);
      settings={...defaults};
    }
    queueSync();
  }

  function watch(){
    if(observer)return;
    observer=new MutationObserver(queueSync);
    observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('lbg-branding-changed',event=>{
      settings={...defaults,...(event.detail||window.LBGBranding?.settings||{})};
      queueSync();
    });
    setInterval(()=>{
      const live=window.LBGBranding?.settings;
      if(live)settings={...defaults,...live};
      queueSync();
    },1600);
  }

  function start(){
    addStyle();watch();
    const timer=setInterval(()=>{
      const auth=window.LBGAuth;
      if(auth?.client){
        clearInterval(timer);
        client=auth.client;
        loadPublicSettings();
      }
      queueSync();
    },100);
    setTimeout(()=>clearInterval(timer),30000);
  }

  start();
})();
