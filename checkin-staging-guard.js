'use strict';
(function(){
  const PRODUCTION_REF='gmkibmybqfomypytmjxw';
  const cfg=window.LBG_SUPABASE_CONFIG||{};
  let reason='';
  let host='';
  try{host=new URL(String(cfg.url||'')).hostname.toLowerCase()}catch{}

  if(!cfg.enabled)reason='Cấu hình Supabase staging chưa được bật.';
  else if(!host||!String(cfg.publishableKey||'').trim())reason='Thiếu URL hoặc publishable/anon key của Supabase staging.';
  else if(host.includes(PRODUCTION_REF))reason='ĐÃ CHẶN: môi trường Check-in staging đang trỏ nhầm vào Supabase production.';
  else if(/YOUR-STAGING-PROJECT|YOUR_STAGING_PUBLISHABLE_OR_ANON_KEY/i.test(String(cfg.url||'')+' '+String(cfg.publishableKey||'')))reason='Bạn chưa thay các giá trị mẫu bằng Supabase staging thật.';

  if(reason){
    window.LBG_CHECKIN_STAGING_CONFIG_ERROR=reason;
    window.LBG_SUPABASE_CONFIG=Object.freeze({
      ...cfg,
      enabled:false,
      testMode:true,
      url:'',
      publishableKey:''
    });
    setTimeout(()=>alert('CHECK-IN STAGING\n\n'+reason+'\n\nProduction không bị thay đổi.'),50);
  }else{
    window.LBG_CHECKIN_STAGING_CONFIG_OK=true;
  }
})();
