'use strict';
const assert=require('assert');
const api=require('../assist-p-web-footer-safe-v1.js');
assert.strictEqual(api.assistLabel(2),'2 Trợ (P)');
assert.deepStrictEqual(api.footerLines('TỔNG: 15 tiết + 1 tiết = 16 tiết',2),[
  'TỔNG: 15 tiết + 1 tiết = 16 tiết',
  '2 Trợ (P)'
]);
console.log('assist-p-web-footer-safe-v1: OK');
