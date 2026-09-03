'use strict';
(function(){
  const OWNER_SRC='sheets-sync-owner-v2.js?v=20260904.1';
  const OWNER_SCRIPT_ID='lbgSheetsSyncOwnerV2Secure';

  function clearLegacyUi(){
    clearInterval(window.__lbgSheetsOwnerTimer);
    window.__lbgSheetsOwnerTimer=null;
    document.getElementById('saveSheets')?.remove();
    document.getElementById('sheetSaveDialog')?.remove();
    document.getElementById('sheetSaveOverlayV2')?.remove();
  }

  function loadOwnerBridge(){
    clearLegacyUi();
    const existing=document.querySelector('script[src*="sheets-sync-owner-v2.js"]');
    if(existing){
      const src=existing.getAttribute('src')||'';
      if(src.includes('v=20260904.1'))return;
      existing.remove();
    }
    document.getElementById(OWNER_SCRIPT_ID)?.remove();
    const s=document.createElement('script');
    s.id=OWNER_SCRIPT_ID;
    s.src=OWNER_SRC;
    s.async=false;
    s.onerror=()=>console.error('LBG: không tải được cầu nối Google Sheets bảo mật.');
    document.body.appendChild(s);
  }

  function attach(){
    if(!window.LBGAuth){
      setTimeout(attach,100);
      return;
    }
    window.LBGAuth.onReady(()=>loadOwnerBridge());
    window.LBGAuth.onLogout(()=>clearLegacyUi());
    if(window.LBGAuth.profile&&!window.LBGAuth.profile.must_change_password)loadOwnerBridge();
  }

  attach();
})();
