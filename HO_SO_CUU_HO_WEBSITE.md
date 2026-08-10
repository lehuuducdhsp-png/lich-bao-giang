# HỒ SƠ CỨU HỘ WEBSITE

> **Mục đích:** Đây là hồ sơ trạng thái và phục hồi của website Lịch Báo giảng. Nếu lịch sử ChatGPT bị mất, đổi máy, quên đã làm tới đâu hoặc website gặp sự cố, hãy mở file này trước tiên.
>
> **Ngày chốt hồ sơ:** 10/08/2026, 18:38 (UTC+7)
>
> **Nguyên tắc an toàn:** Không lưu mật khẩu, service-role key, secret key hoặc giá trị secret trong file này.

---

## 0. TÓM TẮT CỨU HỘ NHANH

### Website chính

- Repository: `lehuuducdhsp-png/lich-bao-giang`
- Nhánh production: `main`
- URL chính: `https://lehuuducdhsp-png.github.io/lich-bao-giang/`
- Commit production tại thời điểm lập hồ sơ: `d9453fc4fcd5bab3f05bc34d376e9ac10f75c1d2`
- Nội dung commit: Check-in admin polish, lọc theo nhóm, lịch sử mới nhất lên trước, xóa nhóm an toàn.

### Supabase production

- Project: `lich-bao-giang`
- Project ref: `gmkibmybqfomypytmjxw`
- Region đã dùng: Singapore
- Check-in backend: đã cài đủ migration tới `20260810053400_checkin_group_filter_and_group_archive.sql`
- Trạng thái Check-in tại thời điểm lập hồ sơ: **PILOT**, chưa mở đại trà cho toàn bộ giáo viên.

### Nếu có sự cố lớn

1. **Không reset remote database.**
2. **Không xóa project Supabase.**
3. **Không force-push `main` nếu chưa hiểu rõ hậu quả.**
4. Kiểm tra các nhánh rollback ở mục 3.
5. Kiểm tra backup Supabase ở mục 4.
6. Nếu chỉ lỗi frontend, ưu tiên phục hồi code trước; không đụng database nếu không cần.

---

## 1. TRẠNG THÁI WEBSITE HIỆN TẠI

### Production đã có

- Đăng nhập theo tài khoản Supabase.
- Bắt buộc đổi mật khẩu ở lần đăng nhập đầu tiên.
- Hotfix đổi mật khẩu lần đầu đã được kiểm thử thực tế: đổi được mật khẩu và đăng nhập lại được.
- Kho TKB chung / TKB cá nhân.
- TKB cá nhân chỉ phục vụ nhu cầu xem riêng của giáo viên.
- **Check-in chỉ lấy TKB CHUNG đang áp dụng** làm nguồn lịch chính thức.
- Quản lý nhóm, nhóm trưởng, thành viên, mã giáo viên TKB.
- Thông báo hệ thống.
- Check-in GPS theo điểm dạy.
- Review Check-in theo phạm vi vai trò.
- Lọc review Check-in theo nhóm.
- Xóa nhóm theo kiểu archive/soft-delete, không xóa lịch sử Check-in cũ.

### Hai PR triển khai Check-in quan trọng

1. PR #1: `Deploy Check-in V2 and first-login password fix`
   - Merge commit: `2cb016f3003445f1528bc4ee0d474b4c5dd3ba91`

2. PR #2: `Polish Check-in admin filters and safe group deletion`
   - Merge commit hiện tại: `d9453fc4fcd5bab3f05bc34d376e9ac10f75c1d2`

---

## 2. CÁC QUY TẮC CHECK-IN ĐÃ CHỐT

### Đối tượng

- Giáo viên thường: được Check-in nếu tài khoản hợp lệ, có mã GV và có quyền theo phase hiện tại.
- Nhóm trưởng: **không cần Check-in**.
- Chủ sở hữu: **không cần Check-in**.
- Quản lý không phải Nhóm trưởng có thể Check-in nếu trực tiếp đi dạy và thỏa điều kiện.

### Điểm dạy

Một điểm dạy được phân biệt theo:

- giáo viên;
- ngày;
- buổi (`Sáng`, `Chiều`, `Khác`);
- tên trường;
- phase dữ liệu (`pilot` / `production`).

