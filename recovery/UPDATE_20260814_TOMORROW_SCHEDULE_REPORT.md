# Cập nhật 14/08/2026 — Báo lịch ngày mai và xác nhận đã xem

## Phạm vi

Bổ sung luồng báo lịch ngày mai dựa trên TKB chung đang áp dụng, tách hoàn toàn khỏi Check-in GPS.

## Trải nghiệm giáo viên

- Sau 17:00, tài khoản có mã giáo viên và có lịch ngày mai được xem lịch ngày mai, kể cả Nhóm trưởng là đối tượng được miễn Check-in GPS.
- Nội dung báo nhóm ở dạng ngắn gọn theo buổi → trường → lớp, ví dụ:

  Chiều thứ 5
  Phú Hậu: 5/4, 5/3, 3/3.

- Có các thao tác: `Sao chép báo nhóm`, `Đã xem lịch`, `Xem chi tiết`.
- `Xem chi tiết` cho biết buổi, trường, tiết, lớp.
- Nếu lịch đã xác nhận sau đó thay đổi ở buổi/trường/lớp/tiết, trạng thái chuyển thành `Cần xem lại` và giáo viên phải xác nhận lại.
- Nếu không có lịch ngày mai, hệ thống thông báo rõ ràng.

## Theo dõi xác nhận

- Chủ sở hữu: luôn xem toàn hệ thống.
- Nhóm trưởng: mặc định xem phạm vi nhóm mình quản lý.
- Chủ sở hữu có thể cấp quyền `Xem toàn hệ thống` cho bất kỳ tài khoản hoạt động nào khi cần, không khóa theo chức danh.
- Danh sách có tìm kiếm, lọc nhóm, lọc trạng thái và phân trang 10/20/50 dòng.
- Bộ lọc nhóm bao gồm cả nhóm đang hoạt động nhưng không có lịch ngày mai.

## Quyền và riêng tư

- Quyền theo dõi xác nhận lịch dạy độc lập với quyền Check-in GPS.
- Giáo viên không có quyền xem bảng kê người khác chỉ thấy chính mình trong bộ chọn Bảng kê tháng; không còn xổ danh sách giáo viên khác rồi chặn ở bước sau.
- Phần `Quản lý nhóm và phân quyền` được ẩn với giáo viên thường khi họ không có trách nhiệm quản lý nhóm.

## Database

Bốn migration đã được áp dụng lên Supabase và tên file trong repo đã đồng bộ đúng với lịch sử migration từ remote:

- `20260814142054_teaching_schedule_acknowledgements.sql`
- `20260814145757_schedule_ack_flexible_access.sql`
- `20260814153711_schedule_ack_monitor_groups.sql`
- `20260814160324_schedule_ack_revoke_anon_rpc.sql`

Migration cuối thu hồi quyền `EXECUTE` mặc định của `PUBLIC/anon` đối với các RPC mới của chức năng xác nhận lịch, chỉ giữ quyền gọi cho `authenticated`. Bảng `teaching_schedule_acknowledgements` bật RLS và không mở policy đọc/ghi trực tiếp; thao tác đi qua các RPC kiểm tra tài khoản/quyền.

Không sửa migration cũ. Không thay đổi lịch sử Check-in. Không đổi backend Check-in khỏi `phase = pilot`.

## File chính

- `checkin-tomorrow-report-v2.js`
- `schedule-ack-flexible-access-v1.js`
- `schedule-ack-list-ux-v3.js`
- `schedule-ack-permission-visual-v1.js`
- `role-privacy-polish-v1.js`
- `app-runtime-v1.js`

Hai module UX thử nghiệm cũ `schedule-ack-list-ux-v1.js` và `schedule-ack-list-ux-v2.js` đã được loại khỏi thay đổi trước khi merge; production chỉ nạp V3.

## Kiểm thử và duyệt

Người dùng đã kiểm thử trên localhost branch `feature/tomorrow-schedule-report-20260814` qua nhiều vòng và xác nhận ổn trước khi yêu cầu đưa chính thức ngày 14/08/2026.

Trước merge đã rà lại lịch sử migration remote và chạy Supabase Security Advisor. Các cảnh báo `anon` phát sinh từ RPC mới đã được xử lý bằng migration `20260814160324_schedule_ack_revoke_anon_rpc.sql`. Các cảnh báo bảo mật cũ của hệ thống không thuộc phạm vi cập nhật này chưa được thay đổi trong PR này.

## Rollback

Rollback branch được tạo trước merge từ `main` hiện hành:

- `rollback/pre-tomorrow-schedule-report-merge-20260814-2259`
- base commit trước merge: `177ab17868749ea7d1b20d34e44b056798bde256`

Lưu ý: rollback code không tự rollback dữ liệu/database. Các migration đã áp dụng là phần schema mới và phải được xử lý riêng nếu thật sự cần hoàn nguyên database.
