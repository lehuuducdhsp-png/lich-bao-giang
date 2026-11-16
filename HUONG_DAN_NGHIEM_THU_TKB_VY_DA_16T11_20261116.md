# TEST 16/11/2026 – TKB Vỹ Dạ (đọc đúng tiết và trợ giảng P)

**Nguồn chuẩn:** file người dùng cung cấp `TKB NĂM HỌC 26-27(3).xlsx`, tab `16T11`; so với bản (2) và hai ảnh chụp màn hình. **Không đưa TKB đầy đủ lên repo công khai.**

**Bản chính thức trước cập nhật:** `20be79738a41d8ee8e625b08fea5c76bc32c0aaa`. Mọi sửa đổi trong nhánh `test/vy-da-tkb-16t11-period4-assist-20261116` chỉ là TEST, chưa triển khai production; phải được người dùng xác nhận **CHỐT**.

## Phần thay đổi trong dữ liệu Excel

- TKB mới thay đổi vị trí/nội dung nhiều ô trong `16T11`; không tái dùng tọa độ hàng cũ làm dữ liệu chuẩn.
- `09T11`: Hương Vinh, `AV108` VŨ -> DUNG và `AV109` VŨP -> DUNGP. Chỉ đọc theo dữ liệu mới, **không tự đặt lại lịch sử GA đã lưu**.
- Vỹ Dạ `B41:B59`, tuần `16T11`:
  - Thứ 3, chiều tiết 4, W42:W55: 7 phân công chính; 5 mã trợ P cùng dòng ở X (X43/X45/X47/X49/X51); hai ô CTV không có P.
  - Thứ 6, chiều **TẤT CẢ HỌC TIẾT 4** theo ghi chú `AX40:AX54` và `AZ39:BA40`: 15 phân công chính tại AZ/BA (từ hàng 42 đến 56), 11 mã P tại AY/BB, bốn CTV không có P.
  - Mã P ở cột AY **nằm bên trái** giáo viên chính cột AZ; mã P ở BB nằm bên phải BA. Ghép P với GV có **cùng mã trên cùng hàng và lớp ở chính cột GV đó**; không mượn lớp từ giáo viên khác.
  - Dù cột Excel AY/AZ/BA/BB có tiết nguồn 2/3/4/5, báo giảng phải hiển thị **tiết thực tế 4**; giữ `slotPeriod` để đối chiếu Excel.
  - Tổng hai khối trong ảnh: **22 phân công chính, 16 mã P, 6 ô CTV không P**. Không lấy số này làm tổng tiết cả tuần.
- Phú Bình tuần `16T11` đã dịch vùng merge `AB82:AC95`, `AQ82:AR95` và mã trợ P xuống hàng 96 (`B96` bắt đầu Hương Vinh); kiểm thử bảo vệ mã địa điểm lịch sử `Phú Bình cũ` và `Phú Hậu cũ`. Trong file mới, **35 giáo viên chính, 33 mã P**, không lấy số 34 P của bản cũ.
- Các tuần `7T9` đến `2T11`: nội dung ô không đổi so với bản (2).

## Quy tắc không được phá

1. Chỉ áp dụng ngoại lệ Vỹ Dạ cho tuần `16T11` với đúng tiêu đề, trường và vùng cột; không áp dụng nhầm Trần Quốc Toản, Thuận An, Phú Tân, Thanh Lam hoặc các tuần cũ.
2. Không tạo một cơ sở Vỹ Dạ mới; giữ `locationKey` lịch sử để GA KNS/STEM tiếp nối.
3. Không tính mã `P` là tiết chính, không tạo `CTVP`; báo cáo tuần, bảng kê tháng và Excel xuất phải khớp.
4. Không ghi đè workbook/IndexedDB/Supabase/Google Sheets. Người dùng kiểm tra bằng **bản sao TKB**, không đồng bộ dữ liệu TEST vào cloud production.
5. Giữ nguyên chương trình/logic GA KNS/STEM, đặc biệt các mốc đã CHỐT ở Phú Bình và tháng 11.

## Kiểm tra trước khi CHỐT

- [ ] Nạp **file TKB mới (3)** tại môi trường thử không ghi dữ liệu thật.
- [ ] Xem Vỹ Dạ, tuần `16T11`: W43 TIÊN/TIÊNP lớp 4/1; W45 TRÂM/TRÂMP lớp 4/2; W53/W55 CTV không P.
- [ ] Thứ 6 chiều: AZ42 DUNG với AY42 DUNGP lớp 1/2; AZ44 DUNG2 với AY44 DUNG2P lớp 1/4; BA42 YẾN với BB42 YẾNP lớp 1/1; AZ56 CTV lớp 2/8.
- [ ] Mỗi lượt nêu trên thuộc **tiết 4**, giữ đúng thứ/buổi và lịch sử GA từng lớp.
- [ ] Cả hai giao diện trợ giảng (preview và chính thức), báo cáo tuần, bảng kê tháng, xuất Excel đúng; không cộng P vào chính.
- [ ] Kiểm tra thêm AV108/AV109 của Hương Vinh trong `09T11` và Phú Bình/P hàng 96 trong `16T11`.
- [ ] Không thay đổi Phú Tân, Thanh Lam, Phú Bình cũ, Thuận An và các tài khoản/dữ liệu.
- [ ] Chỉ khi người dùng trả lời **CHỐT bản TEST mới** mới cân nhắc backup và merge vào `main`.

**Giới hạn kiểm chứng:** kiểm thử tự động chứng minh mã xử lý đúng fixture trích từ Excel; chưa thay cho kiểm tra trực tiếp sau đăng nhập với TKB mới tại trình duyệt của người dùng.
