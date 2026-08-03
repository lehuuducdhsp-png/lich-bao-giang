begin;

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  display_name text not null default '',
  role text not null default 'user' check (role in ('owner','uploader','user')),
  can_upload_shared boolean not null default false,
  is_active boolean not null default true,
  expires_at timestamptz,
  must_change_password boolean not null default true,
  notes text not null default '',
  created_by uuid references auth.users(id),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9._-]{3,32}$')
);
create unique index if not exists profiles_username_lower_uidx on public.profiles (lower(username));

create table if not exists public.tkb_files (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('shared','personal')),
  owner_id uuid references auth.users(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  original_name text not null,
  storage_path text not null unique,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 52428800),
  mime_type text not null default 'application/octet-stream',
  status text not null default 'uploading' check (status in ('uploading','ready','failed')),
  is_active boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tkb_scope_owner_check check (
    (scope = 'personal' and owner_id is not null) or
    (scope = 'shared' and owner_id is null)
  )
);
create index if not exists tkb_files_owner_idx on public.tkb_files(owner_id, created_at desc);
create index if not exists tkb_files_scope_idx on public.tkb_files(scope, created_at desc);
create unique index if not exists one_active_personal_tkb on public.tkb_files(owner_id)
  where scope='personal' and is_active and status='ready';
create unique index if not exists one_active_shared_tkb on public.tkb_files((scope))
  where scope='shared' and is_active and status='ready';

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferred_scope text not null default 'shared' check (preferred_scope in ('shared','personal')),
  last_seen_shared_file_id uuid references public.tkb_files(id) on delete set null,
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists tkb_files_touch_updated_at on public.tkb_files;
create trigger tkb_files_touch_updated_at before update on public.tkb_files
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  v_username text;
  v_name text;
