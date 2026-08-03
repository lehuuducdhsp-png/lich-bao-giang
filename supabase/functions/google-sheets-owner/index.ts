import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const respond = (body: unknown, status = 200) => new Response(
  typeof body === 'string' ? body : JSON.stringify(body),
  { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } },
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return respond({ error: 'Method not allowed' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const publishable = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY')!
    const targetUrl = Deno.env.get('GOOGLE_SHEETS_WEB_APP_URL')
    const accessKey = Deno.env.get('GOOGLE_SHEETS_ACCESS_KEY')
    if (!targetUrl || !accessKey) return respond({ error: 'Chưa cấu hình Google Sheets secret.' }, 500)

    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
    if (!token) return respond({ error: 'Chưa đăng nhập.' }, 401)

    const caller = createClient(supabaseUrl, publishable, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const admin = createClient(supabaseUrl, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: authData, error: authError } = await caller.auth.getUser(token)
    if (authError || !authData.user) return respond({ error: 'Phiên đăng nhập không hợp lệ.' }, 401)

    const { data: profile } = await admin.from('profiles')
      .select('role,is_active,expires_at')
      .eq('id', authData.user.id)
      .single()
    const owner = profile?.role === 'owner' && profile?.is_active &&
      (!profile.expires_at || new Date(profile.expires_at) > new Date())
    if (!owner) return respond({ error: 'Chỉ chủ sở hữu được lưu Google Sheets.' }, 403)

    const payload = await req.json().catch(() => ({}))
    const upstream = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, accessKey }),
      redirect: 'follow',
    })
    const text = await upstream.text()
    return new Response(text, {
      status: upstream.status,
      headers: { ...cors, 'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8' },
    })
  } catch (error) {
    console.error(error)
    return respond({ error: error instanceof Error ? error.message : String(error) }, 500)
  }
})
