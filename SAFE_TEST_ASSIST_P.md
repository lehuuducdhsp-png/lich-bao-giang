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
```bat
python -m http.server 8765
```
Mở:
```text
http://localhost:8765/
```

Chỉ sau khi toàn bộ checklist đạt và người dùng xác nhận mới được đưa thay đổi sang `main`.
