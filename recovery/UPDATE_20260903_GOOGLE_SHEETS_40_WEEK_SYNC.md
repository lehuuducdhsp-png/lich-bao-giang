# Đồng bộ Google Sheets / MỤC LỤC 40 TUẦN 2026–2027

Ngày: 03/09/2026

## Mốc chuẩn của MỤC LỤC
- Tuần 01: 07/09/2026 → 12/09/2026.
- Danh mục gồm 40 tuần liên tiếp, mỗi tuần Thứ Hai → Thứ Bảy.
- Tuần 40: 07/06/2027 → 12/06/2027.

Lưu ý: khoảng ngày của MỤC LỤC 40 TUẦN là lịch danh mục của Google Sheets. Đợt này KHÔNG tự đổi ô `Ngày kết thúc năm học` trên website; cấu hình website đã được chốt riêng ở PR #16 và được giữ nguyên để tránh mở rộng phạm vi thay đổi ngoài yêu cầu.

## Phạm vi frontend
- Không thay đổi `index.html`, `app-runtime-v1.js` hoặc cấu hình năm học so với `main`.
- Không thay đổi database, Supabase hoặc Check-in.
- Website tiếp tục dùng Tuần 01 = `07/09/2026` đã chốt ở PR #16.

## Kế hoạch 40 tuần
- File kiểm tra: `recovery/google-sheets/WEEK_PLAN_2026_2027.csv`.
- Tên tab chuẩn có dạng `TUẦN NN_<ngày>T<tháng>`.
- Ví dụ: `TUẦN 01_7T9`, `TUẦN 02_14T9`, ..., `TUẦN 40_7T6`.

## Công cụ đồng bộ Google Sheets
File: `recovery/google-sheets/SYNC_2026_2027_40_WEEKS.gs`.
Hàm chạy: `LBG_syncSchoolYear2026_2027_40Weeks`.

### Rào chắn trước khi ghi
1. Phải tìm thấy sheet `MỤC LỤC`.
2. Phải nhận diện đúng hàng tiêu đề `TUẦN | TỪ NGÀY | ĐẾN NGÀY | TỔNG SỐ TIẾT | MỞ NHANH`.
3. Quét đủ 40 tuần trước khi sửa.
4. Nếu một tuần có nhiều tab cơ sở, thiếu tab hoặc `TỔNG SỐ TIẾT` khác 0/không đọc được thì DỪNG TOÀN BỘ trước khi ghi.
5. Hiện hộp thoại xem trước số tab sẽ đổi tên và số tab đã đúng; chỉ chạy sau khi người dùng bấm Có.
6. Sau khi bấm Có, kiểm tra lại lần cuối dưới document lock để tránh dữ liệu đổi trong lúc xác nhận.

### Backup bắt buộc
1. Trước khi sửa, tạo một BẢN SAO TOÀN BỘ file Google Sheets trong cùng thư mục Drive nếu có thể.
2. Nếu không tạo được backup toàn file thì DỪNG, không sửa gì.
3. Tạo thêm một bản sao ẩn của riêng sheet `MỤC LỤC` trong file hiện tại.
4. Sau khi chạy, tạo `__LBG_NHAT_KY_SYNC_20260903` ghi tên cũ/tên mới và URL file backup.

### Khi chạy thật
1. Không xóa sheet.
2. Không đụng các tab `BẢN 2`, `BẢN 3`, `COPY`.
3. Chỉ đổi tên tab cơ sở khi `TỔNG SỐ TIẾT = 0`.
4. Cập nhật A–C của MỤC LỤC theo 40 tuần mới.
5. Giữ nguyên cột D để bảo toàn công thức/tổng; Google Sheets tự cập nhật tham chiếu khi tab được đổi tên.
6. Tạo lại liên kết `MỞ TUẦN NN` ở cột E.
7. Cập nhật dòng `Tuần NN` và khoảng ngày ở vùng đầu mỗi tab tuần; không quét/sửa bảng báo giảng bên dưới.

## Lưu ý triển khai
Mã nguồn Apps Script đang chạy thật (`doPost`/luồng lưu báo giảng) không nằm trong repo GitHub và phiên này không có connector Google Sheets có quyền ghi trực tiếp. Vì vậy không sửa mù Apps Script production. Công cụ `.gs` này được thiết kế là một file mới, chạy một lần từ Apps Script gắn với chính Google Sheets; không thay `Code.gs`/`doPost` hiện tại và không thay luồng `Lưu vào Google Sheets` của website.

## Kiểm thử trước khi merge
- Không cần đổi lại localhost/frontend vì branch này cuối cùng không khác `main` ở mã chạy website.
- Trên Google Sheets thật hoặc một bản sao thử: thêm file `.gs` mới, chạy `LBG_syncSchoolYear2026_2027_40Weeks`.
- Kiểm tra MỤC LỤC: Tuần 01 = 07/09–12/09; Tuần 02 = 14/09–19/09; Tuần 39 = 31/05–05/06; Tuần 40 = 07/06–12/06.
- Kiểm tra tên tab tương ứng: `TUẦN 01_7T9`, `TUẦN 02_14T9`, `TUẦN 39_31T5`, `TUẦN 40_7T6`.
- Kiểm tra các nút `MỞ TUẦN NN` mở đúng tab.
- Kiểm tra có file backup toàn bộ trong Drive và sheet nhật ký đồng bộ.

## An toàn
- Không migration database.
- Không thay đổi Supabase.
- Không sửa/xóa lịch sử Check-in.
- Không đổi backend Check-in `phase = pilot`.
- Chưa merge vào `main` cho đến khi người dùng kiểm thử và xác nhận.
