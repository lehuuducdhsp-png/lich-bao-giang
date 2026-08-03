window.LBG_SUPABASE_CONFIG = Object.freeze({
  enabled: false,
  url: 'https://YOUR_PROJECT_REF.supabase.co',
  publishableKey: 'sb_publishable_REPLACE_ME',
  usernameDomain: 'users.lichbaogiang.internal',
  bucket: 'tkb-private',
  maxFileBytes: 50 * 1024 * 1024,
  personalMaxFiles: 20,
  personalMaxBytes: 500 * 1024 * 1024,
  sharedPollMs: 60000
});

// Chỉ URL và publishable key được đặt tại đây.
// Tuyệt đối không đưa secret key/service-role key hoặc mật khẩu vào file này.
