# Đồng bộ Google Sheets / MỤC LỤC 40 TUẦN 2026–2027

Ngày: 03/09/2026

## Mốc chuẩn
- Tuần 01: 07/09/2026 → 12/09/2026.
- 40 tuần liên tiếp, Thứ Hai → Thứ Bảy.
- Tuần 40: 07/06/2027 → 12/06/2027.
- Vì vậy cấu hình 40 tuần đầy đủ dùng ngày kết thúc 12/06/2027. Mốc cũ 31/05/2027 chỉ chứa 39 ngày bắt đầu tuần tính từ 07/09/2026.

## Thay đổi frontend
- `school-year-week1-official-v1.js` nâng lên `20260903.2`.
- Chỉ tự chuyển `Ngày kết thúc năm học` từ mốc mặc định cũ `31/05/2027` sang `12/06/2027` khi năm 2026–2027 đang dùng đúng Tuần 01 = `07/09/2026`.
- Nếu người dùng đã đặt ngày kết thúc khác, hệ thống giữ nguyên.
- Không thay đổi database, Supabase hoặc Check-in.

## Kế hoạch 40 tuần
- File kiểm tra: `recovery/google-sheets/WEEK_PLAN_2026_2027.csv`.
- Tên tab chuẩn có dạng `TUẦN NN_<ngày>T<tháng>`.
- Ví dụ: `TUẦN 01_7T9`, `TUẦN 02_14T9`, ..., `TUẦN 40_7T6`.

## Công cụ đồng bộ Google Sheets
File: `recovery/google-sheets/SYNC_2026_2027_40_WEEKS.gs`.

Nguyên tắc:
1. Không xóa sheet.
2. Tạo bản sao ẩn của `MỤC LỤC` trước khi sửa.
3. Chỉ đổi tên tab tuần cũ nếu `TỔNG SỐ TIẾT` ở MỤC LỤC bằng 0.
4. Nếu có dữ liệu hoặc không xác định được tổng, giữ nguyên tab cũ và ghi cảnh báo.
5. Cập nhật A–C của MỤC LỤC theo 40 tuần mới; giữ nguyên cột D để bảo toàn công thức/tổng.
6. Tạo lại liên kết `MỞ TUẦN NN` ở cột E.
7. Cập nhật tiêu đề tuần và khoảng ngày ở phần đầu mỗi tab đã đổi tên.
8. Tạo sheet nhật ký ẩn để kiểm tra đổi tên/cảnh báo.

## Lưu ý triển khai
Mã nguồn Apps Script đang chạy thật không nằm trong repo GitHub và không có connector Google Sheets có quyền ghi trong phiên này. Vì vậy không được sửa mù `doPost` đang chạy. Công cụ `.gs` được thiết kế độc lập để thêm vào Apps Script của file hiện tại và chạy một lần, không thay đổi luồng `Lưu vào Google Sheets` hiện hữu.

## Kiểm thử trước khi merge
- Localhost: năm 2026 phải hiện Tuần 01 = 07/09/2026.
- Nếu cấu hình đang dùng ngày kết thúc mặc định cũ 31/05/2027, phải tự chuyển thành 12/06/2027 và trạng thái dự kiến = 40 tuần.
- Apps Script: chạy trên file Google Sheets thật; kiểm tra `MỤC LỤC`, 40 tên tab, liên kết MỞ TUẦN và nhật ký.
- Nếu có bất kỳ tuần nào có tổng > 0, công cụ phải giữ tab đó nguyên tên và báo cảnh báo thay vì đổi/xóa.

## An toàn
- Không migration database.
- Không thay đổi Supabase.
- Không sửa/xóa lịch sử Check-in.
- Không đổi backend Check-in `phase = pilot`.
- Chưa merge vào `main` cho đến khi người dùng kiểm thử và xác nhận.
