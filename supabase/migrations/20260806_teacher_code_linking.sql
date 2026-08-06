begin;

-- Mã giáo viên trong TKB có thể chứa dấu tiếng Việt, khoảng trắng, dấu chấm,
-- gạch ngang hoặc chữ số. Không ép về biểu thức chỉ có A-Z như bản cũ.
create or replace function public.set_profile_teacher_code(
  p_user_id uuid,
  p_teacher_code text
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_code text := upper(btrim(coalesce(p_teacher_code,'')));
begin
  if not public.is_owner() then
    raise exception 'Chỉ chủ sở hữu được liên kết mã giáo viên.';
  end if;

  if char_length(v_code) > 40 then
    raise exception 'Mã giáo viên tối đa 40 ký tự.';
  end if;

  if v_code <> '' and v_code ~ '[[:cntrl:]]' then
    raise exception 'Mã giáo viên chứa ký tự điều khiển không hợp lệ.';
  end if;

  update public.profiles
  set teacher_code = nullif(v_code,'')
  where id=p_user_id and role<>'owner';

  if not found then
    raise exception 'Không tìm thấy tài khoản giáo viên.';
  end if;
exception
  when unique_violation then
    raise exception 'Mã giáo viên này đã được liên kết với một tài khoản khác.';
end;
$$;

-- Tự khôi phục mã cho các tài khoản cũ đã được tạo từ danh sách TKB.
-- Khi tạo hàng loạt, mã đã được lưu trong ghi chú dạng: Tạo từ TKB • mã TÂM
with parsed as (
  select
    id,
    upper(btrim(split_part(notes,'• mã ',2))) as code
  from public.profiles
  where role<>'owner'
    and (teacher_code is null or btrim(teacher_code)='')
    and position('• mã ' in notes)>0
), unique_codes as (
  select code
  from parsed
  where code<>'' and char_length(code)<=40
  group by code
  having count(*)=1
)
update public.profiles p
set teacher_code=x.code
from parsed x
join unique_codes u on u.code=x.code
where p.id=x.id
  and not exists (
    select 1
    from public.profiles other
    where other.id<>p.id
      and upper(btrim(coalesce(other.teacher_code,'')))=x.code
  );

-- Chuẩn hóa chỉ mục để không trùng mã dù khác chữ hoa/thường hoặc dư khoảng trắng.
drop index if exists public.profiles_teacher_code_uidx;
create unique index profiles_teacher_code_uidx
  on public.profiles (upper(btrim(teacher_code)))
  where teacher_code is not null and btrim(teacher_code) <> '';

grant execute on function public.set_profile_teacher_code(uuid,text) to authenticated;

commit;
