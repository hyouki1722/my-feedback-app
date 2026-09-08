import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

serve(async (req) => {
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''

    if (!RESEND_API_KEY) throw new Error('尚未設定 RESEND_API_KEY')

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 1. 抓取所有「待審核 (submitted)」的心得
    const { data: reports, error: reportsError } = await supabaseAdmin
      .from('feedback_reports')
      .select('*')
      .eq('status', 'submitted')

    if (reportsError || !reports || reports.length === 0) {
      return new Response(JSON.stringify({ message: '今日無待審核紀錄，不需發信。' }), { status: 200 })
    }

    // 2. 抓取所有人員的基本資料與信箱
    const { data: profiles } = await supabaseAdmin.from('profiles').select('id, name, email')
    const profileMap = new Map()
    profiles?.forEach(p => profileMap.set(p.id, p))

    // 3. 將待審核名單分類打包 (分類給老師 vs 分類給主管)
    const teacherTasks = new Map()
    const supervisorTasks = new Map()

    reports.forEach(report => {
      const studentName = profileMap.get(report.student_id)?.name || '未知學員'

      if (!report.teacher_feedback) {
        // 老師尚未回饋 -> 歸類給老師
        if (report.teacher_id) {
          if (!teacherTasks.has(report.teacher_id)) teacherTasks.set(report.teacher_id, [])
          teacherTasks.get(report.teacher_id).push(studentName)
        }
      } else if (!report.supervisor_feedback) {
        // 老師已寫，主管尚未回饋 -> 歸類給主管
        if (report.supervisor_id) {
          if (!supervisorTasks.has(report.supervisor_id)) supervisorTasks.set(report.supervisor_id, [])
          supervisorTasks.get(report.supervisor_id).push(studentName)
        }
      }
    })

    // 動態讀取環境變數，若無則使用預設的佔位網址
    const systemUrl = Deno.env.get('SYSTEM_URL') ?? 'https://your-system-domain.com';
    const emailPromises = []

    // 4. 準備寄給老師的統整信
    for (const [teacherId, students] of teacherTasks.entries()) {
      const teacherInfo = profileMap.get(teacherId)
      if (!teacherInfo?.email) continue

      const htmlBody = `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #9b59b6;">臨床指導老師 待審核通知</h2>
          <p>${teacherInfo.name} 老師 您好：</p>
          <p>今日共有 <strong>${students.length}</strong> 位學員已繳交心得，等待您的回饋：</p>
          <ul>${students.map(name => `<li>${name}</li>`).join('')}</ul>
          <a href="${systemUrl}" style="display: inline-block; padding: 10px 20px; background-color: #3498db; color: white; text-decoration: none; border-radius: 5px;">登入系統審核</a>
        </div>
      `
      emailPromises.push(sendResendEmail(RESEND_API_KEY, teacherInfo.email, `【學習護照】待審核通知：共有 ${students.length} 筆心得`, htmlBody))
    }

    // 5. 準備寄給主管的統整信
    for (const [supervisorId, students] of supervisorTasks.entries()) {
      const supervisorInfo = profileMap.get(supervisorId)
      if (!supervisorInfo?.email) continue

      const htmlBody = `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #e67e22;">單位主管 待結案通知</h2>
          <p>${supervisorInfo.name} 主管 您好：</p>
          <p>今日共有 <strong>${students.length}</strong> 位學員的心得，老師已完成回饋，等待您進行最終結案：</p>
          <ul>${students.map(name => `<li>${name}</li>`).join('')}</ul>
          <a href="${systemUrl}" style="display: inline-block; padding: 10px 20px; background-color: #3498db; color: white; text-decoration: none; border-radius: 5px;">登入系統結案</a>
        </div>
      `
      emailPromises.push(sendResendEmail(RESEND_API_KEY, supervisorInfo.email, `【學習護照】待結案通知：共有 ${students.length} 筆心得`, htmlBody))
    }

    // 6. 批次發送所有信件
    await Promise.all(emailPromises)

    return new Response(JSON.stringify({ success: true, message: `已發送 ${emailPromises.length} 封統整信件` }), { status: 200, headers: { 'Content-Type': 'application/json' } })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})

// 呼叫 Resend 的共用函式
async function sendResendEmail(apiKey: string, to: string, subject: string, html: string) {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      from: '學習護照系統 <onboarding@resend.dev>',
      to: [to],
      subject: subject,
      html: html
    })
  })
}