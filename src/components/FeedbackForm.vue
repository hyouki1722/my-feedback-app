<template>
  <div class="app-wrapper">
    <div class="form-container">
      <div class="header-section">
        <h2>📘 實習生學習系統 - 測驗與心得中心</h2>
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
                <tr v-if="pendingExams.length === 0"><td colspan="4" class="empty-state">太棒了！目前沒有待辦的測驗任務。</td></tr>
              </tbody>
            </table>
          </div>

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
                  <td style="text-align: center;"><span class="score-badge" :class="getScoreColor(record.score)">{{ record.score }} 分</span></td>
                </tr>
                <tr v-if="myExamRecords.length === 0"><td colspan="3" class="empty-state">尚無測驗紀錄</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- 模組 B：實習心得填寫與審核                     -->
      <!-- ========================================== -->
      <div v-show="activeModule === 'feedback' || !isStudent" class="module-content">
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

        <div v-if="report.id || (isStudent && report.status === 'draft')">
          <div class="status-bar">
            <div class="meta-info">
              <p><strong>撰寫學員：</strong> {{ currentReportMeta.studentName || profile?.name }}</p>
              <p v-if="!isStudent"><strong>指導老師：</strong> {{ currentReportMeta.teacherName || '尚未指派' }}</p>
            </div>
            <div>目前狀態：<span class="status-badge" :class="report.status">{{ getStatusText(report.status) }}</span></div>
          </div>

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
              <div class="form-group"><label>實習/訓練開始日期：</label><input type="date" v-model="report.training_date" :disabled="!isStudent || report.status !== 'draft'" class="form-input" required /></div>
              <div class="form-group"><label>實習/訓練結束日期：</label><input type="date" v-model="report.training_end_date" :disabled="!isStudent || report.status !== 'draft'" class="form-input" required /></div>
            </div>
            <div class="form-group"><label>學習內容重點摘要：</label><textarea v-model="report.content" rows="5" :disabled="!isStudent || report.status !== 'draft'" class="form-input" required></textarea></div>
            <div class="form-group"><label>自我反思與心得：</label><textarea v-model="report.reflection" rows="5" :disabled="!isStudent || report.status !== 'draft'" class="form-input" required></textarea></div>
            
            <div class="action-row no-print" v-if="isStudent && report.status === 'draft'">
              <button @click="saveDraft" class="btn secondary-btn" :disabled="isSaving">儲存草稿</button>
              <!-- 改為呼叫開啓簽章函式 -->
              <button @click="initiateAction('student')" class="btn primary-btn" :disabled="isSaving">✍️ 簽章並送出審核</button>
            </div>
          </div>

          <div class="card section-card" v-if="report.status !== 'draft'">
            <h3>👩‍⚕️ 臨床指導老師回饋</h3>
            <div class="form-group">
              <textarea v-model="report.teacher_feedback" rows="5" placeholder="請給予學員具體的指導與建議..." :disabled="!isTeacher || report.status !== 'pending_teacher'" class="form-input"></textarea>
            </div>
            <div class="action-row no-print" v-if="isTeacher && report.status === 'pending_teacher'">
              <button @click="returnToStudent" class="btn danger-btn" :disabled="isSaving">退回修改</button>
              <button @click="initiateAction('teacher')" class="btn primary-btn" :disabled="isSaving">✍️ 簽章並送出至主管</button>
            </div>
          </div>

          <div class="card section-card" v-if="report.status === 'pending_supervisor' || report.status === 'closed'">
            <h3>🏥 單位主管總評</h3>
            <div class="form-group">
              <textarea v-model="report.supervisor_feedback" rows="5" placeholder="請給予具體之臨床專業講評與期勉..." :disabled="!isSupervisor || report.status !== 'pending_supervisor'" class="form-input"></textarea>
            </div>
            <div class="action-row no-print" v-if="isSupervisor && report.status === 'pending_supervisor'">
              <button @click="returnToTeacher" class="btn danger-btn" :disabled="isSaving">退回給老師</button>
              <button @click="initiateAction('supervisor')" class="btn success-btn" :disabled="isSaving">✍️ 簽章並結案</button>
            </div>
          </div>

          <!-- 🏆 電子簽章顯示區域 -->
          <div class="demo-signatures" v-if="report.id">
            <div class="sign-box">
              <span class="sign-title">學員簽章</span>
              <img v-if="report.student_signature" :src="report.student_signature" class="signature-img" />
              <span v-else class="unsigned-text">(尚未簽署)</span>
            </div>
            <div class="sign-box">
              <span class="sign-title">老師簽章</span>
              <img v-if="report.teacher_signature" :src="report.teacher_signature" class="signature-img" />
              <span v-else class="unsigned-text">(尚未簽署)</span>
            </div>
            <div class="sign-box">
              <span class="sign-title">主管簽章</span>
              <img v-if="report.supervisor_signature" :src="report.supervisor_signature" class="signature-img" />
              <span v-else class="unsigned-text">(尚未簽署)</span>
            </div>
          </div>

          <!-- 結案後功能區 -->
          <div class="action-row center no-print" v-if="report.status === 'closed'" style="margin-top: 30px;">
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

    <!-- ✍️ 電子簽章與印章上傳 Modal -->
    <div v-if="showSignatureModal" class="modal-overlay" @click.self="closeSignatureModal">
      <div class="modal-content signature-modal">
        <div class="modal-header">
          <h3>✍️ 文件核准簽章</h3>
          <button @click="closeSignatureModal" class="close-btn">✖</button>
        </div>
        <div class="modal-body">
          <div class="signature-tabs">
            <button :class="{ active: signatureMode === 'draw' }" @click="signatureMode = 'draw'">手寫簽名</button>
            <button :class="{ active: signatureMode === 'upload' }" @click="signatureMode = 'upload'">上傳印章/圖片</button>
          </div>

          <!-- 手寫畫布 -->
          <div v-show="signatureMode === 'draw'" class="canvas-container">
            <canvas 
              ref="canvasRef" 
              width="400" 
              height="200" 
              class="signature-canvas"
              @mousedown="startDraw" 
              @mousemove="draw" 
              @mouseup="stopDraw" 
              @mouseleave="stopDraw"
              @touchstart.prevent="startDraw" 
              @touchmove.prevent="draw" 
              @touchend.prevent="stopDraw"
            ></canvas>
            <button @click="clearCanvas" class="btn secondary-btn small-btn clear-btn">重新簽名</button>
          </div>

          <!-- 上傳圖片 -->
          <div v-show="signatureMode === 'upload'" class="upload-container">
            <input type="file" @change="handleSignatureUpload" accept="image/*" class="form-input" />
            <div v-if="uploadedSignature" class="preview-img-box">
              <img :src="uploadedSignature" class="signature-preview" />
            </div>
            <p v-else style="color: #7f8c8d; font-size: 14px; margin-top: 10px;">請上傳您的印章或簽名圖檔 (建議為白底或去背 PNG)</p>
          </div>

          <div class="action-row center" style="margin-top: 20px;">
            <button @click="closeSignatureModal" class="btn secondary-btn">取消</button>
            <button @click="confirmSignature" class="btn primary-btn">✅ 確認簽章並送出</button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
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

