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

## Giao diện lịch sử xác nhận

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

Module `schedule-ack-history-sort-v1.js` bổ sung sắp xếp:

- Mặc định `Mới → Cũ` để thông tin gần nhất luôn nằm trước.
- Có thể đổi sang `Cũ → Mới` hoặc `Tên A → Z`.
- Sắp xếp áp dụng trước phân trang để thứ tự đúng trên toàn bộ tập kết quả, không chỉ riêng trang đang nhìn.

## Kiểm tra Check-in — ghi rõ giáo viên chưa Check-in

Migration `20260814171315_checkin_review_roster_missing_notes.sql` bổ sung RPC `checkin_review_roster()`:

- Chỉ người có quyền `can_review` của Check-in mới gọi được.
- Danh sách giáo viên luôn bị giới hạn theo đúng phạm vi `can_view_checkin_target` hiện có; không mở rộng quyền của Nhóm trưởng/Quản lý.
- RPC không mở cho `anon`.

Module `checkin-manager-review-ux-v2.js` đối chiếu danh sách được phép xem với TKB chung đang áp dụng và dữ liệu Check-in đã ghi:

- Nếu giáo viên có lịch nhưng chưa có Check-in, hiện rõ theo từng điểm dạy.
- Trước giờ mở: `Chưa đến giờ Check-in`.
- Đang trong khung giờ nhưng chưa có dữ liệu: `Chưa Check-in`.
- Hết khung giờ hoặc ngày đã qua: `Không Check-in` / `Không Check-in trong khung giờ`.
- Nếu TKB chung hiện tại không còn chứa ngày được chọn, hệ thống không tự kết luận ai chưa Check-in; chỉ hiển thị dữ liệu Check-in đã ghi và cảnh báo thiếu lịch tham chiếu.
- Các điểm chưa Check-in được ghim phía trên để dễ xử lý.
- Phần Check-in đã ghi mặc định `Mới → Cũ`, có thêm `Cũ → Mới` và `Tên A → Z`; các lần Check-in trong cùng một điểm cũng ưu tiên lần mới nhất trước.

### Sửa lỗi bộ lọc Nhóm 15/08/2026

- Trước bản sửa, dropdown `Nhóm` chỉ lọc các thẻ Check-in đã tồn tại trong database; các thẻ `chưa Check-in` mới sinh từ đối chiếu TKB không đi qua bộ lọc nên có thể chọn `Nhóm 2 (0 GV)` nhưng vẫn nhìn thấy giáo viên Nhóm 1.
- `checkin-manager-review-ux-v2.js` bản `20260815.3` lọc danh sách giáo viên theo `group_id` trước khi quét TKB, vì vậy bộ đếm và danh sách thiếu Check-in đều đúng theo nhóm đang chọn.
- `checkin-admin-polish-v1.js` bản `20260815.1` áp dụng bộ lọc cho cả thẻ đã Check-in và chưa Check-in, đồng thời mặc định chọn `Tất cả nhóm` nếu người dùng chưa lưu lựa chọn trước đó.
- Khi chọn một nhóm không có giáo viên trong phạm vi kiểm tra, giao diện phải hiện thông báo rõ và bộ đếm `0/0`, không được rò dữ liệu của nhóm khác.
- Nút `Làm mới`, đổi `Ngày`, đổi `Nhóm` và `Sắp xếp` được tách chức năng: đổi nhóm không làm mất lựa chọn sắp xếp; làm mới buộc nạp lại roster, dashboard và TKB; sắp xếp chỉ thay đổi thứ tự dữ liệu đã Check-in, còn các điểm chưa Check-in vẫn được ghim phía trên.

## An toàn

- Hai bảng lịch sử bật RLS và không cấp quyền đọc/ghi trực tiếp cho `anon` hoặc `authenticated`; truy cập qua RPC kiểm tra quyền.
- Các RPC mới thu hồi `EXECUTE` của `PUBLIC/anon`, chỉ `authenticated` được gọi khi hàm tự kiểm tra phạm vi quyền.
- `acknowledge_teaching_schedule` kiểm tra giờ Việt Nam phía server và không cho xác nhận trước 17:00.
- Không thay đổi lịch sử Check-in GPS và không đổi backend Check-in khỏi `phase = pilot`.

## Đưa lên chính thức

- Người dùng đã kiểm thử localhost và xác nhận ổn ngày 15/08/2026.
- PR #13 `Lịch sử xác nhận lịch dạy và rà soát Check-in` đã merge vào `main`.
- Merge commit: `06c6b7e12e8f3697aee1c172b512aa418d425373`.
- Rollback trước merge: `rollback/pre-schedule-ack-history-merge-20260815-0037` tại commit `5d23692dcaba2f6806178d513fe5cda103940c25`.
- Backend Check-in vẫn giữ `phase = pilot`.
- Sau merge, file recovery này được cập nhật trực tiếp trên `main` để ghi lại mốc triển khai và đường lui.
