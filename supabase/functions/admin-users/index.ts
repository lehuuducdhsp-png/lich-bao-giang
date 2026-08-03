import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' },
})

const cleanUsername = (value: unknown) => String(value ?? '').trim().toLowerCase()
const internalEmail = (username: string) => `${username}@users.lichbaogiang.internal`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const publishable = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY')
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')

    if (!token) return json({ error: 'Chưa đăng nhập.' }, 401)
    if (!service) return json({ error: 'Edge Function chưa có khóa quản trị Supabase.' }, 500)

    const callerClient = createClient(url, publishable, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const admin = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: callerData, error: callerError } = await callerClient.auth.getUser(token)
    if (callerError || !callerData.user) return json({ error: 'Phiên đăng nhập không hợp lệ.' }, 401)

    const { data: callerProfile, error: profileError } = await callerClient
      .from('profiles')
      .select('id,role,is_active,expires_at')
      .eq('id', callerData.user.id)
      .single()

    if (profileError) {
      return json({ error: `Không đọc được quyền tài khoản: ${profileError.message}` }, 500)
    }

    const validOwner = callerProfile?.role === 'owner' && callerProfile?.is_active &&
      (!callerProfile.expires_at || new Date(callerProfile.expires_at) > new Date())

    if (!validOwner) return json({ error: 'Chỉ chủ sở hữu được quản lý tài khoản.' }, 403)

    const body = await req.json().catch(() => ({}))
    const action = String(body.action || '')

    if (action === 'create') {
      const username = cleanUsername(body.username)
      const password = String(body.password || '')
      const displayName = String(body.display_name || username).trim()
      const role = body.role === 'uploader' ? 'uploader' : 'user'

      if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
        return json({ error: 'Tên đăng nhập chỉ gồm chữ thường, số, dấu chấm, gạch ngang hoặc gạch dưới.' }, 400)
      }
      if (password.length < 8) return json({ error: 'Mật khẩu tạm phải có ít nhất 8 ký tự.' }, 400)

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: internalEmail(username),
        password,
        email_confirm: true,
        user_metadata: { username, display_name: displayName },
      })

      if (createError || !created.user) {
        return json({ error: createError?.message || 'Không tạo được tài khoản.' }, 400)
      }

      const { error: profileUpsertError } = await admin.from('profiles').upsert({
        id: created.user.id,
        username,
        display_name: displayName,
        role,
        can_upload_shared: Boolean(body.can_upload_shared || role === 'uploader'),
        is_active: true,
        expires_at: body.expires_at || null,
        must_change_password: true,
        notes: String(body.notes || ''),
        created_by: callerData.user.id,
      })

      if (profileUpsertError) {
        await admin.auth.admin.deleteUser(created.user.id)
        return json({ error: profileUpsertError.message }, 400)
      }

      return json({ ok: true, user_id: created.user.id, username })
    }

    const userId = String(body.user_id || '')
    if (!userId) return json({ error: 'Thiếu user_id.' }, 400)
    if (userId === callerData.user.id && ['delete', 'disable'].includes(action)) {
      return json({ error: 'Không thể tự xóa hoặc tự khóa tài khoản chủ sở hữu.' }, 400)
    }

    if (action === 'reset_password') {
      const password = String(body.password || '')
      if (password.length < 8) return json({ error: 'Mật khẩu tạm phải có ít nhất 8 ký tự.' }, 400)
      const { error } = await admin.auth.admin.updateUserById(userId, { password })
      if (error) return json({ error: error.message }, 400)
      await admin.from('profiles').update({ must_change_password: true }).eq('id', userId)
      return json({ ok: true })
    }

    if (action === 'update') {
      const patch: Record<string, unknown> = {}
      if ('display_name' in body) patch.display_name = String(body.display_name || '').trim()
      if ('is_active' in body) patch.is_active = Boolean(body.is_active)
      if ('expires_at' in body) patch.expires_at = body.expires_at || null
      if ('can_upload_shared' in body) patch.can_upload_shared = Boolean(body.can_upload_shared)
      if ('notes' in body) patch.notes = String(body.notes || '')
      if ('role' in body) patch.role = body.role === 'uploader' ? 'uploader' : 'user'
      const { error } = await admin.from('profiles').update(patch).eq('id', userId).neq('role', 'owner')
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }

    if (action === 'delete') {
      const { data: target } = await admin.from('profiles').select('role').eq('id', userId).single()
      if (target?.role === 'owner') return json({ error: 'Không thể xóa tài khoản chủ sở hữu.' }, 400)
      const { error } = await admin.auth.admin.deleteUser(userId)
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }

    return json({ error: 'Hành động không hợp lệ.' }, 400)
  } catch (error) {
    console.error(error)
    return json({ error: error instanceof Error ? error.message : String(error) }, 500)
  }
})