Ví dụ:

- Sáng – Trường A: 3 lượt riêng.
- Sáng – Trường B: 3 lượt riêng.
- Chiều – Trường A: là điểm khác, 3 lượt riêng.

### Hạn mức

- Mỗi điểm dạy bắt đầu với **3 lượt**.
- Chỉ GPS lấy được + giáo viên xác nhận + server ghi thành công mới tiêu hao 1 lượt.
- GPS lỗi, mất mạng, RPC lỗi: không trừ lượt.
- Khi hết lượt, **không tự động gửi thông báo**.
- Giáo viên phải chủ động bấm **Yêu cầu Nhóm trưởng cấp thêm 3 lượt**.
- Một yêu cầu đang chờ không được spam lặp lại.
- Nhóm trưởng có thể cấp thêm đúng **+3 lượt** khi đủ điều kiện.

### GPS

- Không theo dõi vị trí nền.
- Không lưu hành trình.
- Không Check-out.
- Chỉ lưu vị trí tại thời điểm giáo viên chủ động Check-in.
- Lưu latitude, longitude, accuracy, chất lượng GPS.
- Chất lượng GPS:
  - tốt: `<= 50 m`
  - trung bình: `> 50 m` và `<= 200 m`
  - thấp: `> 200 m`
- Không tự kết luận giáo viên đúng hay sai trường.

### Ngày giờ

- Ngày Check-in theo `Asia/Ho_Chi_Minh`.
- Server chỉ cho Check-in ngày hiện tại.
- Thời gian chính thức lấy từ server/Supabase.
- Giao diện hiển thị **Thứ + ngày + buổi** để tránh nhầm lịch.
- Lịch sử Check-in hiển thị **mới nhất ở trên cùng**.

---

## 3. NHÁNH ROLLBACK / BACKUP GITHUB

### Rollback Check-in quan trọng

- `rollback/pre-checkin-20260810-1057`
  - Trạng thái trước khi bắt đầu tích hợp Check-in.

- `rollback/pre-main-checkin-20260810-1423`
  - Snapshot trước giai đoạn chuẩn bị đưa Check-in vào main.

- `rollback/pre-main-checkin-final-20260810-1802`
  - Snapshot ngay trước đợt merge Check-in V2 hoàn thiện.

- `rollback/pre-admin-polish-20260810-1825`
  - Snapshot ngay trước khi thêm lọc Check-in theo nhóm và Xóa nhóm an toàn.

### Backup production cũ

- `backup-production-20260808-2130`
- Golden commit đã ghi nhận trước đây: `f4df2ecc66424b539a0f8719a1ab0be52954b2fe`

### Backup tài liệu mới tạo trước hồ sơ này

Có các nhánh snapshot tài liệu được tạo ngày 10/08/2026 trước khi thêm hồ sơ cứu hộ. Các nhánh này không thay đổi runtime production.

---

## 4. BACKUP SUPABASE ĐÃ CÓ

### Backup chính ngày 10/08/2026

Đường dẫn local đã ghi nhận:

```text
C:\Users\cuduc\Downloads\BẢO HỘ WEB CHÍN CHU\lich-bao-giang-main\lich-bao-giang-main\recovery\supabase-backup\output\20260810-113006
```

### Thành phần đã backup

- `roles.sql`
- `schema.sql`
- `data.sql`
- `auth-data.sql`
- `auth-schema.sql`
- `storage-metadata.sql`
- metadata Edge Functions
- metadata secrets (chỉ tên/metadata, **không có giá trị secret**)
- danh sách project
- `MANUAL_COMPLETION.txt`
- `SHA256SUMS.txt`

### Storage đã tải thủ công

- Bucket `tkb-private`
- Bucket `site-branding`

Đã ghi nhận có:

- 1 file TKB trong `tkb-private`
- 2 file PNG branding trong `site-branding`

### Edge Functions đã tải

- `admin-users`
- `google-sheets-owner`

Đã kiểm tra có `index.ts`.

### Kiểm tra toàn vẹn

Đã chạy kiểm tra hash và ghi nhận:

```text
BACKUP HASH CHECK: PASS
```

### Lưu ý

Backup Supabase chứa dữ liệu riêng tư/Auth. **Không commit thư mục backup này lên repository public.**

