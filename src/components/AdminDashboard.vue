<template>
  <div class="admin-wrapper">
    <div class="admin-container">
      
      <div class="system-header">
        <div class="header-titles">
          <h1 class="main-app-title">📘 學習護照心得回饋系統</h1>
          <h2 class="title">⚙️ 系統管理員後台</h2>
        </div>
        <button @click="handleLogout" class="btn logout-btn">登出系統</button>
      </div>

      <div class="admin-tabs">
        <button class="tab-btn" :class="{ active: activeTab === 'accounts' }" @click="activeTab = 'accounts'">👥 帳號與權限管理</button>
        <button class="tab-btn" :class="{ active: activeTab === 'assignments' }" @click="activeTab = 'assignments'">🔗 學員配對管理</button>
      </div>

      <div v-if="activeTab === 'accounts'">
        
        <!-- 新增：批次匯入功能操作列 -->
        <div class="admin-card batch-card">
          <div class="batch-content">
            <div>
              <h3 style="margin:0 0 5px 0;">📥 Excel 批次匯入帳號</h3>
              <p class="subtitle" style="margin:0;">請依照範本格式填寫，系統將以「身分證號」作為該員的預設登入密碼。</p>
            </div>
            <div class="batch-actions">
              <button @click="downloadTemplate" class="btn dark-btn small-btn">下載 Excel 範本</button>
              <input type="file" ref="fileInput" accept=".xlsx, .xls" style="display:none" @change="handleBatchImport" />
              <button @click="$refs.fileInput.click()" class="btn success-btn" :disabled="isImporting">
                {{ isImporting ? '⏳ 處理中...' : '上傳並匯入名單' }}
              </button>
            </div>
          </div>
        </div>

        <div class="admin-card">
          <h3>➕ 單筆建立使用者帳號</h3>
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
                <label>臨床老師職稱：</label>
                <select v-model="newUser.profession" required>
                  <option value="" disabled>請選擇職稱</option>
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
                {{ isCreating ? '帳號建立中...' : '確認建立單筆帳號' }}
              </button>
            </div>
          </form>
        </div>

        <div class="admin-card">
          <div class="card-header-flex">
            <h3>📋 系統人員總覽</h3>
            <div class="search-box">
              <input type="text" v-model="accountSearch" placeholder="🔍 搜尋姓名或信箱..." class="search-input" />
            </div>
          </div>
          
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
                <tr v-if="paginatedAccounts.length === 0">
                  <td colspan="4" class="empty-state">找不到符合條件的人員資料</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="pagination-controls" v-if="accountTotalPages > 1">
            <button @click="accountPage--; scrollToTop()" :disabled="accountPage === 1" class="btn page-btn">上一頁</button>
            <span class="page-info">第 {{ accountPage }} 頁 / 共 {{ accountTotalPages }} 頁 (總計 {{ accountTotalCount }} 筆)</span>
            <button @click="accountPage++; scrollToTop()" :disabled="accountPage === accountTotalPages" class="btn page-btn">下一頁</button>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'assignments'">
        <!-- 配對管理介面保留原樣，未更動 -->
        <div class="admin-card">
          <div class="card-header-flex">
            <h3>🔗 學員指導配對管理</h3>
            <div class="search-box">
              <input type="text" v-model="searchQuery" placeholder="🔍 搜尋學員姓名或信箱..." class="search-input" />
            </div>
          </div>
          
          <div class="table-responsive" style="min-height: 400px;">
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
                    <div class="custom-select" @click.stop="toggleDropdown(student.id, 'teacher')">
                      <div class="selected-text" :class="{'placeholder': !student.teacher_id}">
                        {{ getTeacherName(student.teacher_id) }}
                      </div>
                      <span class="dropdown-arrow">▼</span>
                      
                      <div class="dropdown-menu" v-if="activeDropdown === student.id + 'teacher'" @click.stop>
                        <input type="text" v-model="dropdownSearch" placeholder="🔍 搜尋臨床老師..." class="dropdown-search" autofocus />
                        <div class="dropdown-options">
                          <div class="option-item" @click="selectOption(student, 'teacher_id', null)">-- 尚未指派 --</div>
                          <template v-for="(group, groupName) in getFilteredGroups('teacher', dropdownSearch)" :key="groupName">
                            <div class="optgroup-label">{{ groupName }}</div>
                            <div class="option-item" v-for="t in group" :key="t.id" @click="selectOption(student, 'teacher_id', t.id)">
                              {{ extractCleanName(t.name) }}
                            </div>
                          </template>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td>
                    <div class="custom-select" @click.stop="toggleDropdown(student.id, 'supervisor')">
                      <div class="selected-text" :class="{'placeholder': !student.supervisor_id}">
                        {{ getSupervisorName(student.supervisor_id) }}
                      </div>
                      <span class="dropdown-arrow">▼</span>
                      
                      <div class="dropdown-menu" v-if="activeDropdown === student.id + 'supervisor'" @click.stop>
                        <input type="text" v-model="dropdownSearch" placeholder="🔍 搜尋單位主管..." class="dropdown-search" autofocus />
                        <div class="dropdown-options">
                          <div class="option-item" @click="selectOption(student, 'supervisor_id', null)">-- 尚未指派 --</div>
                          <template v-for="(group, groupName) in getFilteredGroups('supervisor', dropdownSearch)" :key="groupName">
                            <div class="optgroup-label">{{ groupName }}</div>
                            <div class="option-item" v-for="s in group" :key="s.id" @click="selectOption(student, 'supervisor_id', s.id)">
                              {{ extractCleanName(s.name) }}
                            </div>
                          </template>
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td>
                    <button @click="saveAssignment(student)" class="btn success-btn">儲存配對</button>
                  </td>
                </tr>
                <tr v-if="paginatedStudents.length === 0">
                  <td colspan="4" class="empty-state">找不到符合條件的學員資料</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="pagination-controls" v-if="studentTotalPages > 1">
            <button @click="currentPage--; scrollToTop()" :disabled="currentPage === 1" class="btn page-btn">上一頁</button>
            <span class="page-info">第 {{ currentPage }} 頁 / 共 {{ studentTotalPages }} 頁 (總計 {{ studentTotalCount }} 筆)</span>
            <button @click="currentPage++; scrollToTop()" :disabled="currentPage === studentTotalPages" class="btn page-btn">下一頁</button>
          </div>
        </div>
      </div>
    </div>

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
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../supabase'
import Swal from 'sweetalert2'
import * as XLSX from 'xlsx'

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
})

