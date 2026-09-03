# Cập nhật 03/09/2026 – Tên bài Kỹ năng sống theo GA nhập thủ công

## Phạm vi
- PR #15: `Bổ sung tên bài Kỹ năng sống theo GA`.
- Merge commit: `9bbcd29965d5b944cd5a9b3ccc51561efd61488e`.
- Rollback trước merge: `rollback/pre-kns-lesson-names-merge-20260903-1557` tại commit `22a6d0a822fb19609f03c8d0112f0d95855b8fb0`.

## Chức năng
Trong phần **Dữ liệu đã đọc từ TKB**, sau khi người dùng nhập GA thủ công ở Lịch Báo giảng, bảng chi tiết hiển thị theo thứ tự:

`STT → Thứ → Ngày → Buổi → Trường → Lớp → Tiết → Giáo án → Tên bài dạy`

Tên bài chỉ lấy từ **Kế hoạch dạy học Tiểu học 2026–2027** và chỉ lấy nội dung thuộc **Ban Kỹ năng sống**.

## Quy tắc loại trừ
- Khối 1–3: không hiển thị tên bài Toán tư duy Finger Math / Abacus tại các tiết `3, 6, 13, 16, 20, 23, 27, 32, 35`.
- Khối 4–5: không hiển thị tên bài STEM tại các tiết `3, 6, 12, 16, 20, 23, 27, 32, 35`.
- Nếu GA thuộc một tiết ngoài Ban KNS, bảng ghi rõ `Không thuộc Ban Kỹ năng sống` thay vì tự gán một tên bài khác.

## Nguyên tắc an toàn
- GA nhập thủ công là dữ liệu người dùng xác nhận và không bị module gợi ý tự ghi đè.
- Nút `Phân tích giáo án gợi ý` vẫn giữ vai trò hỗ trợ đối chiếu riêng.
- Danh mục tên bài hiện được khóa theo năm học 2026–2027; không tự áp sang năm học khác.
- Không có thay đổi Supabase, database, migration, Check-in hoặc lịch sử Check-in trong đợt này.

## File chính
- `kns-lesson-detail-v1.js`
- `app-runtime-v1.js`
- `index.html`
