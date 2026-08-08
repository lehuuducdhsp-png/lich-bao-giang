# SỔ CỨU HỘ & KHÔI PHỤC — LỊCH BÁO GIẢNG

Cập nhật: 08/08/2026 21:30 (UTC+7)

> Mục tiêu của tài liệu này: nếu website lỗi, bị sửa nhầm, mất giao diện, mất đăng nhập, mất kho TKB hoặc cần dựng lại từ đầu, có thể lần theo từng lớp để khôi phục. Không lưu mật khẩu, service-role key hoặc secret trong tài liệu/repository.

## 1. Điểm khôi phục vàng đã khóa

- Repository: `lehuuducdhsp-png/lich-bao-giang`
- Nhánh chạy chính: `main`
- URL chính thức: `https://lehuuducdhsp-png.github.io/lich-bao-giang/`
- Commit production ổn định dùng làm mốc: `f4df2ecc66424b539a0f8719a1ab0be52954b2fe`
- Nhánh backup đóng băng: `backup-production-20260808-2130`
- Không xóa nhánh backup này trừ khi đã có snapshot mới tốt hơn và đã kiểm tra.

### Khôi phục code nhanh nhất

Nếu một thay đổi mới làm web hỏng và cần quay lại ngay:

1. Vào GitHub repository.
2. Kiểm tra nhánh `backup-production-20260808-2130` còn nguyên.
3. So sánh `main` với nhánh backup.
4. Khôi phục `main` về commit `f4df2ecc66424b539a0f8719a1ab0be52954b2fe`, hoặc lấy toàn bộ file từ nhánh backup sang `main`.
5. Chờ GitHub Pages deploy lại, sau đó mở URL chính thức bằng cửa sổ ẩn danh và kiểm tra đăng nhập.

Không chỉnh Supabase nếu sự cố chỉ do giao diện/code frontend.

## 2. Kiến trúc production hiện tại

### Cổng production

- `index.html`: cổng chính thức. Cổng này tải lõi hệ thống, bỏ cấu hình kiểm thử cũ và nạp runtime production.
- `index-core.html`: bản lõi ứng dụng được giữ riêng trước khi promote production. Đây là lớp an toàn rất quan trọng; không xóa.
- `app-runtime-v1.js`: nạp các module giao diện, phân quyền và chức năng production theo thứ tự đã chốt.
- `production-mode-v1.js`: dọn các dấu hiệu “bản kiểm thử” và chuẩn hóa trình bày production.
- `group-auth-test.html`: đã nghỉ hưu; chỉ chuyển hướng về URL chính thức.

### Lõi đọc TKB / lập báo giảng

- `teacher-fix.js`: đọc danh sách giáo viên, loại mã giả như `OFF`, tải `analysis-fix.js`.
- `analysis-fix.js`: bộ đọc an toàn; mỗi ô mã giáo viên thực tế tương ứng một tiết; tải cấu hình năm học, Supabase/auth, đồng bộ cloud và các module thống kê lõi.
- `report-engine-v3.js`: lập/xuất báo giảng, bao gồm logic Chủ nhật động và các quy tắc xuất báo giảng hiện hành.
- `school-year-config.js`: cấu hình ngày bắt đầu Tuần 01 và ngày kết thúc năm học.
- `ga-editor.js`: phần giáo án.
- `multi-teacher-v5.js`: chức năng đa giáo viên liên quan báo giảng.
- `conflict-check-v5.js`: Mục 5 kiểm tra trùng tiết.
- `teacher-intelligence-v6.js`: dữ liệu/thống kê giáo viên.
- `weekly-stats-enhancement-v7.js`: bổ sung thống kê tuần.

### Bảng kê tháng

- `monthly-calendar-v3.js`: Mục 4 Bảng kê tiết dạy tháng đang dùng.
- `monthly-calendar-fix.js`: module cũ đã được vô hiệu hóa; không bật lại cùng lúc với V3.
- `monthly-teacher-search-v1.js`: combobox Giáo viên một ô, có tìm tên/mã bên trong.
- `section-order-fix-v1.js`: khóa thứ tự logic 4 → 5 → 6.

Quy tắc dữ liệu quan trọng của Bảng kê tháng:

