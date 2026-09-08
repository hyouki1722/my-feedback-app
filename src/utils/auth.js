import Swal from 'sweetalert2'
import { supabase } from '../supabase'

export async function checkAndEnforcePasswordChange(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('must_change_password')
    .eq('id', userId)
    .single()

  if (error || !data?.must_change_password) return;

  // 阻擋式對話框，無法點擊外部關閉
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
        Swal.fire('錯誤', updateAuthErr.message, 'error');
        continue;
      }

      // 2. 解除 profiles 限制
      const { error: updateProfileErr } = await supabase.from('profiles').update({ must_change_password: false }).eq('id', userId);
      if (updateProfileErr) {
        Swal.fire('錯誤', '資料庫更新失敗', 'error');
        continue;
      }

      Swal.fire({ icon: 'success', title: '密碼修改成功', text: '請妥善保管您的新密碼！', timer: 2000, showConfirmButton: false });
      isValid = true;
    }
  }
}