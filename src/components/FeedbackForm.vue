<template>
  <div class="app-wrapper">
    <div class="form-container">
      <div class="header-section">
        <h2>📘 臨床學習護照心得回饋</h2>
        <div class="header-actions">
          <span class="user-info" v-if="profile">{{ profile.name }} ({{ getRoleName(profile.role) }})</span>
          <button @click="handleLogout" class="btn dark-btn small-btn">登出</button>
        </div>
      </div>

      <!-- 報告選擇區 (列印時隱藏) -->
      <div class="card section-card no-print">
        <div class="selector-header">
          <h3>📂 待辦與歷史報告清單</h3>
          <button v-if="isStudent" @click="createNewDraft" class="btn success-btn small-btn">➕ 建立新心得</button>
        </div>
        <div class="form-group" style="margin-top: 15px;">
          <select v-model="selectedReportId" @change="selectReport" class="form-input">
            <option value="">-- 請選擇要查閱或審核的報告 --</option>
            <option v-for="r in reportList" :key="r.id" :value="r.id">
              {{ r.studentName }} 的心得 (狀態: {{ getStatusText(r.status) }}) - {{ formatDate(r.updated_at) }}
            </option>
          </select>
        </div>
      </div>

      <!-- 報告主體區塊 -->
      <div v-if="report.id || (isStudent && report.status === 'draft')">
        
        <!-- 狀態與基本資料 -->
        <div class="status-bar">
          <div class="meta-info">
            <p><strong>撰寫學員：</strong> {{ currentReportMeta.studentName || profile?.name }}</p>
            <p v-if="!isStudent"><strong>指導老師：</strong> {{ currentReportMeta.teacherName || '尚未指派' }}</p>
          </div>
          <div>
            目前狀態：<span class="status-badge" :class="report.status">{{ getStatusText(report.status) }}</span>
          </div>
        </div>

        <!-- 學員填寫區 -->
        <div class="card section-card">
          <h3>🎓 學員心得反思</h3>
          <div class="form-group">
            <label>訓練類別：</label>
            <select v-model="report.training_category" :disabled="!isStudent || report.status !== 'draft'" class="form-input" required>
              <option value="" disabled>-- 請選擇訓練類別 --</option>
              <option value="第一年：到職訓練">第一年：到職訓練</option>
              <option value="第一年：三個月新進人員訓練">第一年：三個月新進人員訓練</option>
              <option value="第一年：基層護理人員臨床專業能力訓練">第一年：基層護理人員臨床專業能力訓練</option>
              <option value="第二年：基層護理人員臨床專業能力訓練">第二年：基層護理人員臨床專業能力訓練</option>
              <option value="換照人員：臨床專業能力訓練">換照人員：臨床專業能力訓練</option>
              <option value="病房臨床實習">病房臨床實習</option>
            </select>
          </div>

          <div class="form-group">
            <label>實習/訓練日期：</label>
            <input type="date" v-model="report.training_date" :disabled="!isStudent || report.status !== 'draft'" class="form-input" required />
          </div>

          <div class="form-group">
            <label>學習內容重點摘要：</label>
            <textarea v-model="report.content" rows="5" placeholder="請簡述今日學習的核心護理技術或照護重點..." :disabled="!isStudent || report.status !== 'draft'" class="form-input" required></textarea>
          </div>

          <div class="form-group">
            <label>自我反思與心得：</label>
            <textarea v-model="report.reflection" rows="5" placeholder="請描述執行過程中的反思、遭遇的困難或後續改進方向..." :disabled="!isStudent || report.status !== 'draft'" class="form-input" required></textarea>
          </div>
          
          <!-- 學員操作按鈕 -->
          <div class="action-row no-print" v-if="isStudent && report.status === 'draft'">
            <button @click="saveDraft" class="btn secondary-btn" :disabled="isSaving">儲存草稿</button>
            <button @click="submitReport" class="btn primary-btn" :disabled="isSaving">送出審核</button>
          </div>
        </div>

        <!-- 臨床指導老師回饋區 -->
        <div class="card section-card" v-if="report.status !== 'draft'">
          <h3>👩‍⚕️ 臨床指導老師回饋</h3>
          <div class="form-group">
            <textarea v-model="report.teacher_feedback" rows="5" placeholder="請給予學員具體的指導與建議..." :disabled="!isTeacher || report.status !== 'pending_teacher'" class="form-input"></textarea>
          </div>
          
          <!-- 老師操作按鈕 -->
          <div class="action-row no-print" v-if="isTeacher && report.status === 'pending_teacher'">
            <button @click="returnToStudent" class="btn danger-btn" :disabled="isSaving">退回修改</button>
            <button @click="submitTeacherFeedback" class="btn primary-btn" :disabled="isSaving">送出至主管</button>
          </div>
        </div>

        <!-- 單位主管總評區 -->
        <div class="card section-card" v-if="report.status === 'pending_supervisor' || report.status === 'closed'">
          <h3>🏥 單位主管總評</h3>
          <div class="form-group">
            <textarea v-model="report.supervisor_feedback" rows="5" 
              placeholder="請給予具體之臨床專業講評與期勉。建議包含：對學員臨床表現之肯定、核心護理能力之評估，以及未來精進之方向與建議..." 
              :disabled="!isSupervisor || report.status !== 'pending_supervisor'" class="form-input"></textarea>
          </div>
          
          <!-- 主管操作按鈕 -->
          <div class="action-row no-print" v-if="isSupervisor && report.status === 'pending_supervisor'">
            <button @click="returnToTeacher" class="btn danger-btn" :disabled="isSaving">退回給老師</button>
            <button @click="closeReport" class="btn success-btn" :disabled="isSaving">確認結案</button>
          </div>
        </div>

        <!-- 結案後功能區 (全角色共用) -->
        <div class="action-row center no-print" v-if="report.status === 'closed'">
          <button @click="exportToPDF" class="btn dark-btn">📄 匯出 PDF 存查</button>
          <!-- 僅主管或管理員可解鎖 -->
          <button v-if="isSupervisor || isAdmin" @click="unlockReport" class="btn danger-btn">解鎖並退回重編</button>
        </div>
      </div>

      <!-- 空白狀態提示 -->
      <div v-else class="card section-card empty-state">
        <p v-if="isStudent">請點擊上方「建立新心得」開始填寫。</p>
        <p v-else>目前未選擇任何報告，請由上方選單挑選您管轄的學員紀錄。</p>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../supabase'
