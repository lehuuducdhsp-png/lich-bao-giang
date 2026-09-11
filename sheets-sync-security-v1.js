'use strict';
(function(){
  const OWNER_SRC='sheets-sync-owner-v4.js?v=20260911.verified1';
  const OWNER_SCRIPT_ID='lbgSheetsSyncOwnerV4Secure';
  let loading=false;
  function clearLegacyUi(){
    clearInterval(window.__lbgSheetsOwnerTimer);window.__lbgSheetsOwnerTimer=null;
    for(const id of ['saveSheets','sheetSaveDialog','sheetSaveOverlayV2','sheetSaveOverlayV3','sheetSaveOverlayV4'])document.getElementById(id)?.remove();
  }
  function loadOwnerBridge(){
    if(window.LBGSheetsOwnerV4){window.LBGSheetsOwnerV4.install(window.LBGAuth);return}
    if(loading)return;loading=true;clearLegacyUi();
    const s=document.createElement('script');s.id=OWNER_SCRIPT_ID;s.src=OWNER_SRC;s.async=false;
    s.onerror=()=>{loading=false;console.error('LBG: không tải được cầu nối Google Sheets V4.')};
    document.body.appendChild(s);
  }
  function attach(){
    if(!window.LBGAuth){setTimeout(attach,100);return}
    window.LBGAuth.onReady(loadOwnerBridge);window.LBGAuth.onLogout(clearLegacyUi);
    if(window.LBGAuth.profile&&!window.LBGAuth.profile.must_change_password)loadOwnerBridge();
  }
  attach();
})();
