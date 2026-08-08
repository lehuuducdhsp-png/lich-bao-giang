# CHECKLIST CẤU HÌNH & SECRETS SUPABASE

Tài liệu này dùng để ghi nhận những phần không nên coi là đã được bảo vệ chỉ nhờ database dump.

## A. Thông tin project không nhạy cảm

- [ ] Project ref đã xác nhận: `gmkibmybqfomypytmjxw`
- [ ] Region được ghi lại.
- [ ] Postgres version được ghi lại.
- [ ] Gói/plan hiện tại được ghi lại.
- [ ] Pages/frontend đang trỏ đúng Supabase project.

Không ghi Database password, personal access token hoặc secret/service-role key vào file này.

## B. Auth

Trong Supabase Dashboard, kiểm tra và tự ghi lại ở một nơi riêng tư nếu có thay đổi so với mặc định:

- [ ] Password/email sign-in đang bật/tắt đúng.
- [ ] Site URL.
- [ ] Redirect URLs.
- [ ] Email templates nếu có tùy chỉnh.
- [ ] SMTP riêng nếu có.
- [ ] CAPTCHA nếu có.
- [ ] Rate limit/Auth settings đặc biệt nếu có.
- [ ] OAuth provider nếu có (Google/GitHub/...); client secret phải cất riêng.
- [ ] JWT/signing configuration được ghi nhận ở mức cần thiết cho kế hoạch phục hồi.

## C. Database

- [ ] `roles.sql` có trong backup.
- [ ] `schema.sql` có trong backup.
- [ ] `data.sql` có trong backup.
- [ ] `auth-data.sql` có trong backup.
- [ ] migration history có trong backup hoặc migration repo đầy đủ.
- [ ] Các extension đặc biệt được ghi lại.
- [ ] Database Webhooks nếu có được ghi lại.
- [ ] Realtime publications nếu có được ghi lại.

## D. Storage

- [ ] Bucket `tkb-private` đã được tải hết file.
- [ ] Bucket `site-branding` đã được tải hết file.
- [ ] Bucket public/private state được ghi lại.
- [ ] File-size limit của từng bucket được ghi lại.
- [ ] Allowed MIME types được ghi lại.
- [ ] RLS policies của Storage có trong migration/schema backup.

Lưu ý: database backup chỉ lưu metadata; file object thật phải được sao lưu riêng.

## E. Edge Functions

- [ ] Danh sách Edge Functions đã được lưu.
- [ ] `admin-users` source đã được tải về.
- [ ] `deno.json` / import map nếu function dùng đã được giữ riêng.
- [ ] JWT verification mode của function được ghi lại.
- [ ] Function deploy region/config đặc biệt nếu có được ghi lại.

## F. Secrets

`supabase secrets list` chỉ được dùng để kiểm tra TÊN/digest. Không xem đây là bản sao giá trị secret.

- [ ] Danh sách tên secrets đã lưu vào `metadata/secrets-list.txt`.
- [ ] Mỗi custom secret có một bản giá trị thật trong password manager/kho bí mật riêng.
- [ ] Không có custom secret value nào nằm trong GitHub public.
- [ ] Không có service-role/secret key trong frontend.
- [ ] Không có Database password trong repository.
- [ ] Không có Supabase Personal Access Token trong repository.

### Secret mặc định

Các biến Supabase mặc định do project cấp cho Edge Functions được quản lý theo project. Khi dựng project mới, dùng giá trị của project mới trừ khi tài liệu phục hồi chính thức yêu cầu khác.

### Custom secret

Nếu `admin-users` hoặc function khác dùng custom secret, hãy ghi CHỈ TÊN secret ở đây; giá trị thật cất trong password manager.

Tên custom secret 1: ______________________________

Tên custom secret 2: ______________________________

Tên custom secret 3: ______________________________

## G. Kiểm tra sau mỗi lần backup

- [ ] `BACKUP_STATUS.txt` không có lỗi critical.
- [ ] `SHA256SUMS.txt` đã tạo.
- [ ] Backup đã copy sang nơi riêng tư thứ hai.
- [ ] Không có file backup nào bị Git theo dõi.
- [ ] Không có secret bị commit.
- [ ] Ngày backup được ghi lại.

Ngày backup gần nhất: ____ / ____ / ______
Người thực hiện: ______________________________
