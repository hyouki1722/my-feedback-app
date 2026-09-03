// supabase/functions/delete-user/index.ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: '缺少授權標頭，請重新登入' }, 401)
    }

    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user: callerUser },
      error: callerError,
    } = await callerClient.auth.getUser()

    if (callerError || !callerUser) {
      return jsonResponse({ error: '無法驗證身分，請重新登入' }, 401)
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', callerUser.id)
      .single()

    if (callerProfileError || callerProfile?.role !== 'admin') {
      return jsonResponse({ error: '權限不足，僅限系統管理員執行此操作' }, 403)
    }

    const { user_id } = await req.json()
    if (!user_id) {
      return jsonResponse({ error: '缺少 user_id 參數' }, 400)
    }
    if (user_id === callerUser.id) {
      return jsonResponse({ error: '無法刪除自己目前登入中的管理員帳號' }, 400)
    }

    await supabaseAdmin.from('feedback_reports').delete().eq('student_id', user_id)
    await supabaseAdmin.from('feedback_reports').update({ teacher_id: null }).eq('teacher_id', user_id)
    await supabaseAdmin.from('feedback_reports').update({ supervisor_id: null }).eq('supervisor_id', user_id)

    await supabaseAdmin.from('assignments').delete().eq('student_id', user_id)
    await supabaseAdmin.from('assignments').delete().eq('teacher_id', user_id)
    await supabaseAdmin.from('assignments').delete().eq('supervisor_id', user_id)

    const { error: deleteProfileError } = await supabaseAdmin.from('profiles').delete().eq('id', user_id)
    if (deleteProfileError) throw deleteProfileError

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user_id)
    if (authError) throw authError

    return jsonResponse({ message: '使用者與關聯資料已徹底刪除' })
  } catch (error) {
    console.error('delete-user function error:', error)
    return jsonResponse({ error: error instanceof Error ? error.message : '刪除過程中發生未知錯誤' }, 500)
  }
})