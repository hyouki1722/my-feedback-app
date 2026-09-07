import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: '缺少授權標頭' }, 401)

    // 驗證呼叫者是否為登入狀態
    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } })
    const { data: { user: callerUser }, error: callerError } = await callerClient.auth.getUser()
    if (callerError || !callerUser) return jsonResponse({ error: '無法驗證身分' }, 401)

    // 驗證呼叫者是否具備 admin 權限
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: callerProfile } = await supabaseAdmin.from('profiles').select('role').eq('id', callerUser.id).single()
    if (callerProfile?.role !== 'admin') return jsonResponse({ error: '權限不足，拒絕存取' }, 403)

    const { email, password, name, role } = await req.json()
    if (!email || !password || !name || !role) return jsonResponse({ error: '缺少必要欄位' }, 400)

    // 使用最高權限直接建立帳號，跳過 Email 驗證信
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true
    })
    if (createError) return jsonResponse({ error: createError.message }, 400)

    const { error: profileError } = await supabaseAdmin.from('profiles').insert([
      { id: created.user.id, name, role, email }
    ])
    if (profileError) return jsonResponse({ error: profileError.message }, 400)

    return jsonResponse({ message: '帳號建立成功', user_id: created.user.id })
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : '伺服器發生未知錯誤' }, 500)
  }
})