import Swal from 'sweetalert2'
import { formatDate } from '../utils/format'
import { Toast } from '../utils/toast'
import { checkAndEnforcePasswordChange } from '../utils/auth'

const profile = ref(null)
const isSaving = ref(false)

const reportList = ref([])
const selectedReportId = ref('')
const currentReportMeta = ref({})

const report = ref({
  id: null,
  training_category: '',
  training_date: new Date().toISOString().split('T')[0],
  content: '',
  reflection: '',
  teacher_feedback: '',
  supervisor_feedback: '',
  status: 'draft'
})

const isStudent = computed(() => profile.value?.role === 'student')
const isTeacher = computed(() => profile.value?.role === 'teacher')
const isSupervisor = computed(() => profile.value?.role === 'supervisor')
const isAdmin = computed(() => profile.value?.role === 'admin')

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await checkAndEnforcePasswordChange(user.id)
    const { data: userProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile.value = userProfile
    await loadReportsList(user.id, userProfile.role)
  }
})

// 精確讀取該角色轄下的報告清單
async function loadReportsList(userId, role) {
  const { data: profs } = await supabase.from('profiles').select('id, name')
  const profilesMap = {}
  profs.forEach(p => profilesMap[p.id] = p.name)

  const { data: assigns } = await supabase.from('assignments').select('*')
  const assignsMap = {}
  assigns.forEach(a => assignsMap[a.student_id] = a)

  let query = supabase.from('feedback_reports').select('*').order('updated_at', { ascending: false })

  if (role === 'student') {
    query = query.eq('student_id', userId)
  } else if (role === 'teacher') {
    const myStudentIds = assigns.filter(a => a.teacher_id === userId).map(a => a.student_id)
    query = myStudentIds.length ? query.in('student_id', myStudentIds) : query.eq('id', 'dummy')
  } else if (role === 'supervisor') {
    const myStudentIds = assigns.filter(a => a.supervisor_id === userId).map(a => a.student_id)
    query = myStudentIds.length ? query.in('student_id', myStudentIds) : query.eq('id', 'dummy')
  }

  const { data: reports } = await query

  if (reports) {
    reportList.value = reports.map(r => {
      const assign = assignsMap[r.student_id] || {}
      return {
        ...r,
        studentName: profilesMap[r.student_id] || '未知學員',
        teacherName: profilesMap[assign.teacher_id] || '尚未指派',
        supervisorName: profilesMap[assign.supervisor_id] || '尚未指派'
      }
    })
  }

  if (reportList.value.length > 0) {
    let autoSelect = reportList.value[0]
    if (role === 'teacher') autoSelect = reportList.value.find(r => r.status === 'pending_teacher') || reportList.value[0]
    if (role === 'supervisor') autoSelect = reportList.value.find(r => r.status === 'pending_supervisor') || reportList.value[0]
    
    selectedReportId.value = autoSelect.id
    selectReport()
  }
}

