# CHECK-IN V1 — Đặc tả nghiệp vụ và an toàn triển khai

Trạng thái: **STAGING ONLY**  
Ngày chốt: 2026-08-10

## 1. Mục tiêu

Ghi nhận một **điểm GPS tại đúng thời điểm giáo viên chủ động bấm Check-in**, kèm thời gian máy chủ để Nhóm trưởng/Quản lý có thể mở lại vị trí khi cần đối chiếu.

Check-in V1 **không theo dõi GPS nền**, **không check-out**, **không tự kết luận đúng/sai trường**, và **không yêu cầu có sẵn tọa độ chuẩn của tất cả trường**.

## 2. Đối tượng

- Giáo viên thường: có thể Check-in nếu tài khoản đang hoạt động và đã gán mã giáo viên.
- Nhóm trưởng: **không cần Check-in**.
- Chủ sở hữu: không thuộc đối tượng Check-in.
- Quản lý có mã giáo viên và không phải Nhóm trưởng: vẫn có thể Check-in nếu trực tiếp đi dạy.

## 3. Một điểm dạy là gì?

Một điểm dạy được xác định bởi:

- giáo viên;
- ngày;
- buổi: `Sáng`, `Chiều` hoặc `Khác`;
- tên trường.

Ví dụ cùng buổi sáng:

- Trường A → 3 lượt riêng.
- Trường B → 3 lượt riêng.

Nếu chiều quay lại Trường A thì đó là một điểm dạy khác và có 3 lượt riêng.

## 4. Hạn mức 3 lượt

- Mỗi điểm dạy bắt đầu với đúng **3 lượt**.
- Chỉ khi GPS lấy được, giáo viên bấm **Xác nhận Check-in**, và máy chủ ghi thành công thì mới trừ 1 lượt.
- Từ chối quyền GPS, GPS lỗi, timeout, mất mạng, RPC lỗi: **không trừ lượt**.
- Check-in cũ không bị sửa/xóa. Mỗi lần Check-in lại tạo thêm một bản ghi mới.
- Khi dùng hết toàn bộ hạn mức hiện có, Nhóm trưởng/Quản lý/Chủ sở hữu có thể cấp thêm **đúng +3 lượt**.
- Không được cấp thêm khi giáo viên vẫn còn lượt.
- Mỗi lần cấp thêm phải có lý do và lưu người cấp + thời gian cấp.
- Việc cấp thêm chỉ áp dụng đúng điểm dạy đang bị hết lượt, không reset toàn bộ tài khoản.

## 5. Dạy thay / điểm dạy ngoài TKB

Nếu TKB không kịp cập nhật:

- Giáo viên chọn `Điểm dạy khác / Dạy thay`.
- Nhập tên trường.
- Chọn buổi.
- Chọn lý do: `Dạy thay`, `Điều động đột xuất`, `TKB chưa cập nhật`, `Khác`.
- Dữ liệu được đánh dấu `schedule_source = manual`.
- Đây là dữ liệu ngoài lịch dự kiến, **không đồng nghĩa với sai**.

Nếu TKB đang mở có dữ liệu hôm nay, Check-in V1 tự đọc `teacher-intelligence-v6` để gợi ý các trường/buổi của đúng mã giáo viên.

## 6. Thời gian

V1 **không khóa cứng giờ Check-in** vì mỗi trường có thời khóa biểu khác nhau.

- Ngày check-in bắt buộc là ngày hiện tại theo múi giờ `Asia/Ho_Chi_Minh`.
- `checked_at` lấy trực tiếp từ máy chủ/Supabase.
- Không cho tạo Check-in lùi ngày bằng thời gian trên điện thoại.

## 7. GPS

Mỗi bản ghi lưu:

- `latitude`;
- `longitude`;
- `accuracy_m`;
- `gps_quality`.

`accuracy_m` là độ chính xác do thiết bị/trình duyệt trả về. V1 phân loại:

- `good`: <= 50 m;
- `fair`: > 50 m và <= 200 m;
- `low`: > 200 m.

Phân loại này **chỉ nói về chất lượng GPS**, không nói giáo viên đúng hay sai trường.

