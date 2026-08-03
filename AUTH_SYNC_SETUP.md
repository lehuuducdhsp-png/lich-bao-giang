# Kích hoạt đăng nhập và đồng bộ TKB

> Nhánh triển khai: `feature-auth-sync-v1-20260803`
>
> Hệ thống hiện để `enabled: false`, nên chưa khóa website chính.

## 1. Tạo dự án Supabase riêng

Tạo một dự án mới chỉ dành cho **Lịch Báo giảng**. Không dùng chung với website quản lý học sinh.

Không gửi hoặc ghi vào GitHub:

- Mật khẩu tài khoản chủ sở hữu.
- Secret key/service-role key.
- Mật khẩu cơ sở dữ liệu.
- Google Sheets access key.

Chỉ hai giá trị được phép nằm ở frontend:

- Project URL.
- Publishable key.

## 2. Cài cơ sở dữ liệu và Storage

Trong Supabase SQL Editor, chạy toàn bộ tệp:

`supabase/migrations/20260803_auth_sync.sql`

Tệp này tạo:

- Bảng tài khoản và vai trò.
- Kho TKB chung và kho TKB cá nhân.
- Bucket riêng tư `tkb-private`.
- RLS để mỗi người chỉ thấy file được phép.
- Tối đa 20 file cá nhân.
- Tối đa 50 MB mỗi file.
- Tối đa 500 MB mỗi tài khoản cá nhân.
- Chỉ chủ sở hữu được chọn TKB chung đang áp dụng.

## 3. Tạo tài khoản chủ sở hữu

Trong Supabase Dashboard → Authentication → Users, tạo người dùng:

- Email nội bộ: `lehuuducdhsp@users.lichbaogiang.internal`
- Mật khẩu: tự đặt một mật khẩu **mới**, không dùng lại mật khẩu đã từng gửi trong hội thoại.
- Xác nhận email ngay khi tạo.

Sau đó chạy:

`supabase/bootstrap-owner.sql`

Tài khoản đăng nhập trên website sẽ là:

`lehuuducdhsp`

Người dùng không nhìn thấy email nội bộ.

## 4. Triển khai Edge Functions

Triển khai hai hàm:

- `admin-users`
- `google-sheets-owner`

Các hàm quản trị phải chạy phía máy chủ. Không đưa secret key vào JavaScript trình duyệt.

Thiết lập secrets cho `google-sheets-owner`:

- `GOOGLE_SHEETS_WEB_APP_URL`
- `GOOGLE_SHEETS_ACCESS_KEY`

Sau khi proxy được kiểm tra, phải thay khóa Google Sheets cũ vì khóa cũ từng nằm trong JavaScript công khai.

## 5. Điền cấu hình frontend

Mở `supabase-config.js` và thay:

```js
url: 'https://YOUR_PROJECT_REF.supabase.co',
publishableKey: 'sb_publishable_REPLACE_ME',
```

Sau khi đã chạy SQL, tạo owner và triển khai Functions, đổi:

```js
enabled: true
```

Không bật `enabled: true` trước các bước trên, vì toàn bộ website sẽ chuyển sang màn hình đăng nhập.

## 6. Chức năng đã dựng

### Đăng nhập

- Mã ngắn như `GV001`.
- Chủ sở hữu dùng `lehuuducdhsp`.
- Không tự đăng ký.
- Khóa toàn bộ website khi chưa đăng nhập.
- Người dùng phải đổi mật khẩu tạm ở lần đầu.
- Có khóa/mở tài khoản và ngày hết hạn.
- Không giới hạn số thiết bị đăng nhập.

### Phân quyền

- `owner`: toàn quyền.
- `uploader`: được tải TKB chung nhưng không được chọn bản áp dụng.
- `user`: dùng chức năng phân tích và xuất Excel.
- Chỉ `owner` được quản lý tài khoản và dùng Google Sheets.

### Đồng bộ TKB

- Kho chung và kho cá nhân riêng biệt.
- Người dùng không thấy file cá nhân của nhau.
- Chủ sở hữu có quyền quản trị file cá nhân.
- Tải được trên máy tính và điện thoại.
- File trên 6 MB dùng resumable upload.
- Bản tải từ cloud được lưu thêm vào IndexedDB để mở nhanh.
- Khi bản chung thay đổi, người dùng được hỏi trước khi chuyển.

## 7. Kiểm tra trước khi đưa lên `main`

1. Đăng nhập owner.
2. Tạo tài khoản `GV001` bằng mật khẩu tạm.
3. Đăng nhập `GV001` và đổi mật khẩu.
4. Tải TKB cá nhân bằng máy tính.
5. Đăng nhập cùng tài khoản trên điện thoại và mở đúng file.
6. Kiểm tra người khác không thấy file cá nhân.
7. Tài khoản uploader tải được TKB chung nhưng không kích hoạt được.
8. Owner chọn bản chung.
9. User nhận thông báo và xác nhận chuyển bản.
10. User không thấy và không gọi được Google Sheets.

Chỉ sau khi kiểm tra đủ mới hợp nhất nhánh tính năng vào `main`.
