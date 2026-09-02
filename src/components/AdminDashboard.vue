<template>
  <div class="admin-wrapper">
    <div class="admin-container">
      <!-- 標題列 -->
      <div class="system-header">
        <h2 class="title">⚙️ 系統管理員後台</h2>
        <button @click="handleLogout" class="btn logout-btn">登出系統</button>
      </div>

      <!-- 區塊一：建立新使用者帳號 -->
      <div class="admin-card">
        <h3>➕ 建立新使用者帳號</h3>
        <p class="subtitle">在此統一建立學員、臨床老師或單位主管的預設帳號：</p>
        
        <form @submit.prevent="handleCreateUser" class="create-form">
          <div class="form-row">
            <div class="form-group">
              <label>姓名：</label>
              <input type="text" v-model="newUser.name" placeholder="請輸入姓名" required />
            </div>
            <div class="form-group">
              <label>身分：</label>
              <select v-model="newUser.role" required>
                <option value="" disabled>請選擇身分</option>
                <option value="student">學員</option>
                <option value="teacher">臨床老師</option>
                <option value="supervisor">單位主管</option>
              </select>
            </div>
          </div>

          <!-- 當選擇身分為「老師」時，才顯示職別選單 -->
          <div class="form-row" v-if="newUser.role === 'teacher'">
            <div class="form-group">
              <label>臨床老師職別：</label>
              <select v-model="newUser.profession" required>
                <option value="" disabled>請選擇職別</option>
                <option v-for="prof in professionOptions" :key="prof" :value="prof">{{ prof }}</option>
              </select>
            </div>
            <div class="form-group"></div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Email 帳號：</label>
              <input type="email" v-model="newUser.email" placeholder="請輸入登入信箱" required />
            </div>
            <div class="form-group">
              <label>預設密碼 (至少 6 碼)：</label>
              <input type="password" v-model="newUser.password" placeholder="請輸入預設密碼" minlength="6" required />
            </div>
          </div>
          
          <div class="action-row">
            <button type="submit" class="btn primary-btn submit-btn" :disabled="isCreating">
              {{ isCreating ? '帳號建立中...' : '確認建立帳號' }}
            </button>
          </div>
        </form>
      </div>

      <!-- 區塊二：學員配對管理 -->
      <div class="admin-card">
        <div class="card-header-flex">
          <h3>🔗 學員指導配對管理</h3>
          <!-- 搜尋框 -->
          <div class="search-box">
            <input type="text" v-model="searchQuery" placeholder="🔍 搜尋學員姓名或信箱..." class="search-input" />
          </div>
        </div>
        <p class="subtitle">請為每位學員指派對應的臨床老師與單位主管 (搭配搜尋功能可快速尋找)：</p>
        
        <div class="table-responsive">
          <table class="assignment-table">
            <thead>
              <tr>
                <th>學員姓名 / 信箱</th>
                <th>指派臨床老師</th>
                <th>指派單位主管</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="student in paginatedStudents" :key="student.id">
                <td>
                  <div class="user-name">{{ student.name || '未命名' }}</div>
                  <div class="user-email">{{ student.email }}</div>
                </td>
                <td>
                  <!-- 老師下拉選單：加入群組分類 -->
                  <select v-model="student.teacher_id" class="table-select">
                    <option :value="null">-- 尚未指派 --</option>
                    <optgroup v-for="(teachersInProf, profName) in groupedTeachers" :key="profName" :label="profName">
                      <option v-for="t in teachersInProf" :key="t.id" :value="t.id">
                        {{ extractCleanName(t.name) || t.email }}
                      </option>
                    </optgroup>
                    <!-- 處理舊資料沒有職別標籤的老師 -->
                    <optgroup v-if="ungroupedTeachers.length > 0" label="其他 / 未分類">
                      <option v-for="t in ungroupedTeachers" :key="t.id" :value="t.id">
                        {{ t.name || t.email }}
                      </option>
                    </optgroup>
                  </select>
                </td>
                <td>
                  <select v-model="student.supervisor_id" class="table-select">
                    <option :value="null">-- 尚未指派 --</option>
                    <option v-for="s in supervisors" :key="s.id" :value="s.id">{{ s.name || s.email }}</option>
                  </select>
                </td>
                <td>
                  <button @click="saveAssignment(student)" class="btn success-btn">儲存配對</button>
                </td>
              </tr>
              <tr v-if="filteredStudents.length === 0">
                <td colspan="4" class="empty-state">找不到符合條件的學員資料</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 分頁控制區 -->
        <div class="pagination-controls" v-if="totalPages > 1">
          <button @click="currentPage--" :disabled="currentPage === 1" class="btn page-btn">上一頁</button>
          <span class="page-info">第 {{ currentPage }} 頁 / 共 {{ totalPages }} 頁 (總計 {{ filteredStudents.length }} 筆)</span>
          <button @click="currentPage++" :disabled="currentPage === totalPages" class="btn page-btn">下一頁</button>
        </div>
      </div>
      
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../supabase'

