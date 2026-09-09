# Google Sheets — branding Lịch Báo giảng 09/09/2026

## Mục tiêu
Bổ sung phần nhận diện Hoàn Năng vào đầu mỗi tab LỊCH BÁO GIẢNG mà không thay đổi cách đếm tiết, dấu ` & `, GA, BẢN 2, MỤC LỤC hoặc kích thước phần bảng hiện có.

## Nguồn đã đối chiếu
Bản `Mã.gs` đang dùng đã được người vận hành cung cấp trực tiếp ngày 09/09/2026. Bản hoàn chỉnh sau khi vá có SHA-256:

`2b75686456ab577bb219582d9ebce911a9851dd48ce7645f38946b0fb0f4a070`

Không đưa toàn bộ `Mã.gs` vào repo công khai để tránh công khai các định danh cấu hình Google Sheets không cần thiết.

## Bố cục sau khi vá
Ba hàng nhận diện mới được thêm phía trên phần báo giảng:

- `A1:B3`: logo Hoàn Năng.
- `C1:H3`: `Trung tâm giáo dục kỹ năng sống Hoàn Năng`.
- `A4:H4`: tiêu đề LỊCH BÁO GIẢNG.
- `A5:H5`: Tuần.
- `A6:H6`: khoảng ngày.
- `A7:H7`: Buổi / Tiết / Thứ 2–Thứ 7.
- `A8:H13`: buổi Sáng.
- `A14:H19`: buổi Chiều.
- `A20:D20`: tổng tiết.
- `E20:H20`: giáo viên.

Phần bảng cũ chỉ dịch xuống 3 hàng; độ rộng cột vẫn giữ `80 / 90 / 150` px như trước. Chiều cao các hàng của phần báo giảng cũ cũng giữ nguyên, chỉ thêm 3 hàng nhận diện cao 30 px mỗi hàng.

## An toàn dữ liệu
- `setClassRichText_()` không đổi: nhiều ô nguồn trong cùng tiết vẫn nối bằng ` & `.
- Công thức tổng chỉ dịch vùng từ `C6:H10 + C12:H16` sang `C9:H13 + C15:H19`; nguyên tắc đếm số dấu `&` không đổi.
- Công thức MỤC LỤC chỉ chuyển tham chiếu tổng từ `A17` sang `A20`.
- Không thay `resolveSheetName_()`, nên Ghi đè / BẢN 2 vẫn giữ nguyên.
- Không thay `updateIndex_()`, `doPost()`, xác thực access key hoặc quản lý file năm học.
- Khi ghi đè một tab, ảnh branding cũ neo ở 3 hàng đầu được xóa trước khi chèn ảnh mới để không nhân đôi logo.
- Nếu Google Sheets không tải được ảnh từ URL, việc lưu báo giảng vẫn tiếp tục và khu logo hiển thị chữ `HOÀN NĂNG` dự phòng thay vì làm hỏng toàn bộ lần lưu.

## Logo
Apps Script dùng ảnh public tại:

`https://raw.githubusercontent.com/lehuuducdhsp-png/lich-bao-giang/main/assets/hoan-nang-report-logo.jpg`

Kích thước chèn: khoảng `116 × 88 px`, vừa trong vùng `A1:B3`.

## Triển khai Apps Script
Đây là thay đổi ở `Mã.gs` của Web App Apps Script, nên sau khi thay mã phải tạo **New version** cho deployment hiện tại để `doPost` của website dùng bản mới. Không cần đổi ACCESS_KEY, không cần đổi Edge Function và không cần sửa frontend chỉ để áp dụng branding Google Sheets.

GitHub không trực tiếp triển khai project Apps Script này. Vì vậy PR #29 chỉ lưu hợp đồng/recovery của thay đổi; bản `Mã.gs` hoàn chỉnh được giữ ngoài repo công khai và phải được dán vào project Apps Script rồi cập nhật deployment bằng tài khoản chủ sở hữu.

Trước khi deploy thật nên lưu một bản sao mã cũ hoặc giữ file gốc để rollback ngay nếu cần.