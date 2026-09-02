<template>
  <div class="app-container">
    <div class="system-header">
      <div class="header-text">目前登入身分：<span class="role-tag">{{ roleName }}</span></div>
      <button @click="handleLogout" class="btn logout-btn">登出系統</button>
    </div>

    <!-- A4 實體文件區塊 -->
    <div class="paper-wrapper">
      <div id="pdf-content" class="paper">
        <h1 class="paper-title">基礎訓練心得</h1>

        <!-- 訓練類別勾選區 -->
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

        <!-- 框線表格區 -->
        <div class="feedback-table">
          <!-- 學生區塊 -->
          <div class="table-row">
            <div class="row-header">
              <div class="row-title">一、學員心得回饋</div>
              <div class="row-timestamp" v-if="report.created_at">{{ formatDate(report.created_at) }}</div>
            </div>
            <textarea v-model="report.student_content" class="paper-textarea" rows="4" :disabled="!isStudentDraft"></textarea>
          </div>
          
          <!-- 老師區塊 -->
          <div class="table-row">
            <div class="row-header">
              <div class="row-title">二、指導老師回饋</div>
              <div class="row-timestamp" v-if="report.teacher_submitted_at">{{ formatDate(report.teacher_submitted_at) }}</div>
            </div>
            <textarea v-model="report.teacher_feedback" class="paper-textarea" rows="4" :disabled="currentRole !== 'teacher' || report.status === 'completed'"></textarea>
          </div>
          
          <!-- 主管區塊 -->
          <div class="table-row last-row">
            <div class="row-header">
              <div class="row-title">三、單位主管回饋</div>
              <div class="row-timestamp" v-if="report.supervisor_submitted_at">{{ formatDate(report.supervisor_submitted_at) }}</div>
            </div>
            <textarea v-model="report.supervisor_feedback" class="paper-textarea" rows="4" :disabled="currentRole !== 'supervisor' || report.status === 'completed'"></textarea>
          </div>
        </div>
      </div>
    </div>

    <!-- 系統操作面板 -->
    <div class="action-panel">
      <!-- 學員專屬 -->
      <button v-if="isStudentDraft" @click="submitStudent" class="btn primary-btn">學員送出表單</button>
      
      <!-- 老師專屬 -->
      <template v-if="currentRole === 'teacher' && report.status === 'submitted'">
        <button @click="saveTeacher" class="btn primary-btn">儲存指導老師回饋</button>
        <button @click="rejectToStudent" class="btn warning-btn">退回給學員修改</button>
      </template>

      <!-- 主管專屬 -->
      <button v-if="currentRole === 'supervisor' && report.status === 'submitted'" @click="completeSupervisor" class="btn danger-btn">儲存並完成結案</button>
      
      <!-- 老師與主管：將結案資料拉回重新編輯 -->
      <button v-if="(currentRole === 'teacher' || currentRole === 'supervisor') && report.status === 'completed'" @click="unlockForm" class="btn warning-btn">🔓 將資料拉回重新編輯</button>

      <!-- 匯出 PDF -->
      <button v-if="report.status === 'completed'" @click="exportPDF" class="btn dark-btn">📄 匯出 PDF 文件</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../supabase'
import html2pdf from 'html2pdf.js'

const props = defineProps(['session', 'userRole'])

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
  supervisor_submitted_at: null
})

