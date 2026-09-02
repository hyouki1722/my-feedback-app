<template>
  <div class="admin-wrapper">
    <div class="admin-container">
      <!-- 標題列 -->
      <div class="system-header">
        <h2 class="title">⚙️ 系統管理員後台</h2>
        <button @click="handleLogout" class="btn logout-btn">登出系統</button>
      </div>

      <!-- 頂部切換選單 (Tabs) -->
      <div class="admin-tabs">
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'accounts' }" 
          @click="activeTab = 'accounts'">
          👥 帳號與權限管理
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'assignments' }" 
          @click="activeTab = 'assignments'">
          🔗 學員配對管理
        </button>
      </div>

      <!-- ========================================== -->
      <!-- 畫面一：帳號與權限管理 (accounts)            -->
      <!-- ========================================== -->
      <div v-if="activeTab === 'accounts'">
        
        <!-- 建立新使用者帳號 -->
        <div class="admin-card">
          <h3>➕ 建立新使用者帳號</h3>
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
            <div class="form-row" v-if="newUser.role === 'supervisor'">
              <div class="form-group">
                <label>所屬單位：</label>
                <select v-model="newUser.department" required>
                  <option value="" disabled>請選擇單位</option>
                  <option v-for="dept in departmentOptions" :key="dept" :value="dept">{{ dept }}</option>
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

        <!-- 系統全體人員名單 -->
        <div class="admin-card">
          <div class="card-header-flex">
            <h3>📋 系統人員總覽</h3>
            <div class="search-box">
              <input type="text" v-model="accountSearch" placeholder="🔍 搜尋姓名或信箱..." class="search-input" />
            </div>
          </div>
          <p class="subtitle">管理平台內所有人員（結訓學員或離職員工可在此進行身分變更或資料刪除）：</p>
          
          <!-- 身分快篩標籤區塊 -->
          <div class="filter-group">
            <button class="filter-tag" :class="{ active: accountFilterRole === 'all' }" @click="accountFilterRole = 'all'">全部顯示</button>
            <button class="filter-tag" :class="{ active: accountFilterRole === 'student' }" @click="accountFilterRole = 'student'">學員</button>
            <button class="filter-tag" :class="{ active: accountFilterRole === 'teacher' }" @click="accountFilterRole = 'teacher'">臨床老師</button>
            <button class="filter-tag" :class="{ active: accountFilterRole === 'supervisor' }" @click="accountFilterRole = 'supervisor'">單位主管</button>
            <button class="filter-tag" :class="{ active: accountFilterRole === 'admin' }" @click="accountFilterRole = 'admin'">管理員</button>
          </div>
          
          <div class="table-responsive">
            <table class="assignment-table">
              <thead>
                <tr>
                  <th>姓名</th>
                  <th>登入信箱</th>
                  <th>系統身分</th>
                  <th>資料操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="user in paginatedAccounts" :key="user.id">
                  <td class="user-name">{{ user.name }}</td>
                  <td class="user-email">{{ user.email }}</td>
                  <td><span class="role-badge" :class="user.role">{{ getRoleName(user.role) }}</span></td>
                  <td>
                    <div class="action-buttons">
                      <button @click="openEditModal(user)" class="btn warning-btn small-btn">變更身分</button>
                      <button @click="deleteUser(user)" class="btn danger-btn small-btn">刪除人員</button>
                    </div>
                  </td>
                </tr>
                <tr v-if="filteredAccounts.length === 0">
                  <td colspan="4" class="empty-state">找不到符合條件的人員資料</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="pagination-controls" v-if="accountTotalPages > 1">
            <button @click="accountPage--; scrollToTop()" :disabled="accountPage === 1" class="btn page-btn">上一頁</button>
            <span class="page-info">第 {{ accountPage }} 頁 / 共 {{ accountTotalPages }} 頁 (總計 {{ filteredAccounts.length }} 筆)</span>
            <button @click="accountPage++; scrollToTop()" :disabled="accountPage === accountTotalPages" class="btn page-btn">下一頁</button>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- 畫面二：學員配對管理 (assignments)           -->
      <!-- ========================================== -->
      <div v-if="activeTab === 'assignments'">
        <div class="admin-card">
          <div class="card-header-flex">
            <h3>🔗 學員指導配對管理</h3>
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
                    <select v-model="student.teacher_id" class="table-select">
                      <option :value="null">-- 尚未指派 --</option>
                      <optgroup v-for="(teachersInProf, profName) in groupedTeachers" :key="profName" :label="profName">
                        <option v-for="t in teachersInProf" :key="t.id" :value="t.id">
                          {{ extractCleanName(t.name) || t.email }}
                        </option>
                      </optgroup>
                    </select>
                  </td>
                  <td>
                    <select v-model="student.supervisor_id" class="table-select">
                      <option :value="null">-- 尚未指派 --</option>
                      <optgroup v-for="(supervisorsInDept, deptName) in groupedSupervisors" :key="deptName" :label="deptName">
                        <option v-for="s in supervisorsInDept" :key="s.id" :value="s.id">
                          {{ extractCleanName(s.name) || s.email }}
                        </option>
                      </optgroup>
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

          <div class="pagination-controls" v-if="totalPages > 1">
            <button @click="currentPage--; scrollToTop()" :disabled="currentPage === 1" class="btn page-btn">上一頁</button>
            <span class="page-info">第 {{ currentPage }} 頁 / 共 {{ totalPages }} 頁 (總計 {{ filteredStudents.length }} 筆)</span>
            <button @click="currentPage++; scrollToTop()" :disabled="currentPage === totalPages" class="btn page-btn">下一頁</button>
          </div>
        </div>
      </div>
      
    </div>

    <!-- 身分編輯彈跳視窗 -->
    <div v-if="editModalOpen" class="modal-overlay">
      <div class="modal-content">
        <h3>變更人員身分</h3>
        <p class="subtitle">正在編輯：<strong>{{ editForm.originalName }}</strong></p>
        
        <div class="form-group">
          <label>顯示姓名 (不含職級標籤)：</label>
          <input type="text" v-model="editForm.cleanName" class="modal-input" required />
        </div>
        
        <div class="form-group">
          <label>變更系統身分：</label>
          <select v-model="editForm.role" class="modal-input">
            <option value="student">學員</option>
            <option value="teacher">臨床老師</option>
            <option value="supervisor">單位主管</option>
          </select>
        </div>

        <div class="form-group" v-if="editForm.role === 'teacher'">
          <label>選擇臨床老師職別：</label>
          <select v-model="editForm.profession" class="modal-input">
            <option value="" disabled>請選擇職別</option>
            <option v-for="prof in professionOptions" :key="prof" :value="prof">{{ prof }}</option>
          </select>
        </div>

        <div class="form-group" v-if="editForm.role === 'supervisor'">
          <label>選擇所屬單位：</label>
          <select v-model="editForm.department" class="modal-input">
            <option value="" disabled>請選擇單位</option>
            <option v-for="dept in departmentOptions" :key="dept" :value="dept">{{ dept }}</option>
          </select>
        </div>

        <div class="modal-actions">
          <button @click="editModalOpen = false" class="btn dark-btn">取消</button>
          <button @click="saveRoleChange" class="btn primary-btn">確認變更</button>
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
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
)

