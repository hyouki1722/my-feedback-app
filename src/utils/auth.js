import Swal from 'sweetalert2'
import { supabase } from '../supabase'

export async function checkAndEnforcePasswordChange(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('must_change_password, role')
    .eq('id', userId)
    .single()

  // 若為 admin 或已修改過密碼，直接放行
  if (error || !data?.must_change_password || data?.role === 'admin') return;

  let isValid = false;
  while (!isValid) {
    const { value: newPassword } = await Swal.fire({
      title: '首次登入請修改密碼',
      html: '基於資安規範，預設密碼(身分證)須立即變更。<br><span style="color:#e74c3c; font-size:14px;">(密碼長度至少需要 6 碼)</span>',
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
        // 加上 await 確保錯誤訊息能被看見，不會瞬間跳回輸入框
        await Swal.fire('更新失敗', updateAuthErr.message, 'error');
        continue;
      }

      // 2. 解除 profiles 的強制修改限制
      const { error: updateProfileErr } = await supabase.from('profiles').update({ must_change_password: false }).eq('id', userId);
      if (updateProfileErr) {
        // 加上 await
        await Swal.fire('錯誤', '資料庫更新狀態失敗', 'error');
        continue;
      }

      // 3. 成功提示：修改為指定文字，並改用確認按鈕讓使用者手動關閉
      await Swal.fire({ 
        icon: 'success', 
        title: '更新密碼成功', 
        text: '後續請使用新密碼登入。', 
        confirmButtonText: '確定',
        confirmButtonColor: '#3498db',
        allowOutsideClick: false
      });
      
      isValid = true; // 結束迴圈，讓使用者繼續使用系統
    }
  }
}