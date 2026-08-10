begin;

create table if not exists public.site_branding (
  id text primary key default 'default' check (id = 'default'),
  site_title text not null default 'CÔNG CỤ LẬP LỊCH BÁO GIẢNG',
  site_subtitle text not null default 'Website độc lập — không liên kết trang quản lý lớp học',
  show_header_text boolean not null default true,
  logo_path text,
  icon_path text,
  logo_box_width integer not null default 190 check (logo_box_width between 48 and 420),
  logo_box_height integer not null default 64 check (logo_box_height between 32 and 160),
  logo_mobile_height integer not null default 48 check (logo_mobile_height between 28 and 100),
  logo_align text not null default 'left' check (logo_align in ('left','center','right')),
  logo_fit text not null default 'contain' check (logo_fit in ('contain','cover')),
  logo_background text not null default 'transparent',
  logo_radius integer not null default 8 check (logo_radius between 0 and 48),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

insert into public.site_branding(id)
values('default')
on conflict(id) do nothing;

drop trigger if exists site_branding_touch_updated_at on public.site_branding;
create trigger site_branding_touch_updated_at
before update on public.site_branding
for each row execute function public.touch_updated_at();

alter table public.site_branding enable row level security;

drop policy if exists site_branding_public_read on public.site_branding;
create policy site_branding_public_read
on public.site_branding for select
to anon, authenticated
using (id='default');

drop policy if exists site_branding_owner_update on public.site_branding;
create policy site_branding_owner_update
on public.site_branding for update
to authenticated
using (public.is_owner())
with check (public.is_owner() and id='default');

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'site-branding','site-branding',true,5242880,
  array['image/png','image/jpeg','image/webp']
)
on conflict(id) do update set
  public=true,
  file_size_limit=5242880,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists storage_branding_public_read on storage.objects;
create policy storage_branding_public_read
on storage.objects for select
to public
using (bucket_id='site-branding');

drop policy if exists storage_branding_owner_insert on storage.objects;
create policy storage_branding_owner_insert
on storage.objects for insert
to authenticated
with check (bucket_id='site-branding' and public.is_owner());

drop policy if exists storage_branding_owner_update on storage.objects;
create policy storage_branding_owner_update
on storage.objects for update
to authenticated
using (bucket_id='site-branding' and public.is_owner())
with check (bucket_id='site-branding' and public.is_owner());

drop policy if exists storage_branding_owner_delete on storage.objects;
create policy storage_branding_owner_delete
on storage.objects for delete
to authenticated
using (bucket_id='site-branding' and public.is_owner());

create or replace function public.save_site_branding(
  p_site_title text,
  p_site_subtitle text,
  p_show_header_text boolean,
  p_logo_path text,
  p_icon_path text,
  p_logo_box_width integer,
  p_logo_box_height integer,
  p_logo_mobile_height integer,
  p_logo_align text,
  p_logo_fit text,
  p_logo_background text,
  p_logo_radius integer
)
returns public.site_branding
language plpgsql
security definer
set search_path=public
as $$
declare
  v_row public.site_branding;
begin
  if not public.is_owner() then
    raise exception 'Chỉ chủ sở hữu được thay đổi giao diện website.';
  end if;
  if char_length(btrim(coalesce(p_site_title,''))) not between 1 and 120 then
    raise exception 'Tên website phải có từ 1 đến 120 ký tự.';
  end if;
  if char_length(coalesce(p_site_subtitle,'')) > 220 then
    raise exception 'Dòng mô tả tối đa 220 ký tự.';
  end if;
  if p_logo_box_width not between 48 and 420
     or p_logo_box_height not between 32 and 160
     or p_logo_mobile_height not between 28 and 100
     or p_logo_radius not between 0 and 48 then
    raise exception 'Kích thước logo không hợp lệ.';
  end if;
  if p_logo_align not in ('left','center','right') then
    raise exception 'Vị trí logo không hợp lệ.';
  end if;
  if p_logo_fit not in ('contain','cover') then
    raise exception 'Kiểu hiển thị logo không hợp lệ.';
  end if;

  update public.site_branding set
    site_title=btrim(p_site_title),
    site_subtitle=coalesce(p_site_subtitle,''),
    show_header_text=coalesce(p_show_header_text,true),
    logo_path=nullif(btrim(coalesce(p_logo_path,'')),''),
    icon_path=nullif(btrim(coalesce(p_icon_path,'')),''),
    logo_box_width=p_logo_box_width,
    logo_box_height=p_logo_box_height,
    logo_mobile_height=p_logo_mobile_height,
    logo_align=p_logo_align,
    logo_fit=p_logo_fit,
    logo_background=coalesce(nullif(btrim(p_logo_background),''),'transparent'),
    logo_radius=p_logo_radius,
    updated_by=auth.uid()
  where id='default'
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.reset_site_branding()
returns public.site_branding
language plpgsql
security definer
set search_path=public
as $$
declare
  v_row public.site_branding;
begin
  if not public.is_owner() then
    raise exception 'Chỉ chủ sở hữu được khôi phục giao diện mặc định.';
  end if;
  update public.site_branding set
    site_title='CÔNG CỤ LẬP LỊCH BÁO GIẢNG',
    site_subtitle='Website độc lập — không liên kết trang quản lý lớp học',
    show_header_text=true,
    logo_path=null,
    icon_path=null,
    logo_box_width=190,
    logo_box_height=64,
    logo_mobile_height=48,
    logo_align='left',
    logo_fit='contain',
    logo_background='transparent',
    logo_radius=8,
    updated_by=auth.uid()
  where id='default'
  returning * into v_row;
  return v_row;
end;
$$;

grant usage on schema public to anon, authenticated, service_role;
grant select on public.site_branding to anon, authenticated, service_role;
grant update on public.site_branding to authenticated, service_role;
grant execute on function public.save_site_branding(text,text,boolean,text,text,integer,integer,integer,text,text,text,integer) to authenticated;
grant execute on function public.reset_site_branding() to authenticated;

commit;
