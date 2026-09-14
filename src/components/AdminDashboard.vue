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
        <button :class="{ active: activeTab === 'categories' }" @click="activeTab = 'categories'">🗂️ 訓練類別管理</button>
        <button :class="{ active: activeTab === 'exams' }" @click="activeTab = 'exams'">📝 測驗題庫管理</button>
        <button :class="{ active: activeTab === 'demo' }" @click="activeTab = 'demo'">📄 PDF 範本演示</button>
      </div>

      <!-- 📝 測驗題庫管理區塊 -->
      <div v-if="activeTab === 'exams'" class="tab-content">
        
        <!-- 尚未有預覽時，顯示上傳區塊 -->
        <div class="admin-card" v-if="previewQuestions.length === 0">
          <h3>➕ 匯入 Word 測驗卷</h3>
          <p class="desc">支援匯入標準格式之 .docx 測驗卷，系統將自動解析題目與答案。</p>
          <div style="margin-top: 15px;">
            <input type="file" @change="handleExamUpload" accept=".docx" style="display: none" id="exam-upload" />
            <label for="exam-upload" class="btn success-btn">上傳 .docx 測驗卷</label>
          </div>
        </div>

        <!-- 🆕 測驗卷預覽與編輯中心 (解析後顯示) -->
        <div class="admin-card preview-card" v-else>
          <div class="card-header-flex align-center">
            <h3>👁️ 測驗卷預覽與校對</h3>
            <div class="action-row" style="margin-top: 0;">
              <button @click="cancelPreview" class="btn danger-btn small-btn">取消匯入</button>
              <button @click="confirmSaveExam" class="btn primary-btn small-btn">✅ 確認無誤並儲存</button>
            </div>
          </div>
          
          <div class="form-row" style="background: #fdfdfd; padding: 15px; border-radius: 8px; border: 1px solid #eee;">
            <div class="form-group">
              <label>測驗卷名稱：</label>
              <input type="text" v-model="previewExamTitle" class="form-input" />
            </div>
            <div class="form-group">
              <label>測驗類型：</label>
              <select v-model="previewExamType" class="form-input">
                <option value="pre_test">課前測驗</option>
                <option value="post_test">課後測驗</option>
              </select>
            </div>
          </div>

          <div class="shuffle-options">
            <label class="checkbox-label">
              <input type="checkbox" v-model="shuffleQuestionsMode" class="custom-checkbox">
              🔀 儲存時隨機打亂「題目順序」
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="shuffleOptionsMode" class="custom-checkbox">
              🔀 儲存時隨機打亂「選項順序」(僅套用於選擇題)
            </label>
          </div>

          <div class="preview-questions-list">
            <div v-for="(q, qIndex) in previewQuestions" :key="qIndex" class="question-item">
              <div class="q-header">
                <span class="q-num">Q{{ qIndex + 1 }}</span>
                <input v-model="q.text" class="form-input q-text-input" />
                <button @click="removePreviewQuestion(qIndex)" class="btn danger-btn small-btn" title="刪除此題">🗑️</button>
              </div>
              
              <ul class="q-options">
                <li v-for="(opt, oIndex) in q.options" :key="oIndex" :class="{'is-correct': q.correct === opt}">
                  <!-- 點選 radio 可設定為正確解答 -->
                  <input type="radio" :name="'correct_' + qIndex" :value="opt" v-model="q.correct" class="custom-radio" title="設為正確解答" />
                  <input v-model="q.options[oIndex]" class="form-input opt-text-input" :disabled="q.options.length === 2" />
                  <span v-if="q.correct === opt" class="correct-badge">正確解答</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div class="admin-card">
          <h3>📋 目前已建立的測驗卷清單</h3>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>測驗卷名稱</th>
                  <th>測驗類型</th>
                  <th>建立時間</th>
                  <th style="width: 100px; text-align: center;">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="exam in examList" :key="exam.id">
                  <td><strong>{{ exam.title }}</strong></td>
                  <td><span class="role-badge" :class="exam.type === 'pre_test' ? 'student' : 'teacher'">{{ exam.type === 'pre_test' ? '課前測驗' : '課後測驗' }}</span></td>
                  <td>{{ formatDate(exam.created_at) }}</td>
                  <td style="text-align: center;">
                    <button @click="deleteExam(exam.id, exam.title)" class="btn danger-btn small-btn">刪除</button>
                  </td>
                </tr>
                <tr v-if="examList.length === 0">
                  <td colspan="4" class="empty-state">尚無測驗卷資料</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- PDF 範本演示區塊 -->
      <div v-if="activeTab === 'demo'" class="tab-content">
        <div class="admin-card no-print">
          <h3>📄 系統 PDF 匯出範本演示</h3>
          <p class="desc">這是一份完整的學習心得測試範本。您可以在教學、系統交接或評鑑展示時，點擊下方按鈕直接預覽實際匯出的 PDF 排版效果（列印時會自動隱藏所有系統按鈕與選單）。</p>
          <button @click="exportDemoToPDF" class="btn dark-btn" style="margin-top: 15px;">🖨️ 列印 / 匯出 PDF 範本</button>
        </div>

        <div class="admin-card printable-demo">
          <h2 style="text-align: center; border-bottom: 2px solid #2c3e50; padding-bottom: 10px; margin-bottom: 20px; font-weight: 900; color: #2c3e50;">
            📘 臨床學習護照 - 心得反思紀錄
          </h2>
          <div class="demo-info-grid">
            <p><strong>撰寫學員：</strong> 護理部 - 測試學員</p>
            <p><strong>指導老師：</strong> 臨床指導教師</p>
            <p><strong>訓練類別：</strong> 基層護理人員臨床專業能力訓練</p>
            <p><strong>訓練日期：</strong> 2026-09-14</p>
          </div>
          <div class="demo-section">
            <h4>📚 學習內容重點摘要</h4>
            <div class="demo-text-box">今日參與靜脈留置針注射技術與無菌操作規範實作。課程中詳細說明了如何挑選合適的注射部位（如避開關節處、選擇彈性佳的靜脈），以及下針時的角度拿捏。同時也學習了遇到點滴不滴或病人反應疼痛時的初步排除與異常處理流程。</div>
          </div>
          <div class="demo-section">
            <h4>💡 自我反思與心得</h4>
            <div class="demo-text-box">首次在假人模型上進行實作時，因為怕扎錯位置而略顯緊張，導致下針猶豫不決。但在學姊的逐步引導與鼓勵下，順利完成回血與固定動作。我意識到自己對血管走向的判斷還不夠敏銳，未來在臨床跟診時會多加觀察學姊們的選位技巧，並利用空檔重複練習無菌撕貼步驟，期許能讓動作更加流暢，減少病人的不適感。</div>
          </div>
          <div class="demo-section">
            <h4>👩‍⚕️ 臨床指導老師回饋</h4>
            <div class="demo-text-box">學習態度非常積極，無菌操作的觀念與洗手時機都掌握得很正確，值得嘉許！下針時因為緊張導致角度稍微偏高，建議下次可以深呼吸放鬆手腕，將角度壓低至 15-30 度之間順勢推入。只要多加練習，相信很快就能熟能生巧，繼續保持！</div>
          </div>
          <div class="demo-section">
            <h4>🏥 單位主管總評</h4>
            <div class="demo-text-box">該員於本次訓練中展現出高度的學習熱忱與反思能力。臨床護理技術需要時間與經驗的累積，能主動察覺自身的不足並提出改進策略，是極佳的專業成長態度。期許未來在實際面對病患時，除了技術的持續精進外，也能發揮同理心與良好的溝通技巧。核定通過本次臨床評核。</div>
          </div>
          <div class="demo-signatures">
            <div class="sign-box">學員簽章：<span>(系統已認證)</span></div>
            <div class="sign-box">老師簽章：<span>(系統已認證)</span></div>
            <div class="sign-box">主管簽章：<span>(系統已認證)</span></div>
          </div>
        </div>
      </div>

      <!-- 訓練類別管理區塊 -->
      <div v-if="activeTab === 'categories'" class="tab-content">
        <div class="admin-card">
          <h3>➕ 新增訓練類別選項</h3>
          <p class="desc">在此新增的類別，將會即時顯示於學員填寫心得時的下拉選單中。</p>
          <div class="add-category-row" style="display: flex; gap: 10px; margin-top: 15px;">
            <input type="text" v-model="newCategoryName" placeholder="請輸入類別名稱（例如：PGY 基礎訓練）" class="form-input" style="flex: 1;" @keyup.enter="addCategory" />
            <button @click="addCategory" class="btn primary-btn" style="white-space: nowrap;">新增選項</button>
          </div>
        </div>

        <div class="admin-card">
          <h3>📋 目前啟用的訓練類別清單</h3>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>類別名稱</th>
                  <th>建立時間</th>
                  <th style="width: 100px; text-align: center;">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="cat in dynamicCategories" :key="cat.id">
                  <td><strong>{{ cat.name }}</strong></td>
                  <td>{{ formatDate(cat.created_at) }}</td>
                  <td style="text-align: center;">
                    <button @click="deleteCategory(cat.id, cat.name)" class="btn danger-btn small-btn">刪除</button>
                  </td>
                </tr>
                <tr v-if="dynamicCategories.length === 0">
                  <td colspan="3" class="empty-state">尚無自訂的訓練類別</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 帳號管理區塊 -->
      <div v-if="activeTab === 'users'" class="tab-content">
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

        <div class="admin-card">
          <div class="card-header-flex align-center" style="margin-bottom: 15px;">
            <h3 style="margin-bottom: 0; border: none;">📋 系統人員總覽</h3>
            <div class="filter-tabs">
              <button :class="{ active: roleFilter === 'all' }" @click="roleFilter = 'all'">全部</button>
              <button :class="{ active: roleFilter === 'student' }" @click="roleFilter = 'student'">學員</button>
              <button :class="{ active: roleFilter === 'teacher' }" @click="roleFilter = 'teacher'">指導老師</button>
              <button :class="{ active: roleFilter === 'supervisor' }" @click="roleFilter = 'supervisor'">單位主管</button>
              <button :class="{ active: roleFilter === 'admin' }" @click="roleFilter = 'admin'">管理員</button>
            </div>
          </div>

          <div class="batch-action-bar" v-if="selectedUserIds.length > 0">
            <span>已選取 <strong>{{ selectedUserIds.length }}</strong> 名人員</span>
            <button @click="batchDeleteUsers" class="btn danger-btn small-btn">🗑️ 批次刪除所選人員</button>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 40px; text-align: center;">
                    <input type="checkbox" class="custom-checkbox" :checked="isAllSelectedOnPage" @change="toggleSelectAllOnPage" title="全選本頁" />
                  </th>
                  <th>姓名</th>
                  <th>Email</th>
                  <th>身分角色</th>
                  <th>建立時間</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="user in paginatedUsers" :key="user.id" :class="{'selected-row': selectedUserIds.includes(user.id)}">
                  <td style="text-align: center;">
                    <input type="checkbox" class="custom-checkbox" :value="user.id" v-model="selectedUserIds" />
                  </td>
                  <td><strong>{{ user.name }}</strong></td>
                  <td>{{ user.email }}</td>
                  <td><span class="role-badge" :class="user.role">{{ getRoleName(user.role) }}</span></td>
                  <td>{{ formatDate(user.created_at) }}</td>
                  <td>
                    <button @click="deleteUser(user.id)" class="btn danger-btn small-btn">刪除</button>
                  </td>
                </tr>
                <tr v-if="filteredUsers.length === 0">
                  <td colspan="6" class="empty-state">此分類下尚無人員資料</td>
                </tr>
              </tbody>
            </table>
          </div>

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
import * as mammoth from 'mammoth'
import { formatDate } from '../utils/format'
import { checkAndEnforcePasswordChange } from '../utils/auth'
import { Toast } from '../utils/toast'

