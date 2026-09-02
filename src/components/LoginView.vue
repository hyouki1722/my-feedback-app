<template>
  <div class="login-container">
    <h2>系統登入</h2>
    
    <!-- 加入 form 標籤，並綁定 @submit.prevent，即可實現「按 Enter 直接送出」 -->
    <form @submit.prevent="handleLogin">
      <div class="form-group">
        <label>Email 帳號：</label>
        <!-- 加入 autocomplete="email" 輔助瀏覽器記憶 -->
        <input 
          type="email" 
          v-model="email" 
          placeholder="請輸入測試帳號" 
          autocomplete="email"
          required 
        />
      </div>

      <div class="form-group">
        <label>密碼：</label>
        <!-- 加入 autocomplete="current-password" 輔助瀏覽器記憶密碼 -->
        <input 
          type="password" 
          v-model="password" 
          placeholder="請輸入密碼" 
          autocomplete="current-password"
          required 
        />
      </div>

      <!-- 按鈕 type 必須設為 submit 才能觸發表單送出 -->
      <button type="submit" class="primary-btn" :disabled="isLoading">
        {{ isLoading ? '登入中...' : '登入' }}
      </button>
    </form>
    
    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    
    <div class="switch-mode">
      還沒有帳號嗎？ <a href="#" @click.prevent="$emit('switch-to-register')">點此註冊</a>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../supabase'

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const isLoading = ref(false)

const emit = defineEmits(['switch-to-register'])

// 網頁載入時，自動從瀏覽器 localStorage 讀取上次成功登入的帳號
onMounted(() => {
  const savedEmail = localStorage.getItem('rememberedEmail')
  if (savedEmail) {
    email.value = savedEmail
  }
})

async function handleLogin() {
  if (!email.value || !password.value) {
    errorMessage.value = '請完整填寫帳號與密碼！'
    return
  }
  
  isLoading.value = true
  errorMessage.value = ''

  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  })

  if (error) {
    errorMessage.value = '登入失敗：' + error.message
  } else {
    // 登入成功時，將帳號記憶到瀏覽器的 localStorage 中
    localStorage.setItem('rememberedEmail', email.value)
    
    alert('登入成功！')
    location.reload()
  }
  
  isLoading.value = false
}
</script>

<style scoped>
.login-container { max-width: 380px; margin: 40px auto; padding: 25px; background: white; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); font-family: "微軟正黑體", sans-serif; }
h2 { text-align: center; color: #2c3e50; margin-bottom: 20px; }
.form-group { margin-bottom: 15px; }
label { font-size: 14px; font-weight: bold; color: #333; display: block; margin-bottom: 5px; }
input { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; font-size: 14px; }
.primary-btn { width: 100%; padding: 12px; background-color: #34495e; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 16px; margin-top: 10px; }
.primary-btn:disabled { background-color: #95a5a6; cursor: not-allowed; }
.primary-btn:hover:not(:disabled) { background-color: #2c3e50; }
.error { color: #e74c3c; font-size: 14px; margin-top: 10px; text-align: center; }
.switch-mode { margin-top: 20px; text-align: center; font-size: 14px; }
.switch-mode a { color: #3498db; text-decoration: none; font-weight: bold; }
</style>