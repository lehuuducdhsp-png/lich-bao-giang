# Bàn giao Trợ giảng (P) — 11/09/2026

## Trạng thái xác minh đầu phiên

- Repository: `lehuuducdhsp-png/lich-bao-giang`.
- `main`: `7dd2ca5892dbebf3274b9fecb1174ab5083e5bf2`, commit rollback về production trước P. Các thông báo triển khai P trước đó không còn phản ánh main.
- PR #36: Draft, chưa merge; base `stable/pre-p-20260909`, head `sandbox/assist-p-safe-v1` tại `a7a29311dd219bfa238f18b3d1f4389c5921fb1c`.
- File JS ở head PR #36 vẫn ghi `20260911.safe1` và còn `ensureAnalyzeWrapped`, dù tiêu đề các commit ghi safe2.
- Nhánh sửa tiếp: `fix/assist-p-verified-20260911`, tạo từ main hiện hành. Không merge PR #36 hoặc lấy lại toàn bộ các bản P từng rollback.
- Snapshot trước sửa: `backup-before-assist-p-verified-20260911` trỏ về main nêu trên.

## Quy tắc và thay đổi

- `assist-p-data-v1.js` chỉ đọc ô mã `<mã giáo viên>P`; không thay `analyzeNow`, không sửa `result.entries` hoặc tổng chính.
- Web và Excel gọi cùng bộ đọc ngay trong report engine. P được ghép vào bản sao theo đúng giáo viên, ngày, buổi, tiết. Không đoán mã giáo viên từ tên sheet xuất, kể cả nhiều giáo viên/ZIP.
- Giữ vị trí ô nguồn; nhãn `TIẾT N` xác định tiết thực tế. Ô mã gộp chỉ tính ô chủ; mã giáo viên thật có tên trùng hậu tố được ưu tiên.
- Tổng chính vẫn là chính + cộng. Ví dụ 15 + 1 = 16; thêm 2 P không thành 18.
- Bộ xuất V3 tạo worksheet mới, sao chép giá trị ô chủ và dịch vùng gộp. Không dùng `spliceRows` trên worksheet gộp. Không quét/chèn P lần thứ hai sau serialization.
- Google Sheets nạp V4 một lần qua loader. Tắt tải V2 từ analysis boot khi ở production. V4 gửi P với `isAssist: true`, `assignmentType: assist`, `payEligible: false`, `assistPeriods`; tổng tính lương không chứa P. Đổi tuần/giáo viên phải Kiểm tra lại trước khi lưu.
- Bảng kê tháng dùng số P tự động theo ngày thuộc tháng. Giữ giá trị điều chỉnh thủ công đã lưu; để trống ô điều chỉnh để trở về số tự động. Xuất tháng dùng cùng số với Web.
- Giáo viên chỉ có P vẫn có thể được chọn và xuất. Báo giảng P vào Chủ nhật có cột Chủ nhật.
- Cập nhật toàn bộ cache key và các gate kiểm tra cache tương ứng.

## Bằng chứng kiểm thử

`tests/assist-p-integration.test.cjs` tạo workbook ExcelJS mô phỏng 14T09, rồi chạy parser thật, atomic enrichment, report engine, monthly engine, bộ xuất Excel và payload V4. Đây là **dữ liệu tái hiện**, không phải file TKB gốc của người dùng.

Đã kiểm:

- 15 chính + 1 cộng = 16; 2 P tại chiều Thứ 6, tiết 1 và 3, lớp 1/1 và 1/3.
- Gọi render nhiều lần; `analyzeNow` giữ nguyên tham chiếu, `entries` và tổng chính không bị sửa.
- Ghi XLSX → đọc lại → thêm nhận diện → ghi/đọc lại; đối chiếu toàn bộ giá trị và ô trống với trước khi thêm nhận diện.
- Excel sau thêm 3 dòng nhận diện: G15 = `1/1 (P)`, G17 = `1/3 (P)`, G16 trống; A20 có tổng 16 và Trợ (P): 2.
- Nhiều giáo viên trong một workbook, giáo viên không P, chỉ P, Chủ nhật, vùng gộp, nhãn TIẾT N, lọc ngày trong tháng, chọn giáo viên mới khi kết quả cũ còn trên màn hình.
- Bảng kê tháng trên Web và file XLSX có 16 chính, 2 trợ.

`tests/sheets-edge-passthrough.test.cjs` chạy bản nguồn Edge v6 đã đọc trực tiếp từ Supabase trong môi trường giả lập: payload P giữ nguyên khi chuyển tới upstream; người không phải Owner bị chặn. Không ghi lên Google Sheets thật.

Chạy lại bằng Node 24:

```sh
npm install --prefix ../lbg-test-deps --ignore-scripts exceljs@4.4.0 jsdom@26.1.0
NODE_PATH=../lbg-test-deps/node_modules node --test tests/*.test.cjs
```

Workflow `validate-assist-p.yml` chạy toàn bộ suite và lưu workbook/payload mô phỏng thành artifact CI.

## Google Sheets — giới hạn còn phải giải quyết

- Supabase `google-sheets-owner` đang ACTIVE, version 6. Đã lấy nguồn trực tiếp; bản sao nằm ở `google-sheets/google-sheets-owner-v6.ts`. Không chứa giá trị secret.
- Edge xác thực user, kiểm tra Owner và chuyển nguyên payload sang URL Apps Script trong secret. Không có bước loại P ở Edge. Không cần sửa/deploy Edge chỉ để thêm trường P.
- Chưa truy cập được mã Apps Script đang triển khai hoặc file Sheets đích trong phiên này. Không được khẳng định đã sửa Apps Script hoặc đã lưu P thành công ở file thật.
- Hộp xác nhận có P không đủ chứng minh Sheet được ghi đúng. Cần đối chiếu cả payload gửi, Apps Script nhận/xử lý và ô đã lưu.
- Google Drive chưa kết nối lúc ghi hồ sơ. Đã gợi ý kết nối để đọc file Sheets/tài liệu liên quan. Nếu kết nối không cung cấp mã Apps Script, cần bản nguồn Apps Script hiện hành (không gửi secret).
- Chưa có file TKB gốc 14T09 trong phiên; cần kiểm tra với file gốc trước khi đưa lên main.

## Triển khai

Bản sửa nằm trên nhánh riêng và PR Draft; chưa thay link chính, chưa ghi Sheet thật, chưa đổi database/Check-in. Hoàn tất kiểm tra TKB gốc và Apps Script/Sheet trước khi merge. Giữ nguyên các nhánh cứu hộ hiện có.
