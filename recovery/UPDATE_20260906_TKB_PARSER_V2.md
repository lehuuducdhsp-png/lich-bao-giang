# UPDATE 2026-09-06 — TKB Parser V2 / Điểm dạy / Lớp gộp

## Mục tiêu
Nâng bộ đọc thời khóa biểu để xử lý đúng cấu trúc TKB năm học 2026–2027 có Trường → Trụ sở/Phân hiệu/Điểm trường/Cơ sở, lớp lẻ và lớp gộp; đồng thời sửa lỗi lệch tiết và tránh nhầm tên/mã giáo viên.

## PR / merge
- PR: #22 — `Parser TKB V2: đúng tiết, đúng giáo viên, điểm dạy và lớp gộp`
- Feature branch: `feature/tkb-parser-v2-sites-classes-periods-20260906`
- Feature head đã test: `fd007b4b50ccdd420020a672ac96e6c901cd97cb`
- Merge commit vào `main`: `97712fcd5c8231ba0733eebcfdf9c49d319d0c48`
- Rollback trước merge: `rollback/pre-tkb-parser-v2-merge-20260906-2056`

## Thay đổi chính
- Đọc Thứ/Buổi/Tiết trực tiếp từ header Excel, không hard-code vùng cột cũ.
- Sửa lỗi Tiết 1 bị đọc thành Tiết 2 và lỗi lệch ở biên Sáng/Chiều/ngày.
- Khóa ánh xạ tên giáo viên ↔ mã giáo viên theo bảng COUNTIF; ví dụ `Khánh Thi → K.THI`, `Trần Khánh → KHÁNH`.
- Chỉ chuẩn hóa khác dấu khi chỉ có đúng một mã ứng viên; không tự đoán khi mơ hồ.
- Đọc tách riêng tên Trường và Trụ sở/Phân hiệu/Điểm trường/Cơ sở.
- Hỗ trợ lớp lẻ và lớp gộp; lớp gộp vẫn tính 1 tiết thực dạy.
- Lịch Báo giảng hiển thị đầy đủ điểm dạy; giữ phần `- TIẾT ...` trong nhãn lớp gộp theo nguồn.
- Ô GA rộng hơn, bỏ spinner để số 2 chữ số dễ đọc.
- Chỉ thêm Chủ nhật và ngày kết thúc tới Chủ nhật khi thật sự có phân công Chủ nhật.
- Xuất Excel và Google Sheets owner dùng cùng dữ liệu Parser V2.
- Kiểm tra trùng phân biệt cùng khung nhưng khác điểm dạy/cơ sở.

## File runtime thay đổi
- `app-runtime-v1.js`
- `conflict-check-v7.js`
- `index.html`
- `report-engine-v4.js`
- `sheets-sync-owner-v2.js`
- `sheets-sync-security-v1.js`
- `tkb-parser-bridge-v2.js`
- `tkb-parser-school-name-fix-v1.js`
- `tkb-parser-v2.js`

## Kiểm thử
Người dùng đã test localhost với file `TKB NĂM HỌC 26-27(1).xlsx`, kiểm tra hiển thị Trường/điểm dạy, lớp lẻ/lớp gộp, ô GA 2 chữ số và nhãn `- TIẾT ...`, sau đó xác nhận ổn và đồng ý đưa vào website chính thức.

## Deploy
GitHub Pages run sau merge PR #22:
- Run #259 / id `34038133644`
- Commit `97712fcd5c8231ba0733eebcfdf9c49d319d0c48`
- Kết quả: `completed / success`

## An toàn
- Không migration/SQL/database.
- Không sửa lịch sử Check-in.
- Không đổi backend Check-in phase.
- Khi cần rollback, dùng branch `rollback/pre-tkb-parser-v2-merge-20260906-2056` làm mốc trước thay đổi.
