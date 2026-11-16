# Rà soát toàn trường: mốc GA10 KNS tuần 09T11 và bù GA chưa học

**Nguồn:** file Excel `TKB NĂM HỌC 26-27(3).xlsx` do người dùng cung cấp, 11 sheet tuần từ `7T9` đến `16T11`, ảnh GA của Phú Bình, mã nguồn sản xuất trước sửa `04de984`, quy tắc Giáo án KNS đã CHỐT.

## Quy tắc nghiệp vụ – KHÔNG được thay thế

1. **Đúng tuần 09T11:** lớp **THỰC HỌC KNS** nhận **GA10 đặc biệt**, bất kể còn thiếu GA nào trước đó.
2. **Sau tuần 09T11:** quay lại giáo án KNS còn thiếu **trong tiến trình đã xác minh riêng cho lớp**; ví dụ: đã học GA8, 09T11 học GA10, thì buổi KNS sau đó trở lại **GA9** (không tự động GA11).
3. Nếu **09T11 học STEM** và chưa học KNS GA10, buổi KNS phù hợp kế tiếp cần được bố trí **GA10 KNS**; sau đó trở về bài KNS còn thiếu. STEM có chuỗi GA riêng, không cộng như một lượt KNS.
4. Nếu **09T11 không có buổi KNS lẫn STEM**, **không tự phát GA10** chỉ do đổi tuần; tiếp tục theo tiến độ thông thường đến khi có căn cứ bố trí.
5. Mọi kết quả căn cứ vào **lớp + khối + cơ sở/lịch sử `locationKey`**, không gộp các cơ sở và không coi mã trợ giảng `P` là lượt GA. Nhóm ghép có bài còn thiếu khác nhau phải cảnh báo để tách/xác nhận.
6. Nếu thiếu các GA trước 10 trong dữ liệu, hoặc GA thủ công mâu thuẫn, **đánh dấu cần kiểm tra**; không âm thầm gán GA11 hay ghi đè dữ liệu đã lưu.
7. Bảo toàn mốc GA8 Phú Bình cũ tuần 26T10, lịch Phú Tân/Thanh Lam, GA đặc biệt Quang Trung, KNS/STEM tháng 11, đăng nhập/quyền/dữ liệu.

## Phạm vi rà 11 sheet – 21 trường từng có phân công

| Nhóm | Trường/cơ sở | Nhận xét theo các ô lớp của workbook |
|---|---|---|
| Có phân công lớp tuần **09T11 và 16T11** (14 trường) | **Vân Dương; Quang Trung; Vỹ Dạ; Trần Quốc Toản; Phú Bình; Hương Vinh; Hà Thế Hạnh; Thuận An; TH & THCS Hải Dương; Phú Tân; Thủy Phương; Thủy Dương; Thủy Lương; Thủy Phù** | Mỗi **lớp học KNS ở 09T11** phải gán GA10; lớp STEM phải giữ nguyên luồng STEM và đánh dấu GA10 KNS còn thiếu nếu cần. Từ 16T11 kiểm tra GA còn thiếu của đúng lớp |
| Có phân công trong những tuần trước nhưng **không thấy ô phân công lớp 09T11/16T11** trong workbook này (7 trường) | **Dương Nổ 1; Dương Nổ 2; Lê Quang Tiến; Phú An; Phú Gia; Phú Mỹ; Phú Thuận** | Không tự phát GA10 do tháng 11. Nếu sau này trường trở lại, xem lịch sử thật và bản ghi điều chỉnh trước khi tính GA |

Các tên trường được chuẩn hóa để đếm, ví dụ `VỸ\n DẠ` là Vỹ Dạ, `THUỶ LƯƠNG` là Thủy Lương. Danh sách lấy từ các **ô lớp/giáo viên trong 11 sheet**, không suy ra trường đang hoạt động ngoài file.

## Điểm phải đặc biệt chú ý khi nghiệm thu

- **Phú Bình** có hai cơ sở lịch sử: *Cơ sở 1 – Phú Hậu cũ* và *Cơ sở 2 – Phú Bình cũ*. Không để thay tên trong 16T11 tạo chuỗi GA mới; mốc GA8 ba lớp ở 26T10 giữ nguyên.
- **Hương Vinh** gồm các phân hiệu cũ; cùng tên lớp ở hai phân hiệu không chung tiến độ.
- **Thuận An** gồm cơ sở chính và phân hiệu; không được ghép lịch sử của Thuận An 1/2.
- **Thủy Phương** có phân hiệu Thanh Lam cũ; bảo toàn các quy tắc GA KNS tháng 11.
- **Quang Trung** có mốc lớp bắt đầu bằng GA1 hoặc GA2 được xác nhận trước; không tự quy lớp bắt đầu GA2 là đã học GA1.
- **Nhóm lớp gộp:** nếu một thành viên cần GA9 và thành viên khác cần GA11 sau mốc 09, phải cảnh báo, không tự ép chung.
- **Bài đã nhập thủ công / nghỉ dạy / dạy bù:** TKB là kế hoạch, **không phải nhật ký đã dạy**; không tự ghi đè khi chưa được giáo viên xác nhận.

## Lỗi gốc xác minh trong mã

- Mốc 09T11 `chosen=10` trong `ga-kns-november-2026-safe-v1.js` là **ĐÚNG** và phải giữ.
- Nhưng `nextUnlearned` dò bài chỉ trong danh sách **từ GA10 trở đi**, dẫn đến sai GA11 khi thực tế còn GA9.
- Bảng tiến độ `ga-progress-dashboard-v1.js` cũng bỏ qua bài trước GA10 khi đề xuất bài kế tiếp.
- PR #103 trước đây đổi một số lớp thành GA9 trong chính tuần 09T11 là **SAI quy tắc**, đã đóng mà không gộp.

## Bản TEST sửa toàn trường

- Giữ GA10 bắt buộc ở 09T11 cho lớp KNS, giữ GA10 học bù khi 09T11 học STEM;
- Sau đó tìm bài KNS sớm nhất còn thiếu kể từ **mốc học đầu tiên đã xác nhận** của từng lớp. Nếu thiếu lịch sử trước GA10 thì đánh dấu cần kiểm tra, **không tự bắt đầu GA1 hoặc GA11**;
- Những trường không có lịch 09T11 giữ cách tính bình thường, không bị áp quy tắc GA10;
- Giữ GA thủ công, chỉ cảnh báo xung đột; không làm thay đổi dữ liệu Supabase, IndexedDB, Google Sheets hay Excel;
- Kiểm thử mô phỏng mọi trường có phân công, riêng hai cơ sở Phú Bình, học gộp, STEM09, manual, thiếu lịch sử và nhóm trường không có 09.

**Lưu ý về mức xác minh:** Bộ kiểm thử theo ví dụ nghiệp vụ của mỗi trường chứng minh quy tắc không bỏ sót GA dưới 10. Nó không chứng nhận GA thực dạy từng lớp đã đúng, vì chưa có nhật ký dạy thực tế/GA thủ công sau đăng nhập để đối chiếu. Chỉ triển khai chính thức sau khi người dùng CHỐT bản TEST mới.