const activeTab = ref('accounts') 
const allProfiles = ref([])
const students = ref([])
const teachers = ref([])
const supervisors = ref([])

const professionOptions = ['護理師', '藥師', '呼吸治療師', '物理治療師', '職能治療師', '醫事放射師', '其他']
const departmentOptions = ['2A', '3A', '4A', '5A', '5B', '5C', '6A', '6C', '7C', '8C', 'DR', 'NBC', 'RC', 'PI', 'SI', 'MI', 'CCU']

const isCreating = ref(false)
const newUser = ref({ name: '', role: '', email: '', password: '', profession: '', department: '' })

// 帳號快篩與分頁狀態
const accountSearch = ref('')
const accountFilterRole = ref('all') // 新增：身分快篩
const accountPage = ref(1)

// 配對分頁狀態
const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = 10 

const editModalOpen = ref(false)
const editForm = ref({ id: '', originalName: '', cleanName: '', role: '', profession: '', department: '' })

onMounted(() => {
  loadUsers()
})

async function loadUsers() {
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
  if (data) {
    allProfiles.value = data
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

function scrollToTop() {
  const wrapper = document.querySelector('.admin-wrapper')
  if (wrapper) wrapper.scrollTo({ top: 0, behavior: 'smooth' })
}

// === 帳號總覽過濾邏輯 ===
const filteredAccounts = computed(() => {
  let result = allProfiles.value

  // 1. 先用身分快篩過濾
  if (accountFilterRole.value !== 'all') {
    result = result.filter(u => u.role === accountFilterRole.value)
  }

  // 2. 再用搜尋字串過濾
  if (accountSearch.value) {
    const query = accountSearch.value.toLowerCase()
    result = result.filter(u => 
      (u.name && u.name.toLowerCase().includes(query)) || 
      (u.email && u.email.toLowerCase().includes(query))
    )
  }

  return result
})

const accountTotalPages = computed(() => Math.ceil(filteredAccounts.value.length / itemsPerPage) || 1)
const paginatedAccounts = computed(() => {
  const start = (accountPage.value - 1) * itemsPerPage
  return filteredAccounts.value.slice(start, start + itemsPerPage)
})

// 若搜尋或切換身分，皆自動跳回第一頁
watch([accountSearch, accountFilterRole], () => {
  accountPage.value = 1
})

// === 學員配對過濾邏輯 ===
const filteredStudents = computed(() => {
  if (!searchQuery.value) return students.value
  const query = searchQuery.value.toLowerCase()
  return students.value.filter(s => 
    (s.name && s.name.toLowerCase().includes(query)) || (s.email && s.email.toLowerCase().includes(query))
  )
})
const totalPages = computed(() => Math.ceil(filteredStudents.value.length / itemsPerPage) || 1)
const paginatedStudents = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredStudents.value.slice(start, start + itemsPerPage)
})
watch(searchQuery, () => currentPage.value = 1)

