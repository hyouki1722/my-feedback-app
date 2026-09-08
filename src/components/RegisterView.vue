<template>
  <div class="auth-wrapper">
    <div class="auth-card">
      <h2 class="auth-title">📝 學員帳號註冊</h2>
      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label>姓名：</label>
          <input type="text" v-model="name" placeholder="請輸入您的真實姓名" required class="auth-input" />
        </div>
        <div class="form-group">
          <label>身分：</label>
          <p style="color:#7f8c8d; font-size:14px; margin:0; padding: 10px 0;">
            🎓 系統將自動設為「受訓學員」身分。若需申請老師或主管帳號，請洽系統管理員。
          </p>
        </div>
        <div class="form-group">
          <label>Email 帳號：</label>
          <input type="email" v-model="email" placeholder="example@hospital.com" required class="auth-input" />
        </div>
        <div class="form-group">
          <label>密碼：</label>
          <input type="password" v-model="password" placeholder="請設定至少 6 碼密碼" required class="auth-input" />
        </div>
        <button type="submit" class="btn primary-btn auth-btn" :disabled="isLoading">
          {{ isLoading ? '註冊中...' : '註冊帳號' }}
        </button>
      </form>
      <div class="auth-links">
        <a href="#" @click.prevent="$emit('switch-to-login')" class="link-text">已有帳號？點此登入</a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { supabase } from '../supabase'
import Swal from 'sweetalert2'

const emit = defineEmits(['switch-to-login'])
const name = ref('')
const email = ref('')
const password = ref('')
const isLoading = ref(false)

async function handleRegister() {
  isLoading.value = true
  
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: email.value,
    password: password.value,
  })

  if (authError) {
    let errorMsg = authError.message
    if (errorMsg.includes('User already registered')) errorMsg = '此 Email 已經註冊過囉！'
    if (errorMsg.includes('Password should be at least')) errorMsg = '密碼長度至少需要 6 碼！'
    
    Swal.fire({ icon: 'error', title: '註冊失敗', text: errorMsg, confirmButtonColor: '#3498db' })
    isLoading.value = false
    return
  }

  const userId = authData.user?.id
  if (userId) {
    // 強制寫死 role 為 student，不信任前端輸入
    const { error: profileError } = await supabase.from('profiles').insert([
      { id: userId, name: name.value, email: email.value, role: 'student' }
    ])

    if (profileError) {
      Swal.fire({ icon: 'error', title: '建立個人資料失敗', text: profileError.message, confirmButtonColor: '#3498db' })
    } else {
      Swal.fire({ icon: 'success', title: '註冊成功！', text: '請使用新帳號登入系統', confirmButtonColor: '#2ecc71' })
      emit('switch-to-login')
    }
  }
  isLoading.value = false
}
</script>

<style scoped>
/* 樣式沿用您原有的 auth-wrapper, auth-card, auth-input 等設定 */
.auth-wrapper { display: flex; justify-content: center; align-items: center; min-height: 100vh; width: 100vw; background-color: #f0f2f5; font-family: "微軟正黑體", sans-serif; position: absolute; top: 0; left: 0; }
.auth-card { background: white; padding: 45px 40px; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.08); width: 90%; max-width: 420px; box-sizing: border-box; }
.auth-title { text-align: center; color: #2c3e50; margin-top: 0; margin-bottom: 35px; font-weight: 900; font-size: 24px; }
.form-group { margin-bottom: 22px; }
.form-group label { display: block; margin-bottom: 8px; font-weight: bold; color: #34495e; font-size: 15px; }
.auth-input { width: 100%; padding: 14px; border: 1px solid #dcdde1; border-radius: 6px; box-sizing: border-box; font-size: 15px; transition: border-color 0.2s, box-shadow 0.2s; }
.auth-input:focus { outline: none; border-color: #3498db; box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2); }
.auth-btn { width: 100%; padding: 15px; font-size: 16px; margin-top: 15px; letter-spacing: 1px; border-radius: 6px; }
.btn { border: none; cursor: pointer; font-weight: bold; transition: all 0.2s; }
.primary-btn { background-color: #3498db; color: white; }
.primary-btn:hover:not(:disabled) { background-color: #2980b9; transform: translateY(-1px); }
.primary-btn:disabled { background-color: #bdc3c7; cursor: not-allowed; }
.auth-links { margin-top: 30px; text-align: center; font-size: 14px; display: flex; justify-content: center; align-items: center; }
.link-text { color: #3498db; text-decoration: none; font-weight: bold; transition: color 0.2s; }
.link-text:hover { text-decoration: underline; color: #2980b9; }
</style>