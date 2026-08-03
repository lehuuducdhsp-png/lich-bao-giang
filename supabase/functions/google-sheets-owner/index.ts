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

const decodeHtml = (value: string) => value
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')

const cleanText = (value: string) => decodeHtml(value)
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ').trim()

function responseInfo(raw: string) {
  const decoded = decodeHtml(raw)
  const error = /LBG_ERROR|["']success["']\s*:\s*false|\b(error|lỗi)\b/i.test(decoded)
  const success = /LBG_SAVED|LBG_SAVE_RESULT|LBG_RESULT|["']success["']\s*:\s*true|đã lưu/i.test(decoded)
  const messageMatch = decoded.match(/["']message["']\s*:\s*["']([^"']{1,500})["']/i)
    || decoded.match(/<p[^>]*>([\s\S]*?)<\/p>/i)
  const urlMatch = decoded.match(/https:\/\/docs\.google\.com\/spreadsheets\/d\/[A-Za-z0-9_-]+[^"'<>\s]*/i)
  return {
    error,
    success,
    message: messageMatch ? cleanText(messageMatch[1]) : '',
    url: urlMatch?.[0] || '',
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const publishable = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY')!
    const targetUrl = Deno.env.get('GOOGLE_SHEETS_WEB_APP_URL')
    const accessKey = Deno.env.get('GOOGLE_SHEETS_ACCESS_KEY')
    if (!targetUrl || !accessKey) return json({ error: 'Chưa cấu hình Google Sheets secret.' }, 500)

    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
    if (!token) return json({ error: 'Chưa đăng nhập.' }, 401)

    const caller = createClient(supabaseUrl, publishable, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const admin = createClient(supabaseUrl, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: authData, error: authError } = await caller.auth.getUser(token)
    if (authError || !authData.user) return json({ error: 'Phiên đăng nhập không hợp lệ.' }, 401)

    const { data: profile } = await admin.from('profiles')
      .select('role,is_active,expires_at')
      .eq('id', authData.user.id)
      .single()
    const owner = profile?.role === 'owner' && profile?.is_active &&
      (!profile.expires_at || new Date(profile.expires_at) > new Date())
    if (!owner) return json({ error: 'Chỉ chủ sở hữu được lưu Google Sheets.' }, 403)

    const payload = await req.json().catch(() => ({}))
    const requestId = String(payload.requestId || `lbg-edge-${crypto.randomUUID()}`)
    const form = new URLSearchParams()
    form.set('requestId', requestId)
    form.set('accessKey', accessKey)
    form.set('payload', JSON.stringify({ ...payload, requestId }))

    const upstream = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: form.toString(),
      redirect: 'follow',
    })
    const raw = await upstream.text()
    if (!upstream.ok) return json({ error: `Google Apps Script phản hồi HTTP ${upstream.status}.` }, 502)

    const info = responseInfo(raw)
    if (info.error) return json({ error: info.message || 'Apps Script báo lỗi khi lưu.' }, 502)
    if (!info.success) return json({ error: 'Apps Script phản hồi không rõ kết quả. Hãy kiểm tra nhật ký Apps Script.', detail: cleanText(raw).slice(0, 500) }, 502)
    return json({ ok: true, success: true, requestId, message: info.message || 'Đã lưu vào Google Sheets.', url: info.url || undefined })
  } catch (error) {
    console.error(error)
    return json({ error: error instanceof Error ? error.message : String(error) }, 500)
  }
})
