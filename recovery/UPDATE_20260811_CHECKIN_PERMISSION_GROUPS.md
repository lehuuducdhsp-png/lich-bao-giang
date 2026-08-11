# CẬP NHẬT CỨU HỘ WEBSITE — QUẢN LÝ QUYỀN CHECK-IN THEO NHÓM

**Ngày cập nhật:** 11/08/2026  
**Người quản trị:** Lê Hữu Đức

## 1. Trạng thái triển khai

- Chức năng quản lý quyền Check-in theo nhóm đã được kiểm thử trên localhost và đã gộp vào `main` qua PR #5.
- Merge commit: `eb939d3545c576b505c58e3fc9fbf43bc9d54229`.
- Backend Check-in vẫn giữ ở **PILOT / THỬ NGHIỆM**, chưa chuyển sang CHÍNH THỨC.
- Nhánh cứu hộ frontend trước khi gộp: `rollback/pre-checkin-permission-groups-20260811-1656`.

## 2. Chức năng đã hoàn thiện

- Chủ sở hữu quản lý quyền Check-in theo từng phạm vi: Hành chính/Quản lý, từng Nhóm và Chưa phân nhóm.
- Có ô tìm giáo viên, nút Hoàn tác và nút **Lưu tất cả thay đổi** để lưu hàng loạt.
- Nhóm trưởng chỉ được bật/tắt Check-in cho giáo viên thường thuộc nhóm mình.
- Quyền **Kiểm tra** vẫn do Chủ sở hữu quản lý; Nhóm trưởng không thể tự cấp quyền review cho thành viên.
- Nhóm trưởng được phân loại về đúng nhóm đang phụ trách; nếu quản lý nhiều nhóm thì ưu tiên nhóm được đánh dấu Nhóm trưởng chính.
- Giao diện của Nhóm trưởng hiển thị rõ **Nhóm trưởng phụ trách** ở chế độ chỉ đọc để nhận diện người quản lý nhóm.
- Danh sách tối ưu cho trường hợp có nhiều giáo viên và giao diện mobile.

## 3. Migration đã áp dụng

- `20260811090000_checkin_permission_admin_bulk.sql`
- `20260811100000_checkin_permission_group_leader_bucket_fix.sql`

Sau khi áp dụng migration, đã kiểm tra bằng `supabase db push --dry-run --linked` và nhận trạng thái `Remote database is up to date.`

## 4. Quy tắc dữ liệu quan trọng

- Nhóm trưởng được xác định từ quan hệ quản lý nhóm (`teacher_group_managers`), không chỉ từ membership thông thường.
- Giáo viên thường thuộc nhóm theo membership hiện tại (`teacher_group_memberships` với `valid_to is null`).
- Chỉ tài khoản không quản lý nhóm nào và không có membership hiện tại mới nằm trong **Chưa phân nhóm**.
- Tài khoản Hành chính/Quản lý được gom riêng trong phạm vi **Hành chính / Quản lý**.

## 5. Quy tắc an toàn

- Không sửa/xóa migration đã chạy trên production; mọi sửa lỗi backend phải bằng migration bổ sung mới.
- Nếu frontend có sự cố, ưu tiên phục hồi về nhánh `rollback/pre-checkin-permission-groups-20260811-1656` hoặc tạo revert commit; không phá hủy database.
- Không chuyển Check-in từ PILOT sang CHÍNH THỨC nếu chưa kiểm tra smoke-test trên link chính và chưa có quyết định rõ ràng của Chủ sở hữu.

## 6. Kiểm thử đã hoàn tất trước merge

- Chủ sở hữu: xem theo nhóm/Hành chính, tìm giáo viên, lưu hàng loạt.
- Phân loại Nhóm trưởng về đúng nhóm.
- Nhóm trưởng: chỉ thấy phạm vi nhóm mình, chỉ chỉnh Check-in của giáo viên thường.
- Hiển thị Nhóm trưởng phụ trách ở giao diện Nhóm trưởng.
- Giao diện localhost đã được người dùng xác nhận hoạt động ổn trước khi merge.