const activeTab = ref('users')
const roleFilter = ref('all') 
const users = ref([])
const students = ref([])
const teachers = ref([])
const supervisors = ref([])
const assignmentData = ref({})
const isCreating = ref(false)

const newUser = ref({ email: '', password: '', name: '', role: 'student' })

// === 🆕 測驗題庫解析與校對邏輯 ===
const examList = ref([])

// 預覽狀態變數
const previewQuestions = ref([])
const previewExamTitle = ref('')
const previewExamType = ref('pre_test')
const shuffleQuestionsMode = ref(true) // 預設打亂題目
const shuffleOptionsMode = ref(true)   // 預設打亂選項

async function loadExams() {
  const { data, error } = await supabase.from('exams').select('*').order('created_at', { ascending: false })
  if (!error && data) examList.value = data
}

// 陣列洗牌函數 (Fisher-Yates)
function shuffleArray(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

// 讀取並進入預覽模式
async function handleExamUpload(event) {
  const file = event.target.files[0]
  if (!file) return
  if (!file.name.endsWith('.docx')) return Swal.fire('錯誤', '請上傳 .docx 格式的 Word 檔案', 'error')

  Swal.fire({ title: '解析中...', text: '正在讀取考卷內容', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } })

  try {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const arrayBuffer = e.target.result
      const result = await mammoth.extractRawText({ arrayBuffer })
      const text = result.value

      previewExamTitle.value = file.name.replace('.docx', '')

      const answerSection = text.split('【參考答案】')[1]
      if (!answerSection) throw new Error('找不到【參考答案】區塊')
      const answers = answerSection.match(/[○×ABCD]/g) 

      const questions = []
      const questionRegex = /\(\s*\)\s*(\d+)\.\s*(.*?)(?=\(\s*\)\s*\d+\.|$|【參考答案】)/gs
      let match

      while ((match = questionRegex.exec(text)) !== null) {
        const qNum = parseInt(match[1])
        const qContent = match[2].trim()
        let options = []
        let questionText = ''
        let correctText = ''

        if (qContent.includes('□ ○')) {
          questionText = qContent.split('□')[0].trim()
          options = ['○', '×']
          correctText = answers[qNum - 1] // ○ 或 ×
        } else if (qContent.includes('A.')) {
          questionText = qContent.substring(0, qContent.indexOf('A.')).trim()
          const optA = qContent.substring(qContent.indexOf('A.') + 2, qContent.indexOf('B.')).trim()
          const optB = qContent.substring(qContent.indexOf('B.') + 2, qContent.indexOf('C.')).trim()
          const optC = qContent.substring(qContent.indexOf('C.') + 2, qContent.indexOf('D.')).trim()
          const optD = qContent.substring(qContent.indexOf('D.') + 2).trim()
          options = [optA, optB, optC, optD]
          
          // 轉換正確選項的文字內容 (A對應index 0)
          const correctLetter = answers[qNum - 1] 
          const correctIndex = correctLetter.charCodeAt(0) - 65 
          correctText = options[correctIndex]
        }

        questions.push({
          text: questionText,
          options: options,
          correct: correctText // 儲存確切的文字，打亂選項時答案才不會跑掉
        })
      }

      previewQuestions.value = questions
      Swal.close()
      event.target.value = ''
    }
    reader.readAsArrayBuffer(file)
  } catch (err) {
    Swal.fire('解析失敗', err.message, 'error')
    event.target.value = ''
  }
}

