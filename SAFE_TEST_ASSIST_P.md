# BẢN THỬ AN TOÀN – TRỢ GIẢNG (P)

## Mốc nền
- Nhánh nền: `stable/pre-p-20260909`
- Commit nền: `7765fafb4803c684308585460f22b80e01bf0fe7`
- Đây là mốc production trước chuỗi tích hợp Trợ giảng (P).

## Quy tắc bắt buộc
1. Không sửa trực tiếp `main`.
2. Mọi thay đổi Trợ giảng (P) chỉ thực hiện trên `sandbox/assist-p-safe-v1`.
3. Mỗi commit chỉ xử lý một nhóm vấn đề.
4. PR luôn để Draft cho đến khi kiểm thử xong trên localhost.
5. Không merge nếu chưa kiểm tra Excel và Google Sheets thật.
6. Trước khi merge production phải có nhánh backup/rollback riêng.

## Sự cố đã phát hiện ở safe1
Bản `assist-p-safe-v1.js` đã can thiệp bằng cách bọc lại `window.analyzeNow`. Trong hệ thống hiện có nhiều mô-đun runtime cũng có thể gán lại hàm này, nên xuất hiện vòng gọi lồng nhau và lỗi:

`Maximum call stack size exceeded`

Bản safe1 vì vậy **không đạt gate** và không được đưa vào production.

## Thiết kế safe2
`assist-p-safe-v2.js` không thay, không bọc và không ghi đè `analyzeNow`.

Giai đoạn 1 chỉ kiểm tra Web:
- đọc mã hậu tố `P` bằng bộ parser hiện có;
- ghép P vào **bản sao dữ liệu chỉ để render preview**;
- không sửa `result.entries` gốc;
- không tăng `result.total`;
- Google Sheets bị khóa trong sandbox;
- Excel có P bị khóa trong sandbox cho tới khi Web được xác nhận đúng.

Mục tiêu là giảm phạm vi lỗi: Web đúng trước, sau đó mới mở Excel, cuối cùng mới mở Google Sheets.

## Quy ước P cần đạt
- Mã giáo viên bình thường = tiết chính (T).
- Mã giáo viên có hậu tố `P` = tiết Trợ giảng (P).
- Lịch Báo giảng vẫn hiển thị lớp đúng ngày / buổi / tiết và thêm `(P)`.
- P không cộng vào tiết chính hoặc tiết tính lương.
- Bảng kê tháng hiển thị riêng `Trợ (P)`.
- Excel và Google Sheets phải cùng một kết quả với Web trước khi được merge.

## Gate kiểm thử trước merge
### Giai đoạn 1 — Web
- [ ] Web: không còn lỗi `Maximum call stack size exceeded`.
- [ ] Web: đúng giáo viên.
- [ ] Web: đúng Thứ/ngày.
- [ ] Web: đúng buổi và tiết.
- [ ] Web: lớp trợ có `(P)`.
- [ ] Tổng chính không tăng vì P.
- [ ] Test lại ít nhất một giáo viên không có P.
- [ ] F5 / mở lại trang không làm kết quả thay đổi.

### Giai đoạn 2 — Bảng kê / Excel
- [ ] Bảng kê tháng tách Chính / Trợ.
- [ ] Excel không mất chữ, không phát sinh giá trị lạ ở ô trống.
- [ ] Excel có `(P)` đúng vị trí.

### Giai đoạn 3 — Google Sheets
- [ ] Google Sheets có `(P)` đúng vị trí.
- [ ] Google Sheets không cộng P vào tổng chính.
- [ ] Kiểm tra ghi đè / tạo bản 2 không làm hỏng dữ liệu cũ.

## Trạng thái hiện tại
- Trang thử đang nạp `assist-p-safe-v2.js`.
- PR #36 vẫn Draft và không nhắm vào `main`.
- Trang chính không nhận các thay đổi safe2.
- File `.bat` một-click đã cung cấp sẽ tải lại branch sandbox mới nhất mỗi lần chạy.

## Chạy localhost
Dùng file `.bat` một-click đã cung cấp.

Hoặc chạy thủ công:
```bat
python -m http.server 8765
```
Mở:
```text
http://localhost:8765/thu-nghiem-tro-giang-p-safe.html
```

Chỉ sau khi toàn bộ checklist đạt và người dùng xác nhận mới được đưa thay đổi sang `main`.
