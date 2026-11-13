# HƯỚNG DẪN NGHIỆM THU BẢN TEST – LỊCH BÁO GIẢNG

**Ngày:** 13/11/2026  
**Bản TEST:** `fix/roster-phu-binh-phu-hau-thuan-an-20261113`  
**Bản chính thức bất biến:** `main` tại `8cbc89bddada1d6207b014e0efe03b5b9e7c0e31`  
**Pull request:** #96 (Draft – KHÔNG MERGE trước khi người dùng chốt).

## Mục tiêu

Chỉ sửa **thứ, buổi, tiết học thực tế** cho các cụm đặc biệt ghi tại:
- Phú Bình: **tiết 4 chiều thứ 4** (ảnh thể hiện 19 mã chính, 18 mã P; 1/6 có CTV không có P).
- Phú Hậu: **tiết 5 sáng thứ 6** (ảnh thể hiện 16 mã chính và 16 mã P).
- Thuận An (cơ sở chính – Thuận An 1 cũ; phân hiệu – Thuận An 2 cũ): các khối ghi rõ lịch dạy ở tiêu đề:
  - Tiết 4 chiều thứ 2: 8 giáo viên;
  - Tiết 4 chiều thứ 3: 8 giáo viên;
  - Tiết 5 sáng thứ 4: 9 giáo viên;
  - Tiết 4 chiều thứ 5: 7 giáo viên;
  - Tiết 4 chiều thứ 6: 7 giáo viên.

Tổng **74 mã chính** là số phân công **trong phạm vi ảnh**, không phải tổng tiết của tất cả các tuần/trường.

## Quy tắc kỹ thuật không được phá

1. Phân biệt `slotDay`, `slotSession`, `slotPeriod` (tọa độ nguồn Excel) với `day`, `session`, `teachingPeriod` (lịch học thực tế).
2. Mã `P` phải đi đúng lớp và cùng thứ/buổi/tiết với thực tế nhưng **không cộng vào tiết dạy chính**.
3. Không nhân số tiết theo số lớp, không xóa/ghép ô nguồn; giữ quy tắc tính lương và GA.
4. Không lan quy tắc bốn cơ sở sang Phú Tân, Thanh Lam, Thủy Phương, các trường khác.
5. Giữ nguyên Giáo án KNS/STEM tháng 11, tài khoản, phân quyền, IndexedDB, Supabase, Google Sheets, TKB đã lưu.
6. Không đồng bộ dữ liệu TEST vào Google Sheets hoặc hệ thống cloud production.

## Kiểm thử đã chạy

- GitHub Actions từ nhánh TEST: 19/19 workflow của commit `a635033e` thành công (CI).
- Regression từ các ảnh để kiểm tra nhận nhãn đầy đủ (thứ, buổi, tiết), không chỉ số tiết.
- **Chưa nghiệm thu**: TKB Excel **gốc** đang áp dụng, ranh giới Thuận An 1/Thuận An 2, thao tác đăng nhập/chuyển tuần/xuất báo cáo trên trình duyệt của người dùng.

## Kiểm tra của người dùng

- [ ] Mở **môi trường thử độc lập** hoặc dùng bản ZIP trên máy, **không sử dụng dữ liệu thật để ghi/sync**.
- [ ] Nạp bản sao TKB gốc; kiểm tra tuần và giáo viên chứa các mã trong ảnh.
- [ ] Đối chiếu Phú Bình, Phú Hậu: ngày, buổi, tiết và từng lớp mã chính/P.
- [ ] Đối chiếu Thuận An 1 và 2: từng nhãn cơ sở và lớp ở đúng cơ sở, không nhầm qua vùng ô gộp.
- [ ] Lịch báo giảng trên web, xuất Excel, báo cáo theo trường, báo cáo ngày, bảng kê tháng đều đúng.
- [ ] Các trường ngoài phạm vi không thay đổi; KNS/STEM không đổi thứ tự GA.
- [ ] Đăng nhập, phân quyền, tải tuần mới, chuyển giáo viên và tốc độ vẫn ổn.
- [ ] Chỉ sau khi người dùng xác nhận rõ **CHỐT BẢN TEST** mới được lập kế hoạch sao lưu và hợp nhất vào `main`.

## Lưu ý về ZIP

Gói ZIP chỉ chứa mã nguồn ở nhánh TEST, **không phải website TEST đã được triển khai với tên miền riêng**. Để thử toàn bộ tính năng có đăng nhập và Supabase phải cấu hình môi trường thử độc lập, không được dùng GitHub Pages chính thức làm bản thử.