- Tính theo tháng dương lịch thật, từ ngày 1 đến 28/29/30/31.
- Một ô mã giáo viên thực tế = một tiết.
- Một ô lớp ghi dạng `4/1 + 4/3` nhưng chỉ có một ô mã giáo viên = một tiết.
- Hai ô mã giáo viên tách biệt trong cùng khung giờ = hai tiết.
- `OFF` không phải giáo viên, không được tính tiết.
- Bảng kê cá nhân bị giới hạn theo phân quyền; không nới quyền chỉ vì người dùng có vai trò nhóm/chuyên môn.

### Giao diện production

Các module production đang được `app-runtime-v1.js` nạp gồm:

1. `light-orange-theme-v2.js`
2. `branding-runtime-v2.js`
3. `access-control-v1.js`
4. `self-access-guarantee-v1.js`
5. `teacher-select-refresh-v1.js`
6. `group-management-v1.js`
7. `teacher-code-linking-v2.js`
8. `global-specialist-v1.js`
9. `manager-permissions-v1.js`
10. `manager-cloud-bridge-v1.js`
11. `branding-settings-v1.js`
12. `branding-header-fix-v1.js`
13. `ui-redesign-v1.js`
14. `report-engine-v3.js`
15. `mobile-polish-v2.js`
16. `ui-nav-dedupe-fix-v1.js`
17. `dashboard-finish-v1.js`
18. `login-submit-hotfix-v1.js`
19. `monthly-calendar-v3.js`
20. `final-visual-fix-v1.js`
21. `section-order-fix-v1.js`
22. `typography-polish-v1.js`
23. `monthly-teacher-search-v1.js`
24. `production-mode-v1.js`

Nếu một module giao diện gây lỗi, ưu tiên vô hiệu hóa đúng module mới gây lỗi thay vì sửa hàng loạt các file khác.

## 3. Supabase — phần KHÔNG được xem là đã backup chỉ nhờ GitHub

GitHub giữ code và migration, nhưng không tự giữ bản sao hiện tại của dữ liệu Supabase.

### Thành phần cần bảo vệ riêng

- Auth users: tài khoản đăng nhập và thông tin xác thực.
- Bảng `public.profiles`: hồ sơ, vai trò, mã giáo viên, trạng thái, hạn dùng và quyền.
- Các bảng nhóm/quyền:
  - `teacher_groups`
  - `teacher_group_memberships`
  - `teacher_group_managers`
  - `teacher_group_scoped_access`
  - `teacher_group_transfer_log`
  - `user_notifications`
- `site_branding`: tên website, subtitle, logo/icon và thông số giao diện.
- `tkb_files`: metadata của TKB cloud.
- Storage bucket `tkb-private`: file TKB thực tế.
- Storage bucket `site-branding`: logo/icon đã tải lên.
- Edge Function quản trị tài khoản `admin-users`.
- RLS policies, database functions/RPC và trigger của Supabase.
- Mọi project secret/service-role key: phải giữ ở nơi riêng tư, KHÔNG commit vào GitHub.

### RPC / function mà frontend đang phụ thuộc

Danh sách tối thiểu cần kiểm tra khi phục hồi Supabase:

- `mark_login`
- `complete_password_change`
- `my_access_context`
- `is_owner`
- `can_view_teacher_group`
- `can_manage_teacher_group`
- `set_global_specialist_access`
- `set_manager_permissions`
- `has_manager_permission`
- `create_teacher_group`
- `rename_teacher_group`
- `set_profile_teacher_code`
- `set_group_manager`
- `set_payroll_detail_access`
- `reserve_tkb_upload`
- `finalize_tkb_upload`
- `set_active_shared_tkb`
- `set_active_personal_tkb`
- `save_site_branding`
- `reset_site_branding`

Nếu web mở nhưng một khu vực báo lỗi quyền/RPC, đừng sửa frontend trước; kiểm tra function/migration Supabase tương ứng.

## 4. Migration Supabase phải giữ nguyên

Các migration hiện được workflow kiểm tra trực tiếp:

1. `supabase/migrations/20260804_groups_permissions.sql`
2. `supabase/migrations/20260805_branding_settings.sql`
3. `supabase/migrations/20260806_teacher_code_linking.sql`
4. `supabase/migrations/20260806_global_head_specialist.sql`
5. `supabase/migrations/20260808_manager_permissions.sql`