---

## 5. LỊCH SỬ MIGRATION SUPABASE HIỆN TẠI

Các migration production đã đồng bộ:

```text
20260810051504_remote_schema.sql
20260810053000_checkin_v1.sql
20260810053100_checkin_v1_pilot_safety.sql
20260810053200_checkin_v1_pilot_scope_hardening.sql
20260810053300_checkin_v2_quota_requests.sql
20260810053400_checkin_group_filter_and_group_archive.sql
```

Đã nhiều lần kiểm tra bằng:

```powershell
supabase db push --dry-run --linked
```

Sau khi apply migration, kết quả đã xác nhận:

```text
Remote database is up to date.
```

### Không làm

Không dùng trên production:

```text
supabase db reset --linked
```

hoặc bất kỳ lệnh destructive/reset remote nào nếu chưa có kế hoạch phục hồi đầy đủ.

---

## 6. TKB VÀ CHECK-IN

### Nguồn lịch chính thức

Check-in phải đọc:

> **TKB CHUNG đang áp dụng do Hành chính/Chủ sở hữu chọn.**

Không đọc TKB cá nhân của giáo viên làm nguồn Check-in.

### TKB cá nhân

- Chỉ phục vụ giáo viên mở xem/kiểm tra riêng.
- Không được thay đổi trường/buổi/tiết mà Check-in tự gợi ý.

### File 2026–2027 hiện đang dùng kiểm thử

Đã có một file TKB 2026–2027 dùng để thử logic.

- Đây là **TKB thử**, chưa được hiểu là dữ liệu ổn định lâu dài.
- Sau này có thể đổi tên trường, bớt trường hoặc thêm trường.
- Code Check-in không hard-code tên trường; nó đọc lại TKB chung đang áp dụng.
- Cấu trúc nên giữ tương đối ổn định: trường ở vùng trường hiện hành, mã GV nằm trong lưới tiết, sheet tuần theo kiểu ngày như `10T8`, `17T8`.

### Trường hợp ngoài TKB

Giáo viên luôn có phương án:

> `+ Điểm dạy khác / Tự nhập`

Dùng cho:

- dạy thay;
- điều động;
- TKB chưa cập nhật;
- trường hợp khác.

---

## 7. PHÂN QUYỀN NHÓM VÀ CHECK-IN

### Chủ sở hữu

- Quản lý toàn bộ nhóm.
- Quản lý quyền Check-in Pilot.
- Xem Check-in toàn hệ thống theo quyền.
- Có bộ lọc Nhóm để tránh danh sách quá dài.
- Có thể Xóa nhóm an toàn.

### Hành chính / Quản lý

- Phạm vi xem tùy quyền được cấp.
- Khi Check-in production chính thức, quyền review vẫn phải tuân theo vai trò/phạm vi đã thiết kế.

### Nhóm trưởng

- Không Check-in.
- Xem thành viên đúng nhóm mình.
- Nhận thông báo yêu cầu cấp thêm lượt khi giáo viên chủ động gửi.
- Không được xem nhóm khác chỉ vì được bật Pilot.

### Giáo viên

- Chỉ Check-in cho mình.
- Xem lịch sử của mình.
- Không sửa/xóa Check-in đã gửi.
- Không tự cấp thêm quota.

### Cấu hình Pilot đã dùng để test

Tại thời điểm kiểm thử:

- `Hoài Thanh / gv015 / THANH`: bật quyền **Check-in**.
- `Diệu Tâm / gv010 / TÂM`: Nhóm trưởng, bật quyền **Kiểm tra/Review**.

Đây chỉ là cấu hình thử tại thời điểm snapshot; có thể thay đổi sau này.

---

## 8. XÓA NHÓM AN TOÀN

Nút `Xóa nhóm` không xóa vật lý toàn bộ lịch sử.

Khi Chủ sở hữu xóa nhóm:

- `teacher_groups.is_active = false`;
- thành viên hiện tại được kết thúc membership;
- quyền Nhóm trưởng riêng của nhóm được gỡ;
- scoped-access riêng của nhóm được gỡ;
- trạng thái `is_group_leader` của tài khoản được tính lại theo các nhóm còn hoạt động;
- lịch sử Check-in cũ vẫn giữ;
- lịch sử dữ liệu không bị xóa dây chuyền.

