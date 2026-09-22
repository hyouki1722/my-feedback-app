<template>
  <div class="app-wrapper">
    <div class="admin-container">
      <div class="admin-header">
        <div class="header-titles">
          <h2>⚙️ 實習生學習系統 - 管理員後台</h2>
        </div>
        <button @click="handleLogout" class="btn dark-btn">登出系統</button>
      </div>

      <!-- 頁籤切換 -->
      <div class="tabs">
        <button :class="{ active: activeTab === 'users' }" @click="activeTab = 'users'">👥 帳號管理</button>
        <button :class="{ active: activeTab === 'pairing' }" @click="activeTab = 'pairing'">🔗 師生配對</button>
        <button :class="{ active: activeTab === 'categories' }" @click="activeTab = 'categories'">🗂️ 訓練類別</button>
        <button :class="{ active: activeTab === 'exams' }" @click="activeTab = 'exams'">📝 題庫管理</button>
        <button :class="{ active: activeTab === 'dispatch' }" @click="activeTab = 'dispatch'">🎯 測驗任務派發</button>
        <button :class="{ active: activeTab === 'demo' }" @click="activeTab = 'demo'">📄 PDF 範本</button>
      </div>

      <!-- 🎯 測驗任務派發區塊 -->
      <div v-if="activeTab === 'dispatch'" class="tab-content">
        <div class="admin-card">
          <h3>🎯 批次派發測驗卷</h3>
          <p class="desc">請先選擇要派發的測驗卷，接著透過「實習單位」篩選目標學員，即可進行批次派發。</p>
          
          <div class="form-row" style="background: #fdfdfd; padding: 15px; border-radius: 8px; border: 1px solid #eee; margin-top: 15px;">
            <div class="form-group">
              <label>1. 選擇要派發的測驗卷：</label>
              <select v-model="dispatchSelectedExam" class="form-input">
                <option value="">-- 請選擇測驗卷 --</option>
                <option v-for="exam in examList" :key="exam.id" :value="exam.id">{{ exam.title }} ({{ exam.type === 'pre_test' ? '課前' : '課後' }})</option>
              </select>
            </div>
            <div class="form-group">
              <label>2. 篩選目標實習單位：</label>
              <select v-model="dispatchSelectedUnit" class="form-input">
                <option value="all">顯示所有單位學員</option>
                <option v-for="unit in uniqueUnits" :key="unit" :value="unit">{{ unit }}</option>
              </select>
            </div>
          </div>

          <div v-if="dispatchSelectedExam" style="margin-top: 15px; background: #f0f8ff; padding: 12px 15px; border-radius: 8px; border: 1px solid #bce0fd;">
            <label class="checkbox-label" style="display: flex; align-items: center; gap: 8px; font-weight: bold; cursor: pointer; color: #2980b9;">
              <input type="checkbox" v-model="dispatchShowAnswers" class="custom-checkbox">
              ☑️ 派發時直接公開解答（建議預設取消，等全部考完再於下方統一公開）
            </label>
          </div>

          <div v-if="dispatchSelectedExam" style="margin-top: 20px;">
            <div class="card-header-flex align-center">
              <h4 style="margin: 0; color: #2c3e50;">勾選要派發的學員</h4>
              <button @click="submitDispatch" class="btn success-btn small-btn">🚀 確認派發給所選學員</button>
            </div>
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th style="width: 40px; text-align: center;">
                      <input type="checkbox" class="custom-checkbox" :checked="isAllDispatchSelected" @change="toggleAllDispatch" />
                    </th>
                    <th>實習單位</th>
                    <th>學員姓名</th>
                    <th>派發狀態</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="student in dispatchFilteredStudents" :key="student.id" :class="{'selected-row': dispatchSelectedStudents.includes(student.id)}">
                    <td style="text-align: center;">
                      <input type="checkbox" class="custom-checkbox" :value="student.id" v-model="dispatchSelectedStudents" :disabled="hasDispatched(dispatchSelectedExam, student.id)" />
                    </td>
                    <td>{{ student.unit || '未指定' }}</td>
                    <td><strong>{{ student.name }}</strong></td>
                    <td>
                      <span v-if="hasDispatched(dispatchSelectedExam, student.id)" style="color: #2ecc71; font-weight: bold;">✅ 已派發</span>
                      <span v-else style="color: #95a5a6;">尚未派發</span>
                    </td>
                  </tr>
                  <tr v-if="dispatchFilteredStudents.length === 0">
                    <td colspan="4" class="empty-state">此單位尚無學員資料</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="admin-card" style="margin-top: 20px;">
          <h3>🔓 已派發測驗之解答管理</h3>
          <p class="desc">為防範提早交卷的學員洩漏答案，您可以在確認所有學員皆完成測驗後，在此處「一鍵公開」正確解答。</p>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>測驗卷名稱</th>
                  <th style="text-align: center;">交卷進度</th>
                  <th style="text-align: center;">目前解答狀態</th>
                  <th style="text-align: center;">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="stat in dispatchStats" :key="stat.exam_id">
                  <td><strong>{{ stat.title }}</strong></td>
                  <td style="text-align: center; font-weight: bold;">
                    <!-- 🌟 加入進度與未交名單查看按鈕 -->
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 5px;">
                      <span :style="{ color: stat.completed === stat.total ? '#2ecc71' : '#e67e22' }">
                        {{ stat.completed }} / {{ stat.total }}
                      </span>
                      <button v-if="stat.completed < stat.total" @click="showPendingStudents(stat)" class="btn secondary-btn small-btn" style="padding: 4px 8px; font-size: 12px;">🔍 查看未交名單</button>
                    </div>
                  </td>
                  <td style="text-align: center;">
                    <span v-if="stat.show_answers" style="color: #2ecc71; font-weight: bold;">🔓 已公開</span>
                    <span v-else style="color: #e74c3c; font-weight: bold;">🔒 未公開</span>
                  </td>
                  <td style="text-align: center;">
                    <button v-if="!stat.show_answers" @click="toggleAnswersVisibility(stat.exam_id, stat.show_answers)" class="btn success-btn small-btn">一鍵公開解答</button>
                    <button v-else @click="toggleAnswersVisibility(stat.exam_id, stat.show_answers)" class="btn danger-btn small-btn">關閉解答</button>
                  </td>
                </tr>
                <tr v-if="dispatchStats.length === 0">
                  <td colspan="4" class="empty-state">尚無派發紀錄</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 📝 測驗題庫管理區塊 -->
      <div v-if="activeTab === 'exams'" class="tab-content">
        <div class="admin-card" v-if="previewQuestions.length === 0 && !editingExamId">
          <h3>➕ 匯入 Word 測驗卷</h3>
          <p class="desc">支援匯入標準格式之 .docx 測驗卷，系統將自動解析題目與答案。</p>
          <div style="margin-top: 15px;">
            <input type="file" @change="handleExamUpload" accept=".docx" style="display: none" id="exam-upload" />
            <label for="exam-upload" class="btn success-btn">上傳 .docx 測驗卷</label>
          </div>
        </div>

        <div class="admin-card preview-card" v-else>
          <div class="card-header-flex align-center">
            <h3>{{ editingExamId ? '✏️ 編輯測驗卷與校對' : '👁️ 測驗卷預覽與校對' }}</h3>
            <div class="action-row" style="margin-top: 0;">
              <button @click="cancelPreview" class="btn danger-btn small-btn">{{ editingExamId ? '取消編輯' : '取消匯入' }}</button>
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
            <label class="checkbox-label"><input type="checkbox" v-model="shuffleQuestionsMode" class="custom-checkbox"> 🔀 儲存時隨機打亂「題目順序」</label>
            <label class="checkbox-label"><input type="checkbox" v-model="shuffleOptionsMode" class="custom-checkbox"> 🔀 儲存時隨機打亂「選項順序」</label>
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
                  <input type="radio" :name="'correct_' + qIndex" :value="opt" v-model="q.correct" class="custom-radio" title="設為正確解答" />
                  <input v-model="q.options[oIndex]" class="form-input opt-text-input" :disabled="q.options.length === 2" />
                  <span v-if="q.correct === opt" class="correct-badge">正確解答</span>
                </li>
              </ul>
            </div>
            <div class="action-row" style="justify-content: center; margin-top: 10px;">
              <button @click="addNewQuestion" class="btn success-btn small-btn" style="width: 100%; max-width: 300px;">➕ 手動新增一題</button>
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
                  <th style="width: 180px; text-align: center;">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="exam in examList" :key="exam.id">
                  <td><strong>{{ exam.title }}</strong></td>
                  <td><span class="role-badge" :class="exam.type === 'pre_test' ? 'student' : 'teacher'">{{ exam.type === 'pre_test' ? '課前測驗' : '課後測驗' }}</span></td>
                  <td>{{ formatDate(exam.created_at) }}</td>
                  <td style="text-align: center; white-space: nowrap;">
                    <button @click="viewExam(exam)" class="btn primary-btn small-btn" style="margin-right: 5px;">預覽</button>
                    <button @click="editExam(exam)" class="btn success-btn small-btn" style="margin-right: 5px;">編輯</button>
                    <button @click="deleteExam(exam.id, exam.title)" class="btn danger-btn small-btn">刪除</button>
                  </td>
                </tr>
                <tr v-if="examList.length === 0"><td colspan="4" class="empty-state">尚無測驗卷資料</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 👥 帳號管理區塊 -->
      <div v-if="activeTab === 'users'" class="tab-content">
        <div class="admin-card">
          <div class="card-header-flex">
            <div class="card-header-text">
              <h3>📊 Excel 批次匯入帳號</h3>
              <p class="desc">請依照系統報表格式上傳。新增「實習單位」欄位以便分流管理測驗。</p>
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
                <input type="text" v-model="newUser.name" required class="form-input" placeholder="例如：王小明">
              </div>
              <div class="form-group">
                <label>身分：</label>
                <select v-model="newUser.role" class="form-input">
                  <option value="student">受訓人員 (學員)</option>
                  <option value="teacher">臨床指導老師</option>
                  <option value="supervisor">單位主管</option>
                  <option value="admin">系統管理員</option>
                </select>
              </div>
              <div class="form-group">
                <label>所屬單位 (選填)：</label>
                <input type="text" v-model="newUser.unit" class="form-input" placeholder="例如：5B病房">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Email 帳號：</label>
                <input type="email" v-model="newUser.email" required class="form-input" placeholder="例如：user@hospital.com">
              </div>
              <div class="form-group">
                <label>預設密碼：</label>
                <input type="text" v-model="newUser.password" required class="form-input" placeholder="至少 6 碼">
              </div>
            </div>
            <button type="submit" class="btn primary-btn" :disabled="isCreating">確認建立</button>
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
                  <th style="width: 40px; text-align: center;"><input type="checkbox" class="custom-checkbox" :checked="isAllSelectedOnPage" @change="toggleSelectAllOnPage" /></th>
                  <th>單位</th>
                  <th>姓名</th>
                  <th>Email</th>
                  <th>身分角色</th>
                  <th style="width: 140px; text-align: center;">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="user in paginatedUsers" :key="user.id" :class="{'selected-row': selectedUserIds.includes(user.id)}">
                  <td style="text-align: center;"><input type="checkbox" class="custom-checkbox" :value="user.id" v-model="selectedUserIds" /></td>
                  <td>{{ user.unit || '-' }}</td>
                  <td><strong>{{ user.name }}</strong></td>
                  <td>{{ user.email }}</td>
                  <td><span class="role-badge" :class="user.role">{{ getRoleName(user.role) }}</span></td>
                  <td style="text-align: center; white-space: nowrap;">
                    <button @click="editUser(user)" class="btn primary-btn small-btn" style="margin-right: 5px;">編輯</button>
                    <button @click="deleteUser(user.id)" class="btn danger-btn small-btn">刪除</button>
                  </td>
                </tr>
                <tr v-if="filteredUsers.length === 0"><td colspan="6" class="empty-state">此分類下尚無人員資料</td></tr>
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

      <!-- 🔗 學員配對管理區塊 -->
      <div v-if="activeTab === 'pairing'" class="tab-content">
        <div class="admin-card">
          <h3>🔗 學員與指導者配對設定</h3>
          <p class="desc">請為每位學員指定對應的臨床指導老師與單位主管。</p>
          <div class="table-responsive">
            <table class="data-table pairing-table">
              <thead>
                <tr>
                  <th>單位</th>
                  <th>受訓學員</th>
                  <th>臨床指導老師</th>
                  <th>單位主管</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="student in students" :key="student.id">
                  <td>{{ student.unit || '-' }}</td>
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
                  <td><button @click="saveAssignment(student.id)" class="btn primary-btn small-btn">儲存</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 🗂️ 訓練類別管理區塊 -->
      <div v-if="activeTab === 'categories'" class="tab-content">
        <div class="admin-card">
          <h3>➕ 新增訓練類別選項</h3>
          <div class="add-category-row" style="display: flex; gap: 10px; margin-top: 15px;">
            <input type="text" v-model="newCategoryName" placeholder="請輸入類別名稱" class="form-input" style="flex: 1;" @keyup.enter="addCategory" />
            <button @click="addCategory" class="btn primary-btn" style="white-space: nowrap;">新增選項</button>
          </div>
        </div>
        <div class="admin-card">
          <h3>📋 目前啟用的訓練類別清單</h3>
          <table class="data-table">
            <tbody>
              <tr v-for="cat in dynamicCategories" :key="cat.id">
                <td><strong>{{ cat.name }}</strong></td>
                <td style="text-align: right;"><button @click="deleteCategory(cat.id, cat.name)" class="btn danger-btn small-btn">刪除</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 📄 PDF 範本演示區塊 -->
      <div v-if="activeTab === 'demo'" class="tab-content">
        <div class="admin-card no-print">
          <h3>📄 系統 PDF 匯出範本演示</h3>
          <p class="desc">這是一份完整的學習心得測試範本。您可以在教學、系統交接或評鑑展示時，點擊下方按鈕直接預覽實際匯出的 PDF 排版效果（列印時會自動隱藏所有系統按鈕與選單）。</p>
          <button @click="exportDemoToPDF" class="btn dark-btn" style="margin-top: 15px;">🖨️ 列印 / 匯出 PDF 範本</button>
        </div>

        <div class="admin-card printable-demo">
          <h2 style="text-align: center; border-bottom: 2px solid #2c3e50; padding-bottom: 10px; margin-bottom: 20px; font-weight: 900; color: #2c3e50;">
            📘 實習生學習系統 - 心得反思紀錄
          </h2>
          <div class="demo-info-grid">
            <p><strong>撰寫學員：</strong> 護理部 - 測試學員</p>
            <p><strong>指導老師：</strong> 臨床指導教師</p>
            <p><strong>訓練類別：</strong> 基層護理人員臨床專業能力訓練</p>
            <p><strong>訓練日期：</strong> 2026-09-14</p>
          </div>
          
          <div class="demo-section">
            <h4>📊 測驗成績紀錄</h4>
            <div class="score-tags">
              <div class="score-tag">
                <span class="exam-name">兒科實習測驗 (課前)</span>
                <span class="score-val score-high">90 分</span>
              </div>
              <div class="score-tag">
                <span class="exam-name">兒科實習測驗 (課後)</span>
                <span class="score-val score-high">100 分</span>
              </div>
            </div>
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
    </div>

    <!-- 💡 測驗卷預覽彈出視窗 (Modal) -->
    <div v-if="isViewingModalOpen" class="modal-overlay" @click.self="closeViewModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>👁️ 預覽測驗卷：{{ viewingExam?.title }}</h3>
          <button @click="closeViewModal" class="close-btn">✖</button>
        </div>
        <div class="modal-body">
          <div class="exam-warning">
            💡 <strong>【管理者專屬預覽模式】</strong>此畫面僅供您確認題目排版與校對答案。學員在實際作答時，<strong>「絕對不會」</strong>看到任何綠色的正確解答標示，請放心！
          </div>
          <div class="question-list">
            <div v-for="(q, index) in viewingQuestions" :key="q.id" class="question-item">
              <div class="q-title"><strong>Q{{ index + 1 }}.</strong> {{ q.question_text }}</div>
              <div class="q-options">
                <label v-for="(opt, optIndex) in q.options" :key="optIndex" class="opt-label" :class="{'is-correct-preview': opt === q.correct_answer}">
                  <input type="radio" disabled class="custom-radio">
                  <span class="opt-text">{{ opt }}</span>
                  <span v-if="opt === q.correct_answer" class="correct-badge" style="margin-left: auto;">正確解答</span>
                </label>
              </div>
            </div>
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

