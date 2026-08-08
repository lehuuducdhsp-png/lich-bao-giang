const LBG_AUTH_TEST = new URLSearchParams(window.location.search).get('auth-test') === '1';
const LBG_PRODUCTION_MODE = window.LBG_PRODUCTION === true || document.documentElement?.dataset?.lbgProduction === '1';

window.LBG_SUPABASE_CONFIG = Object.freeze({
  enabled: LBG_AUTH_TEST || LBG_PRODUCTION_MODE,
  testMode: LBG_AUTH_TEST,
  url: 'https://gmkibmybqfomypytmjxw.supabase.co',
  publishableKey: 'sb_publishable_x7E1lF0bK6qi6SJ1rrH8Eg_nzNHmtEg',
  usernameDomain: 'users.lichbaogiang.internal',
  bucket: 'tkb-private',
  maxFileBytes: 50 * 1024 * 1024,
  personalMaxFiles: 20,
  personalMaxBytes: 500 * 1024 * 1024,
  sharedPollMs: 60000
});
