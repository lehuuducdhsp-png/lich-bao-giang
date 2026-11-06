# BẢN TEST TỐI ƯU HIỆU NĂNG – 06/11/2026

Kho mã: lehuuducdhsp-png/lich-bao-giang
Nhánh TEST: test/tang-toc-website-20261106
Căn cứ: main afbd396fd5718c89f478617574015a6a9d47c93b
**Không cập nhật main hoặc thay đổi dữ liệu Supabase.**

## Phạm vi thay đổi
- Giảm quét toàn bộ danh mục khi ô bảng lịch/báo cáo thay đổi; vẫn nhận ra khi thêm mục.
- Chỉ đồng bộ thương hiệu khi vùng header/đăng nhập hoặc cấu hình thay đổi.
- Thống kê tuần chuyển từ 500 ms sang 4.000 ms kiểm tra dự phòng, cập nhật ngay theo sự kiện chọn tuần.
- Giáo viên/GA chuyển từ 700 ms sang 3.500 ms kiểm tra dự phòng, cập nhật ngay khi chọn tuần/giáo viên hoặc phân tích.
- Với trang trợ giảng (P) thử nghiệm: bỏ vòng lặp observer tự kích hoạt và vòng quét 900 ms. Giữ cách đặt lớp (P), theo dõi thay đổi báo cáo.
- Thay đổi version URL để trình duyệt lấy đúng mã mới. KHÔNG sửa thuật toán GA, KNS, STEM, phép tính lương, lịch sử/điểm trường, tài khoản, phân quyền hay lưu TKB.

## Kiểm tra đã chạy tại môi trường thử
- Chromium giả lập báo cáo trợ giảng: trong 650 ms, 39 lượt quét (cũ) so với 1 lượt (mới); đổi lớp và giáo viên vẫn đúng.
- Chromium giả lập cập nhật bảng 15 lần: 105 lần tìm nút điều hướng thừa (cũ) so với 0 lần (mới); thêm danh mục vẫn lên thanh điều hướng.
- Chromium giả lập bảng thay đổi: 22 lần quét logo cũ so với 7 lần ở bản tối ưu; thay logo vẫn được đồng bộ.
- 65/65 bài kiểm thử Node của gói TEST gần nhất đạt sau khi điều chỉnh cache key. Các số liệu Chromium là mô phỏng cục bộ, không phải đo trải nghiệm đăng nhập/Supabase thực tế.
- Các bài kiểm thử GitHub của nhánh TEST cần xem tại PR và không thay thế kiểm tra người dùng.

## Cách kiểm tra
1. Download ZIP nhánh TEST trên GitHub, giải nén.
2. Dùng localhost để chạy (ví dụ cài Python, mở PowerShell ngay trong thư mục giải nén và chạy `py -m http.server 8765`).
3. Vào `http://localhost:8765/` trên trình duyệt, kiểm tra khi chuyển tuần, giáo viên, xem TKB theo trường, tính GA, STEM, xuất Excel và báo cáo trợ giảng.
4. **Không ghi dữ liệu giả**: nhánh TEST vẫn tham chiếu cấu hình dịch vụ thật, nên chỉ kiểm tra đọc/hiển thị hoặc sử dụng môi trường thử riêng.
5. Khi kiểm tra thấy ổn, nhắn **CHỐT** để đối chiếu nhánh TEST với main mới nhất rồi mới đưa lên link chính thức.

## Lưu ý
Không xóa bộ nhớ trình duyệt, IndexedDB hoặc Supabase để "tăng tốc"; việc này có thể làm mất dữ liệu đã lưu.
Nếu vẫn lag, ghi lại thao tác gây chậm (đăng nhập, chuyển tuần, chọn giáo viên, xem báo cáo, lưu GA) và ảnh/đoạn video để khoanh vùng phần mạng hoặc dữ liệu.
