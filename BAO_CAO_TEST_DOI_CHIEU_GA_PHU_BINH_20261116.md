# Báo cáo nghiệm thu TEST – Giáo án KNS Cơ sở 2 Phú Bình cũ, tuần 16T11

**Thời điểm:** 16/11/2026. **Nguồn dữ liệu:** ảnh báo giảng người dùng gửi và workbook `TKB NĂM HỌC 26-27(3).xlsx`, đối chiếu 11 sheet tuần từ `7T9` đến `16T11`. Không tải workbook nguyên gốc lên repository công khai.

## Kết quả kiểm tra 19 lớp – không coi Phú Bình là cơ sở mới

| Nhóm | Lớp | Dự kiến giáo án tuần 16T11 |
|---|---|---|
| KNS – còn thiếu GA10 | **1/4, 1/5, 1/6, 1/7, 2/5, 2/6, 2/7, 3/6, 4/4, 4/6, 4/7, 5/7** (12 lớp) | **GA10** |
| KNS – đã đi qua GA10 | **3/5, 5/5** (2 lớp) | **GA11** |
| STEM – không sửa theo chuỗi KNS | **2/4, 3/4, 3/7, 4/5, 5/8** (5 lớp) | Tiếp nối GA STEM riêng (lớp 3/4 hiển thị GA13 STEM) |

Trong ảnh hiện tại, **LINH2–1/5, M.LINH–2/5, MỘNG–5/7** đang hiển thị GA11 KNS nhưng theo lịch TKB là **GA10**, vì:
- KNS 19T10 theo tiến trình GA7; KNS 26T10 GA8.
- **02T11 học STEM**, không cộng một lượt vào tiến độ KNS.
- **09T11 mới tới KNS GA9**.
- **16T11 dự kiến KNS GA10**.

Lớp 1/6, 4/4 và 5/7 có **mốc GA8 KNS 26T10 đã CHỐT**, cần bảo vệ. Các lớp 3/5, 5/5 học KNS ở 02T11 nên tiếp tục GA11 vào 16T11. Không ép đồng loạt cả trường/cơ sở cùng một số GA.

## Nguyên nhân trong mã cũ

Module `ga-kns-november-2026-safe-v1.js` tự ép mọi lượt KNS của tuần 09T11 thành GA10, dù riêng từng lớp chưa học GA9, sau đó khiến lượt 16T11 hiện GA11. Đó là **mốc chung sai cho các lớp chưa đủ bài**.

## Phạm vi sửa trên nhánh TEST

1. Với **đúng 19 lớp của `PHU BINH|CO SO 2|PHU BINH CU`**, trong tuần 09T11 và 16T11, suy ra bài KNS tiếp theo từ lịch sử của **chính lớp**; không nhân bài KNS khi lớp học STEM.
2. Giữ khác biệt giữa GA10 và GA11, không thay đổi tiến độ GA STEM và mã nhận diện cơ sở.
3. Phú Hậu, Vỹ Dạ, Phú Tân, Thanh Lam, Thuận An và các cơ sở khác **không bị áp dụng ngoại lệ**.
4. **Tuyệt đối không ghi đè GA11 đã lưu thủ công**. Khi lịch sử tính ra GA10 mà bản lưu có GA11, báo chênh lệch và yêu cầu đối chiếu nhật ký thực dạy, sau đó mới sửa thủ công qua giao diện nếu xác nhận chính xác.
5. Không chỉnh sửa dữ liệu TKB, IndexedDB, Supabase, Google Sheets; không phá mốc GA8 Phú Bình cũ, KNS/STEM tháng 11 và quy tắc trợ giảng P.
6. CI chạy hai bài kiểm thử mới (ba lớp theo 11 tuần và cả 19 lớp), toàn bộ kiểm thử dự án, kiểm tra hiệu năng và bảo vệ công đoạn triển khai Pages.

## Giới hạn cần nói rõ

TKB phản ánh **phân công**, không xác nhận các tiết đã thực dạy. Những số GA nêu trên là **dự kiến theo lịch** và mốc đã được xác nhận, không phải kết luận cuối cùng cho các lớp có buổi nghỉ, học bù, điều chỉnh tay hoặc thay đổi lịch thực tế. Bản TEST cần được kiểm tra qua lịch sử GA sau đăng nhập. **ZIP/CI đạt Success không đồng nghĩa website production đã sửa**.

## Quy trình duyệt

Chưa triển khai vào nhánh `main`. Chỉ sau xác nhận rõ **CHỐT** của người dùng mới sao lưu phiên bản chính, hợp nhất PR và xác minh GitHub Pages.