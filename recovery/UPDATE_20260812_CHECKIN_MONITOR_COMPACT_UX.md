# UPDATE 12/08/2026 – THEO DÕI CHECK-IN GỌN CHO CHỦ SỞ HỮU

## Trạng thái
Đã đưa lên `main` sau khi người dùng kiểm thử localhost và xác nhận ổn.

- PR: #9 `Thu gọn Theo dõi Check-in cho Chủ sở hữu`
- Feature branch: `feature/checkin-monitor-compact-ux-20260812`
- Feature head: `f84be1437c92335a7d2ebf9d7da359beb31a2c9f`
- Merge commit: `b6ee2ff6a1d9246df87cb7cf7c1164ee1eeac3f3`
- Rollback trước merge: `rollback/pre-checkin-monitor-compact-ux-merge-20260812-2315`
- Rollback trước vòng thử đầu: `rollback/pre-checkin-monitor-compact-ux-20260812-2242`

## Nội dung đã thêm
Module mới: `checkin-monitor-compact-ux-v1.js`.

Trong `Theo dõi Check-in hôm nay`:
- tìm nhanh theo tên giáo viên, mã TKB hoặc trường;
- lọc Nhóm cho Chủ sở hữu;
- lọc trạng thái `Cần nhắc / Tất cả / Đã hoàn tất`;
- phân trang riêng cho Sáng và Chiều;
- lựa chọn 10/20/50 giáo viên mỗi trang;
- mặc định ưu tiên `Cần nhắc` để danh sách không quá dài khi số giáo viên tăng.

## Quy tắc dropdown Nhóm
Chủ sở hữu thấy toàn bộ nhóm trong hệ thống, kể cả nhóm không có giáo viên có lịch Check-in trong ngày.

Ví dụ:
- `Tất cả nhóm (2)`
- `Nhóm 1 (2)`
- `Nhóm 2 (0)`

Số trong ngoặc là số giáo viên có lịch Check-in trong ngày của nhóm đó, không phải số điểm dạy. Một giáo viên có lịch cả sáng và chiều vẫn chỉ tính 1 giáo viên trong con số của nhóm.

Nếu chọn nhóm có `(0)`, danh sách hiển thị trạng thái không có giáo viên phù hợp thay vì loại nhóm khỏi dropdown.

## Những gì KHÔNG thay đổi
- Không migration mới.
- Không sửa Supabase/database.
- Không thay đổi dữ liệu Check-in.
- Không thay đổi logic tính điểm dạy.
- Không thay đổi quyền Nhóm trưởng/Chủ sở hữu.
- Không thay đổi khung giờ Check-in 06:00–11:00 và 12:00–17:00.

## Kiểm thử
Người dùng đã kiểm thử localhost bản `?checkin-monitor-group-count=20260812-2` và xác nhận `okkeee đã ổn`, sau đó yêu cầu đưa lên link chính.

Sau merge đã đối chiếu feature với `main`: không còn file diff; `main` chỉ hơn feature 1 merge commit.

## Smoke test production nên làm
Mở link chính thức và Ctrl+Shift+R, sau đó kiểm tra:
1. Chủ sở hữu thấy thanh Tìm nhanh / Nhóm / Trạng thái / Hiển thị.
2. Nhóm không có lịch vẫn xuất hiện dạng `(0)`.
3. `Cần nhắc` là mặc định.
4. Phân trang Sáng và Chiều hoạt động độc lập.
5. Nhóm trưởng vẫn chỉ thấy đúng phạm vi quyền hiện có.