function selectReport() {
  const found = reportList.value.find(r => r.id === selectedReportId.value)
  if (found) {
    report.value = { ...found }
    currentReportMeta.value = { studentName: found.studentName, teacherName: found.teacherName }
  } else {
    createNewDraft()
  }
}

function createNewDraft() {
  selectedReportId.value = ''
  report.value = { 
    id: null, 
    training_category: '', 
    training_date: new Date().toISOString().split('T')[0],
    content: '', 
    reflection: '',
    teacher_feedback: '', 
    supervisor_feedback: '', 
    status: 'draft' 
  }
  currentReportMeta.value = {}
}

function getStatusText(status) {
  const map = { 'draft': '📝 草稿', 'pending_teacher': '⏳ 待老師', 'pending_supervisor': '⏳ 待主管', 'closed': '✅ 已結案' }
  return map[status] || status
}

function getRoleName(role) {
  const map = { student: '學員', teacher: '老師', supervisor: '主管', admin: '管理員' }
  return map[role] || role
}

// 學員 - 儲存草稿
async function saveDraft() {
  isSaving.value = true
  try {
    const payload = { 
      student_id: profile.value.id, 
      training_category: report.value.training_category, 
      training_date: report.value.training_date,
      content: report.value.content, 
      reflection: report.value.reflection,
      status: 'draft', 
      updated_at: new Date().toISOString() 
    }

    if (report.value.id) {
      await supabase.from('feedback_reports').update(payload).eq('id', report.value.id)
    } else {
      const { data } = await supabase.from('feedback_reports').insert([payload]).select()
      if (data) report.value.id = data[0].id
    }
    
    Toast.fire({ icon: 'success', title: '草稿已儲存' })
    await loadReportsList(profile.value.id, profile.value.role) 
  } catch (error) {
    Swal.fire('錯誤', '儲存失敗', 'error')
  } finally { 
    isSaving.value = false 
  }
}