Khi dựng một Supabase project mới, không nên chỉ chạy migration cuối cùng rồi cho rằng đã đủ. Cần có schema nền ban đầu (profiles, TKB cloud, auth helper/functions, Edge Function) rồi mới áp các migration theo thứ tự thời gian phù hợp.

Workflow `.github/workflows/validate-static.yml` là tài liệu kỹ thuật hữu ích để biết module/migration nào hiện đang được coi là quan trọng.

## 5. Dữ liệu nằm trên máy người dùng

Một số dữ liệu không nằm ở Supabase:

### IndexedDB

Ứng dụng lưu các phiên bản TKB đã mở/tải về trong IndexedDB `lichBaoGiangDB`, object store `versions`.

Nếu người dùng xóa dữ liệu website, đổi trình duyệt hoặc đổi máy, phần này có thể mất. File TKB đã có trong `tkb-private` vẫn có thể mở/tải lại nếu cloud còn nguyên.

### localStorage

Có các khóa trạng thái như:

- TKB đang dùng (`lbgActive`)
- năm học (`lbgYear`)
- cấu hình năm học
- trạng thái TKB chung đã thấy
- điều chỉnh thủ công của Bảng kê tháng

Đặc biệt: điều chỉnh thủ công của Bảng kê tháng hiện là dữ liệu cục bộ theo trình duyệt. Đây KHÔNG phải dữ liệu cloud bảo đảm. Nếu là dữ liệu chính thức, nên xuất Excel/lưu hồ sơ định kỳ và sau này cân nhắc đồng bộ cloud.

## 6. Quy trình phục hồi theo loại sự cố

### A. Web trắng trang / giao diện vỡ sau khi sửa code

1. Không đụng Supabase.
2. Kiểm tra commit gần nhất.
3. Quay `main` về nhánh `backup-production-20260808-2130` hoặc commit vàng.
4. Đợi Pages cập nhật.
5. Kiểm tra: đăng nhập → mở TKB → lập báo giảng → Bảng kê tháng → Mục 5 → Mục 6 → xuất Excel.

### B. Link chính trả 404 hoặc GitHub Pages không deploy

1. Kiểm tra repository còn public/Pages còn bật.
2. Kiểm tra Pages đang deploy từ đúng branch `main` và đúng thư mục root.
3. Kiểm tra `index.html` còn tồn tại ở root.
4. Khôi phục `index.html` từ nhánh backup nếu cần.

### C. Web mở nhưng không đăng nhập được

1. Kiểm tra Supabase project còn hoạt động.
2. Kiểm tra `supabase-config.js` vẫn trỏ đúng project; không đổi secret/key tùy tiện.
3. Kiểm tra Auth users và `profiles` cùng tồn tại.
4. Kiểm tra Edge Function `admin-users` nếu chỉ phần quản trị tài khoản hỏng.
5. Kiểm tra `mark_login`, `complete_password_change` và RLS/profile policies.

### D. Đăng nhập được nhưng không thấy đúng giáo viên/quyền

1. Kiểm tra `profiles.teacher_code`.
2. Kiểm tra memberships/managers của nhóm.
3. Chạy/đối chiếu các migration nhóm + teacher code + specialist + manager.
4. Kiểm tra RPC `my_access_context`.
5. Không bỏ `access-control-v1.js` để “chữa nhanh”, vì đó là lớp bảo vệ riêng tư.

### E. Kho TKB cloud trống/mất file

1. Kiểm tra bảng `tkb_files`.
2. Kiểm tra bucket `tkb-private` và object tương ứng `storage_path`.
3. Nếu metadata còn nhưng object mất: phục hồi object từ bản backup Storage.
4. Nếu object còn nhưng metadata mất: phục hồi database backup; không tự tạo metadata bằng tay nếu chưa nắm schema.

### F. Mất logo/giao diện thương hiệu

1. Khôi phục hàng `site_branding`.
2. Khôi phục bucket `site-branding`.
3. Kiểm tra `branding-runtime-v2.js` và `branding-settings-v1.js`.

### G. Bảng kê tháng sai sau một bản cập nhật

