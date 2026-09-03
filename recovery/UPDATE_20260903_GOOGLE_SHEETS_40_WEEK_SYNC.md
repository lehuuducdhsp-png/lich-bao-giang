# Đồng bộ Google Sheets / MỤC LỤC 40 TUẦN 2026–2027

Ngày: 03/09/2026

## Trạng thái cuối
ĐÃ KIỂM THỬ VÀ ĐỒNG BỘ THÀNH CÔNG trên file Google Sheets thật của năm học 2026–2027.

Kết quả thực tế khi chạy:
- Preview hợp lệ: 0 vấn đề chặn đồng bộ.
- 40/40 tab đã đúng tên chuẩn tại thời điểm chạy thật.
- Đồng bộ hoàn tất thành công.
- Đã tạo backup toàn bộ Google Sheets trước khi ghi.
- Đã tạo backup riêng của sheet `MỤC LỤC`.
- Đã tạo sheet nhật ký `__LBG_NHAT_KY_SYNC_20260903`.
- Người dùng đã kiểm tra MỤC LỤC sau khi làm mới và xác nhận mốc đầu/cuối 40 tuần đúng.
- Script Property `LBG_SCHOOL_YEAR_CONFIG_2026.startDate` đã được đổi từ `2026-08-31` sang `2026-09-07` để Apps Script cùng mốc với website và Google Sheets.

## Mốc chuẩn
- Tuần 01: 07/09/2026 → 12/09/2026.
- Danh mục gồm 40 tuần liên tiếp, mỗi tuần Thứ Hai → Thứ Bảy.
- Tuần 39: 31/05/2027 → 05/06/2027.
- Tuần 40: 07/06/2027 → 12/06/2027.

Tên tab chuẩn có dạng `TUẦN NN_<ngày>T<tháng>`.
Ví dụ:
- `TUẦN 01_7T9`
- `TUẦN 02_14T9`
- `TUẦN 39_31T5`
- `TUẦN 40_7T6`

## Phạm vi website
- Không thay đổi `index.html`, `app-runtime-v1.js` hoặc database trong đợt đồng bộ Google Sheets này.
- Website tiếp tục dùng Tuần 01 = `07/09/2026` đã chốt ở PR #16.
- Không thay đổi Supabase.
- Không thay đổi Check-in.
- Không đổi backend Check-in `phase = pilot`.

## File phục hồi / đối chiếu
- `recovery/google-sheets/WEEK_PLAN_2026_2027.csv`: lịch chuẩn 40 tuần.
- `recovery/google-sheets/SYNC_2026_2027_40_WEEKS.gs`: công cụ preview + sync dành cho project Apps Script độc lập hiện tại; đọc `CONFIG.CURRENT_SPREADSHEET_ID` từ `Mã.gs`.
- `recovery/google-sheets/BACKUP_NODRIVE_PATCH_20260903.gs`: hàm backup thay thế không dùng `DriveApp`, dùng khi project không có quyền DriveApp.

## Cấu trúc Apps Script thực tế
Project Apps Script là project độc lập dùng làm cầu nối Website → Google Sheets, không phải script container-bound của riêng Spreadsheet.

Do đó:
- Không dùng `SpreadsheetApp.getUi()` cho luồng quản trị này.
- Không thay `Mã.gs`, `doGet`, `doPost` hiện có.
- Spreadsheet đích được mở theo `CONFIG.CURRENT_SPREADSHEET_ID`.
- Không cần bấm `Triển khai` lại chỉ để chạy công cụ đồng bộ thủ công hoặc đổi Script Property.

## Quy trình đã dùng thành công
1. Chạy `LBG_previewSchoolYear2026_2027_40Weeks` trước.
2. Preview xác nhận:
   - Tuần 01 = 07/09/2026 → 12/09/2026.
   - Tuần 40 = 07/06/2027 → 12/06/2027.
   - 0 blockers.
3. Trong bản chạy thực tế, dòng backup được chuyển sang gọi:
   `LBG40_createFullSpreadsheetBackupNoDrive_(ss, context.timeZone)`.
4. Hàm `LBG40_createFullSpreadsheetBackupNoDrive_` được đặt trong file Apps Script riêng `BACKUP_NODRIVE_PATCH.gs`, dùng `SpreadsheetApp.create()` + `copyTo()` để tạo backup mà không cần mở rộng quyền DriveApp.
5. Chạy `LBG_syncSchoolYear2026_2027_40Weeks` trong vòng 15 phút sau Preview.
6. Hệ thống tạo backup trước rồi mới cập nhật MỤC LỤC/tiêu đề/khoảng ngày/liên kết mở nhanh.
7. Nhật ký cuối xác nhận `=== ✅ ĐỒNG BỘ THÀNH CÔNG ===`.
8. Sau đó đổi Script Property `LBG_SCHOOL_YEAR_CONFIG_2026.startDate` sang `2026-09-07`.

## Rào chắn an toàn
- Không xóa bất kỳ sheet nào.
- Không đụng các tab `BẢN 2`, `BẢN 3`, `COPY`.
- Preview phải hợp lệ trước khi sync.
- Preview có thời hạn; nếu hết hạn phải chạy lại.
- Nếu có blocker thì dừng trước khi ghi.
- Backup toàn file phải tạo được trước khi cập nhật dữ liệu.
- Có backup riêng của MỤC LỤC trong file nguồn.
- Có nhật ký đồng bộ để truy vết.

## Kết quả Google Sheets đã xác nhận
MỤC LỤC hiện dùng:
- Tuần 01: 07/09/2026 → 12/09/2026.
- Tuần 02: 14/09/2026 → 19/09/2026.
- Tuần 39: 31/05/2027 → 05/06/2027.
- Tuần 40: 07/06/2027 → 12/06/2027.

Tiêu đề MỤC LỤC: `MỤC LỤC 40 TUẦN • TUẦN 01 BẮT ĐẦU 07/09/2026`.

## Bảo mật
Trong quá trình thao tác, giá trị `ACCESS_KEY` của Apps Script từng xuất hiện trên ảnh chụp màn hình. Không lưu giá trị đó vào repo. Nên rotate khóa sau khi toàn bộ chức năng đã được xác nhận ổn định; khóa mới không cần chia sẻ trong chat.

## Trạng thái merge
Người dùng đã xác nhận phần 40 tuần đúng và hoàn chỉnh. Branch có thể được merge sau khi tạo mốc rollback từ `main`.