// 移除預覽中的特定題目
function removePreviewQuestion(index) {
  previewQuestions.value.splice(index, 1)
}

// 取消預覽
function cancelPreview() {
  previewQuestions.value = []
}

// 確認無誤，進行洗牌並寫入 Supabase
async function confirmSaveExam() {
  if (!previewExamTitle.value.trim()) return Swal.fire('提示', '測驗卷名稱不能為空', 'warning')
  if (previewQuestions.value.length === 0) return Swal.fire('提示', '測驗卷內沒有任何題目', 'warning')

  Swal.fire({ title: '儲存中...', text: '正在將題庫寫入系統', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } })

  try {
    let finalQuestions = JSON.parse(JSON.stringify(previewQuestions.value)) // 深拷貝防污染

    // 1. 如果有勾選打亂選項 (只打亂非是非題的選項)
    if (shuffleOptionsMode.value) {
      finalQuestions.forEach(q => {
        if (q.options.length > 2) {
          q.options = shuffleArray(q.options)
        }
      })
    }

    // 2. 如果有勾選打亂題目
    if (shuffleQuestionsMode.value) {
      finalQuestions = shuffleArray(finalQuestions)
    }

    // 3. 寫入 Exams 總表
    const { data: examData, error: examErr } = await supabase.from('exams').insert([{
      title: previewExamTitle.value, 
      type: previewExamType.value
    }]).select()
    if (examErr) throw examErr

    const examId = examData[0].id

    // 4. 寫入 Questions 題庫
    const qPayload = finalQuestions.map(q => ({
      exam_id: examId,
      question_text: q.text,
      options: q.options,
      correct_answer: q.correct
    }))

    const { error: qErr } = await supabase.from('questions').insert(qPayload)
    if (qErr) throw qErr

    Swal.fire('成功', `已成功寫入題庫，共 ${finalQuestions.length} 題！`, 'success')
    previewQuestions.value = [] // 清空預覽
    await loadExams() // 更新列表
  } catch (err) {
    Swal.fire('寫入失敗', err.message, 'error')
  }
}