1. Không sửa dữ liệu nguồn trước.
2. So sánh `monthly-calendar-v3.js` với snapshot vàng.
3. Giữ nguyên quy tắc 1 ô mã = 1 tiết và `OFF` = không tính.
4. Kiểm tra `teacher-fix.js` / `analysis-fix.js` trước khi kết luận dữ liệu tháng sai.
5. Nếu cần khôi phục gấp, quay module tháng + các module phụ (`section-order-fix`, `monthly-teacher-search`) về snapshot vàng.

## 7. Checklist sau khi phục hồi

Sau mỗi lần restore phải kiểm tra tối thiểu:

- [ ] Trang chính mở bình thường.
- [ ] Login owner thành công.
- [ ] Login một giáo viên thường thành công.
- [ ] Quyền giáo viên thường không nhìn thấy dữ liệu người khác ngoài phạm vi.
- [ ] Chủ sở hữu nhìn thấy phần quản trị cần thiết.
- [ ] Mở được một TKB chung từ cloud.
- [ ] Danh sách giáo viên không chứa `OFF`.
- [ ] Lập báo giảng một tuần không Chủ nhật đúng.
- [ ] Lập báo giảng một tuần có Chủ nhật đúng.
- [ ] Xuất Excel báo giảng thành công.
- [ ] Mục 4 tổng hợp tháng đúng và combobox giáo viên dùng được.
- [ ] Mục 5 kiểm tra trùng tiết chạy.
- [ ] Mục 6 thống kê đúng phạm vi.
- [ ] Mobile không vỡ bố cục.
- [ ] Branding/logo hiển thị đúng.

## 8. Chính sách backup nên duy trì

### Sau mỗi thay đổi lớn

- Tạo một branch dạng `backup-before-...` hoặc `backup-production-YYYYMMDD-HHMM` trước khi sửa.
- Sau khi kiểm thử xong, ghi commit production ổn định mới vào tài liệu này.
- Không dùng cùng một nhánh backup rồi ghi đè liên tục; giữ được nhiều mốc quan trọng sẽ an toàn hơn.

### Hàng tuần hoặc trước đợt sử dụng lớn

Ngoài GitHub, tạo backup Supabase theo khả năng của gói đang dùng:

- Database backup/dump.
- Auth users theo phương thức backup chính thức phù hợp.
- Storage `tkb-private`.
- Storage `site-branding`.
- Edge Functions + secrets/config được ghi lại ở nơi quản trị an toàn.

Không lưu service-role key, mật khẩu tài khoản hoặc secret vào file công khai trong repo.

### Offline

Thỉnh thoảng vào GitHub ở nhánh backup production và dùng **Code → Download ZIP**, sau đó cất ZIP ở ít nhất hai nơi (ví dụ máy cá nhân + Drive/ổ cứng). Đây là lớp bảo vệ nếu tài khoản/repo gặp sự cố.

## 9. Những thứ GitHub KHÔNG thể cứu nếu không backup riêng

- Mật khẩu hiện tại của người dùng.
- Database rows bị xóa vĩnh viễn mà không còn Supabase backup.
- File trong Storage bị xóa mà không có bản sao.
- Service-role secret/Edge Function secrets bị mất mà không có nơi lưu riêng.
- Điều chỉnh Bảng kê tháng chỉ nằm trong localStorage trên một máy đã bị xóa.

## 10. Mốc ưu tiên khi cần cứu hệ thống cực nhanh

Nếu chỉ có 10 phút:

1. Khôi phục code từ `backup-production-20260808-2130`.
2. Xác nhận Supabase project URL/config đúng.
3. Đăng nhập owner.
4. Kiểm tra `profiles` + `my_access_context`.
5. Mở một TKB trong `tkb-private`.
6. Chạy một báo giảng và một Bảng kê tháng.

Nếu 6 bước này đều qua, phần lớn hệ thống cốt lõi đã hoạt động trở lại.

---

## Ghi chú cho lần nâng cấp sau

Khi có một bản production mới ổn định hơn bản ngày 08/08/2026:

- Tạo snapshot branch mới trước khi thay đổi.
- Cập nhật commit vàng trong tài liệu.
- Không xóa snapshot `backup-production-20260808-2130` ngay; giữ ít nhất một thời gian làm mốc lịch sử.
- Nếu Bảng kê tháng trở thành dữ liệu chính thức lâu dài, ưu tiên chuyển điều chỉnh thủ công từ localStorage sang cloud có lịch sử/audit.
