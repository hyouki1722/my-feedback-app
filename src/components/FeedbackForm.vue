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

      <!-- 狀態進度條 -->
      <div class="status-bar" v-if="report.id">
        目前狀態：<span class="status-badge" :class="report.status">{{ getStatusText(report.status) }}</span>
      </div>

      <!-- 學員填寫區 -->
      <div class="card section-card">
        <h3>🎓 學員心得反思</h3>
        <div class="form-group">
          <label>訓練類別：</label>
          <select v-model="report.category" :disabled="!isStudent || report.status !== 'draft'" class="form-input">
            <option value="">-- 請選擇訓練類別 --</option>
            <option value="ward_practice">病房臨床實習</option>
            <option value="skill_eval">特定技術評核</option>
            <option value="case_study">個案討論</option>
          </select>
        </div>
        <div class="form-group">
          <label>心得與反思內容：</label>
          <textarea v-model="report.content" rows="6" placeholder="請詳實填寫您的學習心得..." :disabled="!isStudent || report.status !== 'draft'" class="form-input"></textarea>
        </div>
        
        <!-- 學員操作按鈕 -->
        <div class="action-row" v-if="isStudent && report.status === 'draft'">
          <button @click="saveDraft" class="btn secondary-btn" :disabled="isSaving">儲存草稿</button>
          <button @click="submitReport" class="btn primary-btn" :disabled="isSaving">送出審核</button>
        </div>
      </div>

      <!-- 臨床指導老師回饋區 -->
      <div class="card section-card" v-if="report.status !== 'draft'">
        <h3>👩‍⚕️ 臨床指導老師回饋</h3>
        <div class="form-group">
          <textarea v-model="report.teacher_feedback" rows="4" placeholder="請給予學員具體的指導與建議..." :disabled="!isTeacher || report.status !== 'pending_teacher'" class="form-input"></textarea>
        </div>
        
        <!-- 老師操作按鈕 -->
        <div class="action-row" v-if="isTeacher && report.status === 'pending_teacher'">
          <button @click="returnToStudent" class="btn danger-btn" :disabled="isSaving">退回修改</button>
          <button @click="submitTeacherFeedback" class="btn primary-btn" :disabled="isSaving">送出至主管</button>
        </div>
      </div>

      <!-- 單位主管總評區 -->
      <div class="card section-card" v-if="report.status === 'pending_supervisor' || report.status === 'closed'">
        <h3>🏥 單位主管總評</h3>
        <div class="form-group">
          <textarea v-model="report.supervisor_feedback" rows="4" placeholder="請填寫單位主管總評..." :disabled="!isSupervisor || report.status !== 'pending_supervisor'" class="form-input"></textarea>
        </div>
        
        <!-- 主管操作按鈕 -->
        <div class="action-row" v-if="isSupervisor && report.status === 'pending_supervisor'">
          <button @click="returnToTeacher" class="btn danger-btn" :disabled="isSaving">退回修改</button>
          <button @click="closeReport" class="btn success-btn" :disabled="isSaving">確認結案</button>
        </div>
      </div>

      <!-- 結案後功能區 -->
      <div class="action-row center" v-if="report.status === 'closed'">
        <button @click="exportToPDF" class="btn dark-btn">📄 匯出 PDF 存查</button>
        <button v-if="isSupervisor" @click="unlockReport" class="btn danger-btn">解鎖並退回重編</button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../supabase'
import Swal from 'sweetalert2'
// 引入我們剛建立的共用 Utils
import { formatDate, formatDateTime } from '../utils/format'
import { Toast } from '../utils/toast'
import { checkAndEnforcePasswordChange } from '../utils/auth'

const profile = ref(null)
const isSaving = ref(false)

// 表單資料結構
const report = ref({
  id: null,
  category: '',
  content: '',
  teacher_feedback: '',
  supervisor_feedback: '',
  status: 'draft' // draft, pending_teacher, pending_supervisor, closed
})

// 身分判斷
const isStudent = computed(() => profile.value?.role === 'student')
const isTeacher = computed(() => profile.value?.role === 'teacher')
const isSupervisor = computed(() => profile.value?.role === 'supervisor')

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    // 1. 強制檢查並修改密碼 (若 must_change_password 為 true 會在此處阻擋)
    await checkAndEnforcePasswordChange(user.id)
    
    // 2. 載入使用者資料
    const { data: userProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile.value = userProfile
    
    // 3. 載入表單 (此處簡化為載入最新一筆或建立新表單，實務上可根據路由 ID 讀取)
    await loadLatestReport(user.id)
  }
})

// 載入表單邏輯
async function loadLatestReport(userId) {
  let query = supabase.from('feedback_reports').select('*').order('created_at', { ascending: false }).limit(1)
  
  if (profile.value.role === 'student') {
    query = query.eq('student_id', userId)
  } else if (profile.value.role === 'teacher') {
    query = query.eq('status', 'pending_teacher')
  } else if (profile.value.role === 'supervisor') {
    query = query.eq('status', 'pending_supervisor')
  }

  const { data, error } = await query
  if (data && data.length > 0) {
    report.value = data[0]
  }
}

