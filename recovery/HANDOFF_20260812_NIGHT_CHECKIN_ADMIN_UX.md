# HỒ SƠ BÀN GIAO – PHIÊN TỐI 12/08/2026

> Mục đích: dùng file này để tiếp tục dự án ở một cuộc trò chuyện/tài khoản GPT khác nếu lịch sử chat hiện tại bị mất.

## 1. NHẬN DIỆN DỰ ÁN

- GitHub repo: `lehuuducdhsp-png/lich-bao-giang`
- Link chính thức: `https://lehuuducdhsp-png.github.io/lich-bao-giang/`
- Supabase project ref: `gmkibmybqfomypytmjxw`
- Local repo thường dùng:
  `C:\Users\cuduc\Downloads\BẢO HỘ WEB CHỈN CHU\lich-bao-giang-checkin`
- Local test server:
  `python -m http.server 8765`
- Local test URL thường dùng:
  `http://localhost:8765/`

## 2. TRẠNG THÁI CHÍNH THỨC SAU PHIÊN TỐI 12/08/2026

PR #8 đã merge vào `main`.

- PR: `#8 – Hoàn thiện theo dõi Check-in và danh sách quản trị`
- Head branch: `feature/checkin-daily-monitor-20260812`
- Merge commit: `f4d9b6b5ef5d8386cda89d85f99498aaa55e4bbe`
- Mốc rollback trước khi merge:
  `rollback/pre-checkin-daily-monitor-20260812-2215`
- Mốc rollback riêng trước vòng UX danh sách:
  `rollback/pre-admin-list-ux-trial-20260812-2146`

Sau merge, file recovery này được bổ sung trên `main`.

## 3. CHECK-IN – LOGIC ĐÃ CHỐT

### 3.1. Khung giờ Check-in

Giờ Việt Nam:

- Buổi sáng: `06:00–11:00`
- Buổi chiều: `12:00–17:00`

Ngoài các khung này, giáo viên/thành viên không được thực hiện Check-in.

### 3.2. Logic hiển thị cho giáo viên/thành viên

- Trước 06:00: có thể xem lịch sáng hôm nay nhưng nút Check-in bị khóa.
- 06:00–11:00: chỉ điểm dạy buổi sáng được Check-in.
- 11:01–11:59: chuyển sang xem lịch chiều hôm nay, nút khóa đến 12:00.
- 12:00–17:00: chỉ điểm dạy buổi chiều được Check-in.
- Sau 17:00: không còn cho Check-in hôm nay; giao diện chuyển sang `Ngày mai bạn dạy ở đâu?`.
- Lịch ngày mai chỉ là xem trước, nút Check-in bị khóa.
- Khi xem ngày mai, lịch `Sáng` phải nằm trên, `Chiều` nằm dưới.
- `Điểm dạy khác / Dạy thay` cũng bị khóa ngoài giờ, không được dùng để lách khung thời gian.

Frontend phụ trách phần này:

- `checkin-member-window-v1.js`

### 3.3. Một điểm dạy được tính thế nào

Một điểm dạy Check-in được xác định theo:

- ngày
- buổi
- trường

Nếu cùng một buổi giáo viên có nhiều tiết ở cùng một trường, ví dụ tiết 1, 2, 5 tại Trường A, vẫn tính là 1 điểm cần Check-in.

Nếu cùng một buổi dạy 2 trường khác nhau, ví dụ Trường A và Trường B, phải có 2 điểm Check-in riêng.

### 3.4. Theo dõi Check-in cho Nhóm trưởng

Đã thêm bảng theo dõi trong ngày dành cho Nhóm trưởng/reviewer:

- `Buổi sáng hôm nay`
- `Buổi chiều hôm nay`
- Tổng nhanh kiểu `4/6 điểm đã Check-in • 2 điểm chưa Check-in`
- Giáo viên còn thiếu Check-in được đưa lên trên.
- Mỗi giáo viên hiển thị từng trường và tiết tương ứng.
- Ví dụ: `Trường A • Tiết 1, 2, 5`.
- Có trạng thái `Đã Check-in` / `Chưa Check-in`.
- Nếu 1 giáo viên có 2 điểm nhưng mới Check-in 1 điểm, hiển thị kiểu `1/2 điểm đã Check-in`.
- Không tự kết luận giáo viên Check-in sai trường. Chỉ đối chiếu điểm dạy trong TKB chung với bản ghi Check-in đã có.
- Nhóm trưởng chỉ thấy giáo viên thuộc phạm vi được phép; owner có phạm vi rộng hơn theo quyền hiện có.

Frontend:

- `checkin-daily-monitor-v1.js`

Quan trọng: giao diện Nhóm trưởng giữ nguyên cơ chế theo dõi cả ngày; logic chuyển sang lịch ngày mai chỉ áp dụng cho giáo viên/thành viên Check-in, không làm biến mất bảng theo dõi của Nhóm trưởng.

## 4. SERVER-SIDE KHÓA GIỜ CHECK-IN

Migration:

