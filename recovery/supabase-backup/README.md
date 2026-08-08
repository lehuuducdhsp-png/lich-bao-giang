# SAO LƯU SUPABASE — LỊCH BÁO GIẢNG

Bộ này dành cho Windows và project Supabase hiện tại của Lịch Báo giảng.

## Mục tiêu

Tạo một bản sao lưu độc lập gồm:

- database schema + data của ứng dụng;
- roles;
- dữ liệu Auth, bao gồm tài khoản và dữ liệu cần thiết để bảo toàn đăng nhập khi phục hồi đúng cách;
- metadata Storage;
- file thật trong bucket `tkb-private`;
- file thật trong bucket `site-branding`;
- source Edge Function `admin-users`;
- danh sách Edge Function secrets (tên/digest, không phải giá trị bí mật);
- migration history;
- SHA-256 cho các file backup.

## Cảnh báo bảo mật

Thư mục `output/` có thể chứa dữ liệu cá nhân, dữ liệu tài khoản và hash mật khẩu. Tuyệt đối:

- không commit `output/` lên GitHub;
- không gửi backup qua nơi công khai;
- không dán Database password, Personal Access Token, service-role/secret key vào chat hoặc issue;
- custom secret values phải cất trong password manager/kho bí mật riêng.

`.gitignore` trong thư mục này đã chặn `output/`, `.env`, archive backup và một số file nhạy cảm phổ biến.

## Chuẩn bị một lần trên máy Windows

Cần có:

1. Supabase CLI.
2. Docker Desktop đang chạy.
3. Quyền Owner/Admin đối với project Supabase.
4. Biết Database password. Nếu quên, đặt lại trong Database Settings của Supabase Dashboard.

Project ref đã được cố định trong script là `gmkibmybqfomypytmjxw` để tránh backup nhầm project khác.

## Chạy backup

Mở PowerShell tại repository đã tải/clone về máy rồi chạy:

```powershell
powershell -ExecutionPolicy Bypass -File .\recovery\supabase-backup\backup-supabase-windows.ps1
```

Supabase CLI có thể yêu cầu:

- đăng nhập Supabase;
- nhập Database password khi link project.

Hãy nhập trực tiếp trong cửa sổ CLI. Không lưu các giá trị đó trong repository.

## Sau khi script chạy xong

Một thư mục sẽ xuất hiện tại:

`recovery/supabase-backup/output/YYYYMMDD-HHMMSS/`

Kiểm tra tối thiểu:

- `BACKUP_STATUS.txt`: không có lỗi ở các bước database chính, Auth và `tkb-private`;
- `database/roles.sql`;
- `database/schema.sql`;
- `database/data.sql`;
- `database/auth-data.sql`;
- `storage/tkb-private/`;
- `edge-functions/admin-users/` nếu function đang tồn tại;
- `metadata/secrets-list.txt`;
- `SHA256SUMS.txt`.

Nếu `site-branding` chưa có file thì bước đó có thể trống; đây không nhất thiết là lỗi nghiêm trọng.

## Một việc script KHÔNG thể làm thay bạn

Supabase có thể liệt kê tên/digest Edge Function secrets nhưng giá trị custom secret không nên được coi là có thể lấy lại sau này. Vì vậy nếu project có custom secrets, phải cất giá trị thật ở nơi riêng tư như password manager.

Các secret mặc định do Supabase cấp cho Edge Functions (ví dụ URL/key của chính project) được Supabase quản lý theo project. Không sao chép secret key vào repository public.

## Database Backup trong Dashboard

Nếu gói Supabase của project có backup tự động, vẫn nên giữ backup đó như một lớp an toàn thứ hai. Backup database của Supabase không thay thế backup Storage objects: file trong Storage phải được sao lưu riêng.

## Quy tắc 3 bản

Một bản backup chỉ thật sự yên tâm khi có ít nhất:

- bản đang chạy trên Supabase;
- một bản backup trên máy cá nhân;
- một bản backup thứ hai ở nơi riêng tư khác (ổ cứng/Drive riêng, có kiểm soát quyền).

Không dùng GitHub public làm nơi lưu database dump hoặc Storage backup.

## Phục hồi

Không chạy lệnh restore vào production khi chưa đọc `RESTORE_GUIDE.md`. Restore database/Auth/Storage sai thứ tự có thể làm mất hoặc ghi đè dữ liệu đang chạy.
