<template>
  <div class="auth-wrapper">
    <div class="auth-card">
      <h2 class="auth-title">📘 學習護照系統 - 登入</h2>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label>登入信箱：</label>
          <input type="email" v-model="email" placeholder="請輸入註冊的 Email" required class="auth-input" />
        </div>
        <div class="form-group">
          <label>密碼：</label>
          <input type="password" v-model="password" placeholder="請輸入密碼 (預設為身分證字號)" required class="auth-input" />
        </div>
        <button type="submit" class="btn primary-btn auth-btn" :disabled="isLoading">
          {{ isLoading ? '登入驗證中...' : '登入系統' }}
        </button>
      </form>
      
      <div class="auth-links">
        <a href="#" @click.prevent="handleForgotPassword" class="link-text">忘記密碼？</a>
        <span class="divider">|</span>
        <a href="#" @click.prevent="$emit('switch-to-register')" class="link-text">還沒有帳號？點此註冊</a>
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

// 處理一般登入
async function handleLogin() {
  isLoading.value = true
  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  })
  
  if (error) {
    let errorMsg = error.message
    if (error.message === 'Invalid login credentials') errorMsg = '帳號或密碼輸入錯誤，請重新檢查。'
    Swal.fire({ icon: 'error', title: '登入失敗', text: errorMsg, confirmButtonColor: '#3498db' })
  }
  isLoading.value = false
}

// 處理忘記密碼：彈出輸入框並呼叫 Supabase 重設 API
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
    
    // 呼叫 Supabase 內建的密碼重設 API
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: window.location.origin, // 重設完畢後導回系統首頁
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
.auth-wrapper { display: flex; justify-content: center; align-items: center; min-height: 100vh; width: 100vw; background-color: #f0f2f5; font-family: "微軟正黑體", sans-serif; position: absolute; top: 0; left: 0; }
.auth-card { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); width: 90%; max-width: 420px; box-sizing: border-box; }
.auth-title { text-align: center; color: #2c3e50; margin-top: 0; margin-bottom: 30px; font-weight: 900; }
.form-group { margin-bottom: 20px; }
.form-group label { display: block; margin-bottom: 8px; font-weight: bold; color: #34495e; font-size: 15px; }
.auth-input { width: 100%; padding: 12px; border: 1px solid #dcdde1; border-radius: 6px; box-sizing: border-box; font-size: 15px; transition: border-color 0.2s; }
.auth-input:focus { outline: none; border-color: #3498db; box-shadow: 0 0 5px rgba(52, 152, 219, 0.3); }
.auth-btn { width: 100%; padding: 14px; font-size: 16px; margin-top: 10px; letter-spacing: 1px; }

.btn { border: none; border-radius: 6px; cursor: pointer; font-weight: bold; transition: background 0.2s; }
.primary-btn { background-color: #3498db; color: white; }
.primary-btn:hover:not(:disabled) { background-color: #2980b9; }
.primary-btn:disabled { background-color: #bdc3c7; cursor: not-allowed; }

.auth-links { margin-top: 25px; text-align: center; font-size: 14px; }
.link-text { color: #3498db; text-decoration: none; font-weight: bold; transition: color 0.2s; }
.link-text:hover { text-decoration: underline; color: #2980b9; }
.divider { margin: 0 12px; color: #bdc3c7; }
</style>