const authClient = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
)

const activeTab = ref('accounts')
const teachers = ref([])
const supervisors = ref([])

const professionOptions = ['護理師', '藥師', '呼吸治療師', '物理治療師', '職能治療師', '醫事放射師', '其他']
const departmentOptions = ['2A', '3A', '4A', '5A', '5B', '5C', '6A', '6C', '7C', '8C', 'DR', 'NBC', 'RC', 'PI', 'SI', 'MI', 'CCU']

const isCreating = ref(false)
const isImporting = ref(false)
const newUser = ref({ name: '', role: '', email: '', password: '', profession: '', department: '' })

const paginatedAccounts = ref([])
const accountSearch = ref('')
const accountFilterRole = ref('all')
const accountPage = ref(1)
const accountTotalPages = ref(1)
const accountTotalCount = ref(0)

const paginatedStudents = ref([])
const searchQuery = ref('')
const currentPage = ref(1)
const studentTotalPages = ref(1)
const studentTotalCount = ref(0)
const itemsPerPage = 10

const activeDropdown = ref(null)
const dropdownSearch = ref('')

const editModalOpen = ref(false)
const editForm = ref({ id: '', originalName: '', cleanName: '', role: '', profession: '', department: '' })

function debounce(fn, delay = 300) {
  let timeoutId
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

onMounted(() => {
  fetchTeachersAndSupervisors()
  fetchAccounts()
  fetchStudents()
  document.addEventListener('click', closeDropdown)
})

onUnmounted(() => {
  document.removeEventListener('click', closeDropdown)
})

async function fetchTeachersAndSupervisors() {
  const { data } = await supabase.from('profiles').select('*').in('role', ['teacher', 'supervisor'])
  if (data) {
    teachers.value = data.filter(u => u.role === 'teacher')
    supervisors.value = data.filter(u => u.role === 'supervisor')
  }
}

async function fetchAccounts() {
  let query = supabase.from('profiles').select('*', { count: 'exact' })
  if (accountFilterRole.value !== 'all') query = query.eq('role', accountFilterRole.value)
  if (accountSearch.value) query = query.or(`name.ilike.%${accountSearch.value}%,email.ilike.%${accountSearch.value}%`)
  const from = (accountPage.value - 1) * itemsPerPage
  const to = from + itemsPerPage - 1
  const { data, count } = await query.range(from, to).order('created_at', { ascending: false })
  paginatedAccounts.value = data || []
  accountTotalCount.value = count || 0
  accountTotalPages.value = Math.ceil((count || 0) / itemsPerPage) || 1
}

async function fetchStudents() {
  let query = supabase.from('profiles').select('*', { count: 'exact' }).eq('role', 'student')
  if (searchQuery.value) query = query.or(`name.ilike.%${searchQuery.value}%,email.ilike.%${searchQuery.value}%`)
  const from = (currentPage.value - 1) * itemsPerPage
  const to = from + itemsPerPage - 1
  const { data, count } = await query.range(from, to).order('created_at', { ascending: false })

  if (!data || data.length === 0) {
    paginatedStudents.value = []
    studentTotalCount.value = count || 0
    studentTotalPages.value = 1
    return
  }

  const studentIds = data.map(s => s.id)
  const { data: assigns } = await supabase.from('assignments').select('*').in('student_id', studentIds)
  paginatedStudents.value = data.map(s => {
    const match = assigns?.find(a => a.student_id === s.id)
    return { ...s, teacher_id: match?.teacher_id || null, supervisor_id: match?.supervisor_id || null }
  })
  studentTotalCount.value = count || 0
  studentTotalPages.value = Math.ceil((count || 0) / itemsPerPage) || 1
}

const debouncedFetchAccounts = debounce(fetchAccounts)
const debouncedFetchStudents = debounce(fetchStudents)

watch([accountSearch, accountFilterRole], () => { accountPage.value = 1; debouncedFetchAccounts() })
watch(accountPage, fetchAccounts)
watch(searchQuery, () => { currentPage.value = 1; debouncedFetchStudents() })
watch(currentPage, fetchStudents)

function scrollToTop() {
  const wrapper = document.querySelector('.admin-wrapper')
  if (wrapper) wrapper.scrollTo({ top: 0, behavior: 'smooth' })
}

watch(() => newUser.value.role, (newRole) => { newUser.value.profession = newRole === 'teacher' ? '護理師' : '' })
watch(() => editForm.value.role, (newRole) => {
  if (newRole === 'teacher' && !editForm.value.profession) editForm.value.profession = '護理師'
  else if (newRole !== 'teacher') editForm.value.profession = ''
})

function toggleDropdown(studentId, type) {
  const target = `${studentId}${type}`
  if (activeDropdown.value === target) closeDropdown()
  else { activeDropdown.value = target; dropdownSearch.value = '' }
}
function closeDropdown() { activeDropdown.value = null; dropdownSearch.value = '' }
function selectOption(student, field, value) { student[field] = value; closeDropdown() }

function getTeacherName(id) {
  if (!id) return '-- 尚未指派 --'
  const t = teachers.value.find(x => x.id === id)
  return t ? extractCleanName(t.name) : '-- 尚未指派 --'
}
function getSupervisorName(id) {
  if (!id) return '-- 尚未指派 --'
  const s = supervisors.value.find(x => x.id === id)
  return s ? extractCleanName(s.name) : '-- 尚未指派 --'
}

function getFilteredGroups(type, search) {
  const isTeacher = type === 'teacher'
  const sourceList = isTeacher ? teachers.value : supervisors.value
  const options = isTeacher ? professionOptions : departmentOptions
  let filtered = sourceList
  if (search) {
    const q = search.toLowerCase()
    filtered = filtered.filter(x => x.name && x.name.toLowerCase().includes(q))
  }
  const groups = {}
  options.forEach(opt => groups[opt] = [])
  const ungrouped = []
  filtered.forEach(item => {
    const match = item.name?.match(/^\[(.*?)\]\s*(.*)$/)
    if (match && options.includes(match[1])) groups[match[1]].push(item)
    else ungrouped.push(item)
  })
  Object.keys(groups).forEach(key => { if (groups[key].length === 0) delete groups[key] })
  if (ungrouped.length > 0) groups['其他 / 未分類'] = ungrouped
  return groups
}

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

// 產生並下載 Excel 範本
function downloadTemplate() {
  const templateData = [
    { 姓名: '王小明', 身分: '學員', 職稱或單位: '', 信箱: 'student1@hospital.com', 身分證號: 'A123456789' },
    { 姓名: '陳大文', 身分: '臨床老師', 職稱或單位: '護理師', 信箱: 'teacher1@hospital.com', 身分證號: 'B987654321' },
    { 姓名: '林雅婷', 身分: '單位主管', 職稱或單位: '7C', 信箱: 'super1@hospital.com', 身分證號: 'C111222333' }
  ]
  const ws = XLSX.utils.json_to_sheet(templateData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '帳號匯入範本')
  XLSX.writeFile(wb, '系統帳號批次匯入範本.xlsx')
}

// 處理 Excel 批次上傳邏輯
async function handleBatchImport(event) {
  const file = event.target.files[0]
  if (!file) return
  
  isImporting.value = true
  try {
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data)
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(worksheet)

    let successCount = 0
    let errorList = []

    for (const row of rows) {
      const name = row['姓名']
      const roleRaw = row['身分']
      const extInfo = row['職稱或單位'] || ''
      const email = row['信箱']
      const idNumber = row['身分證號']

      if (!name || !roleRaw || !email || !idNumber) {
        errorList.push(`${name || '未知'}: 缺少必要欄位(姓名/身分/信箱/身分證號)`)
        continue
      }

      let role = 'student'
      if (roleRaw === '臨床老師') role = 'teacher'
      else if (roleRaw === '單位主管') role = 'supervisor'

      // 1. 建立 Auth 帳號 (密碼使用身分證號)
      const { data: authData, error: authError } = await authClient.auth.signUp({
        email: email,
        password: idNumber
      })

      if (authError) {
        errorList.push(`${name}: ${authError.message}`)
        continue
      }

      // 2. 組合最終姓名
      let finalName = name
      if (role === 'teacher' && extInfo) finalName = `[${extInfo}] ${name}`
      else if (role === 'supervisor' && extInfo) finalName = `[${extInfo}] ${name}`

      // 3. 寫入 Profile 資料表
      if (authData?.user) {
        const { error: profileError } = await supabase.from('profiles').insert([{
          id: authData.user.id,
          name: finalName,
          role: role,
          email: email
        }])

        if (profileError) {
          errorList.push(`${name}: 寫入基本資料失敗`)
        } else {
          successCount++
        }
      }
    }

    let resultMsg = `成功建立 ${successCount} 筆新帳號！`
    if (errorList.length > 0) {
      resultMsg += `<br><br><div style="text-align:left; max-height:200px; overflow-y:auto; font-size:14px; color:#e74c3c;"><b>失敗紀錄：</b><br>${errorList.join('<br>')}</div>`
    }

    Swal.fire({
      icon: errorList.length > 0 ? 'warning' : 'success',
      title: '批次匯入完成',
      html: resultMsg,
      confirmButtonColor: '#3498db'
    })

    fetchAccounts()
    fetchTeachersAndSupervisors()

  } catch (err) {
    Swal.fire({ icon: 'error', title: '讀取 Excel 失敗', text: err.message })
  } finally {
    isImporting.value = false
    event.target.value = '' // 清除選取狀態，讓使用者可再次上傳同一個檔案
  }
}

