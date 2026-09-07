<template>
  <div class="app-container">
    
    <div class="system-header">
      <div class="header-titles">
        <h1 class="main-app-title">📘 學習護照心得回饋系統</h1>
        <div class="header-text">目前登入身分：<span class="role-tag">{{ roleName }}</span></div>
      </div>
      <div class="header-actions">
        <button @click="showPasswordModal = true" class="btn warning-btn small-btn">修改密碼</button>
        <button @click="handleLogout" class="btn logout-btn small-btn">登出系統</button>
      </div>
    </div>

    <div v-if="showPasswordModal" class="modal-overlay">
      <div class="modal-content">
        <h3>修改登入密碼</h3>
        <div class="form-group">
          <label>請輸入新密碼 (至少 6 位數)：</label>
          <input type="password" v-model="newPassword" placeholder="輸入新密碼" class="modal-input">
        </div>
        <div class="modal-actions">
          <button @click="showPasswordModal = false" class="btn dark-btn">取消</button>
          <button @click="updatePassword" class="btn primary-btn">確認修改</button>
        </div>
      </div>
    </div>

    <!-- 骨架屏載入動畫 -->
    <div v-if="isLoading" class="skeleton-page" style="margin-top: 0;">
      <div class="skeleton-body">
        <div class="skeleton-title"></div>
        <div class="skeleton-table-row" v-for="i in 5" :key="i">
          <div class="skeleton-cell" style="width: 20%"></div>
          <div class="skeleton-cell" style="width: 30%"></div>
          <div class="skeleton-cell" style="width: 20%"></div>
          <div class="skeleton-cell" style="width: 15%"></div>
        </div>
      </div>
    </div>

    <!-- 師生的歷史紀錄清單畫面 -->
    <div v-else-if="viewMode === 'list'" class="list-container">
      <div class="card-header-flex" style="margin-bottom: 20px; border-bottom: 2px solid #34495e; padding-bottom: 10px;">
        <h2 style="margin: 0; color: #2c3e50; border: none; padding: 0;">
          {{ currentRole === 'student' ? '📝 我的歷史心得紀錄' : '🧑‍🎓 負責學員報告清單' }}
        </h2>
        <button v-if="currentRole === 'student'" @click="createNewReport" class="btn success-btn small-btn">➕ 新增心得回饋</button>
      </div>

      <table class="assignment-table" :class="currentRole === 'student' ? 'student-table' : 'reviewer-table'">
        <thead>
          <tr>
            <th v-if="currentRole !== 'student'">學員姓名</th>
            <th>訓練類別</th>
            <th>目前狀態</th>
            <th>更新時間</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in reportsList" :key="r.id">
            <td v-if="currentRole !== 'student'" class="student-name-cell">{{ r.student_name }}</td>
            <td>{{ r.training_category || '尚未選擇' }}</td>
            <td><span class="status-badge" :class="r.status">{{ getStatusText(r) }}</span></td>
            <td>{{ formatDate(r.created_at) || '-' }}</td>
            <td>
              <button 
                @click="openReport(r)" 
                class="btn primary-btn small-btn" 
                :disabled="r.status === 'not_started'" 
                :class="{ 'disabled-btn': r.status === 'not_started' }">
                {{ r.status === 'completed' ? '查看 / 匯出' : (currentRole === 'student' ? '繼續編輯' : '進入審核') }}
              </button>
            </td>
          </tr>
          <tr v-if="reportsList.length === 0">
            <td :colspan="currentRole === 'student' ? 4 : 5" class="empty-state">
              {{ currentRole === 'student' ? '您尚無任何心得紀錄，請點擊右上方新增' : '目前沒有待審核的學員紀錄' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- A4 實體文件表單區塊 -->
    <div v-else-if="viewMode === 'form'">
      <div class="paper-wrapper">
        <div id="pdf-content" class="paper">
          <h1 class="paper-title">基礎訓練心得</h1>

          <div class="checkbox-section">
            <div class="check-row">
              <label><input type="radio" value="第一年：到職訓練" v-model="report.training_category" :disabled="!isStudentDraft"> 第一年：到職訓練</label>
              <label><input type="radio" value="第一年：三個月新進人員訓練" v-model="report.training_category" :disabled="!isStudentDraft"> 第一年：三個月新進人員訓練</label>
            </div>
            <div class="check-row">
              <label><input type="radio" value="第一年：基層護理人員臨床專業能力訓練" v-model="report.training_category" :disabled="!isStudentDraft"> 第一年：基層護理人員臨床專業能力訓練</label>
            </div>
            <div class="check-row">
              <label><input type="radio" value="第二年：基層護理人員臨床專業能力訓練" v-model="report.training_category" :disabled="!isStudentDraft"> 第二年：基層護理人員臨床專業能力訓練</label>
            </div>
            <div class="check-row">
              <label>
                <input type="radio" value="換照人員：臨床專業能力訓練" v-model="report.training_category" :disabled="!isStudentDraft"> 
                換照人員：臨床專業能力訓練 ( 領證日：
                <input type="text" class="inline-input" placeholder="年 月 日" v-model="report.cert_date" :disabled="!isStudentDraft"> )
              </label>
            </div>
          </div>

          <div class="feedback-table">
            <div class="table-row">
              <div class="row-header">
                <div class="row-title">一、學員心得回饋 <span v-if="report.student_name" style="font-size:14px; font-weight:normal; color:#555;">({{ report.student_name }})</span></div>
                <div class="row-timestamp" v-if="report.created_at">{{ formatDate(report.created_at) }}</div>
              </div>
              <textarea v-model="report.student_content" class="paper-textarea" rows="4" :disabled="!isStudentDraft" placeholder="請在此填寫您的學習心得..."></textarea>
            </div>
            
            <div class="table-row">
              <div class="row-header">
                <div class="row-title">二、指導老師回饋</div>
                <div class="row-timestamp" v-if="report.teacher_submitted_at">{{ formatDate(report.teacher_submitted_at) }}</div>
              </div>
              <textarea v-model="report.teacher_feedback" class="paper-textarea" rows="4" :disabled="currentRole !== 'teacher' || report.status === 'completed'" placeholder="指導老師回饋區..."></textarea>
            </div>
            
            <div class="table-row last-row">
              <div class="row-header">
                <div class="row-title">三、單位主管回饋</div>
                <div class="row-timestamp" v-if="report.supervisor_submitted_at">{{ formatDate(report.supervisor_submitted_at) }}</div>
              </div>
              <textarea v-model="report.supervisor_feedback" class="paper-textarea" rows="4" :disabled="currentRole !== 'supervisor' || report.status === 'completed'" placeholder="單位主管回饋區..."></textarea>
            </div>
          </div>
        </div>
      </div>

      <div class="action-panel">
        <button @click="backToList" class="btn dark-btn">🔙 返回列表</button>
        <button v-if="isStudentDraft" @click="submitStudent" class="btn primary-btn">送出心得表單</button>
        
        <template v-if="currentRole === 'teacher' && report.status === 'submitted'">
          <button @click="saveTeacher" class="btn primary-btn">儲存指導老師回饋</button>
          <button @click="rejectToStudent" class="btn warning-btn">退回給學員修改</button>
        </template>

        <button v-if="currentRole === 'supervisor' && report.status === 'submitted'" @click="completeSupervisor" class="btn danger-btn">儲存並完成結案</button>
        <button v-if="(currentRole === 'teacher' || currentRole === 'supervisor') && report.status === 'completed'" @click="unlockForm" class="btn warning-btn">🔓 將資料拉回重新編輯</button>
        <button v-if="report.status === 'completed'" @click="exportPDF" class="btn dark-btn">📄 匯出 PDF 文件</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { supabase } from '../supabase'
import html2pdf from 'html2pdf.js'
import Swal from 'sweetalert2'

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
})

