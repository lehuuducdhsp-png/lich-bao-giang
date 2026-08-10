# CHECK-IN V1 — Kế hoạch kiểm thử staging

Trạng thái: **STAGING ONLY**

## A. Kiểm thử an toàn nền tảng

1. Mở `main` và xác nhận link production không xuất hiện Check-in.
2. Mở `checkin-staging.html` trong môi trường staging và xác nhận có nhãn `CHECK-IN V1 • STAGING`.
3. Khi chưa chạy migration staging, giao diện chỉ báo thiếu cấu hình; không làm hỏng các module khác.
4. Sau khi chạy migration staging, đăng xuất/đăng nhập lại và xác nhận Check-in hoạt động.

## B. Giáo viên thường

1. Tài khoản có mã GV, không phải Nhóm trưởng.
2. TKB hôm nay có 1 trường → hiện đúng trường và buổi.
3. TKB hôm nay có 2 trường cùng buổi → hiện 2 điểm dạy độc lập.
4. Check-in điểm A một lần → `1/3`, còn 2.
5. Check-in điểm B một lần → `1/3`, không ảnh hưởng điểm A.
6. Check-in lại điểm A → tạo bản ghi mới; bản cũ vẫn còn.
7. Dùng đủ 3 lượt điểm A → nút Check-in bị khóa cho riêng điểm A.
8. Điểm B vẫn dùng bình thường.

## C. GPS

1. Từ chối quyền vị trí → không tạo bản ghi, không mất lượt.
2. Tắt GPS / không lấy được vị trí → không mất lượt.
3. Timeout → không mất lượt.
4. GPS tốt → hiển thị accuracy và cho xác nhận.
5. GPS > 200 m → cảnh báo chất lượng thấp nhưng vẫn cho xác nhận.
6. Bấm `Xem vị trí vừa lấy` → mở đúng ghim tọa độ.
7. Sau khi Check-in, rời khỏi trường → lịch sử vẫn mở tọa độ cũ, không phải vị trí hiện tại.

## D. Dạy thay / TKB chưa cập nhật

1. Chọn `Điểm dạy khác / Dạy thay`.
2. Không nhập tên trường → không cho tiếp tục.
3. Nhập trường + lý do `Dạy thay` → Check-in được.
4. Record hiển thị `Địa điểm tự khai báo`.
5. Nhóm trưởng thấy lý do ngoài TKB.

## E. 3 lượt và cấp lại

1. Giáo viên dùng 3/3 lượt ở một điểm.
2. Nhóm trưởng thấy nút `+ Cấp thêm 3 lượt`.
3. Thử cấp khi giáo viên vẫn còn lượt → server từ chối.
4. Hết lượt → chọn lý do và cấp +3 thành công.
5. Tổng hạn mức thành 6, lịch sử 3 lần cũ giữ nguyên.
6. Giáo viên dùng tiếp lượt 4, 5, 6.
7. Nếu hết 6/6, có thể cấp tiếp một gói +3 mới.
8. Mỗi lần cấp có người cấp, thời gian và lý do trong bảng grant.

## F. Phân quyền

### Giáo viên
- Chỉ xem lịch sử của mình.
- Không đọc GPS của giáo viên khác.
- Không INSERT/UPDATE/DELETE trực tiếp vào 3 bảng Check-in.
- Không gọi RPC cấp thêm lượt cho mình.

### Nhóm trưởng
- Không có giao diện Check-in cá nhân.
- Chỉ thấy Check-in của thành viên thuộc nhóm mình.
- Không thấy thành viên nhóm khác.
- Chỉ cấp +3 cho thành viên thuộc nhóm mình.

### Quản lý / Chủ sở hữu
- Xem được dữ liệu theo quyền thiết kế.
- Có quyền dự phòng cấp +3.

## G. Thời gian

1. `checked_at` phải là thời gian server.
2. Đổi giờ điện thoại không làm đổi thời gian đã lưu trên server.
3. Client cố gửi ngày hôm qua/ngày mai → server từ chối.
4. Không có khóa giờ sớm/muộn theo tiết vì mỗi trường có TKB khác nhau.

## H. Dữ liệu bất biến

1. Giáo viên không sửa được tọa độ bản ghi cũ.
2. Giáo viên không sửa được `checked_at`.
3. Giáo viên không xóa bản ghi cũ.
4. Check-in sai → dùng Check-in lại để tạo record mới.

## I. Thiết bị cần thử trước production

- Android + Chrome.
- iPhone + Safari.
- Máy tính có trình duyệt hiện đại để kiểm tra giao diện quản lý.
- Mạng Wi-Fi và 4G/5G.

## J. Điều kiện PASS trước production

Chỉ xem xét merge khi:

- Toàn bộ test A–H đạt.
- Không có leak GPS giữa các nhóm.
- Không có trường hợp lỗi mạng/GPS làm mất lượt.
- 2 trường trong cùng buổi hoạt động độc lập.
- Dạy thay hoạt động.
- Cấp +3 hoạt động đúng phạm vi.
- Có backup production mới ngay trước ngày merge.
- Production có feature flag và phương án rollback.