const groupedTeachers = computed(() => {
  const groups = {}
  professionOptions.forEach(p => groups[p] = [])
  teachers.value.forEach(t => {
    const match = t.name?.match(/^\[(.*?)\]\s*(.*)$/)
    if (match && professionOptions.includes(match[1])) groups[match[1]].push(t)
    else { groups['其他'] = groups['其他'] || []; groups['其他'].push(t) }
  })
  Object.keys(groups).forEach(key => { if (groups[key].length === 0) delete groups[key] })
  return groups
})

const groupedSupervisors = computed(() => {
  const groups = {}
  departmentOptions.forEach(d => groups[d] = [])
  supervisors.value.forEach(s => {
    const match = s.name?.match(/^\[(.*?)\]\s*(.*)$/)
    if (match && departmentOptions.includes(match[1])) groups[match[1]].push(s)
    else { groups['其他'] = groups['其他'] || []; groups['其他'].push(s) }
  })
  Object.keys(groups).forEach(key => { if (groups[key].length === 0) delete groups[key] })
  return groups
})

function extractCleanName(fullName) {
  if (!fullName) return ''
  const match = fullName.match(/^\[.*?\]\s*(.*)$/)
  return match ? match[1] : fullName
}
function getPrefix(fullName) {
  const match = fullName?.match(/^\[(.*?)\]/)
  return match ? match[1] : ''
}
function getRoleName(role) {
  const map = { student: '學員', teacher: '臨床老師', supervisor: '單位主管', admin: '管理員' }
  return map[role] || role
}

