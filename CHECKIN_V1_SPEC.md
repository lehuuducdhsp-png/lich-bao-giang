# CHECK-IN V1 — Đặc tả nghiệp vụ đã chốt

Trạng thái: **BẢN SAO PHÁT TRIỂN / PILOT**  
Ngày chốt nghiệp vụ: 2026-08-10

## 1. Mục tiêu

Ghi nhận **một điểm GPS tại đúng thời điểm giáo viên chủ động bấm Check-in**, kèm thời gian máy chủ để Nhóm trưởng/Quản lý có thể mở lại vị trí khi cần đối chiếu.

Check-in V1:

- không theo dõi GPS nền;
- không Check-out;
- không tự kết luận đúng/sai trường;
- không yêu cầu có sẵn tọa độ chuẩn của tất cả trường;
- không chụp ảnh/video;
- không lưu hành trình.

## 2. Đối tượng

- Giáo viên thường: Check-in nếu tài khoản hoạt động và có mã giáo viên.
- Nhóm trưởng: **không cần Check-in**.
- Chủ sở hữu: không Check-in.
- Quản lý có mã giáo viên và không phải Nhóm trưởng: có thể Check-in nếu trực tiếp đi dạy.

Trong giai đoạn Pilot, quyền trên còn bị khóa thêm bởi `checkin_pilot_users` phía máy chủ.

## 3. Một điểm dạy

Một điểm dạy được xác định bởi:

- giáo viên;
- ngày;
- buổi: `Sáng`, `Chiều` hoặc `Khác`;
- tên trường;
- phase dữ liệu: `pilot` hoặc `production`.

Ví dụ cùng buổi sáng:

- Trường A → 3 lượt riêng.
- Trường B → 3 lượt riêng.

Nếu chiều quay lại Trường A thì đó là điểm dạy khác và có 3 lượt riêng.

## 4. Hạn mức 3 lượt

- Mỗi điểm dạy bắt đầu với đúng **3 lượt**.
- Chỉ khi GPS lấy được, giáo viên bấm **Xác nhận Check-in**, và máy chủ ghi thành công thì mới trừ 1 lượt.
- Từ chối quyền GPS, GPS lỗi, timeout, mất mạng, RPC lỗi: **không trừ lượt**.
- Check-in cũ không bị sửa/xóa.
- Mỗi lần Check-in lại tạo một bản ghi mới.
- Khi dùng hết hạn mức, Nhóm trưởng/Quản lý/Chủ sở hữu có quyền phù hợp có thể cấp thêm đúng **+3 lượt**.
- Không cấp thêm khi vẫn còn lượt.
- Mỗi lần cấp thêm lưu người cấp, thời gian cấp và lý do.
- Việc cấp thêm chỉ áp dụng đúng điểm dạy đang hết lượt.

## 5. Dạy thay / điểm dạy ngoài TKB

Nếu TKB chưa kịp cập nhật:

- chọn `Điểm dạy khác / Dạy thay`;
- nhập tên trường;
- chọn buổi;
- chọn lý do: `Dạy thay`, `Điều động đột xuất`, `TKB chưa cập nhật`, `Khác`;
- lưu `schedule_source = manual`.

Địa điểm tự khai báo chỉ được đánh dấu để minh bạch, **không đồng nghĩa với sai**.

Nếu TKB đang mở có dữ liệu hôm nay, Check-in tự đọc `teacher-intelligence-v6` để gợi ý trường/buổi của đúng mã giáo viên.

## 6. Thời gian

V1 **không khóa giờ Check-in** vì mỗi trường có thời khóa biểu khác nhau.

- Chỉ Check-in cho ngày hiện tại theo `Asia/Ho_Chi_Minh`.
- `checked_at` lấy từ máy chủ/Supabase.
- Không dùng giờ điện thoại làm thời gian chính thức.
- Không cho tạo Check-in lùi ngày.

## 7. GPS và độ chính xác

Mỗi lần ghi:

- `latitude`;
- `longitude`;
- `accuracy_m`;
- `gps_quality`.

Phân loại chất lượng GPS:

- `good`: <= 50 m;
- `fair`: > 50 m và <= 200 m;
- `low`: > 200 m.

Đây chỉ là **chất lượng GPS**, không phải kết luận giáo viên đúng/sai trường.

GPS thấp sẽ được cảnh báo trước khi xác nhận; giáo viên vẫn có thể xác nhận và hệ thống giữ nguyên `accuracy_m` để người kiểm tra biết mức tin cậy.

## 8. Xem bản đồ

Nhóm trưởng/Quản lý bấm `Xem vị trí` sẽ thấy **bản đồ có ghim ngay trong website** tại tọa độ lịch sử đã lưu.

