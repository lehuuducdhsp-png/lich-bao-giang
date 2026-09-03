# Hotfix treo hộp Lưu Google Sheets — 04/09/2026

## Hiện tượng
- Sau khi bấm `☁ Lưu vào Google Sheets`, hộp lựa chọn hiện ra nhưng có trường hợp nút `Hủy` và các nút khác không phản hồi, giao diện có cảm giác lag/đơ.

## Nguyên nhân nghi ngờ/khoanh vùng
- Cầu nối owner đang dùng native `<dialog>` kết hợp với vòng `setInterval` mỗi 1 giây để kiểm tra/tạo lại nút lưu.
- Khi hộp native bị kẹt, toàn bộ nền bị inert nên người dùng không thể thao tác tiếp.

## Thay đổi
- Bỏ native `<dialog>`; thay bằng overlay nhẹ với 3 nút có `type=button` và handler riêng.
- `Hủy` đóng overlay trực tiếp; click nền hoặc phím Esc cũng đóng.
- Bỏ vòng kiểm tra `setInterval` 1 giây của cầu nối Google Sheets.
- Chỉ cập nhật trạng thái nút theo sự kiện thay đổi tuần/giáo viên/năm học, nút Kiểm tra và trạng thái `disabled` của Xuất Excel.
- Dọn timer/dialog legacy khi bridge bảo mật nạp.
- Bump cache `sheets-sync-owner-v2.js`, `sheets-sync-security-v1.js`, `app-runtime-v1.js`.

## Không thay đổi
- Không đổi `ACCESS_KEY`, Supabase secrets, Apps Script hoặc Google Sheets data.
- Không migration database.
- Không thay Check-in/phase pilot.

## Rollback
- `rollback/pre-sheets-dialog-freeze-hotfix-20260904`

## Kiểm thử cần thực hiện trước merge
1. Localhost mở website, đăng nhập owner.
2. Chọn tuần + giáo viên + Kiểm tra.
3. Bấm `Lưu vào Google Sheets`.
4. Bấm `Hủy` phải đóng ngay và trang tiếp tục thao tác bình thường.
5. Mở lại hộp, thử Ghi đè hoặc BẢN 2; phải gửi qua Edge Function owner như trước.