async function handleCreateUser() {
  isCreating.value = true
  const { data, error } = await authClient.auth.signUp({ email: newUser.value.email, password: newUser.value.password })

  if (error) {
    alert('建立失敗：' + error.message)
  } else if (data?.user) {
    let finalName = newUser.value.name
    if (newUser.value.role === 'teacher' && newUser.value.profession) finalName = `[${newUser.value.profession}] ${finalName}`
    else if (newUser.value.role === 'supervisor' && newUser.value.department) finalName = `[${newUser.value.department}] ${finalName}`

    const { error: profileError } = await supabase.from('profiles').insert([{ id: data.user.id, name: finalName, role: newUser.value.role, email: newUser.value.email }])
    if (profileError) alert('Auth 建立成功，但寫入 profile 失敗：' + profileError.message)
    else {
      alert(`✅ 帳號 ${finalName} 建立成功！`)
      newUser.value = { name: '', role: '', email: '', password: '', profession: '', department: '' }
      await loadUsers() 
    }
  }
  isCreating.value = false
}

function openEditModal(user) {
  editForm.value = {
    id: user.id,
    originalName: user.name,
    cleanName: extractCleanName(user.name),
    role: user.role,
    profession: user.role === 'teacher' ? getPrefix(user.name) : '',
    department: user.role === 'supervisor' ? getPrefix(user.name) : ''
  }
  editModalOpen.value = true
}

async function saveRoleChange() {
  let finalName = editForm.value.cleanName
  if (editForm.value.role === 'teacher' && editForm.value.profession) finalName = `[${editForm.value.profession}] ${finalName}`
  else if (editForm.value.role === 'supervisor' && editForm.value.department) finalName = `[${editForm.value.department}] ${finalName}`

  const { error } = await supabase.from('profiles').update({ name: finalName, role: editForm.value.role }).eq('id', editForm.value.id)
  if (error) alert('更新失敗：' + error.message)
  else {
    alert('✅ 人員身分變更成功！')
    editModalOpen.value = false
    await loadUsers()
  }
}

async function deleteUser(user) {
  if (!confirm(`⚠️ 警告：確定要刪除「${user.name}」嗎？\n這將會清除該員在系統上的所有配對紀錄與心得報告，此動作無法復原！`)) return

  try {
    // 1. 先刪除最外層關聯：所有心得報告
    await supabase.from('feedback_reports').delete().eq('student_id', user.id)
    
    // 2. 刪除配對資料
    await supabase.from('assignments').delete().eq('student_id', user.id)
    await supabase.from('assignments').delete().eq('teacher_id', user.id)
    await supabase.from('assignments').delete().eq('supervisor_id', user.id)
    
    // 3. 最後刪除 Profile 核心資料
    const { error } = await supabase.from('profiles').delete().eq('id', user.id)
    
    if (error) throw error

    alert(`✅ 已成功將 ${user.name} 的資料從平台移除！`)
    await loadUsers()
  } catch (err) {
    alert('刪除過程中發生錯誤：' + err.message)
  }
}

async function saveAssignment(student) {
  if (!student.teacher_id || !student.supervisor_id) return alert('請完整選擇臨床老師與單位主管！')
  const { error } = await supabase.from('assignments').upsert({ student_id: student.id, teacher_id: student.teacher_id, supervisor_id: student.supervisor_id }, { onConflict: 'student_id' })
  if (error) alert('儲存失敗：' + error.message)
  else alert(`✅ 已成功儲存 ${student.name} 的配對資料！`)
}

async function handleLogout() {
  await supabase.auth.signOut()
}
</script>

