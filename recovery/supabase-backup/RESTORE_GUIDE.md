# PHỤC HỒI SUPABASE — KHÔNG CHẠY VỘI TRÊN PRODUCTION

Tài liệu này là checklist phục hồi. Không có script restore một-click nhằm tránh ghi đè nhầm project đang chạy.

## Nguyên tắc đầu tiên

Nếu web lỗi nhưng Supabase vẫn còn dữ liệu, đừng restore database. Trước hết xác định lỗi thuộc:

1. GitHub/frontend;
2. Supabase Auth;
3. Database/RLS/RPC;
4. Storage;
5. Edge Function;
6. cấu hình/secrets.

Chỉ phục hồi lớp bị lỗi.

## Trường hợp cần dựng một Supabase project mới

### 1. Tạo project mới

- Chọn region phù hợp.
- Ghi lại project ref mới.
- Cấu hình các extension/webhook/realtime cần dùng.
- Dùng connection string của project mới.

Không xóa project cũ cho đến khi project mới đã được kiểm thử đầy đủ.

### 2. Khôi phục database ứng dụng

Các file chính:

- `roles.sql`
- `schema.sql`
- `data.sql`

Quy trình chuẩn dùng `psql` theo thứ tự roles → schema → data, trong một transaction khi phù hợp. Với dữ liệu được mã hóa/trigger, cần tuân theo hướng dẫn restore chính thức của Supabase và có thể cần `session_replication_role = replica` trong quá trình import.

Không restore vào production cũ nếu mục tiêu chỉ là thử nghiệm. Hãy restore vào project mới trước.

### 3. Auth users

`auth-data.sql` là lớp dự phòng riêng cho dữ liệu Auth vì Supabase CLI mặc định loại managed schema `auth` khỏi dump thông thường.

Khi chuyển sang một hosted Supabase project mới:

- project mới đã có managed Auth schema;
- ưu tiên phục hồi dữ liệu Auth theo hướng dẫn migration chính thức thay vì ghi đè mù toàn bộ `auth-schema.sql`;
- `auth-schema.sql` trong backup chủ yếu dùng để lưu trữ/đối chiếu các thay đổi schema/triggers/policies;
- sau restore, người dùng có thể phải đăng nhập lại nếu JWT signing configuration của project mới khác.

Phải kiểm tra số lượng `auth.users` và quan hệ với `public.profiles` trước khi cho người dùng sử dụng.

### 4. Public schema và phân quyền

Kiểm tra các bảng tối thiểu:

- `profiles`
- `tkb_files`
- `teacher_groups`
- `teacher_group_memberships`
- `teacher_group_managers`
- `teacher_group_scoped_access`
- `teacher_group_transfer_log`
- `user_notifications`
- `site_branding`

Kiểm tra các RPC/function quan trọng:

- `is_owner`
- `mark_login`
- `complete_password_change`
- `my_access_context`
- `can_view_teacher_group`
- `can_manage_teacher_group`
- `set_global_specialist_access`
- `set_manager_permissions`
- `has_manager_permission`
- `set_profile_teacher_code`
- `reserve_tkb_upload`
- `finalize_tkb_upload`
- `set_active_shared_tkb`
- `set_active_personal_tkb`
- `save_site_branding`
- `reset_site_branding`

Nếu thiếu function/policy, đối chiếu migrations trong repository trước khi sửa frontend.

### 5. Storage

Database backup không chứa file object thật. Phải phục hồi riêng:

- `storage/tkb-private/` → bucket `tkb-private`;
- `storage/site-branding/` → bucket `site-branding`.

Tạo/cấu hình bucket và RLS policy đúng trước khi cho người dùng sử dụng. Sau khi upload lại, kiểm tra file thật và metadata `tkb_files` khớp nhau.

### 6. Edge Function

Source backup hiện cần có `edge-functions/admin-users/`.

Deploy function vào project mới, sau đó kiểm tra:

- tạo tài khoản;
- khóa/mở tài khoản;
- reset mật khẩu;
- xóa tài khoản;
- quyền Owner.

Nếu source function phụ thuộc `deno.json` hoặc import map mà file download không có, phải dựng lại dependency config trước khi deploy.

### 7. Secrets

`secrets-list.txt` chỉ xác nhận TÊN/digest của secret. Nó không phải bản sao giá trị secret.

- custom secret values phải lấy từ password manager/kho bí mật riêng;
- đặt lại custom secrets cho project mới;
- không đưa service-role/secret key vào frontend hoặc repository public;
- các secret mặc định của project mới phải dùng giá trị của project mới.

### 8. Cập nhật frontend sau khi đổi Supabase project

Chỉ khi project mới đã hoạt động ổn mới thay cấu hình frontend:

- Supabase URL/project ref;
- publishable key dành cho browser;
- các cấu hình public khác.

Không đưa secret/service-role key vào `supabase-config.js`.

### 9. Checklist bắt buộc trước khi chuyển người dùng sang project phục hồi

- [ ] Chủ sở hữu đăng nhập được.
- [ ] Một tài khoản giáo viên thường đăng nhập được.
- [ ] Đổi mật khẩu hoạt động.
- [ ] `profiles.teacher_code` đúng.
- [ ] Giáo viên chỉ thấy phạm vi được phép.
- [ ] Trưởng ban/Quản lý có đúng quyền đã cấp.
- [ ] TKB chung mở được.
- [ ] TKB cá nhân mở được.
- [ ] Upload TKB hoạt động.
- [ ] Lập báo giảng hoạt động, gồm Chủ nhật khi có tiết.
- [ ] Bảng kê tháng đúng quy tắc một ô mã = một tiết; `OFF` không tính.
- [ ] Xuất Excel hoạt động.
- [ ] Mục 5 và Mục 6 hoạt động.
- [ ] Logo/icon hiển thị đúng.
- [ ] `admin-users` hoạt động.
- [ ] RLS không cho tài khoản thường đọc dữ liệu riêng tư của người khác.

## Sau khi phục hồi thành công

Tạo ngay một snapshot GitHub mới và một backup Supabase mới. Không xóa bản backup cũ cho đến khi bản mới đã được kiểm tra.