begin
  v_username := lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)));
  v_username := regexp_replace(v_username, '[^a-z0-9._-]', '', 'g');
  if length(v_username) < 3 then
    v_username := 'user_' || substr(replace(new.id::text,'-',''),1,8);
  end if;
  v_name := coalesce(new.raw_user_meta_data->>'display_name', v_username);
  insert into public.profiles(id, username, display_name)
  values(new.id, v_username, v_name)
  on conflict(id) do nothing;
  insert into public.user_preferences(user_id) values(new.id)
  on conflict(user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.is_owner(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.profiles
    where id=p_user and role='owner' and is_active
      and (expires_at is null or expires_at > now())
  );
$$;

create or replace function public.can_manage_shared(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.profiles
    where id=p_user and is_active
      and (expires_at is null or expires_at > now())
      and (role='owner' or can_upload_shared or role='uploader')
  );
$$;

create or replace function public.reserve_tkb_upload(
  p_scope text,
  p_original_name text,
  p_size_bytes bigint,
  p_mime_type text default 'application/octet-stream',
  p_notes text default ''
)
returns public.tkb_files
language plpgsql security definer set search_path=public,storage as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid := gen_random_uuid();
  v_safe_name text;
  v_path text;
  v_count integer;
  v_total bigint;
  v_row public.tkb_files;
begin
  if v_uid is null then raise exception 'Bạn chưa đăng nhập.'; end if;
  if p_scope not in ('shared','personal') then raise exception 'Phạm vi file không hợp lệ.'; end if;
  if p_size_bytes <= 0 or p_size_bytes > 52428800 then raise exception 'Mỗi file tối đa 50 MB.'; end if;
  if lower(p_original_name) !~ '\.(xlsx|xlsm)$' then raise exception 'Chỉ chấp nhận file .xlsx hoặc .xlsm.'; end if;

  if p_scope='shared' and not public.can_manage_shared(v_uid) then
    raise exception 'Tài khoản không có quyền tải TKB chung.';
  end if;

  if p_scope='personal' then
    select count(*), coalesce(sum(size_bytes),0) into v_count,v_total
    from public.tkb_files
    where owner_id=v_uid and scope='personal' and status in ('uploading','ready');
    if v_count >= 20 then raise exception 'Đã đủ 20 phiên bản TKB cá nhân.'; end if;
    if v_total + p_size_bytes > 524288000 then raise exception 'Tổng dung lượng cá nhân tối đa 500 MB.'; end if;
  end if;

  v_safe_name := regexp_replace(p_original_name, '[^A-Za-z0-9._-]+', '_', 'g');
  if p_scope='personal' then
    v_path := 'personal/'||v_uid::text||'/'||v_id::text||'/'||v_safe_name;
  else
    v_path := 'shared/'||v_id::text||'/'||v_safe_name;
  end if;

  insert into public.tkb_files(id,scope,owner_id,uploaded_by,original_name,storage_path,size_bytes,mime_type,notes)
  values(v_id,p_scope,case when p_scope='personal' then v_uid else null end,v_uid,p_original_name,v_path,p_size_bytes,coalesce(p_mime_type,'application/octet-stream'),coalesce(p_notes,''))
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.finalize_tkb_upload(p_id uuid)
returns public.tkb_files
language plpgsql security definer set search_path=public,storage as $$
declare
  v_uid uuid := auth.uid();
  v_row public.tkb_files;
begin
  select * into v_row from public.tkb_files where id=p_id for update;
  if not found then raise exception 'Không tìm thấy phiên tải lên.'; end if;
  if not (
    (v_row.scope='personal' and (v_row.owner_id=v_uid or public.is_owner(v_uid))) or
    (v_row.scope='shared' and public.can_manage_shared(v_uid))
  ) then raise exception 'Không có quyền hoàn tất file này.'; end if;
  if not exists(select 1 from storage.objects where bucket_id='tkb-private' and name=v_row.storage_path) then
    raise exception 'File chưa được tải lên kho lưu trữ.';
  end if;
  update public.tkb_files set status='ready' where id=p_id returning * into v_row;
  if v_row.scope='personal' and not exists(
    select 1 from public.tkb_files where owner_id=v_row.owner_id and scope='personal' and is_active and status='ready'
  ) then
    update public.tkb_files set is_active=true where id=p_id returning * into v_row;
  end if;
  return v_row;
end;
$$;

create or replace function public.set_active_personal_tkb(p_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_uid uuid := auth.uid();
begin
  if not exists(select 1 from public.tkb_files where id=p_id and scope='personal' and owner_id=v_uid and status='ready') then
    raise exception 'Không tìm thấy TKB cá nhân hợp lệ.';
  end if;
  update public.tkb_files set is_active=false where scope='personal' and owner_id=v_uid and is_active;
  update public.tkb_files set is_active=true where id=p_id;
  insert into public.user_preferences(user_id,preferred_scope,updated_at)
  values(v_uid,'personal',now())
  on conflict(user_id) do update set preferred_scope='personal',updated_at=now();
end;
$$;

create or replace function public.set_active_shared_tkb(p_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_owner() then raise exception 'Chỉ chủ sở hữu được chọn TKB chung đang áp dụng.'; end if;
  if not exists(select 1 from public.tkb_files where id=p_id and scope='shared' and status='ready') then
    raise exception 'Không tìm thấy TKB chung hợp lệ.';
  end if;
  update public.tkb_files set is_active=false where scope='shared' and is_active;
  update public.tkb_files set is_active=true where id=p_id;
end;
$$;

create or replace function public.complete_password_change()
returns void language sql security definer set search_path=public as $$
  update public.profiles set must_change_password=false where id=auth.uid();
$$;

create or replace function public.mark_login()
returns void language sql security definer set search_path=public as $$
  update public.profiles set last_login_at=now() where id=auth.uid();
$$;

alter table public.profiles enable row level security;
alter table public.tkb_files enable row level security;
alter table public.user_preferences enable row level security;

create policy profiles_read_own_or_owner on public.profiles for select to authenticated
using (id=auth.uid() or public.is_owner());

create policy tkb_read_allowed on public.tkb_files for select to authenticated
using (
  (scope='personal' and (owner_id=auth.uid() or public.is_owner())) or
  (scope='shared' and (is_active or public.can_manage_shared()))
);

create policy tkb_delete_allowed on public.tkb_files for delete to authenticated
using (
  (scope='personal' and (owner_id=auth.uid() or public.is_owner())) or
  (scope='shared' and public.is_owner())
);

create policy preferences_own_all on public.user_preferences for all to authenticated
using (user_id=auth.uid()) with check (user_id=auth.uid());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'tkb-private','tkb-private',false,52428800,
  array[
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel.sheet.macroEnabled.12',
    'application/octet-stream'
  ]
)
on conflict(id) do update set public=false,file_size_limit=52428800,allowed_mime_types=excluded.allowed_mime_types;

create policy storage_tkb_read on storage.objects for select to authenticated
using (
  bucket_id='tkb-private' and exists(
    select 1 from public.tkb_files f
    where f.storage_path=name and f.status='ready' and (
      (f.scope='personal' and (f.owner_id=auth.uid() or public.is_owner())) or
      (f.scope='shared' and (f.is_active or public.can_manage_shared()))
    )
  )
);

create policy storage_tkb_insert on storage.objects for insert to authenticated
with check (
  bucket_id='tkb-private' and exists(
    select 1 from public.tkb_files f
    where f.storage_path=name and f.status='uploading' and f.uploaded_by=auth.uid() and (
      (f.scope='personal' and f.owner_id=auth.uid()) or
      (f.scope='shared' and public.can_manage_shared())
    )
  )
);

create policy storage_tkb_delete on storage.objects for delete to authenticated
using (
  bucket_id='tkb-private' and exists(
    select 1 from public.tkb_files f
    where f.storage_path=name and (
      (f.scope='personal' and (f.owner_id=auth.uid() or public.is_owner())) or
      (f.scope='shared' and public.is_owner())
    )
  )
);

grant execute on function public.reserve_tkb_upload(text,text,bigint,text,text) to authenticated;
grant execute on function public.finalize_tkb_upload(uuid) to authenticated;
grant execute on function public.set_active_personal_tkb(uuid) to authenticated;
grant execute on function public.set_active_shared_tkb(uuid) to authenticated;
grant execute on function public.complete_password_change() to authenticated;
grant execute on function public.mark_login() to authenticated;

commit;
