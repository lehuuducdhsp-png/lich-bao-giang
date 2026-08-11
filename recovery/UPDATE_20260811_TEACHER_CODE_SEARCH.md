# CẬP NHẬT CỨU HỘ WEBSITE — TÌM NHANH GIÁO VIÊN KHI LIÊN KẾT MÃ TKB

**Ngày cập nhật:** 11/08/2026  
**Người quản trị:** Lê Hữu Đức

## 1. Trạng thái triển khai

- Tính năng tìm nhanh giáo viên/mã TKB đã được kiểm thử trên localhost và gộp vào `main` qua PR #6.
- Merge commit: `6d25e5ee017f6d64c25b7bc4d2b8530b1a183d62`.
- Nhánh cứu hộ frontend trước khi gộp: `rollback/pre-teacher-code-search-20260811-1743`.
- Không có migration Supabase mới và không thay đổi database.

## 2. Chức năng đã hoàn thiện

- Thay trải nghiệm cuộn danh sách giáo viên dài bằng ô tìm kiếm nhanh.
- Có thể tìm theo tên giáo viên hoặc mã TKB.
- Hỗ trợ nhập không dấu để tra cứu thuận tiện hơn.
- Kết quả tìm kiếm chỉ hiển thị các giáo viên phù hợp, giảm rối khi số lượng giáo viên lớn.
- Sau khi chọn, hệ thống vẫn lưu đúng mã TKB theo cơ chế hiện có.
- Tối ưu thao tác trên máy tính và thiết bị di động.

## 3. Kiểm thử đã hoàn tất

- Tìm theo tên giáo viên.
- Tìm theo mã TKB.
- Tìm bằng từ khóa không dấu.
- Chọn giáo viên từ kết quả tìm kiếm.
- Bấm `Lưu mã GV` và xác nhận dữ liệu hoạt động đúng.
- Người dùng đã xác nhận tính năng hoạt động ổn trên localhost trước khi merge.

## 4. Quy tắc an toàn

- Không thay đổi bảng dữ liệu, RPC hay migration Supabase cho tính năng này.
- Nếu frontend có sự cố, phục hồi về `rollback/pre-teacher-code-search-20260811-1743` hoặc tạo revert commit từ merge commit PR #6.
- Không xóa lịch sử liên kết mã đã có; tính năng chỉ thay đổi cách tìm/chọn trên giao diện.
