# Hardening khóa Google Sheets — 03/09/2026

## Vấn đề
- Cầu nối cũ `sheets-sync.js` từng nhúng `ACCESS_KEY` trực tiếp trong JavaScript công khai.
- Một khóa nằm trong frontend tĩnh không thể xem là bí mật, kể cả khi đã đổi khóa.

## Hướng xử lý
- Vô hiệu hóa cầu nối cũ `sheets-sync.js`; không còn khóa Google Sheets trong file hiện hành.
- Thêm `sheets-sync-security-v1.js` để loại bỏ UI cầu nối cũ và bắt buộc tải `sheets-sync-owner-v2.js` sau khi hệ thống đăng nhập sẵn sàng.
- `sheets-sync-owner-v2.js` gọi Supabase Edge Function `google-sheets-owner`; frontend không gửi hay lưu Google Sheets ACCESS_KEY.
- Edge Function hiện đang ACTIVE và tự kiểm tra access token Supabase, profile phải là `owner`, `is_active=true`, chưa hết hạn rồi mới gọi Apps Script.
- Bump `app-runtime-v1.js` cache qua `index.html?v=20260903.5`.

## Rotation bắt buộc sau khi deploy
- Khóa cũ xuất hiện trong ảnh chụp phải được coi là đã lộ.
- Tạo khóa mới trên thiết bị của chủ sở hữu, không gửi vào chat, không commit GitHub.
- Cập nhật cùng một giá trị ở:
  1. Apps Script > Project Settings > Script Properties > `ACCESS_KEY`.
  2. Supabase > Edge Functions > Secrets > `GOOGLE_SHEETS_ACCESS_KEY`.
- Supabase secrets có hiệu lực ngay, không cần redeploy function.
- Sau rotation, thử 1 lần `Lưu vào Google Sheets` bằng tài khoản owner.

## Không thay đổi
- Không database migration.
- Không đổi Check-in hoặc phase pilot.
- Không thay dữ liệu/lịch sử Google Sheets.
- Không lưu khóa mới trong repo/recovery.

## Rollback
`rollback/pre-google-sheets-key-hardening-20260903-1901`
