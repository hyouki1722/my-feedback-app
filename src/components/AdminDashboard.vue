<template>
  <div class="app-wrapper">
    <div class="admin-container">
      <div class="admin-header">
        <div class="header-titles">
          <h2>⚙️ 系統管理員後台</h2>
        </div>
        <button @click="handleLogout" class="btn dark-btn">登出系統</button>
      </div>

      <!-- 頁籤切換 -->
      <div class="tabs">
        <button :class="{ active: activeTab === 'users' }" @click="activeTab = 'users'">👥 帳號與權限管理</button>
        <button :class="{ active: activeTab === 'pairing' }" @click="activeTab = 'pairing'">🔗 學員配對管理</button>
      </div>

      <!-- 帳號管理區塊 -->
      <div v-if="activeTab === 'users'" class="tab-content">
        
        <!-- 批次匯入區塊 -->
        <div class="admin-card">
          <div class="card-header-flex">
            <div class="card-header-text">
              <h3>📊 Excel 批次匯入帳號</h3>
              <p class="desc">請依照系統匯出的報表格式上傳，密碼將預設為「身分證字號」。</p>
            </div>
            <div class="import-actions">
              <button @click="downloadTemplate" class="btn dark-btn">下載範本格式</button>
              <input type="file" ref="fileInput" @change="handleFileUpload" accept=".xlsx, .xls" style="display: none" id="excel-upload" />
              <label for="excel-upload" class="btn success-btn">上傳人事報表</label>
            </div>
          </div>
        </div>

        <!-- 單筆建立區塊 -->
        <div class="admin-card">
          <h3>➕ 單筆建立使用者帳號</h3>
          <form @submit.prevent="createUser" class="create-form">
            <div class="form-row">
              <div class="form-group">
                <label>姓名：</label>
                <input type="text" v-model="newUser.name" required placeholder="例如：王小明">
              </div>
              <div class="form-group">
                <label>身分：</label>
                <select v-model="newUser.role">
                  <option value="student">受訓人員 (學員)</option>
                  <option value="teacher">臨床指導老師</option>
                  <option value="supervisor">單位主管</option>
                  <option value="admin">系統管理員</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Email 帳號：</label>
                <input type="email" v-model="newUser.email" required placeholder="例如：user@hospital.com">
              </div>
              <div class="form-group">
                <label>預設密碼 (建議使用身分證號)：</label>
                <input type="text" v-model="newUser.password" required placeholder="至少 6 碼">
              </div>
            </div>
            <button type="submit" class="btn primary-btn" :disabled="isCreating">
              {{ isCreating ? '建立中...' : '確認建立單筆帳號' }}
            </button>
          </form>
        </div>

        <!-- 人員總覽清單 -->
        <div class="admin-card">
          <div class="card-header-flex align-center" style="margin-bottom: 0;">
            <h3 style="margin-bottom: 0; border: none;">📋 系統人員總覽</h3>
            
            <!-- 身分角色篩選按鈕 -->
            <div class="filter-tabs">
              <button :class="{ active: roleFilter === 'all' }" @click="roleFilter = 'all'">全部</button>
              <button :class="{ active: roleFilter === 'student' }" @click="roleFilter = 'student'">學員</button>
              <button :class="{ active: roleFilter === 'teacher' }" @click="roleFilter = 'teacher'">指導老師</button>
              <button :class="{ active: roleFilter === 'supervisor' }" @click="roleFilter = 'supervisor'">單位主管</button>
              <button :class="{ active: roleFilter === 'admin' }" @click="roleFilter = 'admin'">管理員</button>
            </div>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>姓名</th>
                  <th>Email</th>
                  <th>身分角色</th>
                  <th>建立時間</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <!-- 改為渲染 paginatedUsers (分頁後的資料) -->
                <tr v-for="user in paginatedUsers" :key="user.id">
                  <td><strong>{{ user.name }}</strong></td>
                  <td>{{ user.email }}</td>
                  <td><span class="role-badge" :class="user.role">{{ getRoleName(user.role) }}</span></td>
                  <td>{{ formatDate(user.created_at) }}</td>
                  <td>
                    <button @click="deleteUser(user.id)" class="btn danger-btn small-btn">刪除人員</button>
                  </td>
                </tr>
                <tr v-if="filteredUsers.length === 0">
                  <td colspan="5" class="empty-state">此分類下尚無人員資料</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 分頁控制區塊 -->
          <div class="pagination-controls" v-if="totalPages > 1">
            <button @click="prevPage" :disabled="currentPage === 1" class="page-btn">上一頁</button>
            <span class="page-info">第 {{ currentPage }} 頁 / 共 {{ totalPages }} 頁</span>
            <button @click="nextPage" :disabled="currentPage === totalPages" class="page-btn">下一頁</button>
          </div>
        </div>
      </div>

      <!-- 配對管理區塊 -->
      <div v-if="activeTab === 'pairing'" class="tab-content">
        <div class="admin-card">
          <h3>🔗 學員與指導者配對設定</h3>
          <p class="desc">請為每位學員指定對應的臨床指導老師與單位主管，設定後系統才會自動派發通知信。</p>
          
          <div class="table-responsive">
            <table class="data-table pairing-table">
              <thead>
                <tr>
                  <th>受訓學員</th>
                  <th>臨床指導老師</th>
                  <th>單位主管</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="student in students" :key="student.id">
                  <td><strong>{{ student.name }}</strong></td>
                  <td>
                    <select v-model="assignmentData[student.id].teacher_id" class="pairing-select">
                      <option value="">-- 請選擇指導老師 --</option>
                      <option v-for="teacher in teachers" :key="teacher.id" :value="teacher.id">{{ teacher.name }}</option>
                    </select>
                  </td>
                  <td>
                    <select v-model="assignmentData[student.id].supervisor_id" class="pairing-select">
                      <option value="">-- 請選擇單位主管 --</option>
                      <option v-for="supervisor in supervisors" :key="supervisor.id" :value="supervisor.id">{{ supervisor.name }}</option>
                    </select>
                  </td>
                  <td>
                    <button @click="saveAssignment(student.id)" class="btn primary-btn small-btn">儲存配對</button>
                  </td>
                </tr>
                <tr v-if="students.length === 0">
                  <td colspan="4" class="empty-state">系統中尚無受訓學員</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '../supabase'
