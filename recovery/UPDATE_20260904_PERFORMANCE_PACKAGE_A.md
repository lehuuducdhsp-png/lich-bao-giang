# UPDATE 2026-09-04 — PERFORMANCE PACKAGE A

## Mục tiêu
Giảm lag/đơ và request thừa ở frontend mà không thay đổi dữ liệu, DB, Edge Functions, Google Sheets hay lịch sử Check-in.

## PR / merge
- Feature branch: `feature/performance-package-a-20260904`
- PR: #20 — `Gói A: giảm lag và request thừa`
- Head đã test: `f55c47b130fb1380dbe99a6fdf9ef4f20f39a365`
- Merge commit: `680f4fa75f16ed59fb71c3a0a6e5918994356be5`
- Rollback branch trước merge: `rollback/pre-performance-package-a-merge-20260904-0124`
- Main trước merge: `937c4a49d2115d169a88ea8525b2d7d9c7b73dd9`

## Thay đổi
1. `app-runtime-v1.js`
   - Chờ Auth/profile thật sự sẵn sàng trước khi tải các module nặng.
   - Giữ `login-submit-hotfix-v1.js` và `password-change-hotfix-v1.js` tải sớm để bảo toàn luồng đăng nhập/đổi mật khẩu lần đầu.
   - Reload sạch sau logout để module cũ không tiếp tục gọi Supabase dưới trạng thái anonymous.
2. `schedule-ack-history-sort-v1.js`
   - Bỏ polling 350 ms, chuyển sang MutationObserver/requestAnimationFrame có kiểm soát.
3. `schedule-ack-history-ux-fix-v1.js`
   - Bỏ polling 250 ms; cập nhật theo sự kiện và thay đổi DOM.
4. `checkin-manager-review-ux-v2.js`
   - Bỏ polling 1200 ms; chỉ refresh khi UI sẵn sàng, thay đổi ngày/nhóm, bấm Làm mới, focus hoặc access-ready.
5. `checkin-monitor-compact-ux-v1.js`
   - Ngắt MutationObserver trước khi tự sửa DOM rồi mới observe lại, tránh feedback-loop.

## Kiểm thử trước merge
Đã test localhost hai lượt trên `http://localhost:8765/`:
- Đăng nhập bình thường.
- Menu phản hồi bình thường.
- Check-in phản hồi bình thường.
- Mở `Lưu vào Google Sheets` rồi `Hủy` bình thường.
- Đăng xuất rồi đăng nhập lại bình thường.

## Deploy
GitHub Pages run `33790307657` cho merge commit `680f4fa75f16ed59fb71c3a0a6e5918994356be5` đã `completed / success`.

## Rollback
Nếu production phát sinh lỗi do Gói A, dùng branch:
`rollback/pre-performance-package-a-merge-20260904-0124`

Branch này trỏ đúng trạng thái main trước Gói A: `937c4a49d2115d169a88ea8525b2d7d9c7b73dd9`.