const newUser = ref({ email: '', password: '', name: '', role: 'student', unit: '' })

// === 🎯 測驗任務派發邏輯 ===
const dispatchRecords = ref([])
const dispatchSelectedExam = ref('')
const dispatchSelectedUnit = ref('all')
const dispatchSelectedStudents = ref([])
const dispatchShowAnswers = ref(false) 

const uniqueUnits = computed(() => {
  const units = students.value.map(s => s.unit).filter(u => u)
  return [...new Set(units)]
})

const dispatchFilteredStudents = computed(() => {
  if (dispatchSelectedUnit.value === 'all') return students.value
  return students.value.filter(s => s.unit === dispatchSelectedUnit.value)
})

const isAllDispatchSelected = computed(() => {
  if (dispatchFilteredStudents.value.length === 0) return false
  const available = dispatchFilteredStudents.value.filter(s => !hasDispatched(dispatchSelectedExam.value, s.id))
  if (available.length === 0) return false
  return available.every(s => dispatchSelectedStudents.value.includes(s.id))
})

function hasDispatched(examId, studentId) {
  return dispatchRecords.value.some(r => r.exam_id === examId && r.student_id === studentId)
}

function toggleAllDispatch() {
  if (isAllDispatchSelected.value) {
    dispatchSelectedStudents.value = []
  } else {
    dispatchFilteredStudents.value.forEach(s => {
      if (!hasDispatched(dispatchSelectedExam.value, s.id) && !dispatchSelectedStudents.value.includes(s.id)) {
        dispatchSelectedStudents.value.push(s.id)
      }
    })
  }
}

