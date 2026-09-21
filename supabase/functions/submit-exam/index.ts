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

    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } })
    const { data: { user: callerUser }, error: callerError } = await callerClient.auth.getUser()
    if (callerError || !callerUser) throw new Error('無法驗證身分，請重新登入')

    const { dispatchId, examId, answers } = await req.json()
    if (!dispatchId || !examId || !answers) throw new Error('缺少必要欄位')

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: dispatch, error: dispatchErr } = await supabaseAdmin
      .from('exam_dispatch').select('*').eq('id', dispatchId).single()
    if (dispatchErr || !dispatch) throw new Error('找不到對應的測驗任務')
    if (dispatch.student_id !== callerUser.id) throw new Error('權限不足，無法提交他人的測驗')
    if (dispatch.is_completed) throw new Error('此測驗任務已經完成，無法重複提交')

    const { data: questions, error: qErr } = await supabaseAdmin
      .from('questions').select('id, question_text, options, correct_answer').eq('exam_id', examId)
    if (qErr || !questions || questions.length === 0) throw new Error('題目載入失敗')

    // 進行伺服器端比對與計分，並產生詳細批改紀錄
    let correctCount = 0
    const grading = questions.map((q: any) => {
      const isCorrect = answers[q.id] === q.correct_answer
      if (isCorrect) correctCount++
      return {
        id: q.id,
        question_text: q.question_text,
        options: q.options,
        student_answer: answers[q.id] || '未作答',
        correct_answer: q.correct_answer,
        is_correct: isCorrect
      }
    })
    const score = Math.round((correctCount / questions.length) * 100)
    
    // 檢查管理者是否有開啟「顯示答案」的權限
    const showAnswers = dispatch.show_answers === true;

    // 將詳細批改結果以 JSON 格式包裝存入 answers 欄位
    const finalAnswersPayload = {
      raw: answers,
      show_answers: showAnswers,
      grading: grading
    }

    const { error: insertErr } = await supabaseAdmin.from('exam_records').insert({
      student_id: callerUser.id, exam_id: examId, score, answers: finalAnswersPayload
    })
    if (insertErr) throw insertErr

    await supabaseAdmin.from('exam_dispatch').update({ is_completed: true }).eq('id', dispatchId)

    // 回傳時附帶 show_answers 屬性供前端判斷
    return new Response(JSON.stringify({ success: true, score, show_answers: showAnswers }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    })
  }
})