function formatDate(dateString) {
  if (!dateString) return ''
  const d = new Date(dateString)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const currentRole = computed(() => {
  return props.userRole || ''
})

const roleName = computed(() => {
  const map = {
    student: '學員',
    teacher: '臨床老師',
    supervisor: '單位主管',
    admin: '系統管理員'
  }
  return map[currentRole.value] || '讀取中...'
})

const isStudentDraft = computed(() => {
  return currentRole.value === 'student' && report.value.status === 'draft'
})

onMounted(async () => {
  const { data, error } = await supabase
    .from('feedback_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
    
  if (data) {
    if (currentRole.value === 'student' && data.status === 'completed') {
      return 
    }
    report.value = data
  }
})

// 1. 學員送出檢查 (加入確認視窗與寄信觸發)
async function submitStudent() {
  if (!report.value.training_category) return alert('請先勾選最上方的「訓練類別」！')
  if (!report.value.student_content?.trim()) return alert('請填寫「學員心得回饋」內容！')
  
  const isConfirmed = confirm('確定要送出表單嗎？\n⚠️ 送出後將無法再次編輯，系統將準備發送通知信給您的指導老師與主管。')
  if (!isConfirmed) return
  
  const { data: assignData, error: assignError } = await supabase
    .from('assignments')
    .select('teacher_id, supervisor_id')
    .eq('student_id', props.session.user.id)
    .single()
    
  if (assignError || !assignData) {
    return alert('送出失敗：系統管理員尚未為您分配指導老師與主管，請聯繫管理員！')
  }

  const { error } = await supabase.from('feedback_reports').insert([{ 
    student_id: props.session.user.id,
    teacher_id: assignData.teacher_id,
    supervisor_id: assignData.supervisor_id,
    training_category: report.value.training_category,
    cert_date: report.value.cert_date,
    student_content: report.value.student_content,
    status: 'submitted' 
  }])
  
  if (error) {
    alert('寫入失敗（權限或資料庫錯誤）：' + error.message)
  } else {
    await sendNotificationEmails(assignData.teacher_id, assignData.supervisor_id)
    alert('表單已成功送出！')
    location.reload()
  }
}

// 觸發通知信函式
async function sendNotificationEmails(teacherId, supervisorId) {
  try {
    const { data: teacherData } = await supabase.from('profiles').select('email').eq('id', teacherId).single()
    const { data: supervisorData } = await supabase.from('profiles').select('email').eq('id', supervisorId).single()
    
    const teacherEmail = teacherData?.email || ''
    const supervisorEmail = supervisorData?.email || ''
    
    const systemUrl = window.location.origin
    const subject = encodeURIComponent('【臨床實習系統】新的基礎訓練心得待審核')
    const body = encodeURIComponent(`老師/主管您好：\n\n有學員已送出基礎訓練心得，請點擊下方系統連結，登入後進行您的回饋填寫：\n\n🔗 系統連結：${systemUrl}\n\n(此為系統自動生成信件，請勿直接回覆)`)
    
    const mailtoLink = `mailto:${teacherEmail},${supervisorEmail}?subject=${subject}&body=${body}`
    window.open(mailtoLink, '_blank')
  } catch (err) {
    console.error('抓取信箱失敗:', err)
  }
}

// 2. 老師儲存檢查
async function saveTeacher() {
  if (!report.value.teacher_feedback?.trim()) return alert('請填寫「指導老師回饋」內容！')

  const currentTime = new Date().toISOString()
  const { error } = await supabase.from('feedback_reports')
    .update({ 
      teacher_feedback: report.value.teacher_feedback,
      teacher_submitted_at: currentTime 
    })
    .eq('id', report.value.id)
  if (!error) {
    alert('指導老師回饋已儲存！')
    report.value.teacher_submitted_at = currentTime
  }
}

// 3. 主管結案檢查
async function completeSupervisor() {
  if (!report.value.teacher_feedback?.trim()) return alert('指導老師尚未填寫回饋，無法進行結案！')
  if (!report.value.supervisor_feedback?.trim()) return alert('請填寫「單位主管回饋」內容！')

  const currentTime = new Date().toISOString()
  const { error } = await supabase.from('feedback_reports')
    .update({ 
      supervisor_feedback: report.value.supervisor_feedback, 
      status: 'completed',
      supervisor_submitted_at: currentTime
    })
    .eq('id', report.value.id)
  if (!error) location.reload()
}

// 4. PDF 匯出檢查
function exportPDF() {
  if (!report.value.student_content?.trim() || !report.value.teacher_feedback?.trim() || !report.value.supervisor_feedback?.trim()) {
    return alert('表單尚未全部填寫完畢，無法匯出 PDF！')
  }

  const element = document.getElementById('pdf-content')
  const opt = {
    margin: 0, 
    filename: '基礎訓練心得.pdf',
    image: { type: 'jpeg', quality: 1 },
    html2canvas: { scale: 2, windowWidth: 800 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }
  html2pdf().set(opt).from(element).save()
}

// 5. 將資料拉回重新編輯 (解除結案狀態)
async function unlockForm() {
  if (!confirm('確定要將表單拉回重新編輯嗎？這將會暫時解除「結案」狀態。')) return

  const { error } = await supabase.from('feedback_reports')
    .update({ status: 'submitted' })
    .eq('id', report.value.id)

  if (!error) {
    alert('表單已成功拉回！您現在可以重新編輯內容了。')
    location.reload()
  } else {
    alert('拉回失敗：' + error.message)
  }
}

// 6. 退回給學員修改
async function rejectToStudent() {
  if (!confirm('確定要將此心得退回給學員重新修改嗎？')) return

  const { error } = await supabase.from('feedback_reports')
    .update({ status: 'draft' })
    .eq('id', report.value.id)
    
  if (!error) {
    alert('表單已成功退回給學員！')
    location.reload()
  } else {
    alert('退回失敗：' + error.message)
  }
}

async function handleLogout() {
  await supabase.auth.signOut()
}
</script>

<style scoped>
.app-container { background-color: #f0f2f5; min-height: 100vh; padding: 20px; font-family: "微軟正黑體", sans-serif; }
.system-header { display: flex; justify-content: space-between; align-items: center; max-width: 800px; margin: 0 auto 20px; background: white; padding: 15px 25px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.header-text { color: #333333; font-size: 16px; font-weight: bold; }
.role-tag { background: #3498db; color: white; padding: 4px 12px; border-radius: 12px; font-weight: bold; }
.action-panel { max-width: 800px; margin: 20px auto; display: flex; justify-content: center; gap: 15px; flex-wrap: wrap; }
.btn { padding: 10px 20px; border: none; border-radius: 6px; font-size: 16px; font-weight: bold; cursor: pointer; }
.logout-btn { background: #e74c3c; color: white; }
.primary-btn { background: #3498db; color: white; }
.danger-btn { background: #9b59b6; color: white; }
.warning-btn { background: #e67e22; color: white; }
.dark-btn { background: #2c3e50; color: white; }

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
</style>