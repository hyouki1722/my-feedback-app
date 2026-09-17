<template>
  <div class="app-wrapper">
    <div class="form-container">
      <div class="header-section">
        <h2>📘 臨床學習護照與測驗中心</h2>
        <div class="header-actions">
          <span class="user-info" v-if="profile">{{ profile.name }} ({{ getRoleName(profile.role) }})</span>
          <button @click="handleLogout" class="btn dark-btn small-btn">登出</button>
        </div>
      </div>

      <!-- 🌟 學員專屬：模組切換頁籤 -->
      <div class="module-tabs no-print" v-if="isStudent">
        <button :class="{ active: activeModule === 'exams' }" @click="activeModule = 'exams'">📝 我的測驗任務</button>
        <button :class="{ active: activeModule === 'feedback' }" @click="activeModule = 'feedback'">📘 實習心得填寫</button>
      </div>

      <!-- ========================================== -->
      <!-- 模組 A：線上測驗任務 (僅學員可見)               -->
      <!-- ========================================== -->
      <div v-if="activeModule === 'exams' && isStudent" class="module-content">
        
        <!-- 正在測驗中的畫面 -->
        <div v-if="examTaking" class="card exam-card">
          <div class="exam-header">
            <h3>{{ examTaking.exams?.title }}</h3>
            <span class="role-badge teacher">測驗進行中</span>
          </div>
          <div class="exam-warning">⚠️ 請注意：作答完畢送出後即無法修改，請確認所有題目皆已填答。</div>

          <div class="question-list">
            <div v-for="(q, index) in examQuestions" :key="q.id" class="question-item">
              <div class="q-title"><strong>Q{{ index + 1 }}.</strong> {{ q.question_text }}</div>
              <div class="q-options">
                <label v-for="(opt, optIndex) in q.options" :key="optIndex" class="opt-label">
                  <input type="radio" :name="'q_' + q.id" :value="opt" v-model="studentAnswers[q.id]" class="custom-radio">
                  <span class="opt-text">{{ opt }}</span>
                </label>
              </div>
            </div>
          </div>

          <div class="action-row center" style="margin-top: 30px;">
            <button @click="cancelExam" class="btn secondary-btn">取消暫離</button>
            <button @click="submitExam" class="btn primary-btn" :disabled="isSaving">交卷並計算成績</button>
          </div>
        </div>

        <!-- 任務列表畫面 -->
        <div v-else>
          <!-- 待辦測驗清單 -->
          <div class="card section-card">
            <h3>🔥 待辦測驗任務</h3>
            <table class="data-table">
              <thead>
                <tr>
                  <th>測驗卷名稱</th>
                  <th>類型</th>
                  <th>派發時間</th>
                  <th style="width: 100px; text-align: center;">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="task in pendingExams" :key="task.id">
                  <td><strong>{{ task.exams?.title }}</strong></td>
                  <td><span class="role-badge" :class="task.exams?.type === 'pre_test' ? 'student' : 'teacher'">{{ task.exams?.type === 'pre_test' ? '課前測驗' : '課後測驗' }}</span></td>
                  <td>{{ formatDate(task.created_at) }}</td>
                  <td style="text-align: center;">
                    <button @click="startExam(task)" class="btn success-btn small-btn">開始測驗</button>
                  </td>
                </tr>
                <tr v-if="pendingExams.length === 0">
                  <td colspan="4" class="empty-state">太棒了！目前沒有待辦的測驗任務。</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 已完成測驗清單 -->
          <div class="card section-card" style="margin-top: 20px;">
            <h3>✅ 已完成測驗紀錄</h3>
            <table class="data-table">
              <thead>
                <tr>
                  <th>測驗卷名稱</th>
                  <th>完成時間</th>
                  <th style="width: 100px; text-align: center;">得分</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="record in myExamRecords" :key="record.id">
                  <td><strong>{{ record.exams?.title }}</strong></td>
                  <td>{{ formatDate(record.completed_at) }}</td>
                  <td style="text-align: center;">
                    <span class="score-badge" :class="getScoreColor(record.score)">{{ record.score }} 分</span>
                  </td>
                </tr>
                <tr v-if="myExamRecords.length === 0">
                  <td colspan="3" class="empty-state">尚無測驗紀錄</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- 模組 B：實習心得填寫與審核                     -->
      <!-- ========================================== -->
      <div v-show="activeModule === 'feedback' || !isStudent" class="module-content">
        <!-- 報告選擇區 -->
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
          
          <div class="status-bar">
            <div class="meta-info">
              <p><strong>撰寫學員：</strong> {{ currentReportMeta.studentName || profile?.name }}</p>
              <p v-if="!isStudent"><strong>指導老師：</strong> {{ currentReportMeta.teacherName || '尚未指派' }}</p>
            </div>
            <div>
              目前狀態：<span class="status-badge" :class="report.status">{{ getStatusText(report.status) }}</span>
            </div>
          </div>

          <!-- 📊 學員測驗成績總覽 (螢幕與列印皆會顯示) -->
          <div v-if="studentExamRecords.length > 0" class="card section-card result-card">
            <h3>📊 測驗成績紀錄</h3>
            <p class="desc no-print">匯出 PDF 存查時，系統會自動將此成績列表附在報告中。</p>
            <div class="score-tags">
              <div v-for="record in studentExamRecords" :key="record.id" class="score-tag">
                <span class="exam-name">{{ record.exams?.title }}</span>
                <span class="score-val" :class="getScoreColor(record.score)">{{ record.score }} 分</span>
              </div>
            </div>
          </div>

          <!-- 學員填寫區 -->
          <div class="card section-card">
            <h3>🎓 學員心得反思</h3>
            <div class="form-group">
              <label>訓練類別：</label>
              <select v-model="report.training_category" :disabled="!isStudent || report.status !== 'draft'" class="form-input" required>
                <option value="" disabled>-- 請選擇訓練類別 --</option>
                <option v-for="cat in dynamicCategories" :key="cat.id" :value="cat.name">{{ cat.name }}</option>
              </select>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>實習/訓練開始日期：</label>
                <input type="date" v-model="report.training_date" :disabled="!isStudent || report.status !== 'draft'" class="form-input" required />
              </div>
              <div class="form-group">
                <label>實習/訓練結束日期：</label>
                <input type="date" v-model="report.training_end_date" :disabled="!isStudent || report.status !== 'draft'" class="form-input" required />
              </div>
            </div>

            <div class="form-group">
              <label>學習內容重點摘要：</label>
              <textarea v-model="report.content" rows="5" placeholder="請簡述這段區間內學習的核心護理技術或照護重點..." :disabled="!isStudent || report.status !== 'draft'" class="form-input" required></textarea>
            </div>

            <div class="form-group">
              <label>自我反思與心得：</label>
              <textarea v-model="report.reflection" rows="5" placeholder="請描述執行過程中的反思、遭遇的困難或後續改進方向..." :disabled="!isStudent || report.status !== 'draft'" class="form-input" required></textarea>
            </div>
            
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
            <div class="action-row no-print" v-if="isSupervisor && report.status === 'pending_supervisor'">
              <button @click="returnToTeacher" class="btn danger-btn" :disabled="isSaving">退回給老師</button>
              <button @click="closeReport" class="btn success-btn" :disabled="isSaving">確認結案</button>
            </div>
          </div>

          <!-- 結案後功能區 -->
          <div class="action-row center no-print" v-if="report.status === 'closed'">
            <button @click="exportToPDF" class="btn dark-btn">📄 匯出 PDF 存查</button>
            <button v-if="isSupervisor || isAdmin" @click="unlockReport" class="btn danger-btn">解鎖並退回重編</button>
          </div>
        </div>

        <div v-else class="card section-card empty-state">
          <p v-if="isStudent">請點擊上方「建立新心得」開始填寫。</p>
          <p v-else>目前未選擇任何報告，請由上方選單挑選您管轄的學員紀錄。</p>
        </div>
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

