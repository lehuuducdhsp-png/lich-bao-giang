begin;

-- Check-in V2: teacher-initiated quota requests.
-- Important business rule: running out of attempts DOES NOT notify a Group Leader.
-- A notification is created only when the teacher explicitly presses the request button.

create table if not exists public.teaching_checkin_quota_requests (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.teaching_checkin_slots(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  record_phase text not null check (record_phase in ('pilot','production')),
  status text not null default 'pending' check (status in ('pending','approved','cancelled')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete restrict,
  grant_id uuid references public.teaching_checkin_quota_grants(id) on delete set null,
  constraint teaching_checkin_quota_requests_resolve_ck check (
    (status='pending' and resolved_at is null and resolved_by is null)
    or
    (status<>'pending' and resolved_at is not null and resolved_by is not null)
  )
);

create unique index if not exists teaching_checkin_quota_requests_one_pending_uidx
  on public.teaching_checkin_quota_requests(slot_id)
  where status='pending';

create index if not exists teaching_checkin_quota_requests_user_time_idx
  on public.teaching_checkin_quota_requests(user_id, requested_at desc);
create index if not exists teaching_checkin_quota_requests_status_time_idx
  on public.teaching_checkin_quota_requests(status, requested_at desc);

alter table public.teaching_checkin_quota_requests enable row level security;
drop policy if exists teaching_checkin_quota_requests_read on public.teaching_checkin_quota_requests;
create policy teaching_checkin_quota_requests_read
on public.teaching_checkin_quota_requests
for select
to authenticated
using (
  user_id=auth.uid()
  or public.can_view_checkin_target(user_id,auth.uid())
);

revoke insert, update, delete on public.teaching_checkin_quota_requests from authenticated;
grant select on public.teaching_checkin_quota_requests to authenticated;

create or replace function public.request_teaching_checkin_quota(
  p_slot_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_slot public.teaching_checkin_slots;
  v_settings public.checkin_system_settings;
  v_profile public.profiles;
  v_used integer;
  v_granted integer;
  v_total integer;
  v_request_id uuid;
  v_requested_at timestamptz;
  v_existing public.teaching_checkin_quota_requests;
  v_notice_count integer := 0;
begin
  if v_uid is null then raise exception 'Bạn chưa đăng nhập.'; end if;

  select * into v_settings from public.checkin_system_settings where id=1;
  if not found or not v_settings.enabled then
    raise exception 'Check-in hiện đang tạm tắt.';
  end if;

  select * into v_slot
  from public.teaching_checkin_slots
  where id=p_slot_id
  for update;

  if not found then raise exception 'Không tìm thấy điểm dạy.'; end if;
  if v_slot.user_id<>v_uid then
    raise exception 'Bạn chỉ được gửi yêu cầu cho điểm dạy của chính mình.';
  end if;
  if v_slot.record_phase<>v_settings.phase then
    raise exception 'Điểm dạy này không thuộc giai đoạn Check-in hiện tại.';
  end if;

  if not coalesce((public.checkin_access_context()->>'can_checkin')::boolean,false) then
    raise exception 'Tài khoản hiện không có quyền Check-in.';
  end if;

  select * into v_profile from public.profiles where id=v_uid;

  select count(*)::integer into v_used
  from public.teaching_checkins where slot_id=v_slot.id;

  select coalesce(sum(amount),0)::integer into v_granted
  from public.teaching_checkin_quota_grants where slot_id=v_slot.id;

  v_total := v_slot.initial_quota + v_granted;
  if v_used < v_total then
    raise exception 'Bạn vẫn còn % lượt Check-in; chưa cần gửi yêu cầu.', v_total-v_used;
  end if;

  select * into v_existing
  from public.teaching_checkin_quota_requests
  where slot_id=v_slot.id and status='pending';

  if found then
    return jsonb_build_object(
      'request_id',v_existing.id,
      'slot_id',v_slot.id,
      'status','pending',
      'already_pending',true,
      'requested_at',v_existing.requested_at
    );
  end if;

  insert into public.teaching_checkin_quota_requests(
    slot_id,user_id,record_phase,status
  ) values(
    v_slot.id,v_uid,v_slot.record_phase,'pending'
  ) returning id,requested_at into v_request_id,v_requested_at;

  -- Notify only active Group Leaders assigned to the teacher's current group.
  insert into public.user_notifications(
    recipient_id,notification_type,title,message,payload
  )
  select distinct
    m.user_id,
    'checkin_quota_request',
    'Yêu cầu cấp thêm lượt Check-in',
    coalesce(v_profile.display_name,v_profile.username,'Giáo viên')
      ||' yêu cầu cấp thêm 3 lượt Check-in tại '
      ||v_slot.school_name||' • '||v_slot.session||'.',
    jsonb_build_object(
      'request_id',v_request_id,
      'slot_id',v_slot.id,
      'teacher_id',v_uid,
      'school_name',v_slot.school_name,
      'session',v_slot.session,
      'record_phase',v_slot.record_phase
    )
  from public.teacher_group_memberships gm
  join public.teacher_group_managers m on m.group_id=gm.group_id
  join public.profiles leader on leader.id=m.user_id
  where gm.user_id=v_uid
    and gm.valid_to is null
    and leader.is_active
    and (leader.expires_at is null or leader.expires_at>now());

  get diagnostics v_notice_count = row_count;

  -- Safety fallback: if the teacher currently has no assigned Group Leader,
  -- send the explicit request to active Owners so it is not lost.
  if v_notice_count=0 then
    insert into public.user_notifications(
      recipient_id,notification_type,title,message,payload
    )
    select
      p.id,
      'checkin_quota_request',
      'Yêu cầu cấp thêm lượt Check-in',
      coalesce(v_profile.display_name,v_profile.username,'Giáo viên')
        ||' yêu cầu cấp thêm 3 lượt Check-in tại '
        ||v_slot.school_name||' • '||v_slot.session||'. Tài khoản này hiện chưa có Nhóm trưởng phụ trách.',
      jsonb_build_object(
        'request_id',v_request_id,
        'slot_id',v_slot.id,
        'teacher_id',v_uid,
        'school_name',v_slot.school_name,
        'session',v_slot.session,
        'record_phase',v_slot.record_phase,
        'fallback_owner',true
      )
    from public.profiles p
    where p.role='owner' and p.is_active
      and (p.expires_at is null or p.expires_at>now());
  end if;

  return jsonb_build_object(
    'request_id',v_request_id,
    'slot_id',v_slot.id,
    'status','pending',
    'already_pending',false,
    'requested_at',v_requested_at
  );
end;
$$;

grant execute on function public.request_teaching_checkin_quota(uuid) to authenticated;

-- Keep the existing +3 rule, and automatically close an explicit pending request
-- when an authorized reviewer grants the quota.
create or replace function public.grant_teaching_checkin_quota(
  p_slot_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_slot public.teaching_checkin_slots;
  v_reason text := regexp_replace(btrim(coalesce(p_reason,'')), '[[:space:]]+', ' ', 'g');
  v_grant_id uuid;
  v_used integer;
  v_granted integer;
  v_total integer;
  v_request_id uuid;
begin
  if v_uid is null then raise exception 'Bạn chưa đăng nhập.'; end if;

  select * into v_slot
  from public.teaching_checkin_slots
  where id=p_slot_id
  for update;

  if not found then raise exception 'Không tìm thấy điểm dạy.'; end if;
  if not public.can_grant_checkin_target(v_slot.user_id,v_uid) then
    raise exception 'Bạn không có quyền cấp thêm lượt cho giáo viên này.';
  end if;
  if char_length(v_reason) not between 2 and 200 then
    raise exception 'Hãy nhập lý do cấp thêm lượt.';
  end if;

  select count(*)::integer into v_used
  from public.teaching_checkins
  where slot_id=v_slot.id;

  select coalesce(sum(amount),0)::integer into v_granted
  from public.teaching_checkin_quota_grants
  where slot_id=v_slot.id;

  v_total := v_slot.initial_quota + v_granted;
  if v_used < v_total then
    raise exception 'Giáo viên vẫn còn % lượt Check-in; chưa cần cấp thêm.', v_total-v_used;
  end if;

  insert into public.teaching_checkin_quota_grants(
    slot_id,granted_to,granted_by,amount,reason
  ) values(
    v_slot.id,v_slot.user_id,v_uid,3,v_reason
  ) returning id into v_grant_id;

  update public.teaching_checkin_quota_requests
  set status='approved',resolved_at=now(),resolved_by=v_uid,grant_id=v_grant_id
  where slot_id=v_slot.id and status='pending'
  returning id into v_request_id;

  if v_request_id is not null then
    -- Clear unread request notices for reviewers because the request is resolved.
    update public.user_notifications
    set read_at=coalesce(read_at,now())
    where notification_type='checkin_quota_request'
      and payload->>'request_id'=v_request_id::text;

    -- Tell the teacher that the explicit request was handled.
    insert into public.user_notifications(
      recipient_id,notification_type,title,message,payload
    ) values(
      v_slot.user_id,
      'checkin_quota_approved',
      'Đã cấp thêm 3 lượt Check-in',
      'Yêu cầu tại '||v_slot.school_name||' • '||v_slot.session||' đã được cấp thêm 3 lượt.',
      jsonb_build_object(
        'request_id',v_request_id,
        'slot_id',v_slot.id,
        'grant_id',v_grant_id,
        'school_name',v_slot.school_name,
        'session',v_slot.session
      )
    );
  end if;

  v_total := v_total + 3;
  return jsonb_build_object(
    'grant_id',v_grant_id,
    'slot_id',v_slot.id,
    'granted',3,
    'quota_total',v_total,
    'attempts_used',v_used,
    'remaining',greatest(v_total-v_used,0),
    'request_id',v_request_id,
    'granted_at',now()
  );
end;
$$;

grant execute on function public.grant_teaching_checkin_quota(uuid,text) to authenticated;

commit;
