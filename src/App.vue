<template>
  <main>
    <!-- 骨架屏載入動畫：取代原本的「系統載入中...」 -->
    <div v-if="session && isCheckingRole" class="skeleton-page">
      <div class="skeleton-header"></div>
      <div class="skeleton-body">
        <div class="skeleton-title"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line" style="width: 70%"></div>
        <div class="skeleton-box"></div>
      </div>
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
body { margin: 0; background-color: #f0f2f5; font-family: "微軟正黑體", sans-serif; }

/* 骨架屏動畫核心 */
@keyframes shimmer {
  0% { background-position: -800px 0; }
  100% { background-position: 800px 0; }
}

.skeleton-header, .skeleton-title, .skeleton-line, .skeleton-box, .skeleton-cell {
  background: #f6f7f8;
  background-image: linear-gradient(to right, #f6f7f8 0%, #edeef1 20%, #f6f7f8 40%, #f6f7f8 100%);
  background-repeat: no-repeat;
  background-size: 800px 100%;
  animation: shimmer 1.5s infinite linear forwards;
  border-radius: 4px;
}

/* 骨架屏版面配置 */
.skeleton-page { max-width: 1000px; margin: 40px auto; padding: 20px; box-sizing: border-box; }
.skeleton-header { height: 75px; width: 100%; margin-bottom: 30px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
.skeleton-body { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
.skeleton-title { height: 28px; width: 40%; margin-bottom: 30px; }
.skeleton-line { height: 18px; width: 100%; margin-bottom: 15px; }
.skeleton-box { height: 300px; width: 100%; margin-top: 30px; border-radius: 8px; }
</style>