<template>
  <div class="login-container">
    <h2>註冊臨床實習系統</h2>
    
    <!-- 新增姓名輸入欄位 -->
    <div class="form-group">
      <label>真實姓名：</label>
      <input type="text" v-model="name" placeholder="請輸入您的真實姓名" />
    </div>

    <div class="form-group">
      <label>Email 信箱 (帳號)：</label>
      <input type="email" v-model="email" placeholder="請輸入醫院或學校信箱" />
    </div>
    
    <div class="form-group">
      <label>設定密碼：</label>
      <input type="password" v-model="password" placeholder="請設定至少 6 位數密碼" />
    </div>

    <div class="form-group">
      <label>請選擇您的身分：</label>
      <select v-model="role" class="role-select">
        <option value="" disabled>-- 請選擇身分 --</option>
        <option value="student">👨‍🎓 學員</option>
        <option value="teacher">👨‍🏫 臨床老師</option>
        <option value="supervisor">🏥 單位主管</option>
      </select>
    </div>

    <button @click="handleRegister" class="primary-btn" :disabled="isLoading">
      {{ isLoading ? '註冊中...' : '確認註冊' }}
    </button>
    
    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    
    <div class="switch-mode">
      已經有帳號了嗎？ <a href="#" @click.prevent="$emit('switch-to-login')">返回登入</a>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { supabase } from '../supabase'

const name = ref('')
const email = ref('')
const password = ref('')
const role = ref('')
const errorMessage = ref('')
const isLoading = ref(false)

const emit = defineEmits(['switch-to-login'])

async function handleRegister() {
  if (!name.value || !email.value || !password.value || !role.value) {
    errorMessage.value = '請完整填寫姓名、信箱、密碼與身分！'
    return
  }
  
  isLoading.value = true
  errorMessage.value = ''

  // 1. 在 Supabase Auth 建立帳號密碼
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: email.value,
    password: password.value,
  })

  if (authError) {
    errorMessage.value = '註冊失敗：' + authError.message
    isLoading.value = false
    return
  }

  // 2. 將姓名與身分寫入 profiles 資料表
  const userId = authData.user?.id
  if (userId) {
    const { error: profileError } = await supabase.from('profiles').insert([
      { id: userId, name: name.value, email: email.value, role: role.value }
    ])

    if (profileError) {
      errorMessage.value = '身分設定失敗，請聯繫管理員。'
      console.error(profileError)
    } else {
      alert('註冊成功！系統將自動登入。')
      location.reload()
    }
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
.role-select { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; background: #fff; cursor: pointer; }
.primary-btn { width: 100%; padding: 12px; background-color: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 16px; margin-top: 10px; }
.primary-btn:disabled { background-color: #95a5a6; cursor: not-allowed; }
.error { color: #e74c3c; font-size: 14px; margin-top: 10px; text-align: center; }
.switch-mode { margin-top: 20px; text-align: center; font-size: 14px; }
.switch-mode a { color: #3498db; text-decoration: none; font-weight: bold; }
</style>