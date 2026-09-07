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

const source=fs.readFileSync('report-group-picker-v1.js','utf8');
vm.runInThisContext(source,{filename:'report-group-picker-v1.js'});

const api=window.LBGReportGroupPickerV1;
assert.ok(api&&typeof api.groupCodes==='function','Phải xuất helper groupCodes');
assert.strictEqual(api.normCode(' tâm '),'TÂM','Mã GV phải được chuẩn hóa chữ hoa và bỏ khoảng trắng');
assert.ok(source.includes("rpc('report_picker_groups')"),'Bộ chọn khối/nhóm phải dùng RPC riêng cho phạm vi báo giảng');
assert.ok(!source.includes("rpc('my_group_dashboard')"),'Không được dùng dashboard quản trị để xác định nhóm trong bộ chọn báo giảng');

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

const migration=fs.readFileSync('supabase/migrations/20260907190000_report_picker_global_specialist_groups.sql','utf8');
assert.ok(/create or replace function public\.report_picker_groups\(\)/i.test(migration),'Migration phải tạo RPC report_picker_groups');
assert.ok(/can_review_all_reports/i.test(migration),'RPC phải nhận biết quyền Trưởng ban chuyên môn');
assert.ok(/manager_can_review_all_reports/i.test(migration),'RPC phải đồng bộ quyền Quản lý được cấp xem toàn bộ báo giảng');
assert.ok(/or public\.can_view_teacher_group\(g\.id,v_uid\)/i.test(migration),'Tài khoản thường vẫn phải bị giới hạn theo nhóm được xem');
assert.ok(!/create or replace function public\.can_view_teacher_group/i.test(migration),'Không được nới quyền quản lý nhóm chỉ để phục vụ bộ chọn báo giảng');

console.log('OK report group picker: nhóm toàn hệ thống cho quyền báo giảng, quản trị vẫn giữ phạm vi');
