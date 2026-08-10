begin;

-- Pilot review rights must never widen an existing role.
-- A pilot flag only activates Check-in for a reviewer who is already a Group Leader/Manager.

create or replace function public.checkin_access_context()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_settings public.checkin_system_settings;
  v_profile public.profiles;
  v_owner boolean;
  v_group_leader boolean;
  v_manager boolean;
  v_pilot_checkin boolean;
  v_pilot_review boolean;
  v_can_checkin boolean;
  v_can_review boolean;
  v_can_grant boolean;
begin
  if v_uid is null then raise exception 'Bạn chưa đăng nhập.'; end if;

  select * into v_settings from public.checkin_system_settings where id=1;
  if not found then raise exception 'Chưa cấu hình Check-in.'; end if;

  select * into v_profile
  from public.profiles
  where id=v_uid and is_active and (expires_at is null or expires_at>now());
  if not found then raise exception 'Tài khoản không hoạt động.'; end if;

  v_owner := public.is_owner(v_uid);
  v_group_leader := public.is_group_leader(v_uid);
  v_manager := public.checkin_is_active_manager(v_uid);
  v_pilot_checkin := public.checkin_is_pilot_user(v_uid,'checkin');
  v_pilot_review := public.checkin_is_pilot_user(v_uid,'review');

  if not v_settings.enabled then
    v_can_checkin := false;
    v_can_review := v_owner;
    v_can_grant := false;
  elsif v_settings.phase='pilot' then
    v_can_checkin := (not v_owner) and (not v_group_leader)
      and btrim(coalesce(v_profile.teacher_code,''))<>''
      and v_pilot_checkin;
    v_can_review := v_owner or (v_pilot_review and (v_group_leader or v_manager));
    v_can_grant := v_owner or (v_pilot_review and (v_group_leader or v_manager));
  else
    v_can_checkin := (not v_owner) and (not v_group_leader)
      and btrim(coalesce(v_profile.teacher_code,''))<>'';
    v_can_review := v_owner or v_group_leader or v_manager;
    v_can_grant := v_owner or v_group_leader or v_manager;
  end if;

  return jsonb_build_object(
    'enabled',v_settings.enabled,
    'phase',v_settings.phase,
    'is_owner',v_owner,
    'is_group_leader',v_group_leader,
    'is_manager',v_manager,
    'pilot_can_checkin',v_pilot_checkin,
    'pilot_can_review',v_pilot_review,
    'can_checkin',v_can_checkin,
    'can_review',v_can_review,
    'can_grant',v_can_grant,
    'can_manage_pilot',v_owner
  );
end;
$$;

create or replace function public.can_view_checkin_target(
  p_target uuid,
  p_viewer uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select
    public.checkin_target_in_current_phase(p_target)
    and (
      p_viewer=p_target
      or public.is_owner(p_viewer)
      or (
        (select phase from public.checkin_system_settings where id=1)='pilot'
        and public.checkin_is_pilot_user(p_viewer,'review')
        and (
          public.checkin_is_active_manager(p_viewer)
          or exists(
            select 1
            from public.teacher_group_managers m
            join public.teacher_group_memberships gm
              on gm.group_id=m.group_id
             and gm.user_id=p_target
             and gm.valid_to is null
            where m.user_id=p_viewer
          )
        )
      )
      or (
        (select phase from public.checkin_system_settings where id=1)='production'
        and (
          public.checkin_is_active_manager(p_viewer)
          or exists(
            select 1
            from public.teacher_group_managers m
            join public.teacher_group_memberships gm
              on gm.group_id=m.group_id
             and gm.user_id=p_target
             and gm.valid_to is null
            where m.user_id=p_viewer
          )
        )
      )
    );
$$;

create or replace function public.can_grant_checkin_target(
  p_target uuid,
  p_viewer uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select
    public.checkin_target_in_current_phase(p_target)
    and (
      public.is_owner(p_viewer)
      or (
        (select phase from public.checkin_system_settings where id=1)='pilot'
        and public.checkin_is_pilot_user(p_viewer,'review')
        and (
          public.checkin_is_active_manager(p_viewer)
          or exists(
            select 1
            from public.teacher_group_managers m
            join public.teacher_group_memberships gm
              on gm.group_id=m.group_id
             and gm.user_id=p_target
             and gm.valid_to is null
            where m.user_id=p_viewer
          )
        )
      )
      or (
        (select phase from public.checkin_system_settings where id=1)='production'
        and (
          public.checkin_is_active_manager(p_viewer)
          or exists(
            select 1
            from public.teacher_group_managers m
            join public.teacher_group_memberships gm
              on gm.group_id=m.group_id
             and gm.user_id=p_target
             and gm.valid_to is null
            where m.user_id=p_viewer
          )
        )
      )
    );
$$;

commit;