async function deleteExam(id, title) {
  const { isConfirmed } = await Swal.fire({
    title: `確定要刪除「${title}」嗎？`,
    text: '刪除後，該測驗的所有題目與學員的成績紀錄都會一併移除！',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#e74c3c',
    confirmButtonText: '確認刪除'
  })

  if (!isConfirmed) return

  const { error } = await supabase.from('exams').delete().eq('id', id)
  if (error) return Swal.fire('錯誤', error.message, 'error')
  
  Toast.fire({ icon: 'success', title: '測驗卷已刪除' })
  await loadExams()
}

// === 其他系統邏輯 ===
function exportDemoToPDF() { window.print() }

const dynamicCategories = ref([])
const newCategoryName = ref('')

async function loadCategories() {
  const { data, error } = await supabase.from('training_categories').select('*').order('created_at', { ascending: true })
  if (!error && data) dynamicCategories.value = data
}

async function addCategory() {
  if (!newCategoryName.value.trim()) return Swal.fire('提示', '請輸入類別名稱', 'warning')
  Swal.showLoading()
  const { error } = await supabase.from('training_categories').insert([{ name: newCategoryName.value.trim() }])
  Swal.close()

  if (error) {
    if (error.code === '23505') return Swal.fire('提示', '該類別已經存在', 'warning')
    return Swal.fire('錯誤', error.message, 'error')
  }
  newCategoryName.value = ''
  Toast.fire({ icon: 'success', title: '類別新增成功' })
  await loadCategories()
}

