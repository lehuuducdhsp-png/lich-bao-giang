'use strict';
const assert=require('assert');
const api=require('../assist-p-summary-monthly-safe-v1.js');

assert.strictEqual(api.weekAssistLabel(2),'2 Trợ (P)');
assert.strictEqual(api.weekAssistLabel(0),'0 Trợ (P)');
assert.strictEqual(api.dayOffset(2),0);
assert.strictEqual(api.dayOffset(7),5);
assert.strictEqual(api.dayOffset(8),6);

const monday=new Date(2026,7,31,12,0,0,0); // 31/08/2026
const tue=api.entryDateForWeek(monday,3);
const fri=api.entryDateForWeek(monday,6);
assert.strictEqual(api.dateKey(tue),'2026-09-01');
assert.strictEqual(api.dateKey(fri),'2026-09-04');

const entries=[
  {day:2}, // 31/08, không thuộc tháng 09
  {day:3}, // 01/09
  {day:6}, // 04/09
  {day:7}  // 05/09
];
assert.strictEqual(api.countEntriesInMonth(entries,monday,2026,9),3);
assert.strictEqual(api.countEntriesInMonth(entries,monday,2026,8),1);

const midMonth=new Date(2026,8,14,12,0,0,0);
assert.strictEqual(api.countEntriesInMonth([{day:6},{day:6}],midMonth,2026,9),2);

console.log('assist-p-summary-monthly-safe-v1: OK');