async function handleCreateUser() {
  isCreating.value = true
  const { data, error } = await authClient.auth.signUp({ email: newUser.value.email, password: newUser.value.password })
  if (error) {
    Toast.fire({ icon: 'error', title: '建立失敗：' + error.message })
  } else if (data?.user) {
    let finalName = newUser.value.name
    if (newUser.value.role === 'teacher' && newUser.value.profession) finalName = `[${newUser.value.profession}] ${finalName}`
    else if (newUser.value.role === 'supervisor' && newUser.value.department) finalName = `[${newUser.value.department}] ${finalName}`

    const { error: profileError } = await supabase.from('profiles').insert([{ id: data.user.id, name: finalName, role: newUser.value.role, email: newUser.value.email }])
    if (profileError) {
      Toast.fire({ icon: 'error', title: '設定 profile 失敗：' + profileError.message })
    } else {
      Toast.fire({ icon: 'success', title: `帳號 ${finalName} 建立成功！` })
      newUser.value = { name: '', role: '', email: '', password: '', profession: '', department: '' }
      fetchAccounts()
      fetchTeachersAndSupervisors()
    }
  }
  isCreating.value = false
}

function openEditModal(user) {
  editForm.value = { id: user.id, originalName: user.name, cleanName: extractCleanName(user.name), role: user.role, profession: user.role === 'teacher' ? getPrefix(user.name) : '', department: user.role === 'supervisor' ? getPrefix(user.name) : '' }
  if (editForm.value.role === 'teacher' && !editForm.value.profession) editForm.value.profession = '護理師'
  editModalOpen.value = true
}