import Swal from 'sweetalert2'
import * as XLSX from 'xlsx'
import { formatDate } from '../utils/format'
import { checkAndEnforcePasswordChange } from '../utils/auth'

const activeTab = ref('users')
const roleFilter = ref('all') 
const users = ref([])
const students = ref([])
const teachers = ref([])
const supervisors = ref([])
const assignmentData = ref({})
const isCreating = ref(false)

const newUser = ref({
  email: '',
  password: '',
  name: '',
  role: 'student'
})

// === 分頁邏輯設定 ===
const currentPage = ref(1)
const itemsPerPage = 10 // 每頁顯示 10 筆

// 監聽篩選器變更，自動重置回第一頁
watch(roleFilter, () => {
  currentPage.value = 1
})

// 根據過濾器計算要顯示的使用者 (過濾後總資料)
const filteredUsers = computed(() => {
  if (roleFilter.value === 'all') return users.value
  return users.value.filter(u => u.role === roleFilter.value)
})

// 計算總頁數
const totalPages = computed(() => {
  return Math.ceil(filteredUsers.value.length / itemsPerPage) || 1
})

// 切割當前頁面要顯示的資料
const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredUsers.value.slice(start, end)
})

function prevPage() {
  if (currentPage.value > 1) currentPage.value--
}

function nextPage() {
  if (currentPage.value < totalPages.value) currentPage.value++
}
// ====================

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) await checkAndEnforcePasswordChange(user.id)

  await loadUsers()
  await loadAssignments()
})

function getRoleName(role) {
  const map = { student: '受訓學員', teacher: '指導老師', supervisor: '單位主管', admin: '系統管理員' }
  return map[role] || role
}

async function loadUsers() {
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
  if (error) return console.error(error)
  
  users.value = data
  students.value = data.filter(u => u.role === 'student')
  teachers.value = data.filter(u => u.role === 'teacher')
  supervisors.value = data.filter(u => u.role === 'supervisor')

  students.value.forEach(s => {
    if (!assignmentData.value[s.id]) {
      assignmentData.value[s.id] = { teacher_id: '', supervisor_id: '' }
    }
  })
}

async function loadAssignments() {
  const { data, error } = await supabase.from('assignments').select('*')
  if (error) return console.error(error)

  data.forEach(assign => {
    if (assignmentData.value[assign.student_id]) {
      assignmentData.value[assign.student_id].teacher_id = assign.teacher_id || ''
      assignmentData.value[assign.student_id].supervisor_id = assign.supervisor_id || ''
    }
  })
}

async function createUser() {
  isCreating.value = true
  try {
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: newUser.value
    })
    if (error || (data && data.error)) throw new Error(error?.message || data?.error)

    Swal.fire({ icon: 'success', title: '建立成功', timer: 1500, showConfirmButton: false })
    newUser.value = { email: '', password: '', name: '', role: 'student' }
    await loadUsers()
  } catch (err) {
    Swal.fire({ icon: 'error', title: '建立失敗', text: err.message })
  } finally {
    isCreating.value = false
  }
}