const props = defineProps(['session', 'userRole'])

const viewMode = ref('list')
const reportsList = ref([])
const isLoading = ref(true)

const showPasswordModal = ref(false)
const newPassword = ref('')

const report = ref({
  id: null,
  training_category: '',
  cert_date: '',
  student_content: '',
  teacher_feedback: '',
  supervisor_feedback: '',
  status: 'draft',
  created_at: null,
  teacher_submitted_at: null,
  supervisor_submitted_at: null,
  student_name: ''
})

function formatDate(dateString) {
  if (!dateString) return ''
  const d = new Date(dateString)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const currentRole = computed(() => props.userRole || '')

const roleName = computed(() => {
  const map = { student: '受訓人員', teacher: '教師', supervisor: '主管', admin: '系統管理員' }
  return map[currentRole.value] || '讀取中...'
})

const isStudentDraft = computed(() => currentRole.value === 'student' && report.value.status === 'draft')

watch(() => props.userRole, async (newRole) => {
  if (!newRole) return
  isLoading.value = true
  viewMode.value = 'list'
  
  if (newRole === 'student') {
    await loadStudentReports()
  } else {
    await loadReviewerReports()
  }
  
  setTimeout(() => { isLoading.value = false }, 300)
}, { immediate: true })

async function loadStudentReports() {
  const { data: profile } = await supabase.from('profiles').select('name').eq('id', props.session.user.id).maybeSingle()
  const studentName = profile?.name || '學員'

  const { data, error } = await supabase
    .from('feedback_reports')
    .select('*')
    .eq('student_id', props.session.user.id)
    .order('created_at', { ascending: false })

  if (data) {
    reportsList.value = data.map(r => ({
      ...r,
      student_name: studentName,
      reportData: r 
    }))
  } else {
    reportsList.value = []
  }
}

async function loadReviewerReports() {
  const column = currentRole.value === 'teacher' ? 'teacher_id' : 'supervisor_id'
  const { data: assignments } = await supabase.from('assignments').select('student_id').eq(column, props.session.user.id)

  if (!assignments || assignments.length === 0) {
    reportsList.value = []
    return
  }

  const studentIds = assignments.map(a => a.student_id)
  const { data: profiles } = await supabase.from('profiles').select('id, name, email').in('id', studentIds)
  const { data: reports } = await supabase.from('feedback_reports').select('*').in('student_id', studentIds).order('created_at', { ascending: false })

  const combinedList = []
  
  profiles.forEach(profile => {
    const studentReports = reports?.filter(r => r.student_id === profile.id) || []
    
    if (studentReports.length === 0) {
       combinedList.push({
         id: 'empty-' + profile.id,
         student_id: profile.id,
         student_name: profile.name || profile.email,
         status: 'not_started',
         training_category: '',
         created_at: null,
         reportData: null
       })
    } else {
       studentReports.forEach(r => {
         combinedList.push({
           ...r,
           student_name: profile.name || profile.email,
           reportData: r
         })
       })
    }
  })
  
  combinedList.sort((a, b) => {
    if (!a.created_at) return 1
    if (!b.created_at) return -1
    return new Date(b.created_at) - new Date(a.created_at)
  })

  reportsList.value = combinedList
}

function getStatusText(r) {
  if (r.status === 'not_started') return '⚪ 尚未填寫'
  if (r.status === 'draft') return '✏️ 填寫 / 修改中'
  if (r.status === 'submitted') {
     if (!r.reportData?.teacher_feedback) return '⏳ 待老師回饋'
     return '⏳ 待主管結案'
  }
  if (r.status === 'completed') return '✅ 已結案'
  return '未知狀態'
}

function openReport(r) {
  if (r.status === 'not_started') {
    return Toast.fire({ icon: 'info', title: '學員尚未建立心得表單，無法進入' })
  }
  Object.assign(report.value, r.reportData)
  report.value.student_name = r.student_name
  viewMode.value = 'form'
}

async function createNewReport() {
  Object.assign(report.value, {
    id: null,
    training_category: '',
    cert_date: '',
    student_content: '',
    teacher_feedback: '',
    supervisor_feedback: '',
    status: 'draft',
    created_at: null,
    teacher_submitted_at: null,
    supervisor_submitted_at: null,
  })
  
  if (reportsList.value.length > 0) {
      report.value.student_name = reportsList.value[0].student_name
  } else {
      const { data } = await supabase.from('profiles').select('name').eq('id', props.session.user.id).single()
      report.value.student_name = data?.name
  }
  
  viewMode.value = 'form'
}

function backToList() {
  viewMode.value = 'list'
  isLoading.value = true
  if (currentRole.value === 'student') {
    loadStudentReports().then(() => setTimeout(() => isLoading.value = false, 300))
  } else {
    loadReviewerReports().then(() => setTimeout(() => isLoading.value = false, 300))
  }
}

async function submitStudent() {
  if (!report.value.training_category) return Toast.fire({ icon: 'warning', title: '請先勾選最上方的「訓練類別」！' })
  if (!report.value.student_content?.trim()) return Toast.fire({ icon: 'warning', title: '請填寫「學員心得回饋」內容！' })
  
  const confirmResult = await Swal.fire({
    title: '確定要送出表單嗎？',
    text: '送出後將暫時無法修改，系統會自動在下班前統整待辦清單通知您的指導老師與主管。',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#3498db',
    cancelButtonColor: '#7f8c8d',
    confirmButtonText: '確認送出',
    cancelButtonText: '再檢查一下'
  })
  
  if (!confirmResult.isConfirmed) return
  
  const { data: assignData, error: assignError } = await supabase.from('assignments').select('teacher_id, supervisor_id').eq('student_id', props.session.user.id).maybeSingle()
  if (assignError || !assignData) {
    return Swal.fire({ icon: 'error', title: '送出失敗', text: '系統尚未為您分配指導老師與主管，請聯繫管理員！' })
  }

  let error;
  if (report.value.id) {
    const { error: updateError } = await supabase.from('feedback_reports').update({
      training_category: report.value.training_category,
      cert_date: report.value.cert_date,
      student_content: report.value.student_content,
      status: 'submitted'
    }).eq('id', report.value.id)
    error = updateError
  } else {
    const { error: insertError } = await supabase.from('feedback_reports').insert([{ 
      student_id: props.session.user.id,
      teacher_id: assignData.teacher_id,
      supervisor_id: assignData.supervisor_id,
      training_category: report.value.training_category,
      cert_date: report.value.cert_date,
      student_content: report.value.student_content,
      status: 'submitted' 
    }])
    error = insertError
  }
  
  if (error) {
    Toast.fire({ icon: 'error', title: '寫入失敗：' + error.message })
  } else {
    // 已經移除前端即時發信機制，改由後端 Cron Job 每日統整寄發
    await Swal.fire({ icon: 'success', title: '表單已成功送出！', timer: 2000, showConfirmButton: false })
    backToList()
  }
}

async function saveTeacher() {
  if (!report.value.teacher_feedback?.trim()) return Toast.fire({ icon: 'warning', title: '請填寫「指導老師回饋」內容！' })
  const currentTime = new Date().toISOString()
  const { error } = await supabase.from('feedback_reports').update({ teacher_feedback: report.value.teacher_feedback, teacher_submitted_at: currentTime }).eq('id', report.value.id)
  
  if (!error) {
    Toast.fire({ icon: 'success', title: '指導老師回饋已儲存！' })
    report.value.teacher_submitted_at = currentTime
  }
}

async function completeSupervisor() {
  if (!report.value.teacher_feedback?.trim()) return Toast.fire({ icon: 'warning', title: '指導老師尚未填寫回饋，無法進行結案！' })
  if (!report.value.supervisor_feedback?.trim()) return Toast.fire({ icon: 'warning', title: '請填寫「單位主管回饋」內容！' })
  
  const confirmResult = await Swal.fire({
    title: '確認儲存並結案？',
    text: '結案後將鎖定表單，並開放 PDF 匯出功能。',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#2ecc71',
    cancelButtonColor: '#7f8c8d',
    confirmButtonText: '確認結案'
  })

  if (!confirmResult.isConfirmed) return

  const currentTime = new Date().toISOString()
  const { error } = await supabase.from('feedback_reports').update({ supervisor_feedback: report.value.supervisor_feedback, status: 'completed', supervisor_submitted_at: currentTime }).eq('id', report.value.id)
  
  if (!error) {
    await Swal.fire({ icon: 'success', title: '已成功結案！', timer: 1500, showConfirmButton: false })
    backToList()
  }
}

function exportPDF() {
  if (!report.value.student_content?.trim() || !report.value.teacher_feedback?.trim() || !report.value.supervisor_feedback?.trim()) {
    return Toast.fire({ icon: 'warning', title: '表單尚未全部填寫完畢，無法匯出 PDF！' })
  }
  Toast.fire({ icon: 'info', title: 'PDF 產生中，請稍候...' })
  const element = document.getElementById('pdf-content')
  const fileName = `${report.value.student_name || '學員'}_基礎訓練心得.pdf`
  html2pdf().set({ margin: 0, filename: fileName, image: { type: 'jpeg', quality: 1 }, html2canvas: { scale: 2, windowWidth: 800 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).from(element).save()
}

async function unlockForm() {
  const result = await Swal.fire({
    title: '確定拉回重新編輯？',
    text: '這將會暫時解除「結案」狀態，允許老師與主管修改回饋內容。',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#f39c12',
    cancelButtonColor: '#7f8c8d',
    confirmButtonText: '確認拉回'
  })
  
  if (!result.isConfirmed) return

  const { error } = await supabase.from('feedback_reports').update({ status: 'submitted' }).eq('id', report.value.id)
  if (!error) {
    await Swal.fire({ icon: 'success', title: '表單已成功拉回！', timer: 1500, showConfirmButton: false })
    backToList()
  }
}

async function rejectToStudent() {
  const result = await Swal.fire({
    title: '確認退回給學員？',
    text: '學員將可重新編輯心得內容，您之前的回饋仍會保留。',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#e67e22',
    cancelButtonColor: '#7f8c8d',
    confirmButtonText: '確認退回'
  })
  
  if (!result.isConfirmed) return

  const { error } = await supabase.from('feedback_reports').update({ status: 'draft' }).eq('id', report.value.id)
  if (!error) {
    await Swal.fire({ icon: 'success', title: '表單已成功退回給學員！', timer: 1500, showConfirmButton: false })
    backToList()
  }
}

async function updatePassword() {
  if (newPassword.value.length < 6) return Toast.fire({ icon: 'warning', title: '密碼長度至少需要 6 個字元！' })
  
  const { error } = await supabase.auth.updateUser({ password: newPassword.value })
  if (error) {
    Toast.fire({ icon: 'error', title: '密碼修改失敗：' + error.message })
  } else {
    Swal.fire({ icon: 'success', title: '修改成功', text: '下次登入請使用新密碼。', confirmButtonColor: '#3498db' })
    showPasswordModal.value = false
    newPassword.value = ''
  }
}

async function handleLogout() {
  await supabase.auth.signOut()
}
</script>

<style scoped>
.app-container { background-color: #f0f2f5; min-height: 100vh; width: 100vw; position: absolute; top: 0; left: 0; padding: 30px 20px; font-family: "微軟正黑體", sans-serif; box-sizing: border-box; }

.system-header { display: flex; justify-content: space-between; align-items: center; max-width: 900px; margin: 0 auto 20px; background: white; padding: 20px 25px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e1e4e8; }
.header-titles { display: flex; flex-direction: column; gap: 8px; }
.main-app-title { margin: 0; color: #2c3e50; font-size: 24px; font-weight: 900; letter-spacing: 1px; }
.header-text { color: #7f8c8d; font-size: 15px; font-weight: bold; }
.role-tag { background: #3498db; color: white; padding: 4px 12px; border-radius: 12px; font-weight: bold; }
.action-panel { max-width: 800px; margin: 20px auto; display: flex; justify-content: center; gap: 15px; flex-wrap: wrap; }
.btn { padding: 10px 20px; border: none; border-radius: 6px; font-size: 16px; font-weight: bold; cursor: pointer; }
.logout-btn { background: #e74c3c; color: white; }
.primary-btn { background: #3498db; color: white; }
.danger-btn { background: #9b59b6; color: white; }
.success-btn { background: #2ecc71; color: white; }
.warning-btn { background: #e67e22; color: white; }
.dark-btn { background: #2c3e50; color: white; }
.header-actions { display: flex; gap: 10px; }
.card-header-flex { display: flex; justify-content: space-between; align-items: center; }

.skeleton-page { width: 100%; max-width: 900px; margin: 20px auto; box-sizing: border-box; display: flex; flex-direction: column; align-items: stretch; }
.skeleton-body { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); box-sizing: border-box; }
@keyframes pulse-local { 0% { opacity: 1; } 50% { opacity: 0.35; } 100% { opacity: 1; } }
.skeleton-title { height: 28px; width: 30%; margin-bottom: 25px; background-color: #e4e7eb; border-radius: 4px; animation: pulse-local 1.5s infinite ease-in-out; }
.skeleton-table-row { display: flex; gap: 15px; border-bottom: 1px solid #ecf0f1; padding: 15px 0; }
.skeleton-cell { height: 20px; background-color: #e4e7eb; border-radius: 4px; animation: pulse-local 1.5s infinite ease-in-out; flex-grow: 1; }

.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.modal-content { background: white; padding: 25px; border-radius: 8px; width: 90%; max-width: 400px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
.modal-content h3 { margin-top: 0; margin-bottom: 15px; color: #2c3e50; }
.modal-content label { display: block; font-size: 15px; font-weight: bold; color: #333333; }
.modal-input { width: 100%; padding: 10px; border: 1px solid #999; border-radius: 4px; margin-top: 8px; font-size: 16px; box-sizing: border-box; color: #333333; background-color: #ffffff; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }

.list-container { max-width: 900px; margin: 20px auto; background: white; padding: 25px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
.assignment-table { width: 100%; border-collapse: collapse; }
.assignment-table th, .assignment-table td { border: 1px solid #ddd; padding: 12px; text-align: left; vertical-align: middle; color: #333333; font-weight: 500; }
.assignment-table th { background-color: #f8f9fa; font-weight: bold; color: #1a1a1a; }
.student-name-cell { font-weight: bold; color: #2980b9; }
.status-badge { padding: 5px 10px; border-radius: 12px; font-size: 13px; font-weight: bold; display: inline-block; text-align: center; }
.status-badge.not_started { background: #ecf0f1; color: #7f8c8d; }
.status-badge.draft { background: #f1c40f; color: #8e44ad; }
.status-badge.submitted { background: #3498db; color: white; }
.status-badge.completed { background: #2ecc71; color: white; }
.small-btn { padding: 6px 12px; font-size: 14px; }
.disabled-btn { background: #bdc3c7; cursor: not-allowed; }
.disabled-btn:hover { background: #bdc3c7; }
.empty-state { text-align: center; color: #7f8c8d; padding: 30px; }

.paper-wrapper { max-width: 800px; margin: 0 auto; overflow-x: auto; }
.paper { background: white; padding: 15mm 20mm; width: 800px; box-sizing: border-box; font-family: "DFKai-SB", "BiauKai", "標楷體", serif; color: black; }
.paper-title { text-align: center; font-size: 26px; font-weight: normal; margin-bottom: 30px; letter-spacing: 2px; }
.checkbox-section { margin-bottom: 30px; font-size: 16px; }
.check-row { margin-bottom: 12px; display: flex; gap: 20px; align-items: center; }
input[type="radio"] { transform: scale(1.2); margin-right: 5px; cursor: pointer; }
.inline-input { border: none; border-bottom: 1px solid black; width: 120px; font-family: inherit; font-size: inherit; text-align: center; outline: none; background: transparent; margin: 0 5px; }
.feedback-table { width: 100%; border: 1px solid black; border-bottom: none; box-sizing: border-box; }
.table-row { border-bottom: 1px solid black; padding: 15px; box-sizing: border-box; }
.row-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
.row-title { font-size: 18px; font-weight: bold; }
.row-timestamp { font-size: 13px; color: #555; font-family: "微軟正黑體", sans-serif; }
.paper-textarea { width: 100%; border: none; resize: none; font-family: inherit; font-size: 16px; line-height: 1.6; outline: none; background: transparent; color: black; padding: 0; box-sizing: border-box; }
.paper-textarea:disabled { color: black; } 

@media screen and (max-width: 768px) {
  .system-header { flex-direction: column; align-items: stretch; gap: 15px; }
  .header-actions { flex-direction: column; width: 100%; }
  .header-actions button { width: 100%; }
  .card-header-flex { flex-direction: column; align-items: stretch; gap: 10px; margin-bottom: 15px; }
  .card-header-flex button { width: 100%; }
  
  .assignment-table thead { display: none !important; }
  .assignment-table, .assignment-table tbody, .assignment-table tr, .assignment-table td { display: block; width: 100%; box-sizing: border-box; }
  
  .assignment-table tr { 
    background: #ffffff; 
    border: 1px solid #dfe4ea; 
    border-radius: 10px; 
    margin-bottom: 15px; 
    padding: 15px; 
    box-shadow: 0 4px 8px rgba(0,0,0,0.06); 
  }
  
  .assignment-table td { border: none !important; padding: 6px 0 !important; text-align: left !important; }

  .reviewer-table td.student-name-cell { 
    font-size: 18px; 
    font-weight: bold; 
    color: #2c3e50; 
    border-bottom: 1px solid #ecf0f1 !important; 
    padding-bottom: 10px !important; 
    margin-bottom: 10px; 
  }

  .student-table td:nth-child(1)::before { content: "訓練類別："; font-weight: bold; color: #7f8c8d; }
  .student-table td:nth-child(2)::before { content: "目前狀態："; font-weight: bold; color: #7f8c8d; }
  .student-table td:nth-child(3)::before { content: "更新時間："; font-weight: bold; color: #7f8c8d; }
  
  .reviewer-table td:nth-child(2)::before { content: "訓練類別："; font-weight: bold; color: #7f8c8d; }
  .reviewer-table td:nth-child(3)::before { content: "目前狀態："; font-weight: bold; color: #7f8c8d; }
  .reviewer-table td:nth-child(4)::before { content: "更新時間："; font-weight: bold; color: #7f8c8d; }

  .assignment-table td:last-child { margin-top: 15px; }
  .assignment-table td:last-child button { width: 100%; padding: 12px; font-size: 16px; }

  .paper-wrapper { overflow-x: hidden; }
  .paper { padding: 20px 15px; width: 100%; border-radius: 8px; }
  .paper-title { font-size: 22px; }
  .check-row { flex-direction: column; align-items: flex-start; gap: 12px; margin-bottom: 20px; }
  .row-header { flex-direction: column; gap: 5px; }
  .action-panel { flex-direction: column; gap: 10px; }
  .action-panel button { width: 100%; }
}
</style>