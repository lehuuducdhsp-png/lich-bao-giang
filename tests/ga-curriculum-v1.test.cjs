'use strict';
const assert=require('node:assert/strict');
const C=require('../ga-curriculum-v1.js');

assert.equal(C.version,'20260920.1');

const events=[
  {sheet:'7T9',schoolName:'THỦY PHƯƠNG',schoolKey:'THUY_PHUONG',members:['3/9'],role:'KNS',actualCategory:'KNS',date:new Date(2026,8,7,12),session:'Sáng',teachingPeriod:5},
  {sheet:'7T9',schoolName:'THỦY PHƯƠNG',schoolKey:'THUY_PHUONG',members:['3/9'],role:'KNS',actualCategory:'KNS',date:new Date(2026,8,10,12),session:'Sáng',teachingPeriod:5},
  {sheet:'14T9',schoolName:'THỦY PHƯƠNG',schoolKey:'THUY_PHUONG',members:['3/9'],role:'STEM',actualCategory:'STEM',date:new Date(2026,8,17,12),session:'Sáng',teachingPeriod:5},
  {sheet:'21T9',schoolName:'THỦY PHƯƠNG',schoolKey:'THUY_PHUONG',members:['3/9'],role:'KNS',actualCategory:'KNS',date:new Date(2026,8,24,12),session:'Sáng',teachingPeriod:5}
];

C.assignProgression(events);
assert.equal(events[0].ga,1);
assert.equal(events[1].ga,1,'same week 7T9 KNS must keep GA1');
assert.equal(events[1].gaSource,'same-week');
assert.equal(events[2].ga,3,'STEM starts its independent sequence at GA3');
assert.equal(events[3].ga,2,'next KNS week must advance GA1 -> GA2, ignoring STEM GA3');

console.log('OK GA curriculum weekly progression: 7T9 KNS GA1 throughout, STEM GA3 separate, 21T9 KNS GA2');
