# Báo cáo TEST — kiểm tra GA bị nhảy 9 → 11 tại Cơ sở 2 Phú Bình cũ

**Ngày kiểm tra:** 16/11/2026. **Nguồn:** screenshot người dùng và TKB NĂM HỌC 26-27(3).xlsx, sheet 7T9–16T11.

## Kết quả rà soát

| Lớp | Giáo viên chính trong TKB 16T11 | KNS 26T10 | 02T11 | KNS 09T11 | KNS 16T11 | Website trước sửa |
|---|---|---|---|---|---|---|
| 1/5 | LINH2 | GA8 theo 6 lượt KNS trước đó | STEM | GA9 | **GA10** | GA11 |
| 2/5 | M.LINH | GA8 theo 6 lượt KNS trước đó | STEM | GA9 | **GA10** | GA11 |
| 5/7 | MỘNG | **GA8 được chốt trước** | STEM | GA9 | **GA10** | GA11 |
| 3/4 | MINHANH | KNS | KNS | KNS | **STEM GA13** | STEM GA13 |

**Lưu ý:** Đây là tiến trình suy ra từ phân công TKB và các mốc đã xác nhận; TKB không chứng minh mọi buổi đã dạy thật. Nếu lớp nghỉ, dạy bù, hoặc có GA đã chỉnh thủ công, phải kiểm tra nhật ký thực dạy.

### Đủ 8 lượt KNS của ba lớp đến 16T11

- **1/5, 2/5:** 7T9 GA1, 14T9 GA2, 28T9 GA4, 12T10 GA5, 19T10 GA7, 26T10 GA8, 09T11 GA9, 16T11 GA10. STEM xen giữa không tăng KNS.
- **5/7:** 7T9 GA1, 14T9 GA2, 21T9 GA4, 5T10 GA5, 19T10 GA7, 26T10 GA8, 09T11 GA9, 16T11 GA10.
- **3/4:** Giữ lộ trình STEM độc lập; không chỉnh GA13 theo GA KNS.

## Nguyên nhân

`ga-kns-november-2026-safe-v1.js` đang gán đồng loạt KNS của tuần 09T11 bằng GA10, rồi dùng tập bài chưa học chỉ bắt đầu từ GA10. Ba lớp nói trên chưa xong GA9 trước 09T11, nên bị đẩy lên GA11 ở 16T11.

## Sửa trên nhánh TEST

- Trong đúng Cơ sở 2 – Phú Bình cũ, **ba lớp đã đối chiếu** lấy GA tiếp theo từ lịch sử KNS của chính lớp: 09T11 = GA9, 16T11 = GA10.
- Không ảnh hưởng lịch Phú Hậu (Cơ sở 1), Phú Tân, Thanh Lam, Vỹ Dạ, Thuận An, hoặc các lớp chưa xác minh.
- Không cộng mã `P` thành lượt GA, không cộng STEM vào KNS, không sửa các mốc GA8, GA13 đã chốt.
- Nếu có GA11 đang lưu thủ công cho lớp: **không ghi đè**; chỉ cảnh báo số hiện có khác số dự kiến. Người dùng xác minh thực dạy trước khi chỉnh.
- Không ghi, xóa, reset TKB/IndexedDB/localStorage/Supabase/Google Sheets.

## Tiêu chí chốt

1. Ở 16T11, gợi ý cho **LINH2 – 1/5, M.LINH – 2/5, MỘNG – 5/7** là GA10 KNS, không phải GA11.
2. **MINHANH – 3/4** vẫn GA13 STEM; mã P đúng lớp và không tăng lượt giáo án.
3. Bảng tiến độ không tự bỏ qua bài trước GA10. Những GA thủ công khác đề xuất có cảnh báo.
4. Các bộ kiểm thử GA tháng 11, lịch Phú Bình/Phú Hậu, Vỹ Dạ, Phú Tân, Thanh Lam, hiệu năng và báo cáo vẫn đạt.
5. Chỉ sau khi người dùng **CHỐT bản TEST** mới sao lưu và hợp nhất nhánh chính. Gói TEST hoặc CI không chứng nhận việc đã thay đổi GA thủ công trên thiết bị người dùng.