async function deleteUser(userId) {
  const confirmResult = await Swal.fire({
    title: '確定要刪除此人員嗎？',
    text: '刪除後將無法恢復，且會連帶清理該員的歷史心得與配對紀錄！',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#e74c3c',
    cancelButtonColor: '#7f8c8d',
    confirmButtonText: '確定刪除',
    cancelButtonText: '取消'
  })

  if (!confirmResult.isConfirmed) return

  Swal.fire({ title: '刪除中...', text: '正在清理系統資料', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } })

  const { error } = await supabase.rpc('delete_user_admin', { target_user_id: userId })
  if (error) {
    Swal.fire({ icon: 'error', title: '刪除失敗', text: error.message })
  } else {
    Swal.fire({ icon: 'success', title: '刪除成功', timer: 1500, showConfirmButton: false })
    await loadUsers()
    
    // 如果刪除後當前頁碼超出總頁數，自動退回上一頁
    if (currentPage.value > totalPages.value && totalPages.value > 0) {
      currentPage.value = totalPages.value
    }
  }
}

function downloadTemplate() {
  const ws = XLSX.utils.json_to_sheet([{ "姓名": "王大明", "身分證字號": "A123456789", "Email": "test@hospital.com", "身分": "學員" }])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "人員匯入範本")
  XLSX.writeFile(wb, "系統人員匯入範本.xlsx")
}

const ROLE_MAP = {
  '學員': 'student',
  '受訓學員': 'student',
  '老師': 'teacher',
  '指導老師': 'teacher',
  '主管': 'supervisor',
  '單位主管': 'supervisor',
  '管理員': 'admin'
}

async function handleFileUpload(event) {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const data = new Uint8Array(e.target.result)
      const workbook = XLSX.read(data, { type: 'array' })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      if (jsonData.length === 0) return Swal.fire('錯誤', 'Excel 內無資料', 'error')

      Swal.fire({ title: '批次匯入中...', text: '請勿關閉視窗', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } })

      const results = { success: 0, fail: 0, failRows: [] }
      const concurrency = 5 
      
      for (let i = 0; i < jsonData.length; i += concurrency) {
        const batch = jsonData.slice(i, i + concurrency)
        await Promise.all(batch.map(async (row) => {
          if (!row.Email || !row['姓名'] || !row['身分證字號']) {
            results.fail++; results.failRows.push(`${row['姓名'] || '未知'}：欄位缺漏`); return;
          }
          const roleText = row['身分']?.toString().trim() || '學員'
          const role = ROLE_MAP[roleText]
          if (!role) {
            results.fail++; results.failRows.push(`${row['姓名']}：身分「${roleText}」無法辨識`); return;
          }

          const { error } = await supabase.functions.invoke('create-user', {
            body: { email: row.Email, password: row['身分證字號'].toString(), name: row['姓名'], role }
          })

          if (error) { results.fail++; results.failRows.push(`${row['姓名']}：${error.message}`) }
          else results.success++
        }))
      }

      await loadUsers()
      Swal.fire({ 
        icon: 'info', title: '匯入完成', 
        html: `成功: ${results.success} 筆，失敗: ${results.fail} 筆<br><br><span style="color:#e74c3c;font-size:13px">${results.failRows.slice(0,5).join('<br>')}</span>` 
      })
    } catch (err) {
      Swal.fire('錯誤', '檔案解析失敗', 'error')
    }
    event.target.value = ''
  }
  reader.readAsArrayBuffer(file)
}

async function saveAssignment(studentId) {
  const data = assignmentData.value[studentId]
  if (!data.teacher_id || !data.supervisor_id) return Swal.fire({ icon: 'warning', title: '提示', text: '請完整選擇指導老師與單位主管' })

  const { error } = await supabase.from('assignments').upsert({
    student_id: studentId, teacher_id: data.teacher_id, supervisor_id: data.supervisor_id, updated_at: new Date().toISOString()
  }, { onConflict: 'student_id' })

  if (error) Swal.fire({ icon: 'error', title: '儲存失敗', text: error.message })
  else Swal.fire({ icon: 'success', title: '配對已儲存', timer: 1500, showConfirmButton: false })
}

async function handleLogout() {
  await supabase.auth.signOut()
}
</script>

