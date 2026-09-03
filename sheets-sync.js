'use strict';
(function(){
  // Cầu nối Google Sheets đời cũ đã bị vô hiệu hóa vì từng nhúng ACCESS_KEY
  // trực tiếp trong mã JavaScript công khai. Production phải dùng
  // sheets-sync-owner-v2.js -> Supabase Edge Function google-sheets-owner.
  window.LBG_LEGACY_SHEETS_BRIDGE_DISABLED=true;
  console.warn('LBG: cầu nối Google Sheets cũ đã tắt; dùng cầu nối owner qua Supabase.');
})();
