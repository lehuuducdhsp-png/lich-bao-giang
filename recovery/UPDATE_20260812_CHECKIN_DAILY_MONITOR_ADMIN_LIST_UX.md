# CẬP NHẬT CỨU HỘ — THEO DÕI CHECK-IN & DANH SÁCH QUẢN TRỊ

Ngày: 2026-08-12

## Trạng thái triển khai
- Người dùng đã kiểm thử localhost tại `?admin-list-ux=20260812-1` và xác nhận ổn.
- Đã merge PR #8: `Hoàn thiện theo dõi Check-in và danh sách quản trị`.
- Merge commit: `f4d9b6b5ef5d8386cda89d85f99498aaa55e4bbe`.
- Nhánh tính năng: `feature/checkin-daily-monitor-20260812`.
- Nhánh rollback ngay trước merge: `rollback/pre-checkin-daily-monitor-20260812-2215`.
- Mốc `main` trước merge: `ce3d919d6ef88816124c67354180b53faf9a9463`.

## Phạm vi thay đổi
- Nhóm trưởng có bảng theo dõi Check-in trong ngày, tách sáng `06:00–11:00` và chiều `12:00–17:00`.
- Một trường trong cùng buổi = một điểm dạy; nhiều trường trong cùng buổi = nhiều điểm cần Check-in.
- Giáo viên/thành viên chỉ được thao tác Check-in trong khung giờ tương ứng ở giao diện.
- Sau 17:00, thành viên xem trước lịch ngày mai; nút Check-in bị khóa.
- Lịch ngày mai xếp buổi sáng trước, buổi chiều sau.
- Quản lý tài khoản mặc định `Cũ → mới`; có tìm kiếm, sắp xếp và phân trang.
- Liên kết tài khoản với giáo viên trong TKB có tìm kiếm, lọc, sắp xếp và phân trang; ưu tiên tài khoản chưa liên kết.

## File chính
- `checkin-daily-monitor-v1.js`
- `checkin-member-window-v1.js`
- `admin-list-ux-v1.js`
- `app-runtime-v1.js`
- `index.html`
- `supabase/migrations/20260812220000_checkin_session_time_window.sql`

## Backend / migration
Migration `20260812220000_checkin_session_time_window.sql` đã được đưa vào repository, nhưng việc merge GitHub KHÔNG tự áp dụng migration lên Supabase. Cần chạy `supabase db push` từ repo đã liên kết để khóa thời gian Check-in phía máy chủ hoàn chỉnh.

Quy tắc server-side của migration:
- Sáng: từ `06:00:00` đến trước `11:01:00` giờ Việt Nam.
- Chiều: từ `12:00:00` đến trước `17:01:00` giờ Việt Nam.
- Session `Khác` chỉ được phép khi một trong hai khung chính đang mở.

## An toàn dữ liệu
- Không xóa hoặc sửa lịch sử Check-in đã ghi nhận.
- Không xóa tài khoản, TKB, báo giảng hoặc lịch sử dữ liệu.
- Không đổi phạm vi quyền Nhóm trưởng ngoài phần hiển thị theo dõi mới.

## Kiểm tra sau merge
- So sánh `feature/checkin-daily-monitor-20260812` với `main` sau merge: không có file diff; `main` chỉ hơn đúng merge commit.

## Rollback nhanh
Nếu cần quay lại giao diện/trạng thái repo ngay trước thay đổi này, dùng nhánh:
`rollback/pre-checkin-daily-monitor-20260812-2215`