const activeModule = ref('feedback')

// 測驗任務
const pendingExams = ref([])
const myExamRecords = ref([])
const examTaking = ref(null)
const examQuestions = ref([])
const studentAnswers = ref({})

// 報告與成績
const reportList = ref([])
const selectedReportId = ref('')
const currentReportMeta = ref({})
const dynamicCategories = ref([])
const studentExamRecords = ref([])

const report = ref({
  id: null, training_category: '', training_date: new Date().toISOString().split('T')[0], training_end_date: new Date().toISOString().split('T')[0],
  content: '', reflection: '', teacher_feedback: '', supervisor_feedback: '', status: 'draft',
  student_signature: null, teacher_signature: null, supervisor_signature: null
})

// === ✍️ 電子簽章面板邏輯 ===
const showSignatureModal = ref(false)
const signatureMode = ref('draw') // 'draw' 或 'upload'
const pendingAction = ref(null) // 紀錄目前是誰準備要送出 ('student', 'teacher', 'supervisor')
const canvasRef = ref(null)
const uploadedSignature = ref(null)
let isDrawing = false
let ctx = null
let hasDrawn = false

// 開啟簽章視窗前，先驗證表單是否填寫完整
function initiateAction(actionRole) {
  if (actionRole === 'student') {
    if (!report.value.training_category || !report.value.content || !report.value.reflection) return Swal.fire('提示', '請完整填寫訓練類別、內容與反思', 'warning')
    if (new Date(report.value.training_date) > new Date(report.value.training_end_date)) return Swal.fire('提示', '「結束日期」不能早於「開始日期」', 'warning')
  } else if (actionRole === 'teacher') {
    if (!report.value.teacher_feedback) return Swal.fire('提示', '請填寫指導回饋', 'warning')
  } else if (actionRole === 'supervisor') {
    if (!report.value.supervisor_feedback) return Swal.fire('提示', '請填寫主管總評', 'warning')
  }

  pendingAction.value = actionRole
  showSignatureModal.value = true
  signatureMode.value = 'draw'
  uploadedSignature.value = null
  hasDrawn = false

  // 等待 DOM 渲染 Modal 後初始化 Canvas
  nextTick(() => {
    if (canvasRef.value) {
      ctx = canvasRef.value.getContext('2d')
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.strokeStyle = '#2c3e50'
      clearCanvas()
    }
  })
}

