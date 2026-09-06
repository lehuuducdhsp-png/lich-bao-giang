# UPDATE 2026-09-07 — Mật khẩu tạm GV###

## Quy tắc

- Tài khoản dạng `GV###` dùng mật khẩu tạm `hoannang###`.
- Ví dụ: `GV035` → `hoannang035`.
- Giữ nguyên các số 0 đầu.
- Tài khoản không theo mẫu `GV` + chữ số không bị ép theo quy tắc này.

## An toàn đăng nhập

- Tài khoản mới vẫn được tạo với `must_change_password = true`.
- Người dùng chỉ dùng mật khẩu tạm để vào lần đầu; trước khi sử dụng hệ thống phải đổi sang mật khẩu riêng.
- Sau khi đổi thành công, mật khẩu tạm cũ không còn đăng nhập được vì mật khẩu Supabase Auth đã được thay.
- Quên mật khẩu: chỉ Chủ sở hữu mới được reset qua Edge Function `admin-users`; reset tài khoản GV sẽ đưa về đúng `hoannang###` và bật lại `must_change_password = true`.
- Chức năng reset thường không được phép reset tài khoản `owner`.

## Tài khoản đã tồn tại

- Không tự động thay mật khẩu của tài khoản đã hoàn tất đổi mật khẩu.
- Có thao tác Chủ sở hữu `Chuẩn hóa tài khoản chưa đổi`.
- Máy chủ chỉ chọn các profile `must_change_password = true`, loại trừ `role = owner`, rồi chỉ áp dụng cho username khớp `GV` + chữ số.
- Hành động này có thể chạy lại an toàn: tài khoản đã đổi mật khẩu sẽ không nằm trong tập được chọn.

## Thành phần

- `temp-password-policy-v1.js`: giao diện tạo/reset và nút chuẩn hóa tài khoản chưa đổi.
- `production-mode-v1.js`: tải policy trên website chính thức.
- `supabase/functions/admin-users/index.ts`: policy phía máy chủ và bulk reset có kiểm tra quyền Chủ sở hữu.
- `tests/temp-password-policy-v1.test.cjs`: regression quy tắc username → mật khẩu tạm.
- `tests/admin-users-temp-password-policy.test.cjs`: regression các hàng rào phía máy chủ.
- `.github/workflows/validate-temp-password-policy.yml`: CI.

## Rollback

Nếu cần quay lui giao diện, bỏ phần tải `temp-password-policy-v1.js` trong `production-mode-v1.js`.
Nếu cần quay lui backend, triển khai lại phiên bản `admin-users` trước thay đổi này. Không có migration DB trong cập nhật này.