RPC liên quan:

```text
archive_teacher_group(uuid)
```

---

## 9. ĐỔI MẬT KHẨU LẦN ĐẦU

### Vấn đề từng gặp

Tài khoản mới đăng nhập bằng mật khẩu tạm bị kẹt ở màn hình:

> `Bạn phải đổi mật khẩu tạm trước khi tiếp tục.`

### Bản sửa hiện tại

Đã bổ sung:

- `auth-core-v2.js`
- `password-change-hotfix-v1.js`
- loader mới trong chuỗi runtime/teacher-fix

### Bài test đã đạt

- tài khoản bị bắt đổi mật khẩu;
- nhập mật khẩu mới;
- đổi thành công;
- vào hệ thống;
- đăng xuất;
- đăng nhập lại bằng mật khẩu mới thành công.

Nếu lỗi này xuất hiện lại, ưu tiên kiểm tra cache JS và các file hotfix trước khi đụng Auth database.

---

## 10. FRONTEND CHECK-IN QUAN TRỌNG

Các file chính:

```text
checkin-v2.js
checkin-shared-scan-context-v1.js
checkin-date-label-v1.js
checkin-history-order-v1.js
checkin-admin-polish-v1.js
group-delete-v1.js
checkin-pilot.html
app-runtime-v1.js
index.html
```

### Vai trò chính

- `checkin-v2.js`: UI và logic Check-in.
- `checkin-shared-scan-context-v1.js`: đảm bảo đọc TKB chung theo đúng bối cảnh năm học.
- `checkin-date-label-v1.js`: hiển thị Thứ + ngày đối chiếu TKB.
- `checkin-history-order-v1.js`: lịch sử giáo viên mới nhất lên trước.
- `checkin-admin-polish-v1.js`: lọc nhóm review, sửa wording PILOT, lịch sử reviewer mới nhất lên trước.
- `group-delete-v1.js`: nút Xóa nhóm an toàn.

---

## 11. TRẠNG THÁI PILOT / PRODUCTION

Tại thời điểm lập hồ sơ:

```text
checkin_system_settings.enabled = true
phase = pilot
```

Ý nghĩa:

- frontend Check-in đã có trên link chính;
- backend vẫn giới hạn người dùng theo Pilot;
- chưa mở Check-in đại trà cho toàn bộ giáo viên;
- dữ liệu Pilot và Production có `record_phase` để phân biệt.

### Trước khi chuyển production chính thức

Phải smoke-test trên link chính:

1. Đăng nhập bình thường.
2. Đổi mật khẩu lần đầu.
3. Giáo viên Pilot thấy đúng trường theo TKB chung.
4. Tự nhập điểm dạy khác hoạt động.
5. GPS + Check-in hoạt động.
6. Hết lượt → giáo viên chủ động gửi yêu cầu.
7. Nhóm trưởng nhận thông báo.
8. Nhóm trưởng chỉ thấy đúng phạm vi.
9. Chủ sở hữu/Hành chính lọc được Nhóm 1/2/3/Tất cả.
10. Lịch sử mới nhất ở trên.
11. Xóa nhóm có xác nhận và không xóa dữ liệu Check-in cũ.

---

## 12. CÁCH PHỤC HỒI FRONTEND AN TOÀN

### Trường hợp website chính lỗi do code mới

**Ưu tiên phục hồi bằng một commit mới**, không force-push nếu không cần.

Ví dụ muốn đưa toàn bộ file về snapshot trước admin polish:

```powershell
git switch main
git pull --ff-only origin main
git restore --source origin/rollback/pre-admin-polish-20260810-1825 -- .
git status
git add -A
git commit -m "recovery: restore production before admin polish"
git push origin main
```

Cách này giữ lịch sử Git rõ ràng.

### Muốn quay về trước toàn bộ Check-in

Dùng snapshot:

```text
rollback/pre-checkin-20260810-1057
```

Nhưng cần nhớ: frontend rollback **không tự xóa database Check-in**. Có thể để backend Check-in tồn tại mà frontend không dùng; đây thường an toàn hơn xóa DB ngay.

---

## 13. PHỤC HỒI BACKEND CHECK-IN

