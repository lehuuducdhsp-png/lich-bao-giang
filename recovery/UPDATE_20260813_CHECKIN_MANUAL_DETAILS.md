# UPDATE 13/08/2026 – CHI TIẾT ĐIỂM DẠY KHÁC / DẠY THAY

## Trạng thái
Đã đưa lên `main` sau khi người dùng kiểm thử localhost và xác nhận ổn.

- PR: #10 `Bổ sung chi tiết cho Điểm dạy khác / Dạy thay`
- Feature branch: `feature/checkin-manual-details-20260813`
- Feature head: `0b34ae55f5494fa877de66f6e27b1d73042f1ae4`
- Merge commit: `28ede5b5f1d985f6cf44b262646b3a0067526db5`
- Rollback trước merge: `rollback/pre-checkin-manual-details-merge-20260813-0800`

## Nội dung đã thêm
Module mới: `checkin-manual-detail-v1.js`.

Trong `+ Điểm dạy khác / Dạy thay`:
- thêm trường `Tiết dạy`, hỗ trợ nhập dạng `1, 2, 5` hoặc `1-3`;
- khi chọn/nhập trường + buổi, đối chiếu TKB chung trong ngày để gợi ý giáo viên có lịch tại trường đó;
- với lý do `Dạy thay`, thêm ô `Dạy thay cho giáo viên`, hiển thị giáo viên/mã GV và tiết theo TKB;
- khi chọn giáo viên được dạy thay, tự gợi ý tiết nhưng cho phép chỉnh lại nếu điều động thực tế khác TKB;
- với `TKB chưa cập nhật` hoặc `Điều động đột xuất`, bắt buộc nhập rõ tiết thực tế;
- lưu tiết dạy, giáo viên được dạy thay, mã giáo viên và lớp liên quan vào `schedule_reference` của bản ghi Check-in để đối chiếu về sau.

## Những gì KHÔNG thay đổi
- Không migration mới.
- Không thay đổi schema database.
- Không thay đổi khung giờ Check-in: sáng 06:00–11:00, chiều 12:00–17:00.
- Không thay đổi 3 lượt/điểm dạy và cơ chế xin thêm lượt.
- Không thay đổi GPS.
- Không thay đổi quyền Nhóm trưởng/Chủ sở hữu.
- Không sửa hoặc xóa lịch sử Check-in cũ.

## Kiểm thử
Người dùng đã kiểm thử localhost trên nhánh `feature/checkin-manual-details-20260813` và xác nhận `đã thấy ổn`, sau đó yêu cầu đưa lên link chính.

## Smoke test production nên làm
1. Mở link chính thức và Ctrl+Shift+R.
2. Vào `+ Điểm dạy khác / Dạy thay`.
3. Kiểm tra có đủ Trường / Buổi / Tiết dạy / Lý do.
4. Chọn `Dạy thay`, kiểm tra ô `Dạy thay cho giáo viên` xuất hiện và gợi ý đúng theo TKB chung.
5. Kiểm tra chọn giáo viên tự gợi ý tiết.
6. Với `TKB chưa cập nhật` hoặc `Điều động đột xuất`, kiểm tra hệ thống yêu cầu nhập tiết.
7. Không bấm xác nhận Check-in thật nếu chỉ đang smoke-test giao diện.
