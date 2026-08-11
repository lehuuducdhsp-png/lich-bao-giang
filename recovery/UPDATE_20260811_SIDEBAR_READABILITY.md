# CẬP NHẬT CỨU HỘ — SIDEBAR THU GỌN & ĐỘ DỄ ĐỌC

Ngày: 2026-08-11

## Trạng thái triển khai
- Đã kiểm thử nhiều vòng trên localhost và được người dùng xác nhận ổn.
- Đã merge qua PR #7: `Cải thiện sidebar thu gọn và độ dễ đọc giao diện`.
- Merge commit: `7f103540369b9c858e69d3e5dd0f384effb96e40`.
- Nhánh tính năng: `feature/sidebar-compact-readable-20260811`.
- Nhánh rollback trước khi merge: `rollback/pre-sidebar-readable-20260811-1852`.

## Phạm vi thay đổi
- Thêm nút thu gọn / mở rộng `Danh mục chức năng` trên desktop.
- Sidebar thu gọn thành dạng icon để mở rộng vùng nội dung chính.
- Ghi nhớ trạng thái thu gọn trên thiết bị.
- Tăng cỡ chữ có chọn lọc ở bảng dữ liệu, biểu mẫu, nút, badge và các vùng còn bị nhỏ.
- Thêm `readability-targeted-v2.js` để xử lý component có CSS riêng hoặc tải muộn, đặc biệt Quản lý quyền Check-in và các bảng TKB/tài khoản.
- Giữ hành vi mobile hiện có; không ép chế độ sidebar desktop trên màn hình nhỏ.

## File chính
- `sidebar-compact-readable-v1.js`
- `readability-targeted-v2.js`
- `app-runtime-v1.js`
- `index.html`

## An toàn dữ liệu
- Không có migration Supabase mới.
- Không thay đổi database.
- Không thay đổi dữ liệu người dùng, đăng nhập, phân quyền, lịch sử báo giảng hay lịch sử Check-in.

## Kiểm tra sau merge
- So sánh `feature/sidebar-compact-readable-20260811` với `main` sau merge: không có file diff; `main` chỉ hơn nhánh tính năng đúng merge commit.

## Rollback nhanh
Nếu cần quay lại giao diện ngay trước thay đổi này, dùng nhánh:
`rollback/pre-sidebar-readable-20260811-1852`

Mốc `main` trước khi merge: `71d4133f7adf73708b5ffc5daf6b62aaa7a53001`.
