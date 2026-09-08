import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const SYSTEM_URL = Deno.env.get('SYSTEM_URL') ?? 'https://my-feedback-app-tau.vercel.app'

serve(async (req) => {
  try {
    // 1. 明確檢查環境變數防呆
    if (!RESEND_API_KEY) {
      throw new Error('伺服器設定錯誤：未設定 RESEND_API_KEY')
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // 2. 取得所有人員姓名與信箱對照表
    const { data: profiles } = await supabaseAdmin.from('profiles').select('id, name, email')
    const profileMap = new Map()
    profiles?.forEach(p => profileMap.set(p.id, p))

    // 3. 取得所有師生配對紀錄
    const { data: assignments } = await supabaseAdmin.from('assignments').select('*')
    const assignMap = new Map()
    assignments?.forEach(a => assignMap.set(a.student_id, a))

    // 4. 一次撈出所有「待老師」與「待主管」的報告
    const { data: pendingReports } = await supabaseAdmin
      .from('feedback_reports')
      .select('*')
      .in('status', ['pending_teacher', 'pending_supervisor'])

    if (!pendingReports || pendingReports.length === 0) {
      return new Response(JSON.stringify({ message: '今日無待審核紀錄，不需發信。' }), { status: 200 })
    }

    // 5. 將任務分類歸戶
    const teacherTasks = new Map()
    const supervisorTasks = new Map()

    pendingReports.forEach(report => {
      const studentName = profileMap.get(report.student_id)?.name || '未知學員'
      const assign = assignMap.get(report.student_id)
      if (!assign) return

      if (report.status === 'pending_teacher' && assign.teacher_id) {
        if (!teacherTasks.has(assign.teacher_id)) teacherTasks.set(assign.teacher_id, [])
        teacherTasks.get(assign.teacher_id).push(studentName)
      }
      
      if (report.status === 'pending_supervisor' && assign.supervisor_id) {
        if (!supervisorTasks.has(assign.supervisor_id)) supervisorTasks.set(assign.supervisor_id, [])
        supervisorTasks.get(assign.supervisor_id).push(studentName)
      }
    })

    // 6. 組合收件人與發信內容
    const emailsToSend: any[] = []

    const prepareEmail = (userMap: Map<string, string[]>, taskTitle: string) => {
      userMap.forEach((students, targetUserId) => {
        const targetUser = profileMap.get(targetUserId)
        if (!targetUser || !targetUser.email) return

        const studentListHtml = students.map(name => `<li>${name}</li>`).join('')
        emailsToSend.push({
          from: '學習護照系統 <onboarding@resend.dev>',
          to: [targetUser.email],
          subject: `【臨床學習護照】您有 ${students.length} 筆待辦${taskTitle}需要處理`,
          html: `
            <h2>${targetUser.name} 您好：</h2>
            <p>系統目前有以下學員的心得等待您的<strong>${taskTitle}</strong>：</p>
            <ul>${studentListHtml}</ul>
            <p>請撥冗登入系統查閱與填寫：<br><a href="${SYSTEM_URL}">👉 點此登入系統</a></p>
            <hr>
            <p style="color: #7f8c8d; font-size: 12px;">此為系統自動發送之信件，請勿直接回覆。</p>
          `
        })
      })
    }

    prepareEmail(teacherTasks, '指導回饋')
    prepareEmail(supervisorTasks, '主管總評與結案')

    if (emailsToSend.length === 0) {
      return new Response(JSON.stringify({ message: '無有效收件人。' }), { status: 200 })
    }

    // 7. 呼叫 Resend API 批次發送 (每 100 筆為一批，避免觸發上限)
    const CHUNK_SIZE = 100
    let sentCount = 0

    for (let i = 0; i < emailsToSend.length; i += CHUNK_SIZE) {
      const chunk = emailsToSend.slice(i, i + CHUNK_SIZE)
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify(chunk)
      })

      if (!res.ok) throw new Error(`Resend API 錯誤: ${await res.text()}`)
      sentCount += chunk.length
    }

    return new Response(JSON.stringify({ success: true, sentCount }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})