// 狀態文字轉換
function getStatusText(status) {
  const map = {
    'draft': '📝 草稿',
    'pending_teacher': '⏳ 待老師回饋',
    'pending_supervisor': '⏳ 待主管結案',
    'closed': '✅ 已結案'
  }
  return map[status] || status
}

function getRoleName(role) {
  const map = { student: '學員', teacher: '指導老師', supervisor: '主管', admin: '管理員' }
  return map[role] || role
}

// 學員 - 儲存草稿
async function saveDraft() {
  isSaving.value = true
  try {
    const payload = {
      student_id: profile.value.id,
      category: report.value.category,
      content: report.value.content,
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
  } catch (error) {
    Swal.fire('錯誤', '儲存失敗', 'error')
  } finally {
    isSaving.value = false
  }
}

// 學員 - 送出審核
async function submitReport() {
  if (!report.value.category || !report.value.content) {
    return Swal.fire('提示', '請完整填寫訓練類別與心得內容', 'warning')
  }
  isSaving.value = true
  const { error } = await supabase.from('feedback_reports').update({ 
    status: 'pending_teacher',
    updated_at: new Date().toISOString()
  }).eq('id', report.value.id)
  
  isSaving.value = false
  if (!error) {
    report.value.status = 'pending_teacher'
    Swal.fire({ icon: 'success', title: '已送出', text: '表單已送出給指導老師' })
  }
}

// 老師 - 送出回饋
async function submitTeacherFeedback() {
  if (!report.value.teacher_feedback) return Swal.fire('提示', '請填寫指導回饋', 'warning')
  isSaving.value = true
  const { error } = await supabase.from('feedback_reports').update({ 
    teacher_feedback: report.value.teacher_feedback,
    status: 'pending_supervisor',
    updated_at: new Date().toISOString()
  }).eq('id', report.value.id)
  
  isSaving.value = false
  if (!error) {
    report.value.status = 'pending_supervisor'
    Swal.fire({ icon: 'success', title: '回饋已送出', text: '表單已移交單位主管' })
  }
}

// 老師 - 退回修改
async function returnToStudent() {
  const { isConfirmed } = await Swal.fire({ title: '確定要退回給學員嗎？', showCancelButton: true })
  if (!isConfirmed) return
  const { error } = await supabase.from('feedback_reports').update({ status: 'draft' }).eq('id', report.value.id)
  if (!error) {
    report.value.status = 'draft'
    Toast.fire({ icon: 'info', title: '已退回學員' })
  }
}

// 主管 - 確認結案
async function closeReport() {
  if (!report.value.supervisor_feedback) return Swal.fire('提示', '請填寫主管總評', 'warning')
  isSaving.value = true
  const { error } = await supabase.from('feedback_reports').update({ 
    supervisor_feedback: report.value.supervisor_feedback,
    status: 'closed',
    updated_at: new Date().toISOString()
  }).eq('id', report.value.id)
  
  isSaving.value = false
  if (!error) {
    report.value.status = 'closed'
    Swal.fire({ icon: 'success', title: '結案成功', text: '此表單已正式鎖定存查' })
  }
}

// 主管 - 退回老師修改
async function returnToTeacher() {
  const { error } = await supabase.from('feedback_reports').update({ status: 'pending_teacher' }).eq('id', report.value.id)
  if (!error) report.value.status = 'pending_teacher'
}

// 主管 - 解鎖表單 (特殊權限)
async function unlockReport() {
  const { isConfirmed } = await Swal.fire({ title: '解除鎖定？', text: '將退回至「待主管結案」狀態', icon: 'warning', showCancelButton: true })
  if (isConfirmed) {
    await supabase.from('feedback_reports').update({ status: 'pending_supervisor' }).eq('id', report.value.id)
    report.value.status = 'pending_supervisor'
  }
}

// 匯出 PDF 功能
function exportToPDF() {
  window.print()
}

async function handleLogout() {
  await supabase.auth.signOut()
}
</script>

<style scoped>
.app-wrapper {
  background-color: #f0f2f5;
  min-height: 100vh;
  width: 100vw;
  position: absolute;
  top: 0;
  left: 0;
  padding: 30px 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.form-container { width: 100%; max-width: 800px; font-family: "微軟正黑體", sans-serif; }
.header-section { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: white; padding: 20px 25px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e1e4e8; }
.header-section h2 { margin: 0; color: #2c3e50; font-weight: 900;}
.user-info { font-weight: bold; color: #34495e; margin-right: 15px; }

.status-bar { margin-bottom: 20px; font-weight: bold; color: #2c3e50; font-size: 16px; }
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
.small-btn { padding: 6px 12px; font-size: 13px; }
.primary-btn { background: #3498db; color: white; }
.secondary-btn { background: #95a5a6; color: white; }
.success-btn { background: #2ecc71; color: white; }
.danger-btn { background: #e74c3c; color: white; }
.dark-btn { background: #2c3e50; color: white; }
.btn:hover:not(:disabled) { filter: brightness(0.9); transform: translateY(-1px); }
.btn:disabled { background: #bdc3c7; cursor: not-allowed; }

@media print {
  .app-wrapper { background: white; padding: 0; }
  .header-actions, .action-row, .status-bar { display: none !important; }
  .card { box-shadow: none; border: 1px solid #ccc; page-break-inside: avoid; }
  .form-input { border: none; padding: 0; background: transparent !important; color: black !important; }
}
</style>