<template>
  <div class="login-wrapper">
    <div class="login-container">
      <h1 class="login-main-title">📘 學習護照心得回饋系統</h1>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label>Email 帳號：</label>
          <input type="email" v-model="email" placeholder="請輸入登入帳號" autocomplete="email" required />
        </div>
        <div class="form-group">
          <label>密碼：</label>
          <input type="password" v-model="password" placeholder="請輸入密碼" autocomplete="current-password" required />
        </div>
        <button type="submit" class="primary-btn" :disabled="isLoading">
          {{ isLoading ? '登入中...' : '登入' }}
        </button>
      </form>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      
      <div class="switch-mode">
        還沒有帳號嗎？ <a href="#" @click.prevent="$emit('switch-to-register')">點此註冊</a>
      </div>
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
    localStorage.setItem('rememberedEmail', email.value)
    alert('登入成功！')
    location.reload()
  }
  
  isLoading.value = false
}
</script>

<style scoped>
.login-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f0f2f5;
  box-sizing: border-box;
}

.login-container { 
  width: 100%;
  max-width: 380px; 
  padding: 30px; 
  background: white; 
  border: 1px solid #ddd; 
  border-radius: 8px; 
  box-shadow: 0 4px 12px rgba(0,0,0,0.1); 
  font-family: "微軟正黑體", sans-serif; 
  box-sizing: border-box;
}

h2 { text-align: center; color: #2c3e50; margin-top: 0; margin-bottom: 20px; }
.form-group { margin-bottom: 15px; }
label { font-size: 14px; font-weight: bold; color: #333; display: block; margin-bottom: 5px; }
input { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; font-size: 14px; }
.primary-btn { width: 100%; padding: 12px; background-color: #34495e; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 16px; margin-top: 10px; }
.primary-btn:disabled { background-color: #95a5a6; cursor: not-allowed; }
.primary-btn:hover:not(:disabled) { background-color: #2c3e50; }
.error { color: #e74c3c; font-size: 14px; margin-top: 10px; text-align: center; font-weight: bold; }

.switch-mode { margin-top: 20px; text-align: center; font-size: 14px; }
.switch-mode a { color: #3498db; text-decoration: none; font-weight: bold; }
.login-main-title {
  text-align: center;
  color: #2c3e50;
  font-size: 28px;
  font-weight: 900;
  letter-spacing: 2px;
  margin-bottom: 25px;
}
</style>