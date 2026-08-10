# CẬP NHẬT HỒ SƠ CỨU HỘ - 10/08/2026 22:32 (UTC+7)

## Thay đổi vừa triển khai

- Bổ sung chức năng **Xóa khỏi nhóm** cho thành viên thường tại Mục 7.
- Giao diện tối ưu cho mobile: nút Xóa khỏi nhóm tách rõ, dễ bấm.
- Không cho xóa trực tiếp người đang là Nhóm trưởng; phải gỡ vai trò Nhóm trưởng trước.
- Khi xóa khỏi nhóm, hệ thống **không xóa tài khoản, không xóa mã TKB, không xóa lịch sử báo giảng, không xóa lịch sử Check-in**.
- Thành viên chỉ được kết thúc membership hiện tại và trở về trạng thái chưa phân nhóm.
- Backend lưu thời điểm kết thúc, người thực hiện và gửi thông báo cập nhật nhóm.

## Database

Migration đã áp dụng production:

```text
20260810053500_group_member_release.sql
```

Quy trình đã thực hiện:

1. `supabase db push --dry-run --linked`
2. Chỉ thấy đúng migration `20260810053500_group_member_release.sql`
3. `supabase db push --linked`
4. Kiểm tra lại bằng dry-run
5. Kết quả: `Remote database is up to date.`

## Kiểm thử

- Đã mở bản localhost trên nhánh thử nghiệm.
- Người dùng đã bấm thử **Xóa khỏi nhóm** và xác nhận chức năng hoạt động ổn.

## GitHub

- Feature branch: `feature/group-member-remove-20260810`
- PR: `#4 - Thêm chức năng Xóa khỏi nhóm an toàn`
- PR đã merge vào `main`.
- Merge commit: `4de5af8132938e5fef85dd32ae168559520c912d`

## Mốc cứu hộ trước khi merge

- `rollback/pre-group-member-remove-20260810-2230`
- `backup/pre-member-remove-doc-20260810-2230`

Nếu frontend phát sinh lỗi sau thay đổi này, ưu tiên phục hồi code từ nhánh rollback; không reset database production chỉ để xử lý lỗi giao diện.
