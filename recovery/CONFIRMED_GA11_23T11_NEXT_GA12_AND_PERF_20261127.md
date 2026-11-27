# Kiểm thử tiến trình GA và giảm lag – 27/11/2026

**Quy tắc đã chốt:** nếu một lớp KNS thực dạy **GA11** trong tuần `23T11` thì buổi KNS tiếp theo học **GA12** (nếu không nghỉ, không có điều chỉnh thực dạy). Sau GA12, chuỗi KNS tiếp tới **GA14** (chuỗi không có GA13 vì đó là luồng STEM). Điều này không ảnh hưởng quy tắc **GA10 chỉ dùng 09T11 và 16T11**.

Mốc đã xác nhận từ yêu cầu người dùng:
- **Phú Tân lớp 4/6**, Đức, chiều thứ Sáu tiết 4, 23T11: GA11, tuần KNS kế tiếp GA12.
- **Hà Thế Hạnh lớp 3/4**, Mỹ Linh, Tứ Hạ 1 cũ, sáng thứ Tư tiết 5, 23T11: GA11, tuần KNS kế tiếp GA12.
- **Thủy Dương** của báo giảng Đức 23T11 vẫn GA12, không thay đổi.
- Giáo án lưu thủ công khác mốc được giữ nguyên và cảnh báo đối chiếu, không tự ghi đè từ xa.

Giảm công việc trang chính:
- Dashboard KNS–STEM không tự chạy thống kê đa phiên bản ngay khi vào trang; người dùng bấm **Quét tiến độ** khi cần.
- Tần suất kiểm tra sẵn sàng dashboard giảm từ 100 ms xuống 1500 ms.
- Mô-đun thống kê giáo viên không lặp `start()` mỗi 3500 ms sau khi các nút đã sẵn sàng.
- Đồng bộ lại báo giảng theo thay đổi DOM tối đa 1 lần/400 ms.

Kiểm thử chỉ kiểm tra mã và dữ liệu mô phỏng theo mốc xác nhận. Chưa đo thời gian render thực tế sau đăng nhập với trình duyệt/TKB đầy đủ.

Triển khai: TEST trước → nghiệm thu → CHỐT → cập nhật main.
