import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('缺少授權標頭')

    // 1. 驗證呼叫者身分
    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } })
    const { data: { user: callerUser }, error: callerError } = await callerClient.auth.getUser()
    if (callerError || !callerUser) throw new Error('無法驗證身分，請重新登入')

    const { dispatchId, examId, answers } = await req.json()
    if (!dispatchId || !examId || !answers) throw new Error('缺少必要欄位')

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 2. 防弊驗證：確認派發紀錄歸屬且未完成
    const { data: dispatch, error: dispatchErr } = await supabaseAdmin
      .from('exam_dispatch').select('*').eq('id', dispatchId).single()
    if (dispatchErr || !dispatch) throw new Error('找不到對應的測驗任務')
    if (dispatch.student_id !== callerUser.id) throw new Error('權限不足，無法提交他人的測驗')
    if (dispatch.is_completed) throw new Error('此測驗任務已經完成，無法重複提交')

    // 3. 上帝視角：撈出含正確答案的題目 (絕不回傳給前端)
    const { data: questions, error: qErr } = await supabaseAdmin
      .from('questions').select('id, correct_answer').eq('exam_id', examId)
    if (qErr || !questions || questions.length === 0) throw new Error('題目載入失敗')

    // 4. 伺服器端計分
    let correctCount = 0
    questions.forEach((q: any) => { if (answers[q.id] === q.correct_answer) correctCount++ })
    const score = Math.round((correctCount / questions.length) * 100)

    // 5. 寫入成績與完成狀態
    const { error: insertErr } = await supabaseAdmin.from('exam_records').insert({
      student_id: callerUser.id, exam_id: examId, score, answers
    })
    if (insertErr) throw insertErr

    await supabaseAdmin.from('exam_dispatch').update({ is_completed: true }).eq('id', dispatchId)

    // 6. 僅回傳分數
    return new Response(JSON.stringify({ success: true, score }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    })
  }
})