<style scoped>
.admin-wrapper { position: absolute; top: 0; left: 0; width: 100vw; min-height: 100vh; background-color: #f0f2f5; display: flex; justify-content: center; padding: 40px 20px; box-sizing: border-box; font-family: "微軟正黑體", sans-serif; overflow-y: auto; scroll-behavior: smooth; }
.admin-container { width: 100%; max-width: 1000px; }
.system-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.title { margin: 0; color: #2c3e50; font-size: 24px; }

.admin-tabs { display: flex; gap: 10px; margin-bottom: 25px; border-bottom: 2px solid #ddd; padding-bottom: 10px; }
.tab-btn { background: transparent; border: none; font-size: 18px; font-weight: bold; color: #7f8c8d; padding: 10px 20px; cursor: pointer; transition: 0.3s; border-radius: 8px 8px 0 0; }
.tab-btn:hover { color: #34495e; background: #e8ecef; }
.tab-btn.active { color: #2c3e50; background: white; border-bottom: 4px solid #3498db; box-shadow: 0 -4px 10px rgba(0,0,0,0.02); }

.admin-card { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin-bottom: 25px; border: 1px solid #e1e4e8; }
.card-header-flex { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #ecf0f1; padding-bottom: 10px; margin-bottom: 15px; }
.admin-card h3 { margin: 0; color: #34495e; }
.subtitle { color: #7f8c8d; font-size: 14px; margin-bottom: 15px; }

/* 快篩按鈕群組 */
.filter-group { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
.filter-tag { background: #f1f2f6; border: 1px solid #dfe4ea; padding: 6px 15px; border-radius: 20px; font-size: 14px; cursor: pointer; color: #7f8c8d; font-weight: bold; transition: all 0.2s; }
.filter-tag:hover { background: #dcdde1; color: #2f3542; }
.filter-tag.active { background: #34495e; color: white; border-color: #34495e; }

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
.role-badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; color: white; display: inline-block; }
.role-badge.student { background: #3498db; }
.role-badge.teacher { background: #9b59b6; }
.role-badge.supervisor { background: #e67e22; }
.role-badge.admin { background: #e74c3c; }

.table-select { width: 100%; min-width: 150px; cursor: pointer; }
optgroup { font-weight: bold; color: #2980b9; font-style: normal; }
option { color: #333; font-weight: normal; }
.empty-state { text-align: center; color: #7f8c8d; padding: 30px; }

.pagination-controls { display: flex; justify-content: center; align-items: center; margin-top: 20px; gap: 15px; }
.page-info { font-size: 14px; font-weight: bold; color: #2c3e50; }
.page-btn { background-color: #ecf0f1; color: #333; padding: 6px 15px; }
.page-btn:hover:not(:disabled) { background-color: #bdc3c7; }
.page-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.action-buttons { display: flex; gap: 8px; }
.small-btn { padding: 6px 10px; font-size: 13px; }

.btn { border: none; border-radius: 4px; cursor: pointer; font-weight: bold; transition: background 0.2s; }
.primary-btn { background-color: #3498db; color: white; }
.primary-btn:hover:not(:disabled) { background-color: #2980b9; }
.primary-btn:disabled { background-color: #bdc3c7; cursor: not-allowed; }
.success-btn { background-color: #2ecc71; color: white; padding: 8px 16px; }
.success-btn:hover { background-color: #27ae60; }
.danger-btn { background-color: #e74c3c; color: white; }
.danger-btn:hover { background-color: #c0392b; }
.warning-btn { background-color: #f39c12; color: white; }
.warning-btn:hover { background-color: #d68910; }
.dark-btn { background-color: #2c3e50; color: white; padding: 10px 20px; }
.logout-btn { background-color: #e74c3c; color: white; padding: 10px 20px; }
.logout-btn:hover { background-color: #c0392b; }

/* 彈跳視窗樣式 */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.modal-content { background: white; padding: 25px; border-radius: 8px; width: 90%; max-width: 450px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); font-family: "微軟正黑體", sans-serif; }
.modal-content h3 { margin-top: 0; margin-bottom: 5px; color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 10px; }
.modal-input { width: 100%; padding: 10px; border: 1px solid #999; border-radius: 4px; margin-top: 8px; font-size: 15px; box-sizing: border-box; color: #333; background-color: #fff; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 25px; }
</style>