async function deleteCategory(id, name) {
  const { isConfirmed } = await Swal.fire({
    title: `確定要刪除「${name}」嗎？`, text: '刪除後學員將無法選擇此分類，但歷史紀錄不受影響。',
    icon: 'warning', showCancelButton: true, confirmButtonColor: '#e74c3c', confirmButtonText: '確認刪除'
  })
  if (!isConfirmed) return

  const { error } = await supabase.from('training_categories').delete().eq('id', id)
  if (error) return Swal.fire('錯誤', error.message, 'error')
  Toast.fire({ icon: 'success', title: '類別已刪除' })
  await loadCategories()
}

const currentPage = ref(1)
const itemsPerPage = 10 
watch(roleFilter, () => { currentPage.value = 1; selectedUserIds.value = [] })

const filteredUsers = computed(() => {
  if (roleFilter.value === 'all') return users.value
  return users.value.filter(u => u.role === roleFilter.value)
})

const totalPages = computed(() => { return Math.ceil(filteredUsers.value.length / itemsPerPage) || 1 })
const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredUsers.value.slice(start, start + itemsPerPage)
})

function prevPage() { if (currentPage.value > 1) currentPage.value-- }
function nextPage() { if (currentPage.value < totalPages.value) currentPage.value++ }

const selectedUserIds = ref([])
const isAllSelectedOnPage = computed(() => {
  if (paginatedUsers.value.length === 0) return false
  return paginatedUsers.value.every(user => selectedUserIds.value.includes(user.id))
})

function toggleSelectAllOnPage() {
  if (isAllSelectedOnPage.value) {
    const currentIds = paginatedUsers.value.map(u => u.id)
    selectedUserIds.value = selectedUserIds.value.filter(id => !currentIds.includes(id))
  } else {
    paginatedUsers.value.forEach(user => {
      if (!selectedUserIds.value.includes(user.id)) selectedUserIds.value.push(user.id)
    })
  }
}