<style scoped>
.app-wrapper { background-color: #f0f2f5; min-height: 100vh; width: 100vw; position: absolute; top: 0; left: 0; padding: 30px 20px; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; }
.admin-container { width: 100%; max-width: 1000px; font-family: "微軟正黑體", sans-serif; }
.admin-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; background: white; padding: 20px 25px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e1e4e8; }
.admin-header h2 { margin: 0; color: #2c3e50; font-weight: 900;}

.tabs { display: flex; gap: 5px; margin-bottom: 20px; border-bottom: 2px solid #e1e4e8; padding-bottom: 0; }
.tabs button { padding: 12px 24px; border: none; background: transparent; font-size: 16px; font-weight: bold; color: #7f8c8d; cursor: pointer; border-radius: 6px 6px 0 0; transition: 0.2s; margin-bottom: -2px; border-bottom: 2px solid transparent; }
.tabs button.active { color: #3498db; border-bottom: 2px solid #3498db; }
.tabs button:hover:not(.active) { color: #2c3e50; }

.admin-card { background: white; padding: 25px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e1e4e8; margin-bottom: 25px; }
.admin-card h3 { margin-top: 0; color: #34495e; margin-bottom: 10px; font-weight: 900;}
.desc { color: #7f8c8d; font-size: 14px; margin-bottom: 0; }

.card-header-flex { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 15px; margin-bottom: 15px; }
.card-header-flex.align-center { align-items: center; }
.card-header-text { display: flex; flex-direction: column; gap: 5px; }
.import-actions { display: flex; gap: 15px; align-items: center; flex-shrink: 0; }

.filter-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
.filter-tabs button { padding: 6px 14px; border: 1px solid #bdc3c7; background: white; border-radius: 20px; font-size: 13px; font-weight: bold; color: #7f8c8d; cursor: pointer; transition: 0.2s; }
.filter-tabs button.active { background: #34495e; color: white; border-color: #34495e; }
.filter-tabs button:hover:not(.active) { background: #ecf0f1; }

.create-form { margin-top: 20px; }
.create-form .form-row { display: flex; gap: 15px; margin-bottom: 15px; }
.form-group { flex: 1; }
.form-group label { display: block; font-size: 14px; font-weight: bold; margin-bottom: 8px; color: #2c3e50; }
.form-group input, .form-group select { width: 100%; padding: 12px; border: 1px solid #dcdde1; border-radius: 6px; box-sizing: border-box; transition: 0.2s; }
.form-group input:focus, .form-group select:focus { outline: none; border-color: #3498db; }

.table-responsive { overflow-x: auto; margin-top: 15px; }
.data-table { width: 100%; border-collapse: collapse; min-width: 600px; }
.data-table th, .data-table td { padding: 14px; border-bottom: 1px solid #ecf0f1; text-align: left; color: #2c3e50; }
.data-table th { background: #f8f9fa; font-weight: bold; }
.empty-state { text-align: center; color: #95a5a6; padding: 30px !important; }

.role-badge { padding: 5px 12px; border-radius: 12px; font-size: 13px; font-weight: bold; color: white; display: inline-block; }
.role-badge.student { background: #3498db; }
.role-badge.teacher { background: #9b59b6; }
.role-badge.supervisor { background: #e67e22; }
.role-badge.admin { background: #34495e; }

.pairing-select { width: 100%; padding: 10px; border: 1px solid #bdc3c7; border-radius: 6px; }

.btn { padding: 10px 20px; border: none; border-radius: 6px; font-weight: bold; font-size: 15px; cursor: pointer; transition: all 0.2s; text-align: center; white-space: nowrap; }
.small-btn { padding: 8px 14px; font-size: 13px; }
.primary-btn { background: #3498db; color: white; }
.success-btn { background: #2ecc71; color: white; display: inline-flex; align-items: center; justify-content: center; }
.danger-btn { background: #e74c3c; color: white; }
.dark-btn { background: #2c3e50; color: white; }
.btn:hover:not(:disabled) { filter: brightness(0.9); transform: translateY(-1px); }
.btn:disabled { background: #bdc3c7; cursor: not-allowed; transform: none; }

/* 分頁按鈕樣式 */
.pagination-controls { display: flex; justify-content: center; align-items: center; gap: 15px; margin-top: 15px; padding-top: 15px; border-top: 1px solid #ecf0f1; }
.page-btn { padding: 6px 12px; border: 1px solid #bdc3c7; background: white; border-radius: 4px; cursor: pointer; color: #2c3e50; font-weight: bold; transition: 0.2s; }
.page-btn:hover:not(:disabled) { background: #ecf0f1; border-color: #95a5a6; }
.page-btn:disabled { color: #bdc3c7; cursor: not-allowed; background: #f8f9fa; }
.page-info { font-size: 14px; color: #7f8c8d; font-weight: bold; }

@media screen and (max-width: 768px) {
  .admin-header { flex-direction: column; gap: 15px; }
  .admin-header button { width: 100%; }
  .tabs { flex-direction: column; border-bottom: none; }
  .tabs button { border-radius: 6px; border-bottom: none; margin-bottom: 5px; }
  .tabs button.active { background: #ecf0f1; border-bottom: none; }
  .card-header-flex { flex-direction: column; align-items: stretch; gap: 15px; }
  .import-actions { flex-direction: column; width: 100%; }
  .import-actions .btn, .import-actions label { width: 100%; box-sizing: border-box; }
  .create-form .form-row { flex-direction: column; gap: 10px; }
  .filter-tabs { justify-content: flex-start; }
}
</style>