- Bản đồ trong trang dùng OpenStreetMap embed, không cần API key.
- Có nút mở Google Maps nếu muốn kiểm tra rộng hơn.
- Ghim là vị trí tại lúc Check-in, không phải vị trí hiện tại của giáo viên.

## 9. Phân quyền

### Giáo viên

- Check-in của chính mình.
- Xem lịch sử của chính mình.
- Không sửa/xóa Check-in.
- Không tự cấp thêm lượt.

### Nhóm trưởng

- Không cần Check-in.
- Xem Check-in của thành viên thuộc nhóm mình.
- Mở vị trí thành viên thuộc nhóm mình.
- Cấp thêm +3 lượt cho thành viên thuộc nhóm mình khi điểm dạy đã hết lượt.

### Quản lý

- Xem Check-in toàn hệ thống khi được quyền phù hợp.
- Mở vị trí toàn hệ thống.
- Có quyền dự phòng cấp thêm +3 lượt.

### Chủ sở hữu

- Xem toàn hệ thống.
- Quản lý nhóm Pilot.
- Có quyền dự phòng cấp thêm +3 lượt.

## 10. Pilot an toàn trên cùng hạ tầng

Do hai project Supabase Free hiện đều đang được sử dụng, Pilot có thể dùng cùng Supabase `lich-bao-giang` nhưng được cô lập bằng:

- bảng Check-in hoàn toàn riêng;
- RPC Check-in riêng;
- RLS riêng;
- `checkin_system_settings.phase = 'pilot'`;
- `checkin_pilot_users`;
- `record_phase = 'pilot'` trên điểm dạy;
- entry riêng `checkin-pilot.html`;
- production `index.html` chưa nạp Check-in.

Pilot flag **không được mở rộng vai trò**:

- giáo viên thường chỉ được bật Check-in;
- Nhóm trưởng chỉ được bật Review và vẫn chỉ xem nhóm mình;
- Quản lý được bật Review theo phạm vi vai trò;
- Chủ sở hữu quản lý danh sách Pilot.

## 11. Khi chuyển chính thức

Khi Pilot đạt kiểm thử:

- tạo snapshot + backup mới;
- chuyển phase sang `production`;
- dữ liệu mới ghi `record_phase = production`;
- dữ liệu Pilot không trộn vào dữ liệu chính thức;
- tích hợp module Check-in vào loader production bằng feature flag;
- URL chính của người dùng không đổi.

## 12. Năm học

Quy ước V1:

- tháng 8 trở đi → năm học `YYYY-YYYY+1`;
- tháng 1–7 → năm học trước.

Sang năm học mới, giao diện mặc định dùng năm mới. Dữ liệu năm cũ chuyển thành lịch sử; **không tự DELETE**. Chỉ xóa khi đã backup và có chính sách lưu trữ cụ thể.

## 13. Database

Các bảng chính:

- `teaching_checkin_slots`;
- `teaching_checkins`;
- `teaching_checkin_quota_grants`;
- `checkin_system_settings`;
- `checkin_pilot_users`.

Ghi Check-in qua RPC `security definer`; người dùng không INSERT/UPDATE/DELETE trực tiếp các bản ghi Check-in.

RPC chính:

- `submit_teaching_checkin(...)`;
- `my_checkin_day(date)`;
- `checkin_dashboard(date)`;
- `grant_teaching_checkin_quota(slot_id, reason)`;
- `checkin_access_context()`;
- `checkin_pilot_list()`;
- `set_checkin_pilot_user(...)`.

## 14. Rollback

Frontend có mốc cứu hộ:

`rollback/pre-checkin-20260810-1057`

Backend có:

`supabase/rollback/20260810_checkin_v1_rollback.sql`

Rollback Check-in không được sửa/xóa TKB, Auth, Storage, báo giảng, bảng kê hoặc nhóm hiện có.

## 15. Checklist trước production

1. Backup Supabase mới.
2. Chạy migrations Check-in đúng thứ tự.
3. Pilot đúng 1 giáo viên + 1 Nhóm trưởng.
4. Test GPS bị từ chối / timeout / sai số lớn.
5. Test 3/3 lượt + cấp thêm 3.
6. Test một buổi 2 trường.
7. Test dạy thay / TKB chưa cập nhật.
8. Test Nhóm trưởng không xem được nhóm khác.
9. Test Android Chrome.
10. Test iPhone Safari.
11. Test bản đồ ghim trong web.
12. Backup lần nữa trước promotion.
13. Chỉ sau khi đạt checklist mới đưa vào link chính.
