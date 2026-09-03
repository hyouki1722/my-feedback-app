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
import Swal from 'sweetalert2'
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
    
    await Swal.fire({
      icon: 'error',
      title: '帳號狀態異常',
      text: '您的帳號可能已被停用或刪除，請聯繫系統管理員。',
      confirmButtonColor: '#3498db'
    })
    
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