Nếu GPS thấp, hệ thống cảnh báo và khuyên thử lại, nhưng vẫn cho giáo viên xác nhận nếu cần. Bản ghi sẽ giữ nguyên `accuracy_m` để người kiểm tra biết mức tin cậy.

## 8. Xem bản đồ

Người có quyền bấm `Xem vị trí` sẽ mở Google Maps tại đúng tọa độ đã lưu của lần Check-in đó.

- Đây là **vị trí lịch sử tại lúc Check-in**, không phải vị trí hiện tại của giáo viên.
- Không dùng API key.
- Không gửi vị trí lên Google cho tới khi người kiểm tra chủ động bấm mở bản đồ.

## 9. Phân quyền

### Giáo viên
- Check-in của chính mình.
- Xem lịch sử của chính mình.
- Không sửa/xóa Check-in.
- Không tự cấp thêm lượt.

### Nhóm trưởng
- Không cần Check-in.
- Xem Check-in của thành viên thuộc nhóm mình.
- Mở vị trí của thành viên thuộc nhóm mình.
- Cấp thêm +3 lượt cho thành viên thuộc nhóm mình khi điểm dạy đã hết lượt.

### Quản lý
- Xem Check-in toàn hệ thống.
- Mở vị trí toàn hệ thống.
- Có quyền dự phòng cấp thêm +3 lượt.

### Chủ sở hữu
- Xem toàn hệ thống.
- Có quyền dự phòng cấp thêm +3 lượt.

## 10. Lưu trữ theo năm học

Mỗi điểm dạy có `school_year`.

Quy ước V1:
- từ tháng 8 trở đi thuộc năm học `YYYY-YYYY+1`;
- tháng 1–7 thuộc năm học trước.

Khi sang năm học mới, giao diện mặc định dùng năm học mới. Dữ liệu năm cũ được xem là lưu trữ; **không tự DELETE**. Chỉ xóa sau này nếu Trung tâm có chính sách lưu trữ cụ thể và đã backup.

## 11. Quyền riêng tư

- Chỉ gọi `navigator.geolocation.getCurrentPosition()` khi giáo viên chủ động bấm.
- Không dùng `watchPosition()`.
- Không theo dõi nền.
- Không lưu ảnh/video.
- Không lưu hành trình.
- Không lưu user-agent hay thông tin thiết bị không cần thiết.
- Không cho giáo viên thường xem GPS của nhau.

## 12. Các bảng Supabase

- `teaching_checkin_slots`: điểm dạy + hạn mức gốc.
- `teaching_checkins`: từng lần Check-in bất biến.
- `teaching_checkin_quota_grants`: lịch sử cấp thêm +3 lượt.

Ghi dữ liệu chỉ qua RPC `security definer`; người dùng authenticated chỉ có quyền đọc theo RLS, không INSERT/UPDATE/DELETE trực tiếp.

## 13. RPC chính

- `submit_teaching_checkin(...)`
- `my_checkin_day(date)`
- `checkin_dashboard(date)`
- `grant_teaching_checkin_quota(slot_id, reason)`

## 14. Cổng an toàn trước production

Không merge/bật Check-in trên link chính cho tới khi hoàn thành:

1. Supabase staging riêng.
2. Chạy migration trên staging thành công.
3. Kiểm thử giáo viên thường.
4. Kiểm thử Nhóm trưởng.
5. Kiểm thử 2 trường trong cùng buổi.
6. Kiểm thử dạy thay.
7. Kiểm thử 3/3 lượt + cấp thêm 3.
8. Kiểm thử GPS bị từ chối / timeout / sai số lớn.
9. Kiểm thử iPhone Safari + Android Chrome.
10. Kiểm thử quyền: GV không xem được người khác.
11. Backup production trước merge.
12. Production bật bằng feature flag; rollback được ngay.

## 15. Feature flag

`checkin-v1.js` chỉ chạy khi:

```js
window.LBG_CHECKIN_ENABLED === true
```

Production hiện tại không đặt cờ này. Trang `checkin-staging.html` mới bật cờ để thử nghiệm.

Điều này giúp tránh việc chỉ vì file Check-in xuất hiện trong source mà chức năng tự động chạy trên link chính.
