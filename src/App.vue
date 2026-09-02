<template>
  <main>
    <!-- 正在檢查身分時顯示載入中 -->
    <div v-if="session && isCheckingRole" class="global-loading">
      系統載入中...
    </div>

    <!-- 已登入且確認身分後：根據角色顯示對應畫面 -->
    <template v-else-if="session && !isCheckingRole">
      <AdminDashboard v-if="userRole === 'admin'" />
      <FeedbackForm v-else :session="session" :user-role="userRole" />
    </template>
    
    <!-- 未登入：切換登入與註冊畫面 -->
    <template v-else>
      <LoginView v-if="currentMode === 'login'" @switch-to-register="currentMode = 'register'" />
      <RegisterView v-if="currentMode === 'register'" @switch-to-login="currentMode = 'login'" />
    </template>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from './supabase'
import LoginView from './components/LoginView.vue'
import RegisterView from './components/RegisterView.vue'
import FeedbackForm from './components/FeedbackForm.vue'
import AdminDashboard from './components/AdminDashboard.vue'

const session = ref(null)
const currentMode = ref('login')
const userRole = ref('')
const isCheckingRole = ref(false)

onMounted(() => {
  supabase.auth.getSession().then(({ data }) => {
    session.value = data.session
    if (session.value) checkUserRole(session.value.user.id)
  })

  supabase.auth.onAuthStateChange((_event, _session) => {
    session.value = _session
    if (_session) {
      checkUserRole(_session.user.id)
    } else {
      userRole.value = '' // 登出時清空角色
    }
  })
})

// 從 profiles 資料表檢查登入者的角色
async function checkUserRole(userId) {
  isCheckingRole.value = true
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()
    
  if (data) {
    userRole.value = data.role
  }
  isCheckingRole.value = false
}
</script>

<style>
/* 全域樣式，可選 */
body { margin: 0; background-color: #ecf0f1; }
.global-loading { text-align: center; margin-top: 100px; font-size: 20px; color: #7f8c8d; }
</style>