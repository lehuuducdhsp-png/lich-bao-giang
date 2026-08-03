-- Chạy sau khi đã tạo tài khoản Auth bằng Supabase Dashboard.
-- Email nội bộ dùng cho mã đăng nhập lehuuducdhsp:
-- lehuuducdhsp@users.lichbaogiang.internal
--
-- Không ghi mật khẩu vào tệp SQL này. Hãy đặt một mật khẩu MỚI trực tiếp trong Dashboard.

update public.profiles
set
  username = 'lehuuducdhsp',
  display_name = 'Lê Hữu Đức',
  role = 'owner',
  can_upload_shared = true,
  is_active = true,
  expires_at = null,
  must_change_password = false,
  updated_at = now()
where id = (
  select id from auth.users
  where lower(email) = 'lehuuducdhsp@users.lichbaogiang.internal'
  limit 1
);

-- Kiểm tra kết quả:
select id, username, display_name, role, can_upload_shared, is_active, must_change_password
from public.profiles
where username = 'lehuuducdhsp';