const isStudent = computed(() => profile.value?.role === 'student')
const isTeacher = computed(() => profile.value?.role === 'teacher')
const isSupervisor = computed(() => profile.value?.role === 'supervisor')
const isAdmin = computed(() => profile.value?.role === 'admin')

// 控制目前顯示模組 (exams 或 feedback)
const activeModule = ref('feedback')

// === 📝 線上測驗相關狀態 ===
const pendingExams = ref([])
const myExamRecords = ref([])
const examTaking = ref(null) // 目前正在作答的考卷資訊
const examQuestions = ref([]) // 考卷的題目
const studentAnswers = ref({}) // 學員選的答案 { q_id: '選的選項' }

// === 📘 心得回饋相關狀態 ===
const reportList = ref([])
const selectedReportId = ref('')
const currentReportMeta = ref({})
const dynamicCategories = ref([])
const studentExamRecords = ref([]) // 供老師/主管觀看的該名學員成績

const report = ref({
  id: null,
  training_category: '',
  training_date: new Date().toISOString().split('T')[0],
  training_end_date: new Date().toISOString().split('T')[0],
  content: '',
  reflection: '',
  teacher_feedback: '',
  supervisor_feedback: '',
  status: 'draft'
})

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await checkAndEnforcePasswordChange(user.id)
    const { data: userProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile.value = userProfile
    
    // 依據身分決定預設畫面
    if (userProfile.role === 'student') {
      activeModule.value = 'exams' 
      await loadMyExams()
    }
    
    await loadCategories()
    await loadReportsList(user.id, userProfile.role)
  }
})