const authClient = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
)

const students = ref([])
const teachers = ref([])
const supervisors = ref([])

const professionOptions = [
  '護理師', '藥師', '呼吸治療師', '物理治療師', '職能治療師', '醫事放射師', '其他'
]

const isCreating = ref(false)
const newUser = ref({
  name: '',
  role: '',
  email: '',
  password: '',
  profession: '' // 新增職別欄位
})

const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = 10 

onMounted(() => {
  loadUsers()
})

async function loadUsers() {
  const { data, error } = await supabase.from('profiles').select('*')
  if (data) {
    students.value = data.filter(u => u.role === 'student').map(s => ({ ...s, teacher_id: null, supervisor_id: null }))
    teachers.value = data.filter(u => u.role === 'teacher')
    supervisors.value = data.filter(u => u.role === 'supervisor')
    
    const { data: assigns } = await supabase.from('assignments').select('*')
    if (assigns) {
      students.value.forEach(s => {
        const match = assigns.find(a => a.student_id === s.id)
        if (match) {
          s.teacher_id = match.teacher_id
          s.supervisor_id = match.supervisor_id
        }
      })
    }
  }
}

// 將老師依照 [職別] 分組的計算屬性
const groupedTeachers = computed(() => {
  const groups = {}
  professionOptions.forEach(p => groups[p] = [])
  
  teachers.value.forEach(t => {
    const match = t.name?.match(/^\[(.*?)\]\s*(.*)$/)
    if (match && professionOptions.includes(match[1])) {
      groups[match[1]].push(t)
    }
  })
  
  // 移除空的群組
  Object.keys(groups).forEach(key => {
    if (groups[key].length === 0) delete groups[key]
  })
  
  return groups
})

// 處理沒有職別標籤的舊有老師資料
const ungroupedTeachers = computed(() => {
  return teachers.value.filter(t => {
    const match = t.name?.match(/^\[(.*?)\]\s*(.*)$/)
    return !match || !professionOptions.includes(match[1])
  })
})

// 為了在下拉選單中去掉 [職別] 前綴，讓畫面乾淨
function extractCleanName(fullName) {
  if (!fullName) return ''
  const match = fullName.match(/^\[.*?\]\s*(.*)$/)
  return match ? match[1] : fullName
}

const filteredStudents = computed(() => {
  if (!searchQuery.value) return students.value
  const query = searchQuery.value.toLowerCase()
  return students.value.filter(s => 
    (s.name && s.name.toLowerCase().includes(query)) || 
    (s.email && s.email.toLowerCase().includes(query))
  )
})

const totalPages = computed(() => {
  return Math.ceil(filteredStudents.value.length / itemsPerPage) || 1
})

const paginatedStudents = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredStudents.value.slice(start, end)
})

watch(searchQuery, () => {
  currentPage.value = 1
})

async function handleCreateUser() {
  isCreating.value = true
  
  const { data, error } = await authClient.auth.signUp({
    email: newUser.value.email,
    password: newUser.value.password,
  })

  if (error) {
    alert('建立失敗：' + error.message)
  } else if (data?.user) {
    // 組合名字。如果是老師，將職別包在括號內加上名字前綴
    let finalName = newUser.value.name
    if (newUser.value.role === 'teacher' && newUser.value.profession) {
      finalName = `[${newUser.value.profession}] ${finalName}`
    }

    const { error: profileError } = await supabase.from('profiles').insert([{
      id: data.user.id,
      name: finalName, // 存入組合好的名字
      role: newUser.value.role,
      email: newUser.value.email
    }])

    if (profileError) {
      alert('Auth 建立成功，但寫入 profile 失敗：' + profileError.message)
    } else {
      alert(`✅ 帳號 ${finalName} (${newUser.value.role}) 建立成功！`)
      newUser.value = { name: '', role: '', email: '', password: '', profession: '' }
      await loadUsers() 
    }
  }
  
  isCreating.value = false
}

