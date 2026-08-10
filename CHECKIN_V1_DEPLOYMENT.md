# CHECK-IN V1 — Quy trình triển khai an toàn

Mục tiêu của tài liệu này là bảo đảm **luôn quay lại được website trước Check-in**.

## 1. Các mốc đang giữ

- Production hiện tại: `main`
- Bản cứu hộ trước Check-in: `rollback/pre-checkin-20260810-1057`
- Bản sao phát triển Check-in: `feature/checkin-v1-staging-20260810`

Không sửa trực tiếp nhánh rollback.

## 2. Kiến trúc thử nghiệm

Bản sao Check-in dùng entry riêng:

- `checkin-pilot.html`

Entry này tải cùng lõi giao diện hiện tại nhưng bật:

```js
window.LBG_CHECKIN_ENABLED = true;
window.LBG_CHECKIN_PILOT = true;
```

Trang production `index.html` không bị thay đổi trong giai đoạn phát triển.

## 3. Backend Check-in độc lập

Check-in chỉ thêm các đối tượng riêng:

- `teaching_checkin_slots`
- `teaching_checkins`
- `teaching_checkin_quota_grants`
- `checkin_system_settings`
- `checkin_pilot_users`
- các RPC có tiền tố/ý nghĩa Check-in

Không thay đổi dữ liệu TKB, Storage, Auth user, báo giảng hoặc bảng kê hiện có.

## 4. Pilot gate phía máy chủ

Trong `phase = pilot`:

- chỉ tài khoản có trong `checkin_pilot_users` mới Check-in;
- chỉ Nhóm trưởng/Quản lý được bật quyền review mới xem dữ liệu;
- Nhóm trưởng vẫn chỉ xem giáo viên thuộc nhóm mình;
- Chủ sở hữu quản lý danh sách pilot;
- dữ liệu được ghi `record_phase = pilot`.

Khi chuyển sang `phase = production`:

- giáo viên hợp lệ được Check-in theo vai trò;
- Nhóm trưởng vẫn được miễn Check-in;
- dữ liệu mới được ghi `record_phase = production`;
- dữ liệu pilot không trộn vào dữ liệu production.

## 5. Thứ tự triển khai bắt buộc

1. Tạo backup Supabase mới ngay trước khi chạy migration.
2. Xác nhận `main` và nhánh rollback vẫn cùng trạng thái trước Check-in.
3. Chạy các migration Check-in theo thứ tự tên file.
4. Không sửa/xóa bảng cũ.
5. Bật pilot cho đúng 1 giáo viên + 1 Nhóm trưởng trước.
6. Kiểm thử trên `checkin-pilot.html`.
7. Kiểm thử GPS thật trên điện thoại.
8. Kiểm thử 3/3 lượt và cấp thêm +3.
9. Kiểm thử một buổi có 2 trường.
10. Kiểm thử dạy thay/TKB chưa cập nhật.
11. Kiểm thử Nhóm trưởng không xem được nhóm khác.
12. Chỉ khi đạt checklist mới chuẩn bị promotion.

## 6. Promotion thành link chính

Promotion không đổi URL người dùng. Khi đạt kiểm thử:

1. Tạo thêm snapshot GitHub ngay trước promotion.
2. Backup Supabase lần cuối.
3. Chuyển server mode sang `production`.
4. Tích hợp duy nhất module `checkin-v1.js` vào loader production bằng feature flag.
5. Test smoke test ngay trên link chính.
6. Nếu ổn, giữ production.

## 7. Rollback frontend

Nếu lỗi giao diện/module:

- tắt feature flag Check-in nếu website vẫn truy cập được; hoặc
- đưa `main` về commit/branch `rollback/pre-checkin-20260810-1057`.

Bản cứu hộ không chứa Check-in nên website quay về trạng thái cũ.

## 8. Rollback backend

Có file:

`supabase/rollback/20260810_checkin_v1_rollback.sql`

File này chỉ xóa đối tượng Check-in V1. Không đụng TKB/Auth/Storage/bảng kê/nhóm.

**Chỉ chạy rollback database sau khi đã backup.**

## 9. Những lệnh không dùng trên production

Không dùng các thao tác destructive kiểu reset database remote. Không chạy lệnh reset có liên kết project production.

## 10. Nguyên tắc quyết định

- Check-in chưa ổn → tiếp tục sửa bản sao.
- Check-in không phù hợp → bỏ bản sao và giữ website cũ.
- Check-in đã promotion nhưng có lỗi lớn → rollback frontend + backend theo đúng tài liệu này.
