<template>
  <div class="login-wrapper">
    <div class="login-card">
      <div class="login-header">
        <h2>📘 學習護照系統 - 登入</h2>
      </div>

      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label>登入信箱：</label>
          <input 
            type="email" 
            v-model="email" 
            placeholder="請輸入註冊的 Email" 
            class="form-input" 
            required 
          />
        </div>

        <div class="form-group">
          <label>密碼：</label>
          <input 
            type="password" 
            v-model="password" 
            placeholder="請輸入密碼" 
            class="form-input" 
            required 
          />
          <small class="password-hint">
            💡 預設密碼為身分證字號（第一碼英文字母須為大寫）
          </small>
        </div>

        <button type="submit" class="btn primary-btn btn-block" :disabled="isLoading">
          {{ isLoading ? '登入驗證中...' : '登入系統' }}
        </button>
      </form>

      <div class="login-footer">
        <a href="#" @click.prevent="handleForgotPassword">忘記密碼？</a>
        <span class="divider">|</span>
        <a href="#" @click.prevent="$emit('switch-to-register')">還沒有帳號？點此註冊</a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { supabase } from '../supabase'
import Swal from 'sweetalert2'

const emit = defineEmits(['switch-to-register'])
const email = ref('')
const password = ref('')
const isLoading = ref(false)

async function handleLogin() {
  if (!email.value || !password.value) {
    return Swal.fire({ icon: 'warning', title: '提示', text: '請完整填寫信箱與密碼' })
  }

  isLoading.value = true
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    })

    if (error) throw error

    Swal.fire({ icon: 'success', title: '登入成功', timer: 1500, showConfirmButton: false })
    
    // 💡 關鍵修復：拔除 vue-router，改用原生 JavaScript 強制導向首頁並重整狀態
    window.location.href = '/'
    
  } catch (error) {
    let errorMsg = '帳號或密碼錯誤，請重新確認'
    if (error.message === 'Invalid login credentials') {
      errorMsg = '帳號或密碼輸入錯誤，請重新檢查。'
    }
    Swal.fire({ icon: 'error', title: '登入失敗', text: errorMsg, confirmButtonColor: '#3498db' })
  } finally {
    isLoading.value = false
  }
}

async function handleForgotPassword() {
  const { value: resetEmail } = await Swal.fire({
    title: '重設密碼',
    input: 'email',
    inputLabel: '請輸入您的註冊信箱',
    inputPlaceholder: 'example@hospital.com',
    showCancelButton: true,
    confirmButtonText: '寄送重設信件',
    cancelButtonText: '取消',
    confirmButtonColor: '#3498db',
    cancelButtonColor: '#7f8c8d'
  })

  if (resetEmail) {
    Swal.fire({ title: '處理中...', text: '正在準備寄送重設信', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } })
    
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: window.location.origin,
    })

    if (error) {
      Swal.fire({ icon: 'error', title: '發送失敗', text: error.message, confirmButtonColor: '#3498db' })
    } else {
      Swal.fire({ 
        icon: 'success', 
        title: '重設信已寄出！', 
        text: '請至您的信箱點擊「Reset Password」連結。', 
        confirmButtonColor: '#2ecc71' 
      })
    }
  }
}
</script>

<style scoped>
.login-wrapper {
  background-color: #f0f2f5;
  min-height: 100vh;
  width: 100vw;
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: "微軟正黑體", sans-serif;
}

.login-card {
  background: white;
  width: 100%;
  max-width: 400px;
  padding: 40px 30px;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  border: 1px solid #e1e4e8;
  box-sizing: border-box;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-header h2 {
  margin: 0;
  color: #2c3e50;
  font-weight: 900;
  font-size: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-weight: bold;
  margin-bottom: 8px;
  color: #2c3e50;
}

/* 🏆 關鍵修改：增強 CSS 權重，強制所有 input 聽從這個樣式 */
.form-group input.form-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #dcdde1 !important; /* 強制覆蓋預設黑框 */
  border-radius: 6px !important;       /* 強制覆蓋圓角 */
  box-sizing: border-box;
  font-size: 15px;
  font-family: inherit;
  transition: border-color 0.2s;
  background-color: white;
  color: #2c3e50;
}

.form-group input.form-input:focus {
  outline: none !important;
  border-color: #3498db !important;
  box-shadow: 0 0 5px rgba(52, 152, 219, 0.3) !important;
}

.password-hint {
  color: #7f8c8d;
  font-size: 13px;
  margin-top: 5px;
  display: block;
}

.btn {
  padding: 12px 20px;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.btn-block {
  width: 100%;
  display: block;
  margin-top: 10px;
  letter-spacing: 1px;
}

.primary-btn {
  background: #3498db;
  color: white;
}

.btn:hover:not(:disabled) {
  background-color: #2980b9;
  transform: translateY(-1px);
}

.btn:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
  transform: none;
}

.login-footer {
  margin-top: 25px;
  text-align: center;
  font-size: 14px;
}

.login-footer a {
  color: #3498db;
  text-decoration: none;
  font-weight: bold;
  transition: color 0.2s;
}

.login-footer a:hover {
  text-decoration: underline;
  color: #2980b9;
}

.divider {
  margin: 0 10px;
  color: #bdc3c7;
}
</style>