// 學員 - 送出審核
async function submitReport() {
  if (!report.value.training_category || !report.value.content || !report.value.reflection) {
    return Swal.fire('提示', '請完整填寫訓練類別、內容與反思', 'warning')
  }

  isSaving.value = true
  const payload = { 
    student_id: profile.value.id, 
    training_category: report.value.training_category, 
    training_date: report.value.training_date,
    content: report.value.content, 
    reflection: report.value.reflection,
    status: 'pending_teacher', 
    updated_at: new Date().toISOString() 
  }

  let error;
  if (report.value.id) {
    ({ error } = await supabase.from('feedback_reports').update(payload).eq('id', report.value.id))
  } else {
    ({ error } = await supabase.from('feedback_reports').insert([payload]))
  }

  isSaving.value = false
  if (!error) {
    Swal.fire({ icon: 'success', title: '已送出', text: '表單已送出給指導老師' })
    await loadReportsList(profile.value.id, profile.value.role)
  } else {
    Swal.fire('錯誤', '送出失敗: ' + error.message, 'error')
  }
}

// 老師 - 送出回饋
async function submitTeacherFeedback() {
  if (!report.value.teacher_feedback) return Swal.fire('提示', '請填寫指導回饋', 'warning')
  
  isSaving.value = true
  const { error } = await supabase.from('feedback_reports')
    .update({ teacher_feedback: report.value.teacher_feedback, status: 'pending_supervisor', updated_at: new Date().toISOString() })
    .eq('id', report.value.id)
  
  isSaving.value = false
  if (!error) {
    Swal.fire({ icon: 'success', title: '回饋已送出', text: '表單已移交單位主管' })
    await loadReportsList(profile.value.id, profile.value.role)
  }
}

// 老師 - 退回修改
async function returnToStudent() {
  const { isConfirmed } = await Swal.fire({ title: '退回學員？', text: '退回後學員將可重新編輯內容', showCancelButton: true })
  if (isConfirmed) {
    await supabase.from('feedback_reports').update({ status: 'draft' }).eq('id', report.value.id)
    Toast.fire({ icon: 'info', title: '已退回' })
    await loadReportsList(profile.value.id, profile.value.role)
  }
}

// 主管 - 確認結案
async function closeReport() {
  if (!report.value.supervisor_feedback) return Swal.fire('提示', '請填寫主管總評', 'warning')

  const { isConfirmed } = await Swal.fire({
    title: '確認結案？', 
    text: '結案後表單將鎖定，僅能由主管/管理員解鎖重編。',
    icon: 'question', showCancelButton: true, confirmButtonText: '確認結案', confirmButtonColor: '#2ecc71'
  })
  if (!isConfirmed) return

  isSaving.value = true
  const { error } = await supabase.from('feedback_reports')
    .update({ supervisor_feedback: report.value.supervisor_feedback, status: 'closed', updated_at: new Date().toISOString() })
    .eq('id', report.value.id)
  
  isSaving.value = false

  if (!error) {
    Swal.fire({ icon: 'success', title: '結案成功', text: '表單已正式鎖定存查' })
    await loadReportsList(profile.value.id, profile.value.role)
  } else {
    Swal.fire({ icon: 'error', title: '儲存失敗', text: error.message })
  }
}

// 主管 - 退回老師修改
async function returnToTeacher() {
  const { isConfirmed } = await Swal.fire({ 
    title: '退回給老師？', text: '老師將可重新編輯回饋內容', showCancelButton: true, confirmButtonColor: '#e74c3c'
  })
  if (!isConfirmed) return

  await supabase.from('feedback_reports').update({ status: 'pending_teacher' }).eq('id', report.value.id)
  Toast.fire({ icon: 'info', title: '已退回給老師' })
  await loadReportsList(profile.value.id, profile.value.role)
}

// 主管/管理員 - 解鎖表單
async function unlockReport() {
  const { isConfirmed } = await Swal.fire({ 
    title: '解除鎖定？', text: '將退回至待主管結案狀態', icon: 'warning', showCancelButton: true, confirmButtonColor: '#e74c3c'
  })
  if (!isConfirmed) return

  await supabase.from('feedback_reports').update({ status: 'pending_supervisor' }).eq('id', report.value.id)
  Toast.fire({ icon: 'success', title: '已解除鎖定' })
  await loadReportsList(profile.value.id, profile.value.role)
}