async function batchDeleteUsers() {
  if (selectedUserIds.value.length === 0) return
  const confirmResult = await Swal.fire({
    title: `確定要刪除這 ${selectedUserIds.value.length} 名人員嗎？`,
    text: '刪除後將連帶清理該員的所有歷史心得與配對紀錄！', icon: 'warning', showCancelButton: true, confirmButtonColor: '#e74c3c'
  })
  if (!confirmResult.isConfirmed) return

  Swal.fire({ title: '清理中...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } })
  let successCount = 0, failCount = 0

  for (const userId of selectedUserIds.value) {
    const { error } = await supabase.rpc('delete_user_admin', { target_user_id: userId })
    error ? failCount++ : successCount++
  }

  if (failCount === 0) {
    Swal.fire({ icon: 'success', title: '刪除成功', text: `已成功移除 ${successCount} 名人員`, timer: 2000, showConfirmButton: false })
  } else {
    Swal.fire({ icon: 'warning', title: '部分失敗', text: `成功: ${successCount}，失敗: ${failCount}` })
  }

  selectedUserIds.value = []
  await loadUsers() 
  if (currentPage.value > totalPages.value && totalPages.value > 0) currentPage.value = totalPages.value
}

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) await checkAndEnforcePasswordChange(user.id)
  await loadUsers()
  await loadAssignments()
  await loadCategories() 
  await loadExams() 
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
    if (!assignmentData.value[s.id]) assignmentData.value[s.id] = { teacher_id: '', supervisor_id: '' }
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
    const { data, error } = await supabase.functions.invoke('create-user', { body: newUser.value })
    if (error || (data && data.error)) throw new Error(error?.message || data?.error)
    Swal.fire({ icon: 'success', title: '建立成功', timer: 1500, showConfirmButton: false })
    newUser.value = { email: '', password: '', name: '', role: 'student' }
    await loadUsers()
  } catch (err) {
    Swal.fire({ icon: 'error', title: '建立失敗', text: err.message })
  } finally { isCreating.value = false }
}

async function deleteUser(userId) {
  const confirmResult = await Swal.fire({
    title: '確定要刪除此人員嗎？', text: '刪除後將無法恢復！', icon: 'warning', showCancelButton: true, confirmButtonColor: '#e74c3c'
  })
  if (!confirmResult.isConfirmed) return
  Swal.fire({ title: '刪除中...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } })
  const { error } = await supabase.rpc('delete_user_admin', { target_user_id: userId })
  if (error) {
    Swal.fire({ icon: 'error', title: '刪除失敗', text: error.message })
  } else {
    Swal.fire({ icon: 'success', title: '刪除成功', timer: 1500, showConfirmButton: false })
    selectedUserIds.value = selectedUserIds.value.filter(id => id !== userId)
    await loadUsers()
    if (currentPage.value > totalPages.value && totalPages.value > 0) currentPage.value = totalPages.value
  }
}

function downloadTemplate() {
  const ws = XLSX.utils.json_to_sheet([{ "姓名": "王大明", "身分證字號": "A123456789", "Email": "test@hospital.com", "身分": "學員" }])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "人員匯入範本")
  XLSX.writeFile(wb, "系統人員匯入範本.xlsx")
}

const ROLE_MAP = { '學員': 'student', '受訓學員': 'student', '老師': 'teacher', '指導老師': 'teacher', '主管': 'supervisor', '單位主管': 'supervisor', '管理員': 'admin' }

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
      Swal.fire({ title: '批次匯入中...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } })
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
          if (!role) { results.fail++; results.failRows.push(`${row['姓名']}：身分無法辨識`); return; }
          const { error } = await supabase.functions.invoke('create-user', {
            body: { email: row.Email, password: row['身分證字號'].toString(), name: row['姓名'], role }
          })
          if (error) { results.fail++; results.failRows.push(`${row['姓名']}：${error.message}`) }
          else results.success++
        }))
      }
      await loadUsers()
      Swal.fire({ icon: 'info', title: '匯入完成', html: `成功: ${results.success} 筆，失敗: ${results.fail} 筆<br><br><span style="color:#e74c3c;font-size:13px">${results.failRows.slice(0,5).join('<br>')}</span>` })
    } catch (err) { Swal.fire('錯誤', '檔案解析失敗', 'error') }
    event.target.value = ''
  }
  reader.readAsArrayBuffer(file)
}