function closeSignatureModal() {
  showSignatureModal.value = false
  pendingAction.value = null
}

function startDraw(e) {
  isDrawing = true
  hasDrawn = true
  draw(e)
}

function draw(e) {
  if (!isDrawing) return
  const rect = canvasRef.value.getBoundingClientRect()
  // 支援滑鼠與觸控
  const clientX = e.clientX || (e.touches && e.touches[0].clientX)
  const clientY = e.clientY || (e.touches && e.touches[0].clientY)
  
  const x = clientX - rect.left
  const y = clientY - rect.top
  
  ctx.lineTo(x, y)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x, y)
}

function stopDraw() {
  isDrawing = false
  ctx.beginPath()
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
  hasDrawn = false
}

function handleSignatureUpload(e) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => { uploadedSignature.value = e.target.result }
  reader.readAsDataURL(file)
}

// 確認簽章並執行送出
function confirmSignature() {
  let base64Signature = null

  if (signatureMode.value === 'draw') {
    if (!hasDrawn) return Swal.fire('提示', '請在方框內手寫簽名，或切換至上傳印章。', 'warning')
    base64Signature = canvasRef.value.toDataURL('image/png')
  } else {
    if (!uploadedSignature.value) return Swal.fire('提示', '請上傳您的印章或簽名圖檔。', 'warning')
    base64Signature = uploadedSignature.value
  }

  showSignatureModal.value = false

  // 依照身分寫入對應欄位，並呼叫原本的送出邏輯
  if (pendingAction.value === 'student') {
    report.value.student_signature = base64Signature
    executeStudentSubmit()
  } else if (pendingAction.value === 'teacher') {
    report.value.teacher_signature = base64Signature
    executeTeacherSubmit()
  } else if (pendingAction.value === 'supervisor') {
    report.value.supervisor_signature = base64Signature
    executeSupervisorSubmit()
  }
}
// ===================================

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await checkAndEnforcePasswordChange(user.id)
    const { data: userProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile.value = userProfile
    
    if (userProfile.role === 'student') { activeModule.value = 'exams'; await loadMyExams() }
    await loadCategories()
    await loadReportsList(user.id, userProfile.role)
  }
})