`supabase/migrations/20260812220000_checkin_session_time_window.sql`

Migration này tạo guard phía máy chủ để không thể Check-in ngoài giờ chỉ bằng cách bypass giao diện.

Nội dung chính:

- Sáng chỉ mở 06:00–11:00.
- Chiều chỉ mở 12:00–17:00.
- `Khác` chỉ được ghi trong một trong hai khung hợp lệ, không dùng để bypass.
- Chỉ Check-in ngày hiện tại.

Tối 12/08/2026 người dùng đã chạy:

`supabase db push --linked`

và PowerShell hiện rõ:

- `Applying migration 20260812220000_checkin_session_time_window.sql...`
- `Finished supabase db push.`

=> Migration đã được áp dụng thành công lên Supabase.

Ghi chú: ảnh chụp cuối chat cho thấy lệnh `supabase db push --dry-run --linked` đã được gõ lại để kiểm tra, nhưng kết quả sau khi nhấn Enter không nằm trong ảnh. Khi tiếp tục dự án nên chạy lại một lần để xác nhận remote up to date:

```powershell
supabase db push --dry-run --linked
```

Mong đợi: không còn migration cần push / remote database is up to date.

## 5. QUẢN LÝ TÀI KHOẢN – UX ĐÃ CHỐT

Code gốc `owner-admin-v1.js` lấy profile theo `created_at` mới → cũ. Bản UX mới đổi cách hiển thị mặc định thành:

- Cũ ở trên
- Mới dần xuống dưới

Đồng thời có:

- tìm tài khoản
- sắp xếp `Cũ → mới`, `Mới → cũ`, `Tên A → Z`
- phân trang
- mặc định 10 dòng/trang
- tùy chọn 20 hoặc 50 dòng/trang

Mục tiêu: khi sau này có 50–100 giáo viên/tài khoản, không phải cuộn một bảng rất dài xuống hết website.

Frontend phụ trách:

- `admin-list-ux-v1.js`

## 6. LIÊN KẾT TÀI KHOẢN VỚI GIÁO VIÊN TRONG TKB

Các module liên quan:

- `teacher-code-linking-v2.js`
- `teacher-code-search-v1.js`
- `admin-list-ux-v1.js`

Đã có hai tầng UX:

### 6.1. Tìm giáo viên bên trong ô mã TKB

`teacher-code-search-v1.js` cho phép gõ tên hoặc mã giáo viên thay vì kéo dropdown dài.

- hỗ trợ tìm không dấu
- hỗ trợ tên/mã
- dùng bàn phím lên/xuống + Enter
- giá trị lưu cuối cùng vẫn là teacher code như cơ chế cũ

### 6.2. Quản lý danh sách tài khoản dài

`admin-list-ux-v1.js` bổ sung:

- tìm tài khoản
- lọc: tất cả / chưa liên kết / đã liên kết / nhóm trưởng / thành viên
- sắp xếp
- mặc định `Cần xử lý trước` = tài khoản chưa liên kết lên trên
- có `Tên A → Z`
- có `Nhóm trưởng trước`
- phân trang 10 / 20 / 50 dòng

Mục tiêu: nếu sau này có nhiều giáo viên thì không phải cuộn dài toàn trang.

## 7. SIDEBAR VÀ ĐỘ DỄ ĐỌC ĐÃ MERGE TRƯỚC ĐÓ

Đã có trên production trước phiên Check-in tối nay:

- sidebar `Danh mục chức năng` có thể thu gọn/mở rộng
- khi thu gọn còn thanh icon hẹp
- nội dung bên phải rộng hơn
- tăng cỡ chữ các bảng dữ liệu và các vùng nhỏ

Các module chính:

- `sidebar-compact-readable-v1.js`
- `readability-targeted-v2.js`

PR trước đó:

- PR #7 `Cải thiện sidebar thu gọn và độ dễ đọc giao diện`

## 8. QUY TẮC CHECK-IN KHÔNG ĐƯỢC LÀM HỎNG

- Check-in hiện vẫn theo mô hình PILOT/thử nghiệm nếu hệ thống setting vẫn là pilot. Không tự ý chuyển phase nếu chưa có quyết định rõ ràng.
- Group leader/nhóm trưởng được miễn Check-in.
- Owner được miễn Check-in.
- Giáo viên thường cần teacher_code hợp lệ.
- 3 lượt cho mỗi điểm dạy.
- Chỉ lượt ghi thành công phía server mới tính.
- Hết lượt mới có cơ chế yêu cầu thêm 3 lượt theo quy trình đã có.
- Không xóa/sửa lịch sử Check-in đã ghi.
- GPS chỉ là bằng chứng vị trí; không tự phán quyết đúng/sai trường.
- TKB chung đang áp dụng là nguồn chính thức cho Check-in. TKB cá nhân chỉ tham khảo.
- Manual/dạy thay phải giữ lý do và audit.

## 9. CÁC FILE CHÍNH THÊM/SỬA TRONG PR #8

