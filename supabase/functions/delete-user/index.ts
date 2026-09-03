import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 處理瀏覽器的 CORS 跨域預檢請求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 取得前端傳來的欲刪除使用者 ID
    const { user_id } = await req.json()
    if (!user_id) throw new Error('缺少 user_id 參數')

    // 使用 Supabase 自動注入的環境變數與最高權限金鑰 (Service Role Key)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. 若為學員，刪除其心得報告
    await supabaseAdmin.from('feedback_reports').delete().eq('student_id', user_id)
    
    // 2. 若為老師/主管，清空其在報告上的審核紀錄
    await supabaseAdmin.from('feedback_reports').update({ teacher_id: null }).eq('teacher_id', user_id)
    await supabaseAdmin.from('feedback_reports').update({ supervisor_id: null }).eq('supervisor_id', user_id)
    
    // 3. 刪除所有配對資料
    await supabaseAdmin.from('assignments').delete().eq('student_id', user_id)
    await supabaseAdmin.from('assignments').delete().eq('teacher_id', user_id)
    await supabaseAdmin.from('assignments').delete().eq('supervisor_id', user_id)
    
    // 4. 刪除公開檔案 (Profile)
    await supabaseAdmin.from('profiles').delete().eq('id', user_id)
    
    // 5. 最重要的一步：徹底刪除底層 Auth 帳號 (殭屍帳號)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user_id)
    if (authError) throw authError

    return new Response(
      JSON.stringify({ message: '使用者與關聯資料已徹底刪除' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})