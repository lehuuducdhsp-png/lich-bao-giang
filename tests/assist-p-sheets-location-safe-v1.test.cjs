const test=require('node:test');
const assert=require('node:assert/strict');
const api=require('../assist-p-sheets-location-safe-v1.js');

test('P không tạo thêm trường VỸ khi tiết chính là VỸ DẠ cùng buổi/ngày',()=>{
  const main={day:6,session:'Sáng',school:'VỸ DẠ',className:'3/7',isAssist:false};
  const assist1={day:6,session:'Sáng',school:'VỸ',schoolName:'VỸ',className:'1/1 (P)',isAssist:true,assignmentType:'assist',sourceCell:'X1'};
  const assist2={day:6,session:'Sáng',school:'VỸ',schoolName:'VỸ',className:'1/3 (P)',isAssist:true,assignmentType:'assist',sourceCell:'X2'};
  const out=api.normalizePayloadLocations({entries:[main,assist1,assist2],schedule:[main,assist1,assist2]});
  assert.equal(out.entries[1].school,'VỸ DẠ');
  assert.equal(out.entries[2].school,'VỸ DẠ');
  assert.equal(out.entries[1].locationLabel,'VỸ DẠ');
  assert.deepEqual([...new Set(out.entries.map(e=>e.school))],['VỸ DẠ']);
});

test('ưu tiên locationKey chính xác khi một buổi có nhiều trường',()=>{
  const entries=[
    {day:4,session:'Chiều',school:'THỦY PHƯƠNG\nPhân hiệu: THANH LAM CŨ',locationKey:'tp-tlc',isAssist:false},
    {day:4,session:'Chiều',school:'VỸ DẠ',locationKey:'vy-da',isAssist:false},
    {day:4,session:'Chiều',school:'THANH LAM',schoolName:'THANH LAM',locationKey:'tp-tlc',className:'1/1 (P)',isAssist:true,assignmentType:'assist'}
  ];
  const out=api.normalizePayloadLocations({entries});
  assert.equal(out.entries[2].school,'THỦY PHƯƠNG\nPhân hiệu: THANH LAM CŨ');
});

test('không đụng địa điểm nếu không có tiết chính cùng ngày/buổi',()=>{
  const assist={day:7,session:'Sáng',school:'TRƯỜNG RIÊNG',isAssist:true,assignmentType:'assist'};
  const out=api.normalizePayloadLocations({entries:[assist]});
  assert.equal(out.entries[0].school,'TRƯỜNG RIÊNG');
});
