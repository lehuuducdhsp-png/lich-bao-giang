begin;

-- Server-side enforcement for teaching Check-in time windows.
-- IMPORTANT: this migration is prepared on the feature branch only during trial.
-- Apply to the linked Supabase project only after localhost/user approval.
-- Morning: 06:00 through the end of 11:00 (Vietnam time).
-- Afternoon: 12:00 through the end of 17:00 (Vietnam time).
-- Session 'Khác' is allowed only while either official window is open,
-- so it cannot be used to bypass the time restriction.

create or replace function public.checkin_session_window_open(
  p_session text,
  p_at timestamptz default now()
)
returns boolean
language plpgsql
stable
set search_path=public
as $$
declare
  v_local timestamp := p_at at time zone 'Asia/Ho_Chi_Minh';
  v_time time := v_local::time;
  v_session text := upper(regexp_replace(btrim(coalesce(p_session,'')), '[[:space:]]+', ' ', 'g'));
  v_morning boolean;
  v_afternoon boolean;
begin
  v_morning := v_time >= time '06:00:00' and v_time < time '11:01:00';
  v_afternoon := v_time >= time '12:00:00' and v_time < time '17:01:00';

  if v_session in ('SÁNG','SANG') then return v_morning; end if;
  if v_session in ('CHIỀU','CHIEU') then return v_afternoon; end if;
  if v_session in ('KHÁC','KHAC') then return v_morning or v_afternoon; end if;
  return false;
end;
$$;

create or replace function public.enforce_teaching_checkin_time_window()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_session text;
  v_teaching_date date;
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  select s.session,s.teaching_date
    into v_session,v_teaching_date
  from public.teaching_checkin_slots s
  where s.id=new.slot_id;

  if not found then
    raise exception 'Không tìm thấy điểm dạy để Check-in.';
  end if;

  if v_teaching_date is distinct from v_today then
    raise exception 'Chỉ được Check-in cho ngày hiện tại.';
  end if;

  if not public.checkin_session_window_open(v_session,now()) then
    if upper(v_session)='SÁNG' then
      raise exception 'Check-in buổi sáng chỉ mở từ 06:00 đến hết 11:00 (giờ Việt Nam).';
    elsif upper(v_session)='CHIỀU' then
      raise exception 'Check-in buổi chiều chỉ mở từ 12:00 đến hết 17:00 (giờ Việt Nam).';
    else
      raise exception 'Check-in chỉ mở trong khung 06:00-11:00 hoặc 12:00-17:00 (giờ Việt Nam).';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists teaching_checkins_time_window_guard on public.teaching_checkins;
create trigger teaching_checkins_time_window_guard
before insert on public.teaching_checkins
for each row execute function public.enforce_teaching_checkin_time_window();

grant execute on function public.checkin_session_window_open(text,timestamptz) to authenticated;

commit;