// =====================================
// 📝 模組 A：線上測驗邏輯
// =====================================

async function loadMyExams() {
  if (!isStudent.value) return

  const { data: dispatches } = await supabase
    .from('exam_dispatch')
    .select('*, exams(title, type)')
    .eq('student_id', profile.value.id)
    .eq('is_completed', false)
    .order('created_at', { ascending: false })
  pendingExams.value = dispatches || []

  const { data: records } = await supabase
    .from('exam_records')
    .select('*, exams(title, type)')
    .eq('student_id', profile.value.id)
    .order('completed_at', { ascending: false })
  myExamRecords.value = records || []
}

async function startExam(task) {
  Swal.fire({ title: '載入題目中...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } })
  const { data: qData, error } = await supabase.from('questions').select('*').eq('exam_id', task.exam_id)

  if (error || !qData) {
    return Swal.fire('錯誤', '題目載入失敗', 'error')
  }

  examQuestions.value = qData
  examTaking.value = task
  studentAnswers.value = {}
  Swal.close()
}

function cancelExam() {
  Swal.fire({
    title: '確定要暫離嗎？', text: '目前作答的進度將不會被保留！', icon: 'warning', showCancelButton: true, confirmButtonColor: '#e74c3c'
  }).then((result) => {
    if (result.isConfirmed) {
      examTaking.value = null
      studentAnswers.value = {}
    }
  })
}

async function submitExam() {
  const answeredCount = Object.keys(studentAnswers.value).length
  const totalCount = examQuestions.value.length

  if (answeredCount < totalCount) {
    return Swal.fire('提示', `您還有 ${totalCount - answeredCount} 題尚未作答，請檢查！`, 'warning')
  }

  const { isConfirmed } = await Swal.fire({ title: '確定要交卷嗎？', text: '交卷後即無法修改答案！', icon: 'question', showCancelButton: true, confirmButtonColor: '#3498db' })
  if (!isConfirmed) return

  Swal.fire({ title: '批改中...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } })

  let correctCount = 0
  examQuestions.value.forEach(q => {
    if (studentAnswers.value[q.id] === q.correct_answer) correctCount++
  })
  const score = Math.round((correctCount / totalCount) * 100)

  await supabase.from('exam_records').insert({ student_id: profile.value.id, exam_id: examTaking.value.exam_id, score: score, answers: studentAnswers.value })
  await supabase.from('exam_dispatch').update({ is_completed: true }).eq('id', examTaking.value.id)

  Swal.fire({
    icon: 'success', title: '測驗完成！',
    html: `您的得分為：<strong style="font-size: 24px; color: ${score >= 60 ? '#2ecc71' : '#e74c3c'};">${score} 分</strong>`,
  })

  examTaking.value = null
  studentAnswers.value = {}
  await loadMyExams() 
}

function getScoreColor(score) {
  if (score >= 80) return 'score-high'
  if (score >= 60) return 'score-pass'
  return 'score-fail'
}

// =====================================
// 📘 模組 B：心得填寫與審核邏輯
// =====================================

async function loadCategories() {
  const { data, error } = await supabase.from('training_categories').select('*').order('created_at', { ascending: true })
  if (!error && data) dynamicCategories.value = data
}

async function loadReportsList(userId, role) {
  const { data: profs } = await supabase.from('profiles').select('id, name')
  const profilesMap = {}
  profs.forEach(p => profilesMap[p.id] = p.name)

  const { data: assigns } = await supabase.from('assignments').select('*')
  const assignsMap = {}
  assigns.forEach(a => assignsMap[a.student_id] = a)

  let query = supabase.from('feedback_reports').select('*').order('updated_at', { ascending: false })

  if (role === 'student') query = query.eq('student_id', userId)
  else if (role === 'teacher') {
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
        ...r, studentName: profilesMap[r.student_id] || '未知學員', teacherName: profilesMap[assign.teacher_id] || '尚未指派', supervisorName: profilesMap[assign.supervisor_id] || '尚未指派'
      }
    })
  }

  if (reportList.value.length > 0) {
    let autoSelect = reportList.value[0]
    if (role === 'teacher') autoSelect = reportList.value.find(r => r.status === 'pending_teacher') || reportList.value[0]
    if (role === 'supervisor') autoSelect = reportList.value.find(r => r.status === 'pending_supervisor') || reportList.value[0]
    selectedReportId.value = autoSelect.id
    await selectReport()
  }
}

async function selectReport() {
  const found = reportList.value.find(r => r.id === selectedReportId.value)
  if (found) {
    report.value = { ...found }
    if (!report.value.training_end_date) report.value.training_end_date = report.value.training_date
    currentReportMeta.value = { studentName: found.studentName, teacherName: found.teacherName }

    // 🌟 核心整合：不限身分，只要檢視報告就撈取該學員的考試成績 (供匯出 PDF 使用)
    const { data: records } = await supabase
      .from('exam_records')
      .select('*, exams(title)')
      .eq('student_id', found.student_id)
      .order('completed_at', { ascending: false })
    studentExamRecords.value = records || []
  } else {
    createNewDraft()
  }
}

function createNewDraft() {
  selectedReportId.value = ''
  report.value = { id: null, training_category: '', training_date: new Date().toISOString().split('T')[0], training_end_date: new Date().toISOString().split('T')[0], content: '', reflection: '', teacher_feedback: '', supervisor_feedback: '', status: 'draft' }
  currentReportMeta.value = {}
  studentExamRecords.value = []
}

function getStatusText(status) {
  const map = { 'draft': '📝 草稿', 'pending_teacher': '⏳ 待老師', 'pending_supervisor': '⏳ 待主管', 'closed': '✅ 已結案' }
  return map[status] || status
}

function getRoleName(role) {
  const map = { student: '學員', teacher: '老師', supervisor: '主管', admin: '管理員' }
  return map[role] || role
}

async function saveDraft() {
  if (new Date(report.value.training_date) > new Date(report.value.training_end_date)) return Swal.fire('提示', '「結束日期」不能早於「開始日期」', 'warning')
  isSaving.value = true
  const payload = { student_id: profile.value.id, training_category: report.value.training_category, training_date: report.value.training_date, training_end_date: report.value.training_end_date, content: report.value.content, reflection: report.value.reflection, status: 'draft', updated_at: new Date().toISOString() }
  if (report.value.id) await supabase.from('feedback_reports').update(payload).eq('id', report.value.id)
  else {
    const { data } = await supabase.from('feedback_reports').insert([payload]).select()
    if (data) report.value.id = data[0].id
  }
  Toast.fire({ icon: 'success', title: '草稿已儲存' })
  await loadReportsList(profile.value.id, profile.value.role) 
  isSaving.value = false 
}

async function submitReport() {
  if (!report.value.training_category || !report.value.content || !report.value.reflection) return Swal.fire('提示', '請完整填寫訓練類別、內容與反思', 'warning')
  if (new Date(report.value.training_date) > new Date(report.value.training_end_date)) return Swal.fire('提示', '「結束日期」不能早於「開始日期」', 'warning')

  isSaving.value = true
  const payload = { student_id: profile.value.id, training_category: report.value.training_category, training_date: report.value.training_date, training_end_date: report.value.training_end_date, content: report.value.content, reflection: report.value.reflection, status: 'pending_teacher', updated_at: new Date().toISOString() }
  let error;
  if (report.value.id) ({ error } = await supabase.from('feedback_reports').update(payload).eq('id', report.value.id))
  else ({ error } = await supabase.from('feedback_reports').insert([payload]))

  isSaving.value = false
  if (!error) { Swal.fire({ icon: 'success', title: '已送出', text: '表單已送出給指導老師' }); await loadReportsList(profile.value.id, profile.value.role) } 
  else Swal.fire('錯誤', '送出失敗: ' + error.message, 'error')
}

async function submitTeacherFeedback() {
  if (!report.value.teacher_feedback) return Swal.fire('提示', '請填寫指導回饋', 'warning')
  isSaving.value = true
  await supabase.from('feedback_reports').update({ teacher_feedback: report.value.teacher_feedback, status: 'pending_supervisor', updated_at: new Date().toISOString() }).eq('id', report.value.id)
  isSaving.value = false
  Swal.fire({ icon: 'success', title: '回饋已送出', text: '表單已移交單位主管' })
  await loadReportsList(profile.value.id, profile.value.role)
}

async function returnToStudent() {
  const { isConfirmed } = await Swal.fire({ title: '退回學員？', text: '退回後學員將可重新編輯內容', showCancelButton: true })
  if (isConfirmed) { await supabase.from('feedback_reports').update({ status: 'draft' }).eq('id', report.value.id); Toast.fire({ icon: 'info', title: '已退回' }); await loadReportsList(profile.value.id, profile.value.role) }
}

async function closeReport() {
  if (!report.value.supervisor_feedback) return Swal.fire('提示', '請填寫主管總評', 'warning')
  const { isConfirmed } = await Swal.fire({ title: '確認結案？', text: '結案後表單將鎖定。', icon: 'question', showCancelButton: true, confirmButtonText: '確認結案', confirmButtonColor: '#2ecc71' })
  if (!isConfirmed) return

  isSaving.value = true
  const { error } = await supabase.from('feedback_reports').update({ supervisor_feedback: report.value.supervisor_feedback, status: 'closed', updated_at: new Date().toISOString() }).eq('id', report.value.id)
  isSaving.value = false
  if (!error) { Swal.fire({ icon: 'success', title: '結案成功' }); await loadReportsList(profile.value.id, profile.value.role) }
}

async function returnToTeacher() {
  const { isConfirmed } = await Swal.fire({ title: '退回給老師？', showCancelButton: true, confirmButtonColor: '#e74c3c' })
  if (isConfirmed) { await supabase.from('feedback_reports').update({ status: 'pending_teacher' }).eq('id', report.value.id); Toast.fire({ icon: 'info', title: '已退回給老師' }); await loadReportsList(profile.value.id, profile.value.role) }
}

async function unlockReport() {
  const { isConfirmed } = await Swal.fire({ title: '解除鎖定？', icon: 'warning', showCancelButton: true, confirmButtonColor: '#e74c3c' })
  if (isConfirmed) { await supabase.from('feedback_reports').update({ status: 'pending_supervisor' }).eq('id', report.value.id); Toast.fire({ icon: 'success', title: '已解除鎖定' }); await loadReportsList(profile.value.id, profile.value.role) }
}

function exportToPDF() { window.print() }
async function handleLogout() { await supabase.auth.signOut() }
</script>

<style scoped>
/* 基本共用樣式 */
.app-wrapper { background-color: #f0f2f5; min-height: 100vh; width: 100vw; position: absolute; top: 0; left: 0; padding: 30px 20px; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; }
.form-container { width: 100%; max-width: 850px; font-family: "微軟正黑體", sans-serif; }
.header-section { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: white; padding: 20px 25px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e1e4e8; }
.header-section h2 { margin: 0; color: #2c3e50; font-weight: 900;}
.user-info { font-weight: bold; color: #34495e; margin-right: 15px; }

/* 模組切換頁籤 */
.module-tabs { display: flex; gap: 5px; margin-bottom: 20px; border-bottom: 2px solid #e1e4e8; }
.module-tabs button { padding: 12px 24px; border: none; background: transparent; font-size: 16px; font-weight: bold; color: #7f8c8d; cursor: pointer; border-radius: 6px 6px 0 0; transition: 0.2s; margin-bottom: -2px; border-bottom: 2px solid transparent; }
.module-tabs button.active { color: #3498db; border-bottom: 2px solid #3498db; }
.module-tabs button:hover:not(.active) { color: #2c3e50; }
.module-content { animation: fadeIn 0.3s ease-in-out; }

@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

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

/* 表單樣式 */
.form-row { display: flex; gap: 15px; margin-bottom: 15px; }
.form-row .form-group { flex: 1; margin-bottom: 0; }
.form-group { margin-bottom: 15px; }
.form-group label { display: block; font-weight: bold; margin-bottom: 8px; color: #2c3e50; }
.form-input { width: 100%; padding: 12px; border: 1px solid #dcdde1; border-radius: 6px; box-sizing: border-box; font-size: 15px; font-family: inherit; resize: vertical; }
.form-input:focus { outline: none; border-color: #3498db; }
.form-input:disabled { background-color: #f8f9fa; color: #7f8c8d; cursor: not-allowed; }

.action-row { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.action-row.center { justify-content: center; }

.btn { padding: 10px 20px; border: none; border-radius: 6px; font-weight: bold; font-size: 15px; cursor: pointer; transition: all 0.2s; font-family: inherit; }
.small-btn { padding: 8px 14px; font-size: 13px; }
.primary-btn { background: #3498db; color: white; }
.secondary-btn { background: #95a5a6; color: white; }
.success-btn { background: #2ecc71; color: white; }
.danger-btn { background: #e74c3c; color: white; }
.dark-btn { background: #2c3e50; color: white; }
.btn:hover:not(:disabled) { filter: brightness(0.9); transform: translateY(-1px); }
.btn:disabled { background: #bdc3c7; cursor: not-allowed; transform: none; }

/* 表格樣式 */
.table-responsive { overflow-x: auto; margin-top: 15px; }
.data-table { width: 100%; border-collapse: collapse; min-width: 600px; }
.data-table th, .data-table td { padding: 14px; border-bottom: 1px solid #ecf0f1; text-align: left; color: #2c3e50; }
.data-table th { background: #f8f9fa; font-weight: bold; }
.role-badge { padding: 5px 12px; border-radius: 12px; font-size: 13px; font-weight: bold; color: white; display: inline-block; }
.role-badge.student { background: #3498db; }
.role-badge.teacher { background: #9b59b6; }

/* 🏆 成績標籤設計 */
.score-badge { padding: 6px 12px; border-radius: 6px; font-weight: bold; color: white; display: inline-block; min-width: 50px; }
.score-high { background-color: #2ecc71; }
.score-pass { background-color: #f39c12; }
.score-fail { background-color: #e74c3c; }

.result-card { background: #fdfdfd; border-color: #3498db; }
.score-tags { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
.score-tag { display: flex; align-items: center; border: 1px solid #dcdde1; border-radius: 6px; overflow: hidden; background: white; font-weight: bold; }
.score-tag .exam-name { padding: 8px 12px; background: #f8f9fa; color: #2c3e50; }
.score-tag .score-val { padding: 8px 12px; color: white; }

/* 測驗進行中 UI */
.exam-card { border-top: 5px solid #3498db; }
.exam-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ecf0f1; padding-bottom: 15px; margin-bottom: 15px; }
.exam-header h3 { border: none; margin: 0; padding: 0; }
.exam-warning { background: #fff3cd; color: #856404; padding: 12px; border-radius: 6px; margin-bottom: 20px; font-weight: bold; font-size: 14px; border: 1px solid #ffeeba; }
.question-list { display: flex; flex-direction: column; gap: 20px; }
.question-item { background: #f8f9fa; padding: 18px; border-radius: 8px; border: 1px solid #e1e4e8; }
.q-title { font-size: 16px; color: #2c3e50; margin-bottom: 15px; line-height: 1.5; }
.q-options { display: flex; flex-direction: column; gap: 10px; }
.opt-label { display: flex; align-items: flex-start; gap: 10px; cursor: pointer; padding: 10px 15px; background: white; border-radius: 6px; border: 1px solid #dcdde1; transition: 0.2s; }
.opt-label:hover { border-color: #3498db; background: #f0f8ff; }
.custom-radio { margin-top: 4px; width: 16px; height: 16px; accent-color: #3498db; }
.opt-text { font-size: 15px; color: #34495e; line-height: 1.4; }

/* 🖨️ PDF 列印專屬優化 (確保成績框與排版不走鐘) */
@media print {
  .app-wrapper { background: white; padding: 0; }
  .no-print { display: none !important; }
  .card { box-shadow: none; border: 1px solid #ccc; page-break-inside: avoid; margin-bottom: 15px; }
  .form-input { border: none; padding: 0; background: transparent !important; color: black !important; }
  
  /* 確保成績標籤在列印時不會被強制轉成透明白字 */
  .score-tag { border: 1px solid #000; }
  .score-tag .exam-name { background: transparent !important; color: #000 !important; border-right: 1px solid #000; }
  .score-tag .score-val { color: #000 !important; background: transparent !important; }
}

@media screen and (max-width: 600px) {
  .header-section { flex-direction: column; align-items: stretch; gap: 12px; text-align: center; }
  .header-actions { justify-content: center; flex-wrap: wrap; gap: 10px; }
  .module-tabs { flex-direction: column; border-bottom: none; }
  .module-tabs button { border-radius: 6px; border-bottom: none; margin-bottom: 5px; }
  .module-tabs button.active { background: #ecf0f1; border-bottom: none; }
  .status-bar { flex-direction: column; align-items: flex-start; gap: 12px; padding: 15px; }
  .action-row { flex-direction: column; }
  .action-row button { width: 100%; margin-bottom: 5px; }
  .form-row { flex-direction: column; gap: 15px; margin-bottom: 15px; }
  .card { padding: 18px; }
  .selector-header { flex-direction: column; gap: 10px; align-items: stretch; }
  .exam-header { flex-direction: column; gap: 10px; align-items: flex-start; }
}
</style>