'use strict';
// COPY this file to: checkin-staging-config.local.js
// Then fill ONLY the URL and PUBLISHABLE/ANON key of a SEPARATE Supabase staging project.
// NEVER use a service_role key here.
// NEVER point this staging config at the production project.

window.LBG_SUPABASE_CONFIG = Object.freeze({
  enabled: true,
  testMode: true,
  url: 'https://YOUR-STAGING-PROJECT.supabase.co',
  publishableKey: 'YOUR_STAGING_PUBLISHABLE_OR_ANON_KEY',
  usernameDomain: 'users.lichbaogiang.internal',
  bucket: 'tkb-private',
  maxFileBytes: 50 * 1024 * 1024,
  personalMaxFiles: 20,
  personalMaxBytes: 500 * 1024 * 1024,
  sharedPollMs: 60000
});
