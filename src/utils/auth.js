import Swal from 'sweetalert2'
import { supabase } from '../supabase'

// 防止畫面短時間內重複觸發的鎖
let isChecking = false;

export async function checkAndEnforcePasswordChange(userId) {
  if (isChecking) return;
  isChecking = true;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('must_change_password, role')
      .eq('id', userId)
      .single()

    if (error || !data?.must_change_password || data?.role === 'admin') {
      return; 
    }

    let isValid = false;
    while (!isValid) {
      const { value: newPassword } = await Swal.fire({
        title: '首次登入請修改密碼',
        html: '基於資安規範，預設密碼(身分證)須立即變更。<br><span style="color:#e74c3c; font-size:14px;">(密碼長度至少需要 6 碼，且不可與舊密碼相同)</span>',
        input: 'password',
        inputPlaceholder: '請輸入新密碼',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showCancelButton: false,
        confirmButtonText: '確認修改',
        confirmButtonColor: '#3498db',
        inputValidator: (value) => {
          if (!value || value.length < 6) return '密碼長度至少需要 6 碼！'
        }
      });

      if (newPassword) {
        Swal.fire({ title: '更新中...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        // 1. 更新 Auth 密碼
        const { error: updateAuthErr } = await supabase.auth.updateUser({ password: newPassword });
        if (updateAuthErr) {
          let errorMsg = updateAuthErr.message;
          if (errorMsg.includes('different from the old password')) {
            errorMsg = '新密碼不可與舊密碼（預設密碼）相同，請重新設定！';
          }
          await Swal.fire('更新失敗', errorMsg, 'error');
          continue;
        }

        // 2. 解除 profiles 限制 (加上 .select() 嚴格檢查是否真的更新成功)
        const { data: updatedProfile, error: updateProfileErr } = await supabase
          .from('profiles')
          .update({ must_change_password: false })
          .eq('id', userId)
          .select();

        // 若 RLS 權限未開啟，長度會是 0，此處會明確跳出錯誤攔截
        if (updateProfileErr || !updatedProfile || updatedProfile.length === 0) {
          await Swal.fire('權限錯誤', '資料庫權限阻擋了狀態更新，請確認已執行 SQL 開放 Update 權限！', 'error');
          continue;
        }

        // 3. 成功提示
        await Swal.fire({ 
          icon: 'success', 
          title: '更新密碼成功', 
          text: '後續請使用新密碼登入系統。', 
          confirmButtonText: '確定',
          confirmButtonColor: '#3498db',
          allowOutsideClick: false
        });
        
        isValid = true;
      }
    }
  } finally {
    // 確保視窗關閉或邏輯結束後解鎖
    isChecking = false;
  }
}