async function saveRoleChange() {
  let finalName = editForm.value.cleanName
  if (editForm.value.role === 'teacher' && editForm.value.profession) finalName = `[${editForm.value.profession}] ${finalName}`
  else if (editForm.value.role === 'supervisor' && editForm.value.department) finalName = `[${editForm.value.department}] ${finalName}`

  const { error } = await supabase.from('profiles').update({ name: finalName, role: editForm.value.role }).eq('id', editForm.value.id)
  if (error) Toast.fire({ icon: 'error', title: '更新失敗：' + error.message })
  else {
    Toast.fire({ icon: 'success', title: '人員身分變更成功！' })
    editModalOpen.value = false
    fetchAccounts()
    fetchStudents()
    fetchTeachersAndSupervisors()
  }
}

async function deleteUser(user) {
  const confirmResult = await Swal.fire({ title: `確定要刪除「${user.name}」嗎？`, text: '這將會徹底清除該員在系統上的所有紀錄與帳號，此動作無法復原！', icon: 'warning', showCancelButton: true, confirmButtonColor: '#e74c3c', cancelButtonColor: '#7f8c8d', confirmButtonText: '確認刪除', cancelButtonText: '取消' })
  if (!confirmResult.isConfirmed) return
  try {
    const { error } = await supabase.functions.invoke('delete-user', { body: { user_id: user.id } })
    if (error) throw error
    Swal.fire({ icon: 'success', title: '刪除成功', text: `已成功將 ${user.name} 的資料從平台徹底移除。`, confirmButtonColor: '#3498db' })
    fetchAccounts()
    fetchStudents()
    fetchTeachersAndSupervisors()
  } catch (err) { Swal.fire({ icon: 'error', title: '刪除失敗', text: err.message }) }
}

