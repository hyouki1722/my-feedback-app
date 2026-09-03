<template>
  <main>
    <div v-if="session && isCheckingRole" class="global-loading">
      系統載入中...
    </div>
    <template v-else-if="session && !isCheckingRole">
      <AdminDashboard v-if="userRole === 'admin'" />
      <FeedbackForm v-else :session="session" :user-role="userRole" />
    </template>
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
      userRole.value = '' 
    }
  })
})

async function checkUserRole(userId) {
  isCheckingRole.value = true
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (error || !data) {
    console.error('讀取使用者身分失敗：', error)
    userRole.value = ''
    isCheckingRole.value = false
    alert('您的帳號資料異常（可能已被停用或刪除），請聯繫系統管理員。系統將自動登出。')
    await supabase.auth.signOut()
    return
  }

  userRole.value = data.role
  isCheckingRole.value = false
}
</script>

<style>
body { margin: 0; background-color: #ecf0f1; }
.global-loading { text-align: center; margin-top: 100px; font-size: 20px; color: #7f8c8d; }
</style>