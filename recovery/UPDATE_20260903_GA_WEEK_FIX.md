# Cập nhật 03/09/2026 — ô GA và số tuần Lịch Báo giảng

## Mục tiêu

Tinh chỉnh phần Xem trước/Xuất Lịch Báo giảng mà không thay đổi TKB, Supabase, Check-in hoặc dữ liệu lịch sử.

## Thay đổi

- Mở rộng và làm rõ ô nhập số giáo án GA để hiển thị tốt số 2 chữ số.
- Ẩn spinner tăng/giảm của input GA trên trình duyệt, căn giữa và tăng độ rõ của số.
- Giữ nguyên cơ chế lưu GA hiện có và nội dung GA khi xuất Excel.
- Sửa trường hợp số tuần bị tính thành `Tuần -1`, `Tuần 0` hoặc rơi thành `Tuần ...`.
- Ưu tiên số tuần ghi rõ trong tên sheet nếu có.
- Nếu tên sheet không ghi rõ số tuần, dùng cấu hình Ngày bắt đầu Tuần 01 hiện có; có fallback theo tuần đầu tiên trong file TKB để tránh số tuần âm/trống.
- Hiển thị số tuần theo 2 chữ số: `01`, `02`, ...
- Không thay đổi giao diện hay giá trị cấu hình Ngày bắt đầu Tuần 01.

## Kiểm thử

Người dùng đã kiểm thử localhost ngày 03/09/2026 và xác nhận:
- ô GA đã hiển thị ổn;
- lịch từ 10/08/2026 đến 15/08/2026 hiển thị `Tuần 01` đúng mong muốn;
- đồng ý chốt để đưa chính thức.

## An toàn và rollback

- Không migration database.
- Không thay đổi Supabase.
- Không sửa/xóa lịch sử Check-in.
- Backend Check-in vẫn giữ nguyên `phase = pilot`.
- Rollback trước merge: `rollback/pre-ga-week-fix-merge-20260903-1504` tại main commit `1f64e2428998560ef25c68da465b09e14029a4e5`.

## Branch

`feature/ga-input-readable-20260903`
