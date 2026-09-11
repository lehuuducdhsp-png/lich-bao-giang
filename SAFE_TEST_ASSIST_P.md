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

## Quy ước P cần đạt
- Mã giáo viên bình thường = tiết chính (T).
- Mã giáo viên có hậu tố `P` = tiết Trợ giảng (P).
- Lịch Báo giảng vẫn hiển thị lớp đúng ngày / buổi / tiết và thêm `(P)`.
- P không cộng vào tiết chính hoặc tiết tính lương.
- Bảng kê tháng hiển thị riêng `Trợ (P)`.
- Excel và Google Sheets phải cùng một kết quả với Web.

## Bản thử hiện tại
- File giao diện riêng: `thu-nghiem-tro-giang-p-safe.html`
- Module riêng: `assist-p-safe-v1.js`
- Không sửa `index.html`, `app-runtime-v1.js`, parser, report engine, monthly calendar hay bridge Google Sheets của production.
- `analyzeNow` chỉ được bọc trong trang thử; `entries` tiết chính giữ nguyên, P được giữ riêng trong `assistEntries`.
- Web preview dùng bản sao dữ liệu để hiển thị P nên không làm tăng `total` chính.
- Bảng kê tháng tự đọc mã hậu tố P và điền ô `Trợ (P)` ở trang thử.
- Excel tuần chỉ bị chặn trong trang thử khi giáo viên thực sự có P; file được dựng từ report engine ổn định và thêm P vào bản sao dữ liệu.
- Google Sheets ở trang thử tạo payload riêng có `assistPeriods`, `isAssist=true`, `payEligible=false`; `total` vẫn chỉ là chính + cộng.
- Trạng thái: **sandbox-only**. `main` không bị thay đổi bởi PR #36.

## Gate kiểm thử trước merge
- [ ] Web: đúng giáo viên.
- [ ] Web: đúng Thứ/ngày.
- [ ] Web: đúng buổi và tiết.
- [ ] Web: lớp trợ có `(P)`.
- [ ] Tổng chính không tăng vì P.
- [ ] Bảng kê tháng tách Chính / Trợ.
- [ ] Excel không mất chữ, không phát sinh giá trị lạ ở ô trống.
- [ ] Excel có `(P)` đúng vị trí.
- [ ] Google Sheets có `(P)` đúng vị trí.
- [ ] Google Sheets không cộng P vào tổng chính.
- [ ] Test lại ít nhất một giáo viên không có P để bảo đảm không bị ảnh hưởng.
- [ ] F5 / mở lại trang không làm kết quả thay đổi.

## Chạy localhost
Sau khi checkout nhánh `sandbox/assist-p-safe-v1`, chạy:
```bat
python -m http.server 8765
```
Mở đúng trang thử:
```text
http://localhost:8765/thu-nghiem-tro-giang-p-safe.html
```
Không dùng `/` để tránh nhầm với giao diện production.

## Trình tự test đề nghị
1. Tải đúng file TKB có mã `...P`.
2. Chọn giáo viên và nhấn `Kiểm tra`.
3. Đối chiếu từng P theo đúng Thứ / buổi / tiết.
4. Kiểm tra tổng chính không đổi.
5. Mở `Bảng kê tháng`, tổng hợp đúng tháng và kiểm tra từng dòng `Trợ (P)`.
6. Xuất Excel tuần và Excel tháng, mở file thật để kiểm tra cột/hàng/chữ.
7. Lưu Google Sheets bằng bản thử và mở file thật để kiểm tra.
8. Test một giáo viên không có P.
9. F5 rồi lặp lại bước 2–8.

Chỉ sau khi toàn bộ checklist đạt và người dùng xác nhận mới được đưa thay đổi sang `main`.