async function loadDispatches() {
  const { data } = await supabase.from('exam_dispatch').select('*')
  if (data) dispatchRecords.value = data
}

async function submitDispatch() {
  if (dispatchSelectedStudents.value.length === 0) return Swal.fire('提示', '請至少勾選一名學員', 'warning')
  
  Swal.fire({ title: '派發中...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } })
  const payload = dispatchSelectedStudents.value.map(sId => ({
    exam_id: dispatchSelectedExam.value,
    student_id: sId,
    show_answers: dispatchShowAnswers.value 
  }))

  const { error } = await supabase.from('exam_dispatch').insert(payload)
  if (error) {
    Swal.fire('錯誤', error.message, 'error')
  } else {
    Swal.fire('成功', '測驗任務派發完畢！學員登入後即可看見此測驗。', 'success')
    dispatchSelectedStudents.value = []
    await loadDispatches()
  }
}

// 🌟 計算派發狀態，並收集尚未完成的學員名單
const dispatchStats = computed(() => {
  const stats = {}
  dispatchRecords.value.forEach(r => {
    if (!stats[r.exam_id]) {
      const exam = examList.value.find(e => e.id === r.exam_id)
      stats[r.exam_id] = {
        exam_id: r.exam_id,
        title: exam ? exam.title : '未知測驗',
        total: 0,
        completed: 0,
        show_answers: r.show_answers,
        pending_names: []
      }
    }
    stats[r.exam_id].total++
    if (r.is_completed) {
      stats[r.exam_id].completed++
    } else {
      const student = users.value.find(u => u.id === r.student_id)
      if (student) stats[r.exam_id].pending_names.push(student.name)
    }
    if (r.show_answers) stats[r.exam_id].show_answers = true
  })
  return Object.values(stats)
})

// 🌟 彈出未完成學員名單
function showPendingStudents(stat) {
  if (stat.pending_names.length === 0) {
    Swal.fire('提示', '所有學員皆已完成測驗！', 'success')
    return
  }
  const namesHtml = stat.pending_names.map(name => `<span style="display:inline-block; margin: 5px; padding: 5px 10px; background:#ecf0f1; border-radius:4px; font-weight:bold; color: #2c3e50;">${name}</span>`).join('')
  Swal.fire({
    title: `尚未交卷名單 (${stat.pending_names.length} 人)`,
    html: `<div style="text-align: left; margin-top: 15px;">${namesHtml}</div>`,
    icon: 'info',
    confirmButtonText: '關閉'
  })
}

async function toggleAnswersVisibility(examId, currentStatus) {
  const newStatus = !currentStatus
  Swal.fire({ title: '更新中...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } })
  const { error } = await supabase.from('exam_dispatch').update({ show_answers: newStatus }).eq('exam_id', examId)
  if (error) {
    Swal.fire('錯誤', error.message, 'error')
  } else {
    Toast.fire({ icon: 'success', title: newStatus ? '已全面公開解答' : '已關閉解答' })
    await loadDispatches()
  }
}

// === 📝 測驗題庫解析、預覽與編輯邏輯 ===
const examList = ref([])
const previewQuestions = ref([])
const previewExamTitle = ref('')
const previewExamType = ref('pre_test')
const shuffleQuestionsMode = ref(true)
const shuffleOptionsMode = ref(true)
const editingExamId = ref(null) 

const isViewingModalOpen = ref(false)
const viewingExam = ref(null)
const viewingQuestions = ref([])

async function loadExams() {
  const { data, error } = await supabase.from('exams').select('*').order('created_at', { ascending: false })
  if (!error && data) examList.value = data
}

function shuffleArray(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

function addNewQuestion() {
  previewQuestions.value.push({
    text: '請輸入新題目內容...',
    options: ['選項A', '選項B', '選項C', '選項D'],
    correct: '選項A'
  })
}

async function editExam(exam) {
  Swal.fire({ title: '載入題目中...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } })
  const { data, error } = await supabase.from('questions').select('*').eq('exam_id', exam.id)
  if (error) return Swal.fire('錯誤', '題目載入失敗', 'error')
  
  editingExamId.value = exam.id
  previewExamTitle.value = exam.title
  previewExamType.value = exam.type
  previewQuestions.value = data.map(q => ({
    id: q.id, text: q.question_text, options: q.options, correct: q.correct_answer
  }))
  Swal.close()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function handleExamUpload(event) {
  const file = event.target.files[0]
  if (!file) return
  if (!file.name.endsWith('.docx')) return Swal.fire('錯誤', '請上傳 .docx 檔案', 'error')

  Swal.fire({ title: '解析中...', text: '正在讀取考卷內容', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } })

  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const arrayBuffer = e.target.result
      const result = await mammoth.extractRawText({ arrayBuffer })
      const text = result.value
      previewExamTitle.value = file.name.replace('.docx', '')
      editingExamId.value = null 

      let answerSection = ''
      let questionSection = text
      const answerKeywords = ['標準解答', '參考答案', '解答對照表', '解答']
      let foundIndex = -1
      for (const kw of answerKeywords) {
        const idx = text.lastIndexOf(kw)
        if (idx !== -1 && idx > text.length / 3) { foundIndex = idx; break; }
      }

      if (foundIndex === -1) throw new Error('找不到解答區塊。請確保文件後半部包含「標準解答」或「參考答案」等關鍵字。')
      answerSection = text.substring(foundIndex)
      questionSection = text.substring(0, foundIndex)

      const answersMap = {}
      const strictAnsRegex = /(?:第\s*)?0*(\d+)\s*(?:題)?\s*[：:]\s*\(*([A-D○×])\)*/g
      let matchAns
      let useStrict = false
      while ((matchAns = strictAnsRegex.exec(answerSection)) !== null) {
        answersMap[parseInt(matchAns[1])] = matchAns[2]
        useStrict = true
      }
      if (!useStrict) {
        const pureAnswers = answerSection.match(/[○×ABCD]/g)
        if (pureAnswers) pureAnswers.forEach((ans, idx) => { answersMap[idx + 1] = ans })
      }

      const questions = []
      const qRegex = /(?:^|\n|】|）|\s)0*(\d+)\.\s+(.*?)(?=(?:^|\n|】|）|\s)0*\d+\.\s+|$)/gs
      let matchQ

      while ((matchQ = qRegex.exec(questionSection)) !== null) {
        const qNum = parseInt(matchQ[1])
        let rawText = matchQ[2].trim()
        let options = [], questionText = '', correctText = ''
        const ansKey = answersMap[qNum] || 'A'
        const idxA = rawText.search(/\s*(?:\(A\)|A\.)\s*/)
        
        if (idxA !== -1) {
          questionText = rawText.substring(0, idxA).trim()
          const optsPart = rawText.substring(idxA)
          const optMatches = optsPart.split(/\s*(?:\([A-D]\)|[A-D]\.)\s*/).filter(s => s.trim() !== '')
          if (optMatches.length >= 4) options = optMatches.slice(0, 4).map(s => s.trim())
          else { options = optMatches; while (options.length < 4) options.push('選項缺失') }
          const ansIndex = ansKey === 'A' ? 0 : ansKey === 'B' ? 1 : ansKey === 'C' ? 2 : ansKey === 'D' ? 3 : 0
          correctText = options[ansIndex] || options[0]
        } else if (rawText.includes('○') || rawText.includes('×') || ['○', '×'].includes(ansKey)) {
          const idxO = rawText.search(/[○×□]/)
          if (idxO !== -1 && idxO < rawText.length - 10) questionText = rawText.substring(0, idxO).trim()
          else questionText = rawText.replace(/[○×□]/g, '').trim()
          options = ['○', '×']; correctText = ansKey
        } else {
          questionText = rawText.trim(); options = ['(未解析出選項)', '(未解析出選項)']; correctText = options[0]
        }
        
        if (questionText.length > 2) questions.push({ text: questionText.replace(/^[(\s]+/, ''), options: options, correct: correctText })
      }

      if (questions.length === 0) throw new Error('未能自動解析出題目，請確保題目編號為「1. 」格式，選項為「(A)」格式。')
      previewQuestions.value = questions; Swal.close()
    } catch (err) { Swal.fire('解析失敗', err.message, 'error') } finally { event.target.value = '' }
  }
  reader.readAsArrayBuffer(file)
}

function removePreviewQuestion(index) { previewQuestions.value.splice(index, 1) }

function cancelPreview() { 
  previewQuestions.value = [] 
  editingExamId.value = null
  previewExamTitle.value = ''
}

async function confirmSaveExam() {
  if (!previewExamTitle.value.trim()) return Swal.fire('提示', '名稱不能為空', 'warning')
  if (previewQuestions.value.length === 0) return Swal.fire('提示', '考卷內不能沒有題目！', 'warning')
  
  Swal.fire({ title: '儲存中...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } })

  try {
    let finalQuestions = JSON.parse(JSON.stringify(previewQuestions.value))
    if (shuffleOptionsMode.value) finalQuestions.forEach(q => { if (q.options.length > 2) q.options = shuffleArray(q.options) })
    if (shuffleQuestionsMode.value) finalQuestions = shuffleArray(finalQuestions)
    let targetExamId = editingExamId.value

    if (targetExamId) {
      const { error: examErr } = await supabase.from('exams').update({ title: previewExamTitle.value, type: previewExamType.value }).eq('id', targetExamId)
      if (examErr) throw examErr

      const { data: existingQ } = await supabase.from('questions').select('id').eq('exam_id', targetExamId)
      const existingIds = existingQ.map(q => q.id)
      const keptIds = finalQuestions.map(q => q.id).filter(id => id)
      const idsToDelete = existingIds.filter(id => !keptIds.includes(id))
      
      if (idsToDelete.length > 0) await supabase.from('questions').delete().in('id', idsToDelete)

      const questionsToUpdate = finalQuestions.filter(q => q.id).map(q => ({ id: q.id, exam_id: targetExamId, question_text: q.text, options: q.options, correct_answer: q.correct }))
      const questionsToInsert = finalQuestions.filter(q => !q.id).map(q => ({ exam_id: targetExamId, question_text: q.text, options: q.options, correct_answer: q.correct }))

      if (questionsToUpdate.length > 0) { const { error: updErr } = await supabase.from('questions').upsert(questionsToUpdate); if (updErr) throw updErr }
      if (questionsToInsert.length > 0) { const { error: insErr } = await supabase.from('questions').insert(questionsToInsert); if (insErr) throw insErr }
    } else {
      const { data: examData, error: examErr } = await supabase.from('exams').insert([{ title: previewExamTitle.value, type: previewExamType.value }]).select()
      if (examErr) throw examErr
      targetExamId = examData[0].id
      const qPayload = finalQuestions.map(q => ({ exam_id: targetExamId, question_text: q.text, options: q.options, correct_answer: q.correct }))
      const { error: qErr } = await supabase.from('questions').insert(qPayload)
      if (qErr) throw qErr
    }

    Swal.fire('成功', `已成功儲存題庫，共 ${finalQuestions.length} 題！`, 'success')
    previewQuestions.value = []; editingExamId.value = null; previewExamTitle.value = ''; await loadExams()
  } catch (err) { Swal.fire('寫入失敗', err.message, 'error') }
}

async function deleteExam(id, title) {
  const { isConfirmed } = await Swal.fire({ title: `確定要刪除「${title}」嗎？`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#e74c3c' })
  if (!isConfirmed) return
  const { error } = await supabase.from('exams').delete().eq('id', id)
  if (error) return Swal.fire('錯誤', error.message, 'error')
  Toast.fire({ icon: 'success', title: '測驗卷已刪除' })
  await loadExams()
}

async function viewExam(exam) {
  Swal.fire({ title: '載入中...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } })
  const { data, error } = await supabase.from('questions').select('*').eq('exam_id', exam.id)
  if (error) { Swal.fire('錯誤', '題目載入失敗', 'error'); return }
  viewingExam.value = exam; viewingQuestions.value = data; isViewingModalOpen.value = true
  Swal.close()
}
function closeViewModal() { isViewingModalOpen.value = false; viewingExam.value = null; viewingQuestions.value = [] }

function exportDemoToPDF() { window.print() }
const dynamicCategories = ref([]); const newCategoryName = ref('')
async function loadCategories() {
  const { data, error } = await supabase.from('training_categories').select('*').order('created_at', { ascending: true })
  if (!error && data) dynamicCategories.value = data
}
async function addCategory() {
  if (!newCategoryName.value.trim()) return Swal.fire('提示', '請輸入類別名稱', 'warning')
  const { error } = await supabase.from('training_categories').insert([{ name: newCategoryName.value.trim() }])
  if (error) return Swal.fire('錯誤', error.message, 'error')
  newCategoryName.value = ''; Toast.fire({ icon: 'success', title: '類別新增成功' }); await loadCategories()
}
async function deleteCategory(id, name) {
  const { isConfirmed } = await Swal.fire({ title: `確定要刪除「${name}」嗎？`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#e74c3c' })
  if (isConfirmed) { await supabase.from('training_categories').delete().eq('id', id); await loadCategories() }
}

const currentPage = ref(1); const itemsPerPage = 10; watch(roleFilter, () => { currentPage.value = 1; selectedUserIds.value = [] })
const filteredUsers = computed(() => { return roleFilter.value === 'all' ? users.value : users.value.filter(u => u.role === roleFilter.value) })
const totalPages = computed(() => { return Math.ceil(filteredUsers.value.length / itemsPerPage) || 1 })
const paginatedUsers = computed(() => { const start = (currentPage.value - 1) * itemsPerPage; return filteredUsers.value.slice(start, start + itemsPerPage) })
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
  } else { paginatedUsers.value.forEach(user => { if (!selectedUserIds.value.includes(user.id)) selectedUserIds.value.push(user.id) }) }
}

async function batchDeleteUsers() {
  if (selectedUserIds.value.length === 0) return
  const { isConfirmed } = await Swal.fire({ title: `確定刪除 ${selectedUserIds.value.length} 名人員？`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#e74c3c' })
  if (!isConfirmed) return
  
  Swal.fire({ title: '清理中...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } })
  const results = { success: 0, fail: 0 }
  const concurrency = 5

  for (let i = 0; i < selectedUserIds.value.length; i += concurrency) {
    const batch = selectedUserIds.value.slice(i, i + concurrency)
    await Promise.all(batch.map(async (userId) => {
      const { error } = await supabase.rpc('delete_user_admin', { target_user_id: userId })
      error ? results.fail++ : results.success++
    }))
  }

  if (results.fail === 0) { Swal.fire({ icon: 'success', title: '刪除成功', text: `已成功移除 ${results.success} 名人員`, timer: 1500, showConfirmButton: false }) } 
  else { Swal.fire({ icon: 'warning', title: '部分失敗', text: `成功: ${results.success}，失敗: ${results.fail}` }) }

  selectedUserIds.value = []; await loadUsers()
  if (currentPage.value > totalPages.value && totalPages.value > 0) currentPage.value = totalPages.value
}

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) await checkAndEnforcePasswordChange(user.id)
  await loadUsers(); await loadAssignments(); await loadCategories(); await loadExams(); await loadDispatches()
})

function getRoleName(role) {
  const map = { student: '受訓學員', teacher: '指導老師', supervisor: '單位主管', admin: '系統管理員' }
  return map[role] || role
}

async function loadUsers() {
  const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
  users.value = data || []
  students.value = users.value.filter(u => u.role === 'student')
  teachers.value = users.value.filter(u => u.role === 'teacher')
  supervisors.value = users.value.filter(u => u.role === 'supervisor')
  students.value.forEach(s => { if (!assignmentData.value[s.id]) assignmentData.value[s.id] = { teacher_id: '', supervisor_id: '' } })
}

async function loadAssignments() {
  const { data } = await supabase.from('assignments').select('*')
  if(data) data.forEach(assign => {
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
    newUser.value = { email: '', password: '', name: '', role: 'student', unit: '' }; await loadUsers()
  } catch (err) { Swal.fire({ icon: 'error', title: '建立失敗', text: err.message }) } 
  finally { isCreating.value = false }
}

async function editUser(user) {
  const currentUnit = (user.unit === '未指定單位' || !user.unit) ? '' : user.unit;

  const { value: formValues } = await Swal.fire({
    title: '✏️ 修改人員資料',
    html: `
      <div style="text-align: left; margin-top: 10px;">
        <label style="font-weight: bold; font-size: 14px; display: block; margin-bottom: 5px;">身分角色：</label>
        <select id="edit-role" class="swal2-select" style="width: 100%; max-width: 100%; margin: 0 0 15px 0; font-size: 15px; padding: 8px;">
          <option value="student" ${user.role === 'student' ? 'selected' : ''}>受訓學員</option>
          <option value="teacher" ${user.role === 'teacher' ? 'selected' : ''}>指導老師</option>
          <option value="supervisor" ${user.role === 'supervisor' ? 'selected' : ''}>單位主管</option>
          <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>系統管理員</option>
        </select>
        <label style="font-weight: bold; font-size: 14px; display: block; margin-bottom: 5px;">實習單位：</label>
        <input id="edit-unit" class="swal2-input" value="${currentUnit}" placeholder="例如：5B病房 (留空則為未指定)" style="width: 100%; max-width: 100%; margin: 0; box-sizing: border-box;">
      </div>
    `,
    showCancelButton: true, confirmButtonColor: '#3498db', cancelButtonColor: '#7f8c8d', confirmButtonText: '儲存修改', cancelButtonText: '取消',
    preConfirm: () => { return { role: document.getElementById('edit-role').value, unit: document.getElementById('edit-unit').value.trim() } }
  });

  if (formValues) {
    Swal.fire({ title: '儲存中...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
    const finalUnit = formValues.unit ? formValues.unit : '未指定單位';
    const { error } = await supabase.rpc('update_user_admin', { target_user_id: user.id, new_role: formValues.role, new_unit: finalUnit });
    if (error) { Swal.fire('錯誤', `修改失敗: ${error.message}`, 'error'); } 
    else { Toast.fire({ icon: 'success', title: '資料修改成功' }); await loadUsers(); }
  }
}

async function deleteUser(userId) {
  const { isConfirmed } = await Swal.fire({ title: '確定要刪除？', icon: 'warning', showCancelButton: true, confirmButtonColor: '#e74c3c' })
  if (!isConfirmed) return
  await supabase.rpc('delete_user_admin', { target_user_id: userId })
  selectedUserIds.value = selectedUserIds.value.filter(id => id !== userId); await loadUsers()
}

function downloadTemplate() {
  const ws = XLSX.utils.json_to_sheet([{ "姓名": "王大明", "身分證字號": "A123456789", "Email": "test@hospital.com", "身分": "學員", "實習單位": "5B病房" }])
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
      Swal.fire({ title: '批次匯入中...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } })
      const results = { success: 0, fail: 0, failRows: [] }
      for (let i = 0; i < jsonData.length; i += 5) {
        const batch = jsonData.slice(i, i + 5)
        await Promise.all(batch.map(async (row) => {
          if (!row.Email || !row['姓名'] || !row['身分證字號']) { results.fail++; return; }
          const roleText = row['身分']?.toString().trim() || '學員'
          const role = ROLE_MAP[roleText]
          const unit = row['實習單位']?.toString().trim() || ''
          if (!role) { results.fail++; return; }
          const { error } = await supabase.functions.invoke('create-user', { body: { email: row.Email, password: row['身分證字號'].toString(), name: row['姓名'], role, unit } })
          error ? results.fail++ : results.success++
        }))
      }
      await loadUsers()
      Swal.fire({ icon: 'info', title: '匯入完成', html: `成功: ${results.success} 筆，失敗: ${results.fail} 筆` })
    } catch (err) { Swal.fire('錯誤', '檔案解析失敗', 'error') }
    event.target.value = ''
  }
  reader.readAsArrayBuffer(file)
}

async function saveAssignment(studentId) {
  const data = assignmentData.value[studentId]
  if (!data.teacher_id || !data.supervisor_id) {
    return Swal.fire({ icon: 'warning', title: '提示', text: '請選擇指導老師與單位主管' })
  }
  Swal.fire({ title: '儲存配對中...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } })
  const { error } = await supabase.from('assignments').upsert(
    { student_id: studentId, teacher_id: data.teacher_id, supervisor_id: data.supervisor_id }, 
    { onConflict: 'student_id' }
  )
  if (error) Swal.fire('配對失敗', `資料庫錯誤: ${error.message}`, 'error')
  else Swal.fire('成功', '配對已成功儲存！', 'success')
}

async function handleLogout() { 
  sessionStorage.clear()
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
  color-scheme: light only; 
}

.form-container { width: 100%; max-width: 1000px; font-family: "微軟正黑體", sans-serif; }
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

.import-actions { display: flex; gap: 15px; align-items: center; flex-shrink: 0; }
.filter-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
.filter-tabs button { padding: 6px 14px; border: 1px solid #bdc3c7; background: white; border-radius: 20px; font-size: 13px; font-weight: bold; color: #7f8c8d; cursor: pointer; transition: 0.2s; }
.filter-tabs button.active { background: #34495e; color: white; border-color: #34495e; }

.form-row { display: flex; gap: 15px; margin-bottom: 15px; }
.form-group { flex: 1; margin-bottom: 15px; }
.form-group label { display: block; font-size: 14px; font-weight: bold; margin-bottom: 8px; color: #2c3e50; }
.form-input { width: 100%; padding: 12px; border: 1px solid #dcdde1; border-radius: 6px; box-sizing: border-box; transition: 0.2s; font-family: inherit; }
.form-input:focus { outline: none; border-color: #3498db; }

.batch-action-bar { background: #fdf2f2; border: 1px solid #fab1a0; padding: 12px 18px; border-radius: 6px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; color: #d63031; font-weight: bold; }
.custom-checkbox { width: 18px; height: 18px; cursor: pointer; accent-color: #e74c3c; }

.table-responsive { overflow-x: auto; margin-top: 15px; }
.data-table { width: 100%; border-collapse: collapse; min-width: 600px; }
.data-table th, .data-table td { padding: 14px; border-bottom: 1px solid #ecf0f1; text-align: left; color: #2c3e50; }
.data-table th { background: #f8f9fa; font-weight: bold; }
.data-table tbody tr:hover { background: #f9fbfc; }
.empty-state { text-align: center; color: #95a5a6; padding: 30px !important; }

.role-badge { padding: 5px 12px; border-radius: 12px; font-size: 13px; font-weight: bold; color: white; display: inline-block; }
.role-badge.student { background: #3498db; }
.role-badge.teacher { background: #9b59b6; }
.role-badge.supervisor { background: #e67e22; }
.role-badge.admin { background: #34495e; }

.btn { padding: 10px 20px; border: none; border-radius: 6px; font-weight: bold; font-size: 15px; cursor: pointer; transition: all 0.2s; text-align: center; white-space: nowrap; font-family: inherit; }
.small-btn { padding: 8px 14px; font-size: 13px; }
.primary-btn { background: #3498db; color: white; }
.secondary-btn { background: #95a5a6; color: white; }
.success-btn { background: #2ecc71; color: white; display: inline-flex; align-items: center; justify-content: center; }
.danger-btn { background: #e74c3c; color: white; }
.dark-btn { background: #2c3e50; color: white; }
.btn:hover:not(:disabled) { filter: brightness(0.9); transform: translateY(-1px); }
.btn:disabled { background: #bdc3c7; cursor: not-allowed; }

.pagination-controls { display: flex; justify-content: center; align-items: center; gap: 15px; margin-top: 15px; padding-top: 15px; border-top: 1px solid #ecf0f1; }
.page-btn { padding: 6px 12px; border: 1px solid #bdc3c7; background: white; border-radius: 4px; cursor: pointer; color: #2c3e50; font-weight: bold; transition: 0.2s; }

.shuffle-options { display: flex; gap: 20px; margin: 15px 0 25px 0; background: #f0f8ff; padding: 12px; border-radius: 6px; border: 1px solid #bce0fd; }
.checkbox-label { display: flex; align-items: center; gap: 8px; font-weight: bold; color: #2980b9; cursor: pointer; font-size: 14px; }
.preview-questions-list { display: flex; flex-direction: column; gap: 15px; }
.question-item { background: #f8f9fa; border: 1px solid #e1e4e8; border-radius: 8px; padding: 15px; }
.q-header { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; }
.q-num { font-weight: 900; color: #3498db; font-size: 18px; width: 35px; }
.q-text-input { font-weight: bold; font-size: 16px; border-color: #bdc3c7; }
.q-options { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
.q-options li { display: flex; align-items: center; gap: 10px; background: white; padding: 8px; border-radius: 6px; border: 1px solid #eee; }
.q-options li.is-correct { border-color: #2ecc71; background: #f4fdf8; }
.custom-radio { width: 18px; height: 18px; cursor: pointer; accent-color: #2ecc71; }
.correct-badge { background: #2ecc71; color: white; font-size: 12px; font-weight: bold; padding: 4px 8px; border-radius: 12px; white-space: nowrap; }

.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.6); z-index: 9999; display: flex; justify-content: center; align-items: center; padding: 20px; box-sizing: border-box; }
.modal-content { background: white; width: 100%; max-width: 850px; max-height: 90vh; border-radius: 8px; display: flex; flex-direction: column; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid #e1e4e8; background: #f8f9fa;}
.modal-header h3 { margin: 0; color: #2c3e50; font-size: 20px; font-weight: 900; }
.close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #7f8c8d; }
.modal-body { padding: 25px; overflow-y: auto; }
.exam-warning { background: #e8f4fd; color: #2980b9; padding: 12px; border-radius: 6px; margin-bottom: 20px; font-weight: bold; font-size: 14px; border: 1px solid #bce0fd; }

.demo-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; background: #f8f9fa; padding: 15px; border-radius: 6px; }
.demo-section { margin-bottom: 20px; }
.demo-text-box { background: white; border: 1px solid #bdc3c7; padding: 15px; border-radius: 6px; font-size: 15px; line-height: 1.6; color: #2c3e50; min-height: 80px; }
.demo-signatures { display: flex; justify-content: space-between; margin-top: 40px; border-top: 2px solid #ecf0f1; padding-top: 20px; }
.sign-box { font-weight: bold; color: #2c3e50; font-size: 15px; }

@media screen and (max-width: 768px) {
  .admin-header { flex-direction: column; gap: 15px; }
  .admin-header button { width: 100%; }
  .tabs { flex-direction: column; border-bottom: none; }
  .tabs button { border-radius: 6px; border-bottom: none; margin-bottom: 5px; }
  .card-header-flex { flex-direction: column; align-items: stretch; gap: 15px; }
  .import-actions { flex-direction: column; width: 100%; }
  .demo-info-grid { grid-template-columns: 1fr; }
}
</style>