PR #8 thay đổi 6 file:

- `admin-list-ux-v1.js` – mới
- `checkin-daily-monitor-v1.js` – mới
- `checkin-member-window-v1.js` – mới
- `app-runtime-v1.js` – thêm tải các module trên
- `index.html` – bump runtime/cache version
- `supabase/migrations/20260812220000_checkin_session_time_window.sql` – mới

PR #8 có khoảng +510/-2 dòng.

## 10. CÁC MỐC ROLLBACK/AN TOÀN LIÊN QUAN

Gần nhất:

- `rollback/pre-checkin-daily-monitor-20260812-2215`
- `rollback/pre-admin-list-ux-trial-20260812-2146`

Các mốc cũ quan trọng:

- `rollback/pre-teacher-code-search-20260811-1743`
- `rollback/pre-checkin-permission-groups-20260811-1656`
- `rollback/pre-group-member-remove-20260810-2230`
- `rollback/pre-admin-polish-20260810-1825`
- `rollback/pre-main-checkin-20260810-1423`
- `rollback/pre-checkin-20260810-1057`

Golden/backup production cũ:

- branch: `backup-production-20260808-2130`
- golden commit: `f4df2ecc66424b539a0f8719a1ab0be52954b2fe`

Không dùng golden cũ để ghi đè production hiện tại trừ khi đang cứu hộ có chủ đích, vì production hiện nay đã có nhiều chức năng mới hơn.

## 11. BACKUP SUPABASE QUAN TRỌNG

Backup cục bộ đã tạo trước đó:

`C:\Users\cuduc\Downloads\BẢO HỘ WEB CHỈN CHU\lich-bao-giang-main\lich-bao-giang-main\recovery\supabase-backup\output\20260810-113006`

Có dump roles/schema/data/auth/storage và `SHA256SUMS.txt`; trước đó đã kiểm tra rehash PASS.

Không commit DB/auth backup lên GitHub public.

## 12. LỆNH TIẾP TỤC AN TOÀN Ở MÁY WINDOWS

```powershell
Set-Location "C:\Users\cuduc\Downloads\BẢO HỘ WEB CHỈN CHU\lich-bao-giang-checkin"

git switch main
git pull --ff-only

git status --short --branch

supabase db push --dry-run --linked
```

Nếu cần tạo tính năng mới:

1. luôn bắt đầu từ `main` mới nhất
2. tạo branch feature riêng
3. test localhost trước
4. không merge trước khi người dùng xác nhận
5. nếu đụng database, dùng migration mới; không sửa migration đã áp dụng
6. tạo rollback branch trước khi merge tính năng lớn
7. sau merge cập nhật file recovery

## 13. CÁCH TEST LOCALHOST

```powershell
Set-Location "C:\Users\cuduc\Downloads\BẢO HỘ WEB CHỈN CHU\lich-bao-giang-checkin"

Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

python -m http.server 8765
```

Mở:

`http://localhost:8765/`

Nếu mở một cửa sổ PowerShell riêng cho server thì giữ cửa sổ đó chạy trong lúc test.

## 14. PROMPT BÀN GIAO NGẮN ĐỂ DÁN VÀO GPT KHÁC

Dán nguyên đoạn dưới đây vào tài khoản GPT khác và gửi kèm file này:

> Tôi đang tiếp tục dự án GitHub `lehuuducdhsp-png/lich-bao-giang`, website chính thức `https://lehuuducdhsp-png.github.io/lich-bao-giang/`. Hãy đọc file `recovery/HANDOFF_20260812_NIGHT_CHECKIN_ADMIN_UX.md` trong repo trước khi làm bất cứ thay đổi nào. Production hiện đã merge PR #8, merge commit `f4d9b6b5ef5d8386cda89d85f99498aaa55e4bbe`. Migration khóa giờ Check-in `20260812220000_checkin_session_time_window.sql` đã được push lên Supabase thành công. Không được tự ý đổi phase Check-in, không phá lịch sử dữ liệu, không sửa migration đã áp dụng. Mọi tính năng mới phải làm branch thử riêng, test localhost trước, chỉ merge sau khi tôi xác nhận.

## 15. VIỆC CẦN KIỂM TRA NGAY KHI TIẾP TỤC

1. Chạy `git pull --ff-only` trên main.
2. Chạy `supabase db push --dry-run --linked` để xác nhận remote up to date.
3. Mở link chính thức và Ctrl+Shift+R.
4. Smoke test:
   - thành viên sau 17:00 thấy lịch ngày mai, nút khóa
   - sáng nằm trên chiều
   - nhóm trưởng thấy bảng theo dõi sáng/chiều
   - Quản lý tài khoản có tìm kiếm/sort/phân trang và mặc định cũ → mới
   - Liên kết TKB có tìm/lọc/sort/phân trang
5. Không kết luận toàn hệ thống ổn nếu chưa smoke-test các mục trên production.

---

Ngày lập hồ sơ: 12/08/2026, khoảng 22:23–22:30 giờ Việt Nam.
