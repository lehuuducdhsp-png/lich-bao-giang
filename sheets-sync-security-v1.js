'use strict';
(function(){
  const OWNER_SRC='sheets-sync-owner-v3.js?v=20260909.2';
  const OWNER_SCRIPT_ID='lbgSheetsSyncOwnerV3Secure';

  function clearLegacyUi(){
    clearInterval(window.__lbgSheetsOwnerTimer);window.__lbgSheetsOwnerTimer=null;
    document.getElementById('saveSheets')?.remove();
    document.getElementById('sheetSaveDialog')?.remove();
    document.getElementById('sheetSaveOverlayV2')?.remove();
    document.getElementById('sheetSaveOverlayV3')?.remove();
  }
  function loadOwnerBridge(){
    clearLegacyUi();
    document.querySelectorAll('script[src*="sheets-sync-owner-v2.js"],script[src*="sheets-sync-owner-v3.js"]').forEach(x=>x.remove());
    document.getElementById(OWNER_SCRIPT_ID)?.remove();
    const s=document.createElement('script');s.id=OWNER_SCRIPT_ID;s.src=OWNER_SRC;s.async=false;
    s.onerror=()=>console.error('LBG: không tải được cầu nối Google Sheets V3.');document.body.appendChild(s);
  }
  function attach(){
    if(!window.LBGAuth){setTimeout(attach,100);return}
    window.LBGAuth.onReady(()=>loadOwnerBridge());window.LBGAuth.onLogout(()=>clearLegacyUi());
    if(window.LBGAuth.profile&&!window.LBGAuth.profile.must_change_password)loadOwnerBridge();
  }
  attach();
})();