function exportToPDF() {
  window.print()
}

async function handleLogout() {
  await supabase.auth.signOut()
}
</script>

<style scoped>
.app-wrapper { background-color: #f0f2f5; min-height: 100vh; width: 100vw; position: absolute; top: 0; left: 0; padding: 30px 20px; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; }
.form-container { width: 100%; max-width: 850px; font-family: "微軟正黑體", sans-serif; }
.header-section { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: white; padding: 20px 25px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e1e4e8; }
.header-section h2 { margin: 0; color: #2c3e50; font-weight: 900;}
.user-info { font-weight: bold; color: #34495e; margin-right: 15px; }

.selector-header { display: flex; justify-content: space-between; align-items: center; }
.empty-state { text-align: center; color: #7f8c8d; padding: 40px !important; font-weight: bold; }

.status-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; font-weight: bold; color: #2c3e50; font-size: 15px; background: #ecf0f1; padding: 15px 20px; border-radius: 8px;}
.meta-info p { margin: 0 0 5px 0; }
.meta-info p:last-child { margin: 0; }

.status-badge { padding: 5px 12px; border-radius: 20px; margin-left: 10px; color: white; font-size: 14px; }
.status-badge.draft { background: #95a5a6; }
.status-badge.pending_teacher { background: #f39c12; }
.status-badge.pending_supervisor { background: #e67e22; }
.status-badge.closed { background: #2ecc71; }

.card { background: white; padding: 25px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e1e4e8; margin-bottom: 20px; }
.card h3 { margin-top: 0; color: #34495e; border-bottom: 2px solid #ecf0f1; padding-bottom: 10px; margin-bottom: 15px; }

.form-group { margin-bottom: 15px; }
.form-group label { display: block; font-weight: bold; margin-bottom: 8px; color: #2c3e50; }
.form-input { width: 100%; padding: 12px; border: 1px solid #dcdde1; border-radius: 6px; box-sizing: border-box; font-size: 15px; font-family: inherit; resize: vertical; }
.form-input:focus { outline: none; border-color: #3498db; }
.form-input:disabled { background-color: #f8f9fa; color: #7f8c8d; cursor: not-allowed; }

.action-row { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.action-row.center { justify-content: center; }

.btn { padding: 10px 20px; border: none; border-radius: 6px; font-weight: bold; font-size: 15px; cursor: pointer; transition: all 0.2s; }
.small-btn { padding: 8px 14px; font-size: 13px; }
.primary-btn { background: #3498db; color: white; }
.secondary-btn { background: #95a5a6; color: white; }
.success-btn { background: #2ecc71; color: white; }
.danger-btn { background: #e74c3c; color: white; }
.dark-btn { background: #2c3e50; color: white; }
.btn:hover:not(:disabled) { filter: brightness(0.9); transform: translateY(-1px); }
.btn:disabled { background: #bdc3c7; cursor: not-allowed; transform: none; }

/* 列印專用樣式 */
@media print {
  .app-wrapper { background: white; padding: 0; }
  .no-print { display: none !important; }
  .card { box-shadow: none; border: 1px solid #ccc; page-break-inside: avoid; margin-bottom: 15px; }
  .form-input { border: none; padding: 0; background: transparent !important; color: black !important; }
}

/* 補回手機版 RWD 樣式 */
@media screen and (max-width: 600px) {
  .header-section { flex-direction: column; align-items: stretch; gap: 12px; text-align: center; }
  .header-actions { justify-content: center; flex-wrap: wrap; gap: 10px; }
  .status-bar { flex-direction: column; align-items: flex-start; gap: 12px; padding: 15px; }
  .action-row { flex-direction: column; }
  .action-row button { width: 100%; margin-bottom: 5px; }
  .card { padding: 18px; }
  .selector-header { flex-direction: column; gap: 10px; align-items: stretch; }
}
</style>