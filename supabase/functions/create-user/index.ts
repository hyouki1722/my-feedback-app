import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 處理 CORS 預檢請求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 取得環境變數
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    // 取得請求的授權標頭
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('缺少授權標頭')
    }

    // 1. 驗證呼叫者身分
    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { 
      global: { headers: { Authorization: authHeader } } 
    })
    
    const { data: { user: callerUser }, error: callerError } = await callerClient.auth.getUser()
    if (callerError || !callerUser) {
      throw new Error('無法驗證身分，請重新登入')
    }

    // 建立具備最高權限的 Admin Client
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 2. 驗證呼叫者是否為系統管理員 (admin)
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', callerUser.id)
      .single()
    
    if (callerProfile?.role !== 'admin') {
      throw new Error('權限不足，僅限系統管理員操作')
    }

    // 3. 解析要建立的使用者資料
    const { email, password, name, role } = await req.json()
    if (!email || !password || !name || !role) {
      throw new Error('缺少必要欄位 (email, password, name, role)')
    }

    // 4. 透過 Admin API 建立底層登入帳號 (自動驗證信箱，免收確認信)
    const { data: createdAuth, error: createAuthErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true 
    })

    if (createAuthErr) throw createAuthErr

    const newUserId = createdAuth.user.id

    // 5. 將資料寫入 profiles 表格，並明確強制要求修改密碼
    const { error: profileError } = await supabaseAdmin.from('profiles').insert([
      { 
        id: newUserId, 
        name: name, 
        email: email, 
        role: role, 
        must_change_password: true // ← 確保首次登入防護網生效
      }
    ])

    // 若 profiles 寫入失敗，則刪除剛才建立的 auth 帳號 (Rollback 避免產生孤兒帳號)
    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(newUserId)
      throw profileError
    }

    // 回傳成功訊息
    return new Response(JSON.stringify({ success: true, user: createdAuth.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400, // 回傳 400 給前端觸發錯誤提示
    })
  }
})