async function saveAssignment(student) {
  if (!student.teacher_id || !student.supervisor_id) return Toast.fire({ icon: 'warning', title: '請完整選擇臨床老師與單位主管！' })
  const { error } = await supabase.from('assignments').upsert({ student_id: student.id, teacher_id: student.teacher_id, supervisor_id: student.supervisor_id }, { onConflict: 'student_id' })
  if (error) Toast.fire({ icon: 'error', title: '儲存失敗：' + error.message })
  else Toast.fire({ icon: 'success', title: `已成功儲存 ${student.name} 的配對資料！` })
}

async function handleLogout() {
  await supabase.auth.signOut()
}
</script>

<style scoped>
/* 包含先前實作的 RWD 卡片化樣式，請保留原有 CSS，並增加批次區塊的樣式 */
.admin-wrapper { position: absolute; top: 0; left: 0; width: 100vw; min-height: 100vh; background-color: #f0f2f5; display: flex; justify-content: center; padding: 40px 20px; box-sizing: border-box; font-family: "微軟正黑體", sans-serif; overflow-y: auto; scroll-behavior: smooth; }
.admin-container { width: 100%; max-width: 1000px; }

.system-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: white; padding: 20px 30px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e1e4e8; }
.header-titles { display: flex; flex-direction: column; gap: 8px; }
.main-app-title { margin: 0; color: #2980b9; font-size: 26px; font-weight: 900; letter-spacing: 1px; }
.title { margin: 0; color: #7f8c8d; font-size: 16px; font-weight: bold; }

.admin-tabs { display: flex; gap: 10px; margin-bottom: 25px; border-bottom: 2px solid #ddd; padding-bottom: 10px; }
.tab-btn { background: transparent; border: none; font-size: 18px; font-weight: bold; color: #7f8c8d; padding: 10px 20px; cursor: pointer; transition: 0.3s; border-radius: 8px 8px 0 0; }
.tab-btn:hover { color: #34495e; background: #e8ecef; }
.tab-btn.active { color: #2c3e50; background: white; border-bottom: 4px solid #3498db; box-shadow: 0 -4px 10px rgba(0,0,0,0.02); }

.admin-card { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin-bottom: 25px; border: 1px solid #e1e4e8; }
.batch-card { background: #f8fbfe; border: 1px solid #c8e1f5; }
.batch-content { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; }
.batch-actions { display: flex; gap: 10px; }

.card-header-flex { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #ecf0f1; padding-bottom: 10px; margin-bottom: 15px; flex-wrap: wrap; gap: 10px; }
.admin-card h3 { margin: 0; color: #34495e; }
.subtitle { color: #7f8c8d; font-size: 14px; margin-bottom: 15px; }

.filter-group { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
.filter-tag { background: #f1f2f6; border: 1px solid #dfe4ea; padding: 6px 15px; border-radius: 20px; font-size: 14px; cursor: pointer; color: #7f8c8d; font-weight: bold; transition: all 0.2s; }
.filter-tag:hover { background: #dcdde1; color: #2f3542; }
.filter-tag.active { background: #34495e; color: white; border-color: #34495e; }

.search-input { padding: 8px 12px; border: 1px solid #ccc; border-radius: 20px; width: 250px; font-size: 14px; outline: none; transition: border-color 0.2s; }
.search-input:focus { border-color: #3498db; }
.form-row { display: flex; gap: 20px; margin-bottom: 15px; flex-wrap: wrap; }
.form-group { flex: 1; min-width: 250px; }
label { display: block; font-size: 14px; font-weight: bold; color: #333; margin-bottom: 8px; }
input, select { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; box-sizing: border-box; }
.action-row { display: flex; justify-content: flex-end; margin-top: 20px; }
.submit-btn { padding: 12px 30px; font-size: 16px; }

.table-responsive { overflow-x: visible; }
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

.custom-select { position: relative; width: 100%; min-width: 170px; background: #fff; border: 1px solid #ccc; border-radius: 4px; padding: 10px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; box-sizing: border-box; }
.selected-text { font-size: 14px; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: bold; }
.selected-text.placeholder { color: #7f8c8d; font-weight: normal; }
.dropdown-arrow { font-size: 10px; color: #7f8c8d; }
.dropdown-menu { position: absolute; top: 100%; left: 0; width: 100%; background: white; border: 1px solid #ccc; border-radius: 4px; box-shadow: 0 4px 15px rgba(0,0,0,0.15); z-index: 100; margin-top: 4px; max-height: 280px; display: flex; flex-direction: column; }
.dropdown-search { width: 100%; border: none; border-bottom: 1px solid #eee; padding: 12px; font-size: 14px; box-sizing: border-box; outline: none; background: #fdfdfd; }
.dropdown-options { overflow-y: auto; flex: 1; }
.optgroup-label { padding: 8px 12px; font-size: 12px; font-weight: bold; color: #2980b9; background-color: #f8f9fa; border-top: 1px solid #eee; }
.option-item { padding: 10px 15px; font-size: 14px; color: #333; cursor: pointer; transition: background 0.1s; }
.option-item:hover { background-color: #f1f2f6; }

.empty-state { text-align: center; color: #7f8c8d; padding: 30px; }
.pagination-controls { display: flex; justify-content: center; align-items: center; margin-top: 20px; gap: 15px; flex-wrap: wrap; }
.page-info { font-size: 14px; font-weight: bold; color: #2c3e50; }
.page-btn { background-color: #ecf0f1; color: #333; padding: 6px 15px; }
.page-btn:hover:not(:disabled) { background-color: #bdc3c7; }
.page-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.action-buttons { display: flex; gap: 8px; flex-wrap: wrap; }
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

.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 15px; box-sizing: border-box; }
.modal-content { background: white; padding: 25px; border-radius: 8px; width: 100%; max-width: 450px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); font-family: "微軟正黑體", sans-serif; box-sizing: border-box; }
.modal-content h3 { margin-top: 0; margin-bottom: 5px; color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 10px; }
.modal-input { width: 100%; padding: 10px; border: 1px solid #999; border-radius: 4px; margin-top: 8px; font-size: 15px; box-sizing: border-box; color: #333; background-color: #fff; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 25px; }

@media screen and (max-width: 768px) {
  .system-header { flex-direction: column; align-items: stretch; gap: 15px; }
  .header-actions, .logout-btn { width: 100%; }
  .batch-content { flex-direction: column; align-items: stretch; }
  .batch-actions { flex-direction: column; width: 100%; }
  .batch-actions button { width: 100%; }
  .card-header-flex { flex-direction: column; align-items: stretch; gap: 10px; }
  .search-box, .search-input { width: 100%; box-sizing: border-box; }
  .admin-tabs { flex-wrap: wrap; }
  .tab-btn { flex: 1; text-align: center; font-size: 15px; padding: 10px; }
  .assignment-table thead { display: none !important; }
  .assignment-table, .assignment-table tbody, .assignment-table tr, .assignment-table td { display: block; width: 100%; box-sizing: border-box; }
  .assignment-table tr { background: #ffffff; border: 1px solid #dfe4ea; border-radius: 10px; margin-bottom: 15px; padding: 15px; box-shadow: 0 4px 8px rgba(0,0,0,0.06); }
  .assignment-table td { border: none !important; padding: 8px 0 !important; text-align: left !important; }
  .action-buttons { width: 100%; display: flex; flex-direction: row; gap: 10px; margin-top: 10px; }
  .action-buttons button, .success-btn { flex: 1; width: 100%; padding: 12px; font-size: 15px; }
  .custom-select { width: 100%; margin-bottom: 8px; }
}
</style>