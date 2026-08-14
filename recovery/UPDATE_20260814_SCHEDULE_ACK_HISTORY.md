# Cập nhật 14/08/2026 — Lịch sử xác nhận lịch dạy

## Quy tắc thời gian

- 17:00–21:59: xác nhận bình thường → `Đã xem đúng giờ`.
- 22:00–23:59: vẫn cho xác nhận → lần xác nhận đầu tiên được ghi `Đã xem muộn`.
- 00:00: không còn xác nhận cho lịch của ngày vừa chuyển sang hôm nay.
- Nếu giáo viên đã xác nhận một phiên bản lịch, sau đó TKB thay đổi và giáo viên xác nhận lại, trạng thái lịch sử là `Đã xem lại sau đổi lịch`, không quy chụp thành xem muộn.
- Nếu tới ngày dạy vẫn không xác nhận phiên bản lịch cuối cùng: lưu `Không xác nhận trước ngày dạy` hoặc `Không xác nhận lại sau đổi lịch`.

## Lưu trữ dài hạn

Migration `20260814163624_schedule_ack_long_term_history.sql` bổ sung:

- `teaching_schedule_expectations`: ảnh chụp lịch bắt buộc theo giáo viên + ngày dạy, giữ tên/mã/nhóm/lịch/TKB nguồn tại thời điểm chụp.
- `teaching_schedule_ack_events`: nhật ký từng lần xác nhận, không ghi đè lịch sử lần trước.
- RPC lịch sử theo khoảng ngày, có phân quyền theo phạm vi Nhóm trưởng / toàn hệ thống.

Bảng `teaching_schedule_acknowledgements` cũ vẫn được giữ để tương thích với giao diện hiện tại; RPC xác nhận mới đồng thời ghi event lịch sử.

## Cách bảo toàn người không xác nhận

- Tài khoản có quyền xem toàn hệ thống tự đồng bộ ảnh chụp lịch tương lai từ TKB chung đang áp dụng (tối đa 90 ngày tới) vào Supabase.
- Giáo viên khi sử dụng hệ thống cũng ghi ảnh chụp lịch ngày mai của chính mình.
- Khi ngày dạy đến, nếu ảnh chụp cho thấy giáo viên có lịch nhưng không có event xác nhận, lịch sử tự hiện `Không xác nhận trước ngày dạy`; không cần job chạy đúng 00:00.
- Nếu TKB chung được thay đổi trước ngày dạy, lần đồng bộ tiếp theo cập nhật revision và lịch cuối cùng cần xác nhận.

## Giao diện

Module `schedule-ack-history-v1.js` bổ sung:

- `Lịch sử xác nhận lịch dạy` có chọn từ ngày / đến ngày.
- Tìm kiếm tên, tài khoản, mã giáo viên, trường.
- Lọc nhóm và trạng thái.
- Phân trang 10 / 20 / 50 dòng.
- Bộ đếm Đúng giờ / Muộn / Xem lại / Không xác nhận / Không xem lại.
- Nút `Đồng bộ TKB hiện tại` dành cho người có quyền xem toàn hệ thống.
- Sau 22:00, màn hình theo dõi hiện `Chưa xem – quá giờ` và phân biệt `Đã xem muộn`.

Module `schedule-ack-history-ux-fix-v1.js` tinh chỉnh trải nghiệm:

- Ô tìm kiếm được debounce khoảng 380 ms để không render lại sau từng ký tự, tránh mất focus và gõ khó.
- Thêm nút nhanh `Hôm nay` ngay trước `7 ngày`.
- Bộ lọc Nhóm lấy danh sách trực tiếp từ `schedule_ack_monitor_groups()`, nên hiển thị đầy đủ các nhóm đang hoạt động trong phạm vi quyền kể cả nhóm chưa có bản ghi lịch sử ở khoảng ngày đang xem.

## An toàn

- Hai bảng lịch sử bật RLS và không cấp quyền đọc/ghi trực tiếp cho `anon` hoặc `authenticated`; truy cập qua RPC kiểm tra quyền.
- Các RPC mới thu hồi `EXECUTE` của `PUBLIC/anon`, chỉ `authenticated` được gọi.
- `acknowledge_teaching_schedule` kiểm tra giờ Việt Nam phía server và không cho xác nhận trước 17:00.
- Không thay đổi lịch sử Check-in GPS và không đổi backend Check-in khỏi `phase = pilot`.

## Branch thử nghiệm

`feature/schedule-ack-history-20260814`

Chưa merge `main`. Cần kiểm thử localhost trước khi đưa chính thức.