async function loadMyExams() {
  if (!isStudent.value) return
  const { data: dispatches } = await supabase.from('exam_dispatch').select('*, exams(title, type)').eq('student_id', profile.value.id).eq('is_completed', false).order('created_at', { ascending: false })
  pendingExams.value = dispatches || []
  const { data: records } = await supabase.from('exam_records').select('*, exams(title, type)').eq('student_id', profile.value.id).order('completed_at', { ascending: false })
  myExamRecords.value = records || []
}

async function startExam(task) {
  Swal.fire({ title: '載入題目中...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } })
  const { data: qData, error } = await supabase.from('questions').select('*').eq('exam_id', task.exam_id)
  if (error || !qData) return Swal.fire('錯誤', '題目載入失敗', 'error')
  examQuestions.value = qData; examTaking.value = task; studentAnswers.value = {}; Swal.close()
}

function cancelExam() {
  Swal.fire({ title: '確定要暫離嗎？', text: '進度將不會保留！', icon: 'warning', showCancelButton: true }).then((r) => { if (r.isConfirmed) { examTaking.value = null; studentAnswers.value = {} } })
}

async function submitExam() {
  const answeredCount = Object.keys(studentAnswers.value).length
  const totalCount = examQuestions.value.length
  if (answeredCount < totalCount) return Swal.fire('提示', `還有 ${totalCount - answeredCount} 題尚未作答`, 'warning')
  const { isConfirmed } = await Swal.fire({ title: '確定要交卷嗎？', icon: 'question', showCancelButton: true })
  if (!isConfirmed) return

  Swal.fire({ title: '批改中...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } })
  let correctCount = 0
  examQuestions.value.forEach(q => { if (studentAnswers.value[q.id] === q.correct_answer) correctCount++ })
  const score = Math.round((correctCount / totalCount) * 100)

  await supabase.from('exam_records').insert({ student_id: profile.value.id, exam_id: examTaking.value.exam_id, score: score, answers: studentAnswers.value })
  await supabase.from('exam_dispatch').update({ is_completed: true }).eq('id', examTaking.value.id)

  Swal.fire({ icon: 'success', title: '測驗完成！', html: `您的得分為：<strong style="font-size: 24px;">${score} 分</strong>` })
  examTaking.value = null; studentAnswers.value = {}; await loadMyExams() 
}

function getScoreColor(score) {
  if (score >= 80) return 'score-high'
  if (score >= 60) return 'score-pass'
  return 'score-fail'
}

async function loadCategories() {
  const { data, error } = await supabase.from('training_categories').select('*').order('created_at', { ascending: true })
  if (!error && data) dynamicCategories.value = data
}

async function loadReportsList(userId, role) {
  const { data: profs } = await supabase.from('profiles').select('id, name')
  const profilesMap = {}; profs.forEach(p => profilesMap[p.id] = p.name)
  const { data: assigns } = await supabase.from('assignments').select('*')
  const assignsMap = {}; assigns.forEach(a => assignsMap[a.student_id] = a)

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
      return { ...r, studentName: profilesMap[r.student_id] || '未知學員', teacherName: profilesMap[assign.teacher_id] || '尚未指派', supervisorName: profilesMap[assign.supervisor_id] || '尚未指派' }
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

    const { data: records } = await supabase.from('exam_records').select('*, exams(title)').eq('student_id', found.student_id).order('completed_at', { ascending: false })
    studentExamRecords.value = records || []
  } else createNewDraft()
}

function createNewDraft() {
  selectedReportId.value = ''
  report.value = { id: null, training_category: '', training_date: new Date().toISOString().split('T')[0], training_end_date: new Date().toISOString().split('T')[0], content: '', reflection: '', teacher_feedback: '', supervisor_feedback: '', status: 'draft', student_signature: null, teacher_signature: null, supervisor_signature: null }
  currentReportMeta.value = {}; studentExamRecords.value = []
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
  isSaving.value = true
  const payload = { student_id: profile.value.id, training_category: report.value.training_category, training_date: report.value.training_date, training_end_date: report.value.training_end_date, content: report.value.content, reflection: report.value.reflection, status: 'draft', updated_at: new Date().toISOString() }
  if (report.value.id) await supabase.from('feedback_reports').update(payload).eq('id', report.value.id)
  else { const { data } = await supabase.from('feedback_reports').insert([payload]).select(); if (data) report.value.id = data[0].id }
  Toast.fire({ icon: 'success', title: '草稿已儲存' }); await loadReportsList(profile.value.id, profile.value.role); isSaving.value = false 
}

// 原本的 submitReport 改由 confirmSignature 呼叫
async function executeStudentSubmit() {
  isSaving.value = true
  const payload = { 
    student_id: profile.value.id, training_category: report.value.training_category, 
    training_date: report.value.training_date, training_end_date: report.value.training_end_date,
    content: report.value.content, reflection: report.value.reflection,
    status: 'pending_teacher', updated_at: new Date().toISOString(),
    student_signature: report.value.student_signature // 寫入簽章
  }
  let error;
  if (report.value.id) ({ error } = await supabase.from('feedback_reports').update(payload).eq('id', report.value.id))
  else ({ error } = await supabase.from('feedback_reports').insert([payload]))

  isSaving.value = false
  if (!error) { Swal.fire({ icon: 'success', title: '已送出給指導老師' }); await loadReportsList(profile.value.id, profile.value.role) } 
  else Swal.fire('錯誤', error.message, 'error')
}

// 原本的 submitTeacherFeedback 改由 confirmSignature 呼叫
async function executeTeacherSubmit() {
  isSaving.value = true
  await supabase.from('feedback_reports').update({ 
    teacher_feedback: report.value.teacher_feedback, 
    status: 'pending_supervisor', 
    updated_at: new Date().toISOString(),
    teacher_signature: report.value.teacher_signature // 寫入簽章
  }).eq('id', report.value.id)
  isSaving.value = false
  Swal.fire({ icon: 'success', title: '已移交單位主管' })
  await loadReportsList(profile.value.id, profile.value.role)
}

// 原本的 closeReport 改由 confirmSignature 呼叫
async function executeSupervisorSubmit() {
  isSaving.value = true
  const { error } = await supabase.from('feedback_reports').update({ 
    supervisor_feedback: report.value.supervisor_feedback, 
    status: 'closed', 
    updated_at: new Date().toISOString(),
    supervisor_signature: report.value.supervisor_signature // 寫入簽章
  }).eq('id', report.value.id)
  isSaving.value = false
  if (!error) { Swal.fire({ icon: 'success', title: '結案成功' }); await loadReportsList(profile.value.id, profile.value.role) }
}

async function returnToStudent() {
  const { isConfirmed } = await Swal.fire({ title: '退回學員？', showCancelButton: true })
  if (isConfirmed) { await supabase.from('feedback_reports').update({ status: 'draft', student_signature: null }).eq('id', report.value.id); Toast.fire({ icon: 'info', title: '已退回' }); await loadReportsList(profile.value.id, profile.value.role) }
}

async function returnToTeacher() {
  const { isConfirmed } = await Swal.fire({ title: '退回給老師？', showCancelButton: true, confirmButtonColor: '#e74c3c' })
  if (isConfirmed) { await supabase.from('feedback_reports').update({ status: 'pending_teacher', teacher_signature: null }).eq('id', report.value.id); Toast.fire({ icon: 'info', title: '已退回' }); await loadReportsList(profile.value.id, profile.value.role) }
}

async function unlockReport() {
  const { isConfirmed } = await Swal.fire({ title: '解除鎖定？', icon: 'warning', showCancelButton: true, confirmButtonColor: '#e74c3c' })
  if (isConfirmed) { await supabase.from('feedback_reports').update({ status: 'pending_supervisor', supervisor_signature: null }).eq('id', report.value.id); Toast.fire({ icon: 'success', title: '已解除鎖定' }); await loadReportsList(profile.value.id, profile.value.role) }
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
.exam-warning { background: #fff3cd; color: #856404; padding: 12px; border-radius: 6px; margin-bottom: 20px; font-weight: bold; border: 1px solid #ffeeba; }
.question-item { background: #f8f9fa; padding: 18px; border-radius: 8px; border: 1px solid #e1e4e8; margin-bottom: 20px;}
.q-title { font-size: 16px; color: #2c3e50; margin-bottom: 15px; line-height: 1.5; }
.q-options { display: flex; flex-direction: column; gap: 10px; }
.opt-label { display: flex; align-items: flex-start; gap: 10px; cursor: pointer; padding: 10px 15px; background: white; border-radius: 6px; border: 1px solid #dcdde1; transition: 0.2s; }
.opt-label:hover { border-color: #3498db; background: #f0f8ff; }
.custom-radio { margin-top: 4px; width: 16px; height: 16px; accent-color: #3498db; }

/* ✍️ 簽名與印章顯示排版 */
.demo-signatures { display: flex; justify-content: space-between; margin-top: 40px; border-top: 2px solid #ecf0f1; padding-top: 25px; }
.sign-box { display: flex; flex-direction: column; align-items: center; gap: 10px; width: 30%; }
.sign-title { font-weight: bold; color: #2c3e50; font-size: 16px; border-bottom: 2px solid #bdc3c7; padding-bottom: 5px; width: 100%; text-align: center; }
.signature-img { max-height: 80px; max-width: 100%; object-fit: contain; }
.unsigned-text { color: #bdc3c7; font-style: italic; margin-top: 10px; }

/* ✍️ 簽章 Modal 樣式 */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.6); z-index: 9999; display: flex; justify-content: center; align-items: center; padding: 20px; box-sizing: border-box; }
.signature-modal { width: 100%; max-width: 500px; background: white; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); animation: fadeIn 0.2s; overflow: hidden; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid #e1e4e8; background: #f8f9fa;}
.modal-header h3 { margin: 0; color: #2c3e50; font-size: 18px; font-weight: 900; }
.close-btn { background: none; border: none; font-size: 20px; cursor: pointer; color: #7f8c8d; }
.modal-body { padding: 25px; }
.signature-tabs { display: flex; gap: 5px; margin-bottom: 15px; }
.signature-tabs button { flex: 1; padding: 10px; border: 1px solid #dcdde1; background: #f8f9fa; cursor: pointer; font-weight: bold; color: #7f8c8d; transition: 0.2s; }
.signature-tabs button.active { background: #3498db; color: white; border-color: #3498db; }
.canvas-container { position: relative; border: 2px dashed #bdc3c7; border-radius: 8px; background: #fdfdfd; overflow: hidden; }
.signature-canvas { width: 100%; height: 200px; touch-action: none; cursor: crosshair; }
.clear-btn { position: absolute; top: 10px; right: 10px; opacity: 0.8; }
.upload-container { border: 2px dashed #bdc3c7; border-radius: 8px; padding: 20px; text-align: center; min-height: 200px; display: flex; flex-direction: column; justify-content: center; }
.preview-img-box { margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 6px; }
.signature-preview { max-height: 100px; max-width: 100%; object-fit: contain; }

/* 🖨️ PDF 列印專屬優化 */
@media print {
  .app-wrapper { background: white; padding: 0; }
  .no-print { display: none !important; }
  .card { box-shadow: none; border: 1px solid #ccc; page-break-inside: avoid; margin-bottom: 15px; }
  .form-input { border: none; padding: 0; background: transparent !important; color: black !important; }
  .score-tag { border: 1px solid #000; }
  .score-tag .exam-name { background: transparent !important; color: #000 !important; border-right: 1px solid #000; }
  .score-tag .score-val { color: #000 !important; background: transparent !important; }
}

@media screen and (max-width: 600px) {
  .header-section { flex-direction: column; gap: 12px; text-align: center; }
  .action-row { flex-direction: column; }
  .action-row button { width: 100%; margin-bottom: 5px; }
  .form-row { flex-direction: column; gap: 15px; margin-bottom: 15px; }
  .demo-signatures { flex-direction: column; gap: 20px; }
  .sign-box { width: 100%; }
}
</style>