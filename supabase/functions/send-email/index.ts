import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 處理 CORS 預檢請求
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { teacherEmail, supervisorEmail, studentName } = await req.json()
    
    // 從環境變數讀取 Resend API Key
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) throw new Error('伺服器未設定 RESEND_API_KEY')

    // 抓取觸發請求的系統網址 (例如 Vercel 的網域)
    const systemUrl = req.headers.get('origin') || '系統首頁'

    // 過濾掉空值，組合成收件者陣列
    const toEmails = [teacherEmail, supervisorEmail].filter(email => email && email.trim() !== '')
    if (toEmails.length === 0) throw new Error('沒有可用的收件者信箱')

    // 呼叫 Resend API 發送信件
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: '學習護照系統 <onboarding@resend.dev>', // 測試階段使用 Resend 預設網域
        to: toEmails,
        subject: `【學習護照系統】待審核通知：${studentName} 的心得回饋`,
        html: `
          <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #2c3e50;">待審核通知</h2>
            <p>老師 / 主管 您好：</p>
            <p>學員 <strong>${studentName}</strong> 已送出基礎訓練心得，請點擊下方按鈕登入系統進行您的回饋填寫：</p>
            <a href="${systemUrl}" style="display: inline-block; padding: 10px 20px; margin-top: 15px; background-color: #3498db; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">登入學習護照系統</a>
            <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;">
            <p style="color: #7f8c8d; font-size: 12px;">(此為系統自動發送之信件，請勿直接回覆)</p>
          </div>
        `
      })
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.message || '寄信 API 發生錯誤')

    return new Response(JSON.stringify({ success: true, data }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : '寄信過程發生未知錯誤' }), { 
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})