async function saveAssignment(studentId) {
  const data = assignmentData.value[studentId]
  if (!data.teacher_id || !data.supervisor_id) return Swal.fire({ icon: 'warning', title: '提示', text: '請完整選擇指導老師與單位主管' })
  const { error } = await supabase.from('assignments').upsert({
    student_id: studentId, teacher_id: data.teacher_id, supervisor_id: data.supervisor_id
  }, { onConflict: 'student_id' })
  if (error) Swal.fire({ icon: 'error', title: '儲存失敗', text: error.message })
  else Toast.fire({ icon: 'success', title: '配對已儲存' })
}

async function handleLogout() { await supabase.auth.signOut() }
</script>

<style scoped>
/* 基礎排版與共用 UI */
.app-wrapper { background-color: #f0f2f5; min-height: 100vh; width: 100vw; position: absolute; top: 0; left: 0; padding: 30px 20px; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; }
.admin-container { width: 100%; max-width: 1000px; font-family: "微軟正黑體", sans-serif; }
.admin-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; background: white; padding: 20px 25px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e1e4e8; }
.admin-header h2 { margin: 0; color: #2c3e50; font-weight: 900;}
.tabs { display: flex; gap: 5px; margin-bottom: 20px; border-bottom: 2px solid #e1e4e8; padding-bottom: 0; overflow-x: auto; white-space: nowrap; }
.tabs button { padding: 12px 24px; border: none; background: transparent; font-size: 16px; font-weight: bold; color: #7f8c8d; cursor: pointer; border-radius: 6px 6px 0 0; transition: 0.2s; margin-bottom: -2px; border-bottom: 2px solid transparent; }
.tabs button.active { color: #3498db; border-bottom: 2px solid #3498db; }
.tabs button:hover:not(.active) { color: #2c3e50; }
.admin-card { background: white; padding: 25px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e1e4e8; margin-bottom: 25px; }
.admin-card h3 { margin-top: 0; color: #34495e; margin-bottom: 10px; font-weight: 900;}
.desc { color: #7f8c8d; font-size: 14px; margin-bottom: 0; line-height: 1.5; }
.card-header-flex { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 15px; margin-bottom: 15px; }
.card-header-flex.align-center { align-items: center; border-bottom: none; padding-bottom: 0; }
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
.form-input { width: 100%; padding: 12px; border: 1px solid #dcdde1; border-radius: 6px; box-sizing: border-box; transition: 0.2s; font-family: inherit; }
.form-input:focus { outline: none; border-color: #3498db; }
.batch-action-bar { background: #fdf2f2; border: 1px solid #fab1a0; padding: 12px 18px; border-radius: 6px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; color: #d63031; font-weight: bold; animation: fadeIn 0.3s ease-in-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
.custom-checkbox { width: 18px; height: 18px; cursor: pointer; accent-color: #e74c3c; }
.table-responsive { overflow-x: auto; margin-top: 15px; }
.data-table { width: 100%; border-collapse: collapse; min-width: 600px; }
.data-table th, .data-table td { padding: 14px; border-bottom: 1px solid #ecf0f1; text-align: left; color: #2c3e50; transition: background 0.2s; }
.data-table th { background: #f8f9fa; font-weight: bold; }
.data-table tbody tr:hover { background: #f9fbfc; }
.data-table tbody tr.selected-row { background: #fdf2f2; }
.empty-state { text-align: center; color: #95a5a6; padding: 30px !important; }
.role-badge { padding: 5px 12px; border-radius: 12px; font-size: 13px; font-weight: bold; color: white; display: inline-block; }
.role-badge.student { background: #3498db; }
.role-badge.teacher { background: #9b59b6; }
.role-badge.supervisor { background: #e67e22; }
.role-badge.admin { background: #34495e; }
.pairing-select { width: 100%; padding: 10px; border: 1px solid #bdc3c7; border-radius: 6px; font-family: inherit; }
.btn { padding: 10px 20px; border: none; border-radius: 6px; font-weight: bold; font-size: 15px; cursor: pointer; transition: all 0.2s; text-align: center; white-space: nowrap; font-family: inherit; }
.small-btn { padding: 8px 14px; font-size: 13px; }
.primary-btn { background: #3498db; color: white; }
.success-btn { background: #2ecc71; color: white; display: inline-flex; align-items: center; justify-content: center; }
.danger-btn { background: #e74c3c; color: white; }
.dark-btn { background: #2c3e50; color: white; }
.btn:hover:not(:disabled) { filter: brightness(0.9); transform: translateY(-1px); }
.btn:disabled { background: #bdc3c7; cursor: not-allowed; transform: none; }
.pagination-controls { display: flex; justify-content: center; align-items: center; gap: 15px; margin-top: 15px; padding-top: 15px; border-top: 1px solid #ecf0f1; }
.page-btn { padding: 6px 12px; border: 1px solid #bdc3c7; background: white; border-radius: 4px; cursor: pointer; color: #2c3e50; font-weight: bold; transition: 0.2s; }
.page-btn:hover:not(:disabled) { background: #ecf0f1; border-color: #95a5a6; }
.page-btn:disabled { color: #bdc3c7; cursor: not-allowed; background: #f8f9fa; }
.page-info { font-size: 14px; color: #7f8c8d; font-weight: bold; }

/* 🆕 預覽與編輯區塊專用樣式 */
.preview-card { border: 2px solid #3498db; box-shadow: 0 0 15px rgba(52, 152, 219, 0.2); }
.shuffle-options { display: flex; gap: 20px; margin: 15px 0 25px 0; background: #f0f8ff; padding: 12px; border-radius: 6px; border: 1px solid #bce0fd; }
.checkbox-label { display: flex; align-items: center; gap: 8px; font-weight: bold; color: #2980b9; cursor: pointer; font-size: 14px; }
.preview-questions-list { display: flex; flex-direction: column; gap: 15px; }
.question-item { background: #f8f9fa; border: 1px solid #e1e4e8; border-radius: 8px; padding: 15px; }
.q-header { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; }
.q-num { font-weight: 900; color: #3498db; font-size: 18px; width: 35px; }
.q-text-input { font-weight: bold; font-size: 16px; border-color: #bdc3c7; }
.q-options { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
.q-options li { display: flex; align-items: center; gap: 10px; background: white; padding: 8px; border-radius: 6px; border: 1px solid #eee; transition: 0.2s; }
.q-options li.is-correct { border-color: #2ecc71; background: #f4fdf8; }
.custom-radio { width: 18px; height: 18px; cursor: pointer; accent-color: #2ecc71; }
.opt-text-input { padding: 8px 12px; font-size: 14px; }
.correct-badge { background: #2ecc71; color: white; font-size: 12px; font-weight: bold; padding: 4px 8px; border-radius: 12px; white-space: nowrap; }

/* PDF 演示專用 */
.demo-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; background: #f8f9fa; padding: 15px; border-radius: 6px; }
.demo-info-grid p { margin: 0; font-size: 15px; color: #2c3e50; }
.demo-section { margin-bottom: 20px; }
.demo-section h4 { margin: 0 0 10px 0; color: #34495e; font-size: 16px; font-weight: bold; }
.demo-text-box { background: white; border: 1px solid #bdc3c7; padding: 15px; border-radius: 6px; font-size: 15px; line-height: 1.6; color: #2c3e50; min-height: 80px; }
.demo-signatures { display: flex; justify-content: space-between; margin-top: 40px; border-top: 2px solid #ecf0f1; padding-top: 20px; }
.sign-box { font-weight: bold; color: #2c3e50; font-size: 15px; }
.sign-box span { font-weight: normal; color: #7f8c8d; font-style: italic; margin-left: 10px; }

@media print {
  .app-wrapper { background: white; padding: 0; }
  .admin-header, .tabs, .no-print, .batch-action-bar, .admin-card:not(.printable-demo) { display: none !important; }
  .printable-demo { box-shadow: none !important; border: none !important; padding: 0 !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; }
  .demo-text-box { border: 1px solid #000; break-inside: avoid; }
  .demo-info-grid { background: transparent; border: 1px solid #000; }
}

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
  .batch-action-bar { flex-direction: column; gap: 10px; text-align: center; }
  .demo-info-grid { grid-template-columns: 1fr; }
  .shuffle-options { flex-direction: column; gap: 10px; }
}
</style>