Có file:

```text
supabase/rollback/20260810_checkin_v1_rollback.sql
```

**Chỉ dùng sau khi đã backup database ngay trước rollback.**

Lưu ý: file rollback V1 có trước migration admin polish `20260810053400`. Nếu cần xóa hoàn toàn phần admin polish, cần xử lý thêm các function mới của migration đó, ví dụ:

```sql
drop function if exists public.checkin_review_groups();
drop function if exists public.archive_teacher_group(uuid);
```

Không thực hiện các câu lệnh này chỉ để “thử”. Chỉ dùng khi có quyết định rollback backend thật sự.

---

## 14. KIỂM TRA SAU MỖI LẦN CẬP NHẬT

### Git

```powershell
git status
git log -1 --oneline
git branch --show-current
```

### Supabase

```powershell
supabase db push --dry-run --linked
```

Khi không có migration chờ:

```text
Remote database is up to date.
```

### Browser

Sau deploy GitHub Pages:

```text
Ctrl + Shift + R
```

Nếu nghi cache mạnh, kiểm tra ở cửa sổ Ẩn danh.

---

## 15. NHỮNG THỨ KHÔNG ĐƯỢC LƯU VÀO GITHUB PUBLIC

Không commit:

- database password;
- service-role key;
- secret key;
- giá trị Edge Function secrets;
- backup Auth data;
- file backup private Storage;
- thông tin đăng nhập thật;
- file `.env` chứa secret.

`.gitignore` hiện có mục bảo vệ config staging local và `supabase/.temp/`.

---

## 16. NẾU MẤT TOÀN BỘ LỊCH SỬ CHATGPT

Không cần nhớ toàn bộ cuộc trò chuyện.

Hãy làm theo thứ tự:

1. Mở `HO_SO_CUU_HO_WEBSITE.md`.
2. Xác nhận URL/repository/main commit.
3. Xem mục 3 để biết các snapshot rollback.
4. Xem mục 4 để tìm backup Supabase local.
5. Xem mục 5 để biết database đang ở migration nào.
6. Xem mục 11 để biết Check-in đang Pilot hay Production.
7. Chỉ sau khi hiểu trạng thái mới tiếp tục sửa/deploy.

**File này được xem là “điểm nối lại công việc” nếu chat bị mất.**

---

## 17. CÁCH CẬP NHẬT HỒ SƠ SAU NÀY

Mỗi khi có một thay đổi lớn, cập nhật ít nhất:

- ngày cập nhật;
- commit `main` mới;
- migration Supabase mới;
- phase Check-in;
- backup mới nhất;
- rollback branch mới nhất;
- thay đổi nghiệp vụ quan trọng;
- việc còn đang làm dở.

Khuyến nghị không xóa lịch sử cũ trong file; chỉ ghi thêm phần `NHẬT KÝ CẬP NHẬT` bên dưới.

---

## 18. NHẬT KÝ CẬP NHẬT

### 10/08/2026 — Check-in V2 + Admin polish

- Hoàn thiện Check-in V2.
- Sửa đổi mật khẩu lần đầu.
- Check-in đọc TKB chung đang áp dụng.
- Giữ tự nhập tên trường.
- Thêm yêu cầu cấp +3 lượt có thông báo Nhóm trưởng.
- Thêm thứ/ngày đối chiếu.
- Lịch sử mới nhất lên đầu.
- Thêm lọc Check-in theo nhóm.
- Đổi wording `Nhóm thử nghiệm Check-in` thành quản lý quyền rõ ràng hơn.
- Thêm Xóa nhóm an toàn.
- Backend vẫn ở `PILOT` tại thời điểm lập hồ sơ.

---

# KẾT LUẬN

Tại thời điểm 10/08/2026, website đã có:

- Git history;
- nhiều snapshot rollback;
- backup Supabase local đã kiểm tra hash;
- migration history đồng bộ;
- Check-in chạy trên link chính nhưng backend vẫn Pilot;
- hồ sơ cứu hộ này để nối lại công việc ngay cả khi mất lịch sử chat.

**Không coi ChatGPT chat là bản backup duy nhất. GitHub + Supabase backup + file hồ sơ này mới là nền tảng phục hồi chính.**
