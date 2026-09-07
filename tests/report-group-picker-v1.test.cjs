'use strict';
const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

global.window={};
global.document={
  readyState:'loading',
  addEventListener(){},
  getElementById(){return null},
  querySelectorAll(){return[]},
  documentElement:{dataset:{}},
  head:{appendChild(){}},
  body:{}
};
global.MutationObserver=function(){};
global.requestAnimationFrame=fn=>fn();
global.Event=function(){};

vm.runInThisContext(fs.readFileSync('report-group-picker-v1.js','utf8'),{filename:'report-group-picker-v1.js'});

const api=window.LBGReportGroupPickerV1;
assert.ok(api&&typeof api.groupCodes==='function','Phải xuất helper groupCodes');
assert.strictEqual(api.normCode(' tâm '),'TÂM','Mã GV phải được chuẩn hóa chữ hoa và bỏ khoảng trắng');

const group={
  id:'khoi-1',name:'Khối 1',members:[
    {teacher_code:'TÂM'},
    {teacher_code:'lợi'},
    {teacher_code:' TÂM '},
    {teacher_code:''},
    {},
    {teacher_code:'ĐỨC'}
  ]
};

assert.deepStrictEqual(api.groupCodes(group),['TÂM','LỢI','ĐỨC'],'Không lọc quyền thì phải lấy mã hợp lệ, duy nhất, đúng thứ tự');
assert.deepStrictEqual(api.groupCodes(group,new Set(['TÂM','ĐỨC'])),['TÂM','ĐỨC'],'Phải chỉ chọn mã đang có trong tuần/phạm vi quyền');
assert.deepStrictEqual(api.groupCodes(group,new Set(['THANH'])),[],'Không được chọn giáo viên ngoài phạm vi khả dụng');
assert.deepStrictEqual(api.groupCodes({members:[{code:'GVX'}]},new Set(['GVX'])),['GVX'],'Cho phép fallback code khi dữ liệu nhóm dùng thuộc tính code');

console.log('OK report group picker: group -> accessible teacher selection');