async function saveAssignment(student) {
  if (!student.teacher_id || !student.supervisor_id) {
    return alert('請完整選擇臨床老師與單位主管！')
  }

  const { error } = await supabase
    .from('assignments')
    .upsert({ 
      student_id: student.id, 
      teacher_id: student.teacher_id, 
      supervisor_id: student.supervisor_id 
    }, { onConflict: 'student_id' })

  if (error) {
    alert('儲存失敗：' + error.message)
  } else {
    alert(`✅ 已成功儲存 ${student.name} 的配對資料！`)
  }
}

async function handleLogout() {
  await supabase.auth.signOut()
}
</script>

<style scoped>
.admin-wrapper { position: absolute; top: 0; left: 0; width: 100vw; min-height: 100vh; background-color: #f0f2f5; display: flex; justify-content: center; padding: 40px 20px; box-sizing: border-box; font-family: "微軟正黑體", sans-serif; overflow-y: auto; }
.admin-container { width: 100%; max-width: 900px; }
.system-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
.title { margin: 0; color: #2c3e50; font-size: 24px; }
.admin-card { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin-bottom: 25px; border: 1px solid #e1e4e8; }
.card-header-flex { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #ecf0f1; padding-bottom: 10px; margin-bottom: 15px; }
.admin-card h3 { margin: 0; color: #34495e; }
.subtitle { color: #7f8c8d; font-size: 14px; margin-bottom: 20px; }
.search-input { padding: 8px 12px; border: 1px solid #ccc; border-radius: 20px; width: 250px; font-size: 14px; outline: none; transition: border-color 0.2s; }
.search-input:focus { border-color: #3498db; }
.form-row { display: flex; gap: 20px; margin-bottom: 15px; }
.form-group { flex: 1; }
label { display: block; font-size: 14px; font-weight: bold; color: #333; margin-bottom: 8px; }
input, select { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; box-sizing: border-box; }
.action-row { display: flex; justify-content: flex-end; margin-top: 20px; }
.submit-btn { padding: 12px 30px; font-size: 16px; }
.table-responsive { overflow-x: auto; }
.assignment-table { width: 100%; border-collapse: collapse; }
.assignment-table th, .assignment-table td { border: 1px solid #ddd; padding: 12px; text-align: left; vertical-align: middle; color: #333333; }
.assignment-table th { background-color: #f8f9fa; font-weight: bold; color: #1a1a1a; }
.user-name { font-weight: bold; color: #2c3e50; }
.user-email { font-size: 13px; color: #7f8c8d; margin-top: 4px; }
.table-select { width: 100%; min-width: 150px; cursor: pointer; }
optgroup { font-weight: bold; color: #2980b9; font-style: normal; }
option { color: #333; font-weight: normal; }
.empty-state { text-align: center; color: #7f8c8d; padding: 30px; }
.pagination-controls { display: flex; justify-content: center; align-items: center; margin-top: 20px; gap: 15px; }
.page-info { font-size: 14px; font-weight: bold; color: #2c3e50; }
.page-btn { background-color: #ecf0f1; color: #333; padding: 6px 15px; }
.page-btn:hover:not(:disabled) { background-color: #bdc3c7; }
.page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn { border: none; border-radius: 4px; cursor: pointer; font-weight: bold; transition: background 0.2s; }
.primary-btn { background-color: #3498db; color: white; }
.primary-btn:hover:not(:disabled) { background-color: #2980b9; }
.primary-btn:disabled { background-color: #bdc3c7; cursor: not-allowed; }
.success-btn { background-color: #2ecc71; color: white; padding: 8px 16px; }
.success-btn:hover { background-color: #27ae60; }
.logout-btn { background-color: #e74c3c; color: white; padding: 10px 20px; }
.logout-btn:hover { background-color: #c0392b; }
</style>