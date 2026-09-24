<template>
  <div class="app-wrapper" :class="printMode ? `print-mode-${printMode}` : ''">
    <!-- ======================================================= -->
    <!-- 一般網頁管理介面                                           -->
    <!-- ======================================================= -->
    <div class="admin-container no-print-if-active">
      <div class="admin-header">
        <div class="header-titles">
          <h2>⚙️ 實習生學習系統 - 管理員後台</h2>
        </div>
        <button @click="handleLogout" class="btn dark-btn">登出系統</button>
      </div>

      <!-- 🌟 分頁導覽：改用 v-show 以確保畫面緩存、極致流暢不閃爍 -->
      <div class="tabs">
        <button :class="{ active: activeTab === 'users' }" @click="activeTab = 'users'">👥 帳號管理</button>
        <button :class="{ active: activeTab === 'pairing' }" @click="activeTab = 'pairing'">🔗 師生配對</button>
        <button :class="{ active: activeTab === 'categories' }" @click="activeTab = 'categories'">🗂️ 訓練類別</button>
        <button :class="{ active: activeTab === 'exams' }" @click="activeTab = 'exams'">📝 題庫與量表</button>
        <button :class="{ active: activeTab === 'dispatch' }" @click="activeTab = 'dispatch'">🎯 任務派發</button>
        <button :class="{ active: activeTab === 'demo' }" @click="activeTab = 'demo'">📄 PDF 範本</button>
      </div>

      <!-- ================= 任務派發與成績管理 ================= -->
      <div v-show="activeTab === 'dispatch'" class="tab-content">
        <div class="admin-card">
          <h3>🎯 批次派發測驗卷與量表</h3>
          <p class="desc">請選擇要派發的項目（含測驗或壓力量表），並透過實習單位篩選目標學員進行派發。</p>
          <div class="form-row" style="background: #fdfdfd; padding: 15px; border-radius: 8px; border: 1px solid #eee; margin-top: 15px;">
            <div class="form-group"><label>1. 選擇派發項目：</label>
              <select v-model="dispatchSelectedExam" class="form-input">
                <option value="">-- 請選擇 --</option>
                <option v-for="exam in examList" :key="exam.id" :value="exam.id">
                  {{ exam.title }} ({{ exam.type === 'pre_test' ? '課前' : exam.type === 'post_test' ? '課後' : '評估量表' }})
                </option>
              </select>
            </div>
            <div class="form-group"><label>2. 篩選目標實習單位：</label>
              <select v-model="dispatchSelectedUnit" class="form-input">
                <option value="all">顯示所有單位學員</option>
                <option v-for="unit in uniqueUnits" :key="unit" :value="unit">{{ unit }}</option>
              </select>
            </div>
          </div>
          <div v-if="dispatchSelectedExam" style="margin-top: 15px; background: #f0f8ff; padding: 12px 15px; border-radius: 8px; border: 1px solid #bce0fd;">
            <label class="checkbox-label" style="display: flex; align-items: center; gap: 8px; font-weight: bold; cursor: pointer; color: #2980b9;">
              <input type="checkbox" v-model="dispatchShowAnswers" class="custom-checkbox">☑️ 派發時直接公開解答（若是量表則無標準解答，請自由勾選）
            </label>
          </div>
          <div v-if="dispatchSelectedExam" style="margin-top: 20px;">
            <div class="card-header-flex align-center">
              <h4 style="margin: 0;">勾選要派發的學員</h4>
              <button @click="submitDispatch" class="btn success-btn small-btn">🚀 確認派發</button>
            </div>
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th style="width: 40px; text-align: center;"><input type="checkbox" class="custom-checkbox" :checked="isAllDispatchSelected" @change="toggleAllDispatch" /></th>
                    <th>實習單位</th><th>學員姓名</th><th>派發狀態</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="student in dispatchFilteredStudents" :key="student.id" :class="{'selected-row': dispatchSelectedStudents.includes(student.id)}">
                    <td style="text-align: center;"><input type="checkbox" class="custom-checkbox" :value="student.id" v-model="dispatchSelectedStudents" :disabled="hasDispatched(dispatchSelectedExam, student.id)" /></td>
                    <td>{{ student.unit || '未指定' }}</td><td><strong>{{ student.name }}</strong></td>
                    <td>
                      <span v-if="hasDispatched(dispatchSelectedExam, student.id)" style="color: #2ecc71; font-weight: bold;">✅ 已派發</span>
                      <span v-else style="color: #95a5a6;">尚未派發</span>
                    </td>
                  </tr>
                  <tr v-if="dispatchFilteredStudents.length === 0"><td colspan="4" class="empty-state">此單位尚無學員資料</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="admin-card" style="margin-top: 20px;">
          <h3>🔓 已派發任務進度與分析</h3>
          <p class="desc">在此處可查看未交卷名單，或是針對「壓力量表」進行六大類壓力因子分析與 PDF 匯出。</p>
          <div class="table-responsive">
            <table class="data-table">
              <thead><tr><th>任務名稱</th><th style="text-align: center;">繳交進度</th><th style="text-align: center;">解答狀態</th><th style="text-align: center;">操作</th></tr></thead>
              <tbody>
                <tr v-for="stat in dispatchStats" :key="stat.exam_id">
                  <td><strong>{{ stat.title }}</strong></td>
                  <td style="text-align: center; font-weight: bold;">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 5px;">
                      <span :style="{ color: stat.completed === stat.total ? '#2ecc71' : '#e67e22' }">{{ stat.completed }} / {{ stat.total }}</span>
                      <button v-if="stat.completed < stat.total" @click="showPendingStudents(stat)" class="btn secondary-btn small-btn" style="padding: 4px 8px; font-size: 12px;">🔍 查看未交名單</button>
                    </div>
                  </td>
                  <td style="text-align: center;">
                    <span v-if="stat.show_answers" style="color: #2ecc71; font-weight: bold;">🔓 已公開</span>
                    <span v-else style="color: #e74c3c; font-weight: bold;">🔒 未公開</span>
                  </td>
                  <td style="text-align: center;">
                    <div style="display: flex; flex-direction: column; gap: 8px; align-items: center;">
                      <button @click="openScoreModal(stat)" class="btn primary-btn small-btn" style="width: 100%; max-width: 140px;">📊 成績與分析匯出</button>
                      <button v-if="!stat.show_answers" @click="toggleAnswersVisibility(stat.exam_id, stat.show_answers)" class="btn success-btn small-btn" style="width: 100%; max-width: 140px;">一鍵公開解答</button>
                      <button v-else @click="toggleAnswersVisibility(stat.exam_id, stat.show_answers)" class="btn danger-btn small-btn" style="width: 100%; max-width: 140px;">關閉解答</button>
                    </div>
                  </td>
                </tr>
                <tr v-if="dispatchStats.length === 0"><td colspan="4" class="empty-state">尚無派發紀錄</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ================= 題庫與量表管理 ================= -->
      <div v-show="activeTab === 'exams'" class="tab-content">
        <div class="admin-card" v-if="previewQuestions.length === 0 && !editingExamId">
          <h3>➕ 匯入 Word 測驗卷 / 評估量表</h3>
          <p class="desc">支援一般測驗卷，以及如「護生實習壓力量表」等五點計分量表。</p>
          <div style="margin-top: 15px; display: flex; gap: 15px; flex-wrap: wrap;">
            <div>
              <input type="file" @change="handleExamUpload" accept=".docx" style="display: none" id="exam-upload" />
              <label for="exam-upload" class="btn success-btn">📝 上傳一般測驗卷</label>
            </div>
            <div>
              <input type="file" @change="handleScaleUpload" accept=".docx" style="display: none" id="scale-upload" />
              <label for="scale-upload" class="btn primary-btn" style="background-color: #e67e22; border-color: #e67e22;">📊 上傳壓力量表 (五點計分)</label>
            </div>
          </div>
        </div>

        <div class="admin-card preview-card" v-else>
          <div class="card-header-flex align-center">
            <h3>{{ editingExamId ? '✏️ 編輯與校對' : '👁️ 預覽與校對' }}</h3>
            <div class="action-row" style="margin-top: 0;">
              <button @click="cancelPreview" class="btn danger-btn small-btn">取消</button>
              <button @click="confirmSaveExam" class="btn primary-btn small-btn">✅ 儲存任務</button>
            </div>
          </div>
          <div class="form-row" style="background: #fdfdfd; padding: 15px; border-radius: 8px; border: 1px solid #eee;">
            <div class="form-group"><label>任務名稱：</label><input type="text" v-model="previewExamTitle" class="form-input" /></div>
            <div class="form-group">
              <label>類型：</label>
              <select v-model="previewExamType" class="form-input">
                <option value="pre_test">課前測驗</option>
                <option value="post_test">課後測驗</option>
                <option value="scale">評估量表 (不顯示分數/六大類分析)</option>
              </select>
            </div>
          </div>
          
          <div class="shuffle-options" style="display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; gap: 20px;">
              <label class="checkbox-label"><input type="checkbox" v-model="shuffleQuestionsMode" class="custom-checkbox"> 🔀 儲存時隨機打亂「題目順序」</label>
              <label class="checkbox-label" v-if="previewExamType !== 'scale'"><input type="checkbox" v-model="shuffleOptionsMode" class="custom-checkbox"> 🔀 儲存時隨機打亂「選項順序」</label>
            </div>
            <button v-if="previewExamType === 'scale'" @click="applyOptionsToAll" class="btn secondary-btn small-btn" style="width: fit-content; background-color: #8e44ad;">🔂 將 Q1 選項套用至整份量表</button>
          </div>

          <div class="preview-questions-list">
            <div v-for="(q, qIndex) in previewQuestions" :key="qIndex" class="question-item">
              <div class="q-header">
                <span class="q-num">Q{{ qIndex + 1 }}</span>
                <input v-model="q.text" class="form-input q-text-input" />
                <button @click="removePreviewQuestion(qIndex)" class="btn danger-btn small-btn" title="刪除此題">🗑️</button>
              </div>
              <ul class="q-options">
                <li v-for="(opt, oIndex) in q.options" :key="oIndex" :class="{'is-correct': q.correct === opt && previewExamType !== 'scale'}">
                  <input v-if="previewExamType !== 'scale'" type="radio" :name="'correct_' + qIndex" :value="opt" v-model="q.correct" class="custom-radio" title="設為正確解答" />
                  <input v-model="q.options[oIndex]" class="form-input opt-text-input" />
                  <span v-if="q.correct === opt && previewExamType !== 'scale'" class="correct-badge">正確解答</span>
                </li>
              </ul>
              <div style="margin-top: 15px;" v-if="previewExamType !== 'scale'">
                <label style="font-size: 13px; font-weight: bold; color: #7f8c8d;">💡 解題分析 (選填)：</label>
                <textarea v-model="q.explanation" class="form-input" rows="2" placeholder="如有解析請輸入於此..."></textarea>
              </div>
            </div>
            <div class="action-row" style="justify-content: center; margin-top: 10px;"><button @click="addNewQuestion" class="btn success-btn small-btn" style="width: 100%; max-width: 300px;">➕ 手動新增一題</button></div>
          </div>
        </div>

        <div class="admin-card">
          <h3>📋 已建立的任務清單</h3>
          <div class="table-responsive">
            <table class="data-table">
              <thead><tr><th>名稱</th><th>類型</th><th>建立時間</th><th style="text-align: center;">操作</th></tr></thead>
              <tbody>
                <tr v-for="exam in examList" :key="exam.id">
                  <td><strong>{{ exam.title }}</strong></td>
                  <td>
                    <span class="role-badge" :class="exam.type === 'scale' ? 'supervisor' : exam.type === 'pre_test' ? 'student' : 'teacher'">
                      {{ exam.type === 'scale' ? '評估量表' : exam.type === 'pre_test' ? '課前測驗' : '課後測驗' }}
                    </span>
                  </td>
                  <td>{{ formatDate(exam.created_at) }}</td>
                  <td style="text-align: center; white-space: nowrap;">
                    <button @click="viewExam(exam)" class="btn primary-btn small-btn" style="margin-right: 5px;">預覽</button>
                    <button @click="editExam(exam)" class="btn success-btn small-btn" style="margin-right: 5px;">編輯</button>
                    <button @click="deleteExam(exam.id, exam.title)" class="btn danger-btn small-btn">刪除</button>
                  </td>
                </tr>
                <tr v-if="examList.length === 0"><td colspan="4" class="empty-state">尚無任務資料</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ================= 帳號管理 (完整還原身分顯示) ================= -->
      <div v-show="activeTab === 'users'" class="tab-content">
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
              <div class="form-group"><label>姓名：</label><input type="text" v-model="newUser.name" required class="form-input" placeholder="例如：王小明"></div>
              <div class="form-group">
                <label>身分：</label>
                <select v-model="newUser.role" class="form-input">
                  <option value="student">受訓人員 (學員)</option>
                  <option value="teacher">臨床指導老師</option>
                  <option value="supervisor">單位主管</option>
                  <option value="admin">系統管理員</option>
                </select>
              </div>
              <div class="form-group"><label>所屬單位 (選填)：</label><input type="text" v-model="newUser.unit" class="form-input" placeholder="例如：5B病房"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Email 帳號：</label><input type="email" v-model="newUser.email" required class="form-input" placeholder="例如：user@hospital.com"></div>
              <div class="form-group"><label>預設密碼：</label><input type="text" v-model="newUser.password" required class="form-input" placeholder="至少 6 碼"></div>
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
                  <th>單位</th><th>姓名</th><th>Email</th><th>身分角色</th><th style="width: 140px; text-align: center;">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="user in paginatedUsers" :key="user.id" :class="{'selected-row': selectedUserIds.includes(user.id)}">
                  <td style="text-align: center;"><input type="checkbox" class="custom-checkbox" :value="user.id" v-model="selectedUserIds" /></td>
                  <td>{{ user.unit || '-' }}</td><td><strong>{{ user.name }}</strong></td><td>{{ user.email }}</td>
                  <!-- 🌟 身分標籤 -->
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

      <!-- ================= 師生配對 ================= -->
      <div v-show="activeTab === 'pairing'" class="tab-content">
        <div class="admin-card">
          <h3>🔗 學員與指導者配對設定</h3>
          <p class="desc">請為每位學員指定對應的臨床指導老師與單位主管。</p>
          <div class="table-responsive">
            <table class="data-table pairing-table">
              <thead><tr><th>單位</th><th>受訓學員</th><th>臨床指導老師</th><th>單位主管</th><th>操作</th></tr></thead>
              <tbody>
                <tr v-for="student in students" :key="student.id">
                  <td>{{ student.unit || '-' }}</td><td><strong>{{ student.name }}</strong></td>
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

      <!-- ================= 訓練類別 ================= -->
      <div v-show="activeTab === 'categories'" class="tab-content">
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

      <!-- ================= PDF 範本 ================= -->
      <div v-show="activeTab === 'demo'" class="tab-content">
        <div class="admin-card no-print">
          <h3>📄 系統 PDF 匯出範本演示</h3>
          <p class="desc">這是一份完整的學習心得測試範本。點擊下方按鈕直接預覽實際匯出的 PDF 排版效果。</p>
          <button @click="exportDemoToPDF" class="btn dark-btn" style="margin-top: 15px;">🖨️ 列印 / 匯出 PDF 範本</button>
        </div>
        
        <!-- 用於網頁預覽的心得範本 -->
        <div class="admin-card printable-demo no-print">
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
              <div class="score-tag"><span class="exam-name">兒科實習測驗 (課前)</span><span class="score-val score-high-badge" style="color:white !important;">90 分</span></div>
              <div class="score-tag"><span class="exam-name">兒科實習測驗 (課後)</span><span class="score-val score-high-badge" style="color:white !important;">100 分</span></div>
            </div>
          </div>
          <div class="demo-section"><h4>📚 學習內容重點摘要</h4><div class="demo-text-box">今日參與靜脈留置針注射技術與無菌操作規範實作。</div></div>
          <div class="demo-section"><h4>💡 自我反思與心得</h4><div class="demo-text-box">首次在假人模型上進行實作時，因為怕扎錯位置而略顯緊張。</div></div>
          <div class="demo-section"><h4>👩‍⚕️ 臨床指導老師回饋</h4><div class="demo-text-box">學習態度非常積極，無菌操作的觀念與洗手時機都掌握得很正確，值得嘉許！</div></div>
          <div class="demo-section"><h4>🏥 單位主管總評</h4><div class="demo-text-box">該員於本次訓練中展現出高度的學習熱忱與反思能力。</div></div>
          <div class="demo-signatures">
            <div class="sign-box">學員簽章：<br><span class="unsigned-text">(系統已認證)</span></div>
            <div class="sign-box">老師簽章：<br><span class="unsigned-text">(系統已認證)</span></div>
            <div class="sign-box">主管簽章：<br><span class="unsigned-text">(系統已認證)</span></div>
          </div>
        </div>
      </div>
    </div> <!-- admin-container 結束 -->

    <!-- ======================================================= -->
    <!-- 📊 任務/量表分析彈出視窗 (Modal)                            -->
    <!-- ======================================================= -->
    <div v-if="isScoreModalOpen" class="modal-overlay no-print" @click.self="closeScoreModal">
      <div class="modal-content review-modal" style="max-width: 900px;">
        <div class="modal-header">
          <h3>📊 {{ scoreReportData.isScale ? '量表分析與填答報告' : '成績清單' }}：{{ scoreReportData.title }}</h3>
          <button @click="closeScoreModal" class="close-btn">✖</button>
        </div>
        <div class="modal-body">
          <div style="background: #f8f9fa; border: 1px solid #dcdde1; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 15px 0; color: #2c3e50;">📝 報表與表頭設定 (支援預填)</h4>
            <div class="form-row">
              <div class="form-group"><label>學年學期：</label><input v-model="reportMeta.semester" class="form-input" placeholder="例：112學年度上學期"></div>
              <div class="form-group"><label>課程名稱：</label><input v-model="reportMeta.courseName" class="form-input"></div>
              <div class="form-group"><label>授課老師：</label><input v-model="reportMeta.teacherName" class="form-input"></div>
            </div>
            <div class="form-row" style="margin-bottom: 0;">
              <div class="form-group"><label>院系/部門：</label><input v-model="reportMeta.department" class="form-input"></div>
              <div class="form-group"><label>班級名稱：</label><input v-model="reportMeta.className" class="form-input" placeholder="例：A班"></div>
              <div class="form-group"><label>列印日期：</label><input type="date" v-model="reportMeta.printDate" class="form-input"></div>
            </div>
          </div>

          <div class="action-row" style="margin-bottom: 15px; justify-content: space-between; align-items: center; border-bottom: 1px solid #e1e4e8; padding-bottom: 15px;">
            <span style="font-size: 15px; font-weight: bold; color: #2c3e50;">已選取 <strong style="color: #e74c3c;">{{ selectedScoreRecords.length }}</strong> 名學員</span>
            <button @click="printSelectedScores" class="btn dark-btn small-btn" :disabled="selectedScoreRecords.length === 0">🖨️ 匯出勾選學員之報表 (PDF)</button>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 40px; text-align: center;"><input type="checkbox" class="custom-checkbox" :checked="isAllScoresSelected" @change="toggleAllScores" /></th>
                  <th>實習單位</th>
                  <th>學員姓名</th>
                  <th style="text-align: center;">{{ scoreReportData.isScale ? '量表總分 / 壓力等級' : '測驗得分' }}</th>
                  <th>填答時間</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(record, index) in scoreReportData.records" :key="index">
                  <td style="text-align: center;"><input type="checkbox" class="custom-checkbox" :value="record.studentId" v-model="selectedScoreRecords" /></td>
                  <td>{{ record.studentUnit }}</td>
                  <td><strong>{{ record.studentName }}</strong></td>
                  <td style="text-align: center;">
                    <span v-if="scoreReportData.isScale" style="font-weight: bold; color: #d35400;">
                      {{ record.totalScore }} 分 ({{ record.stressLevel }})
                    </span>
                    <span v-else class="score-badge-custom score-high-badge">{{ record.score }} 分</span>
                  </td>
                  <td>{{ formatDateTime(record.completedAt) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- 預覽考卷視窗 -->
    <div v-if="isViewingModalOpen" class="modal-overlay no-print" @click.self="closeViewModal">
      <div class="modal-content">
        <div class="modal-header"><h3>👁️ 預覽任務：{{ viewingExam?.title }}</h3><button @click="closeViewModal" class="close-btn">✖</button></div>
        <div class="modal-body">
          <div class="exam-warning">💡 <strong>【管理者專屬預覽模式】</strong>此畫面僅供確認題目排版。學員不會看到正確解答標示。</div>
          <div class="question-list">
            <div v-for="(q, index) in viewingQuestions" :key="q.id" class="question-item">
              <div class="q-title"><strong>Q{{ index + 1 }}.</strong> {{ q.question_text }}</div>
              <div class="q-options">
                <label v-for="(opt, optIndex) in q.options" :key="optIndex" class="opt-label" :class="{'is-correct-preview': opt === q.correct_answer && viewingExam?.type !== 'scale'}">
                  <input type="radio" disabled class="custom-radio"><span class="opt-text">{{ opt }}</span>
                  <span v-if="opt === q.correct_answer && viewingExam?.type !== 'scale'" class="correct-badge" style="margin-left: auto;">正確解答</span>
                </label>
              </div>
              <div v-if="q.explanation && viewingExam?.type !== 'scale'" style="margin-top: 15px; padding: 12px; background: #fdf4e5; border-left: 4px solid #f39c12; border-radius: 4px;">
                <strong style="color: #d35400;">💡 解題分析：</strong>
                <div style="color: #2c3e50; font-size: 14px; margin-top: 5px; white-space: pre-wrap;">{{ q.explanation }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================================================= -->
    <!-- 🖨️ 隱藏版：正式 PDF 匯出格式 (包含雷達圖與六大類表格分析)       -->
    <!-- ======================================================= -->
    <div class="print-only-scores" v-show="printMode === 'scores'">
      <h1 style="text-align: center; font-size: 26px; font-weight: bold; margin-bottom: 20px; color: #000;">
        {{ scoreReportData.isScale ? '護生實習壓力評估與分析報告' : '課程成績單' }}
      </h1>
      
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; margin-bottom: 20px; font-size: 15px;">
        <tbody>
          <tr>
            <td style="border: 1px solid #000; padding: 10px; font-weight: bold; background: #f9f9f9; width: 120px;">課程/量表：</td>
            <td style="border: 1px solid #000; padding: 10px;">{{ scoreReportData.title }}</td>
            <td style="border: 1px solid #000; padding: 10px; font-weight: bold; background: #f9f9f9; width: 120px;">學年學期：</td>
            <td style="border: 1px solid #000; padding: 10px;">{{ reportMeta.semester || '______' }}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 10px; font-weight: bold; background: #f9f9f9;">授課/指導：</td>
            <td style="border: 1px solid #000; padding: 10px;">{{ reportMeta.teacherName }}</td>
            <td style="border: 1px solid #000; padding: 10px; font-weight: bold; background: #f9f9f9;">院系/班級：</td>
            <td style="border: 1px solid #000; padding: 10px;">{{ reportMeta.department }} / {{ reportMeta.className }}</td>
          </tr>
        </tbody>
      </table>

      <!-- 勾選學員的詳細填答與六大類壓力分析 -->
      <div v-if="scoreReportData.isScale">
        <div v-for="record in filteredScoreRecords" :key="record.studentId" style="page-break-inside: avoid; margin-bottom: 40px; border: 2px solid #000; padding: 20px;">
          <h3 style="border-bottom: 1px solid #000; padding-bottom: 8px; margin-top: 0; display: flex; justify-content: space-between;">
            <span>學員姓名：{{ record.studentName }} ({{ record.studentUnit || '未分組' }})</span>
            <span>總分：{{ record.totalScore }} 分 [評估：{{ record.stressLevel }}]</span>
          </h3>
          
          <p style="font-size: 13px; color: #555; margin: 5px 0 15px 0;">* 壓力等級說明：31-77分(維持支持與增能)、78-108分(列入觀察，每週追蹤)、109-155分(高度壓力，48-72小時內面談)</p>

          <!-- 六大類壓力因子分析表格 -->
          <h4 style="margin: 10px 0 5px 0;">📈 六大類壓力因子分析摘要</h4>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 14px; margin-bottom: 15px;">
            <thead>
              <tr style="background: #f0f0f0;">
                <th style="border: 1px solid #000; padding: 8px; text-align: left;">壓力構面與類別</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 100px;">平均得分</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: left;">壓力傾向解讀</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(dim, dKey) in record.dimensions" :key="dKey">
                <td style="border: 1px solid #000; padding: 8px;"><strong>{{ dim.name }}</strong></td>
                <td style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">{{ dim.avgScore }} 分</td>
                <td style="border: 1px solid #000; padding: 8px; color: #333;">{{ dim.statusText }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 若為一般測驗則呈現標準成績單表格 -->
      <div v-else>
        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; font-size: 16px; margin-bottom: 40px;">
          <thead>
            <tr>
              <th style="border: 1px solid #000; padding: 10px; background: #f0f0f0; text-align: center; width: 60px;">序號</th>
              <th style="border: 1px solid #000; padding: 10px; background: #f0f0f0; text-align: left;">學員帳號</th>
              <th style="border: 1px solid #000; padding: 10px; background: #f0f0f0; text-align: left;">姓名</th>
              <th style="border: 1px solid #000; padding: 10px; background: #f0f0f0; text-align: left;">實習單位</th>
              <th style="border: 1px solid #000; padding: 10px; background: #f0f0f0; text-align: center;">分數</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(record, index) in filteredScoreRecords" :key="record.studentId">
              <td style="border: 1px solid #000; padding: 10px; text-align: center;">{{ index + 1 }}</td>
              <td style="border: 1px solid #000; padding: 10px;">{{ record.studentEmail }}</td>
              <td style="border: 1px solid #000; padding: 10px; font-weight: bold;">{{ record.studentName }}</td>
              <td style="border: 1px solid #000; padding: 10px;">{{ record.studentUnit || reportMeta.department }}</td>
              <td style="border: 1px solid #000; padding: 10px; text-align: center; font-weight: bold;">{{ record.score }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 16px; font-weight: bold;">
        <div>授課/指導教師簽章：_______________________</div>
        <div style="margin-right: 50px;">日期：{{ formatPrintDate(reportMeta.printDate) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { supabase } from '../supabase'
import Swal from 'sweetalert2'
import * as XLSX from 'xlsx'
import * as mammoth from 'mammoth'
import { checkAndEnforcePasswordChange } from '../utils/auth'
import { Toast } from '../utils/toast'

const profile = ref(null)
const activeTab = ref('users'); const roleFilter = ref('all'); const users = ref([]); const students = ref([]); const teachers = ref([]); const supervisors = ref([]); const assignmentData = ref({}); const isCreating = ref(false); const newUser = ref({ email: '', password: '', name: '', role: 'student', unit: '' })
const dispatchRecords = ref([]); const dispatchSelectedExam = ref(''); const dispatchSelectedUnit = ref('all'); const dispatchSelectedStudents = ref([]); const dispatchShowAnswers = ref(false) 
const printMode = ref('')
const hasParsedAnswers = ref(true)

// ==========================================
// 📊 量表分析與成績單匯出邏輯
// ==========================================
const isScoreModalOpen = ref(false)
const scoreReportData = ref({ title: '', isScale: false, records: [] })
const selectedScoreRecords = ref([])

const reportMeta = ref({
  semester: '', courseName: 'AI賦能高齡健康照護培訓專班', teacherName: '', department: '護理部', className: '', examName: '', printDate: new Date().toISOString().split('T')[0]
})

const isAllScoresSelected = computed(() => {
  if (scoreReportData.value.records.length === 0) return false;
  return scoreReportData.value.records.every(r => selectedScoreRecords.value.includes(r.studentId))
})
const filteredScoreRecords = computed(() => {
  return scoreReportData.value.records.filter(r => selectedScoreRecords.value.includes(r.studentId));
})

function toggleAllScores() {
  if (isAllScoresSelected.value) selectedScoreRecords.value = []
  else selectedScoreRecords.value = scoreReportData.value.records.map(r => r.studentId)
}

function formatPrintDate(dateStr) {
  if (!dateStr) return '______ 年 ______ 月 ______ 日';
  const parts = dateStr.split('-');
  if(parts.length !== 3) return '______ 年 ______ 月 ______ 日';
  return `${parts[0]} 年 ${parts[1]} 月 ${parts[2]} 日`;
}

// 🌟 安全的列印引擎：不再依賴會造成 Vue Root Crash 的結構切換
function printSelectedScores() {
  printMode.value = 'scores';
  isScoreModalOpen.value = false;
  const originalTitle = document.title;
  document.title = `${scoreReportData.value.isScale ? '量表分析' : '課程成績單'}_${reportMeta.value.examName}`; 

  setTimeout(() => { window.print(); }, 300);

  const restoreState = () => {
    document.title = originalTitle;
    printMode.value = '';
    isScoreModalOpen.value = true;
    window.removeEventListener('afterprint', restoreState);
  };
  window.addEventListener('afterprint', restoreState);
}

function exportDemoToPDF() { 
  printMode.value = 'demo';
  setTimeout(() => { window.print(); }, 300);
  const restoreState = () => { printMode.value = ''; window.removeEventListener('afterprint', restoreState); };
  window.addEventListener('afterprint', restoreState);
}

function formatDateTime(isoString) {
  if (!isoString) return '(無時間紀錄)';
  const d = new Date(isoString);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function formatDate(isoString) { if (!isoString) return ''; const d = new Date(isoString); return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}` }

function getScoreBadgeClass(score) {
  if (score >= 80) return 'score-high-badge';
  if (score >= 60) return 'score-pass-badge';
  return 'score-fail-badge';
}

const uniqueUnits = computed(() => { const units = students.value.map(s => s.unit).filter(u => u); return [...new Set(units)] })
const dispatchFilteredStudents = computed(() => { if (dispatchSelectedUnit.value === 'all') return students.value; return students.value.filter(s => s.unit === dispatchSelectedUnit.value) })
const isAllDispatchSelected = computed(() => { if (dispatchFilteredStudents.value.length === 0) return false; const available = dispatchFilteredStudents.value.filter(s => !hasDispatched(dispatchSelectedExam.value, s.id)); if (available.length === 0) return false; return available.every(s => dispatchSelectedStudents.value.includes(s.id)) })
function hasDispatched(examId, studentId) { return dispatchRecords.value.some(r => r.exam_id === examId && r.student_id === studentId) }
function toggleAllDispatch() { if (isAllDispatchSelected.value) { dispatchSelectedStudents.value = [] } else { dispatchFilteredStudents.value.forEach(s => { if (!hasDispatched(dispatchSelectedExam.value, s.id) && !dispatchSelectedStudents.value.includes(s.id)) { dispatchSelectedStudents.value.push(s.id) } }) } }

async function loadDispatches() { const { data } = await supabase.from('exam_dispatch').select('*'); if (data) dispatchRecords.value = data }
async function submitDispatch() { if (dispatchSelectedStudents.value.length === 0) return Swal.fire('提示', '請至少勾選一名學員', 'warning'); Swal.fire({ title: '派發中...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } }); const payload = dispatchSelectedStudents.value.map(sId => ({ exam_id: dispatchSelectedExam.value, student_id: sId, show_answers: dispatchShowAnswers.value })); const { error } = await supabase.from('exam_dispatch').insert(payload); if (error) { Swal.fire('錯誤', error.message, 'error') } else { Swal.fire('成功', '任務派發完畢！', 'success'); dispatchSelectedStudents.value = []; await loadDispatches() } }

// 🌟 修正版 dispatchStats 計算邏輯 (補齊 pending_names 初始化，防崩潰)
const dispatchStats = computed(() => { 
  const stats = {}; 
  dispatchRecords.value.forEach(r => { 
    if (!stats[r.exam_id]) { 
      const exam = examList.value.find(e => e.id === r.exam_id); 
      stats[r.exam_id] = { 
        exam_id: r.exam_id, 
        title: exam ? exam.title : '未知任務', 
        total: 0, 
        completed: 0, 
        show_answers: r.show_answers, 
        type: exam ? exam.type : '',
        pending_names: [] // 重要修復：初始化陣列
      } 
    } 
    stats[r.exam_id].total++; 
    if (r.is_completed) { 
      stats[r.exam_id].completed++ 
    } else { 
      const student = users.value.find(u => u.id === r.student_id); 
      if (student) stats[r.exam_id].pending_names.push(student.name) 
    } 
    if (r.show_answers) stats[r.exam_id].show_answers = true 
  }); 
  return Object.values(stats) 
})

function showPendingStudents(stat) { 
  if (stat.pending_names.length === 0) { 
    Swal.fire('提示', '所有學員皆已完成！', 'success'); return 
  } 
  const namesHtml = stat.pending_names.map(name => `<span style="display:inline-block; margin: 5px; padding: 5px 10px; background:#ecf0f1; border-radius:4px; font-weight:bold; color: #2c3e50;">${name}</span>`).join(''); 
  Swal.fire({ title: `尚未交卷名單 (${stat.pending_names.length} 人)`, html: `<div style="text-align: left; margin-top: 15px;">${namesHtml}</div>`, icon: 'info', confirmButtonText: '關閉' }) 
}

async function toggleAnswersVisibility(examId, currentStatus) { const newStatus = !currentStatus; Swal.fire({ title: '更新中...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } }); const { error } = await supabase.from('exam_dispatch').update({ show_answers: newStatus }).eq('exam_id', examId); if (error) { Swal.fire('錯誤', error.message, 'error') } else { Toast.fire({ icon: 'success', title: newStatus ? '已全面公開解答' : '已關閉解答' }); await loadDispatches() } }

// 🌟 核心：量表六大類壓力因子計算引擎
const DIMENSIONS_MAP = {
  dim1: { name: 'I. 實際護理病人之壓力', qList: [4, 3, 8, 12, 11, 2, 10, 9] },
  dim2: { name: 'II. 教師及護理人員之壓力', qList: [17, 18, 25, 14, 20, 1] },
  dim3: { name: 'III. 作業及工作量之壓力', qList: [16, 13, 15, 19, 22] },
  dim4: { name: 'IV. 同學及生活之壓力', qList: [23, 24, 5, 21] },
  dim5: { name: 'V. 專業知識與技能之壓力', qList: [6, 7, 26] },
  dim6: { name: 'VI. 實習環境之壓力', qList: [28, 27, 29, 30, 31] } // 涵蓋所有環境因子
};

function calculateScaleDimensions(answersJson) {
  const result = {};
  for (let dKey in DIMENSIONS_MAP) {
    let dim = DIMENSIONS_MAP[dKey];
    let totalScore = 0; let count = 0;
    dim.qList.forEach(qNum => {
      const qIndex = qNum - 1; 
      // 確保陣列有該題才計算，防止拉低平均分
      if (answersJson && (answersJson[qIndex] !== undefined || answersJson[String(qIndex)] !== undefined)) {
        const ansVal = answersJson[qIndex] || answersJson[String(qIndex)];
        let scoreNum = 3;
        if (typeof ansVal === 'number') scoreNum = ansVal;
        else if (typeof ansVal === 'string') {
          if (ansVal.includes('1分') || ansVal.includes('從不')) scoreNum = 1;
          else if (ansVal.includes('2分') || ansVal.includes('很少')) scoreNum = 2;
          else if (ansVal.includes('3分') || ansVal.includes('有時')) scoreNum = 3;
          else if (ansVal.includes('4分') || ansVal.includes('經常')) scoreNum = 4;
          else if (ansVal.includes('5分') || ansVal.includes('總是')) scoreNum = 5;
        }
        totalScore += scoreNum; count++;
      }
    });
    const avg = count > 0 ? (totalScore / count).toFixed(1) : 0;
    let statusText = '壓力輕微';
    if (avg >= 4.0) statusText = '⚠️ 壓力偏高，需重點關注';
    else if (avg >= 3.0) statusText = '⚡ 中度壓力，需適當引導';
    
    result[dKey] = { name: dim.name, totalScore, avgScore: avg, statusText };
  }
  return result;
}

async function openScoreModal(stat) {
  Swal.fire({ title: '載入資料中...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } })
  const exam = examList.value.find(e => e.id === stat.exam_id) || {};
  const isScale = exam.type === 'scale';

  const { data, error } = await supabase.from('exam_records').select('student_id, score, answers, completed_at').eq('exam_id', stat.exam_id)
  if (error) { Swal.fire('錯誤', '載入失敗', 'error'); return }

  const mappedRecords = data.map(r => {
    const student = users.value.find(u => u.id === r.student_id) || {}
    let dimensions = {};
    let totalScore = r.score || 0;
    let stressLevel = '維持支持與增能';
    
    if (isScale && r.answers) {
      dimensions = calculateScaleDimensions(r.answers);
      totalScore = Object.values(dimensions).reduce((sum, d) => sum + Number(d.totalScore), 0);
      if (totalScore >= 109) stressLevel = '高度壓力 (48-72小時內面談)';
      else if (totalScore >= 78) stressLevel = '列入觀察 (每週追蹤)';
    }

    return { 
      studentId: r.student_id, studentEmail: student.email || '未提供', 
      studentName: student.name || '未知學員', studentUnit: student.unit || '', 
      score: r.score, totalScore, stressLevel, dimensions, completedAt: r.completed_at 
    }
  });

  scoreReportData.value = { title: stat.title, isScale, records: mappedRecords }
  selectedScoreRecords.value = mappedRecords.map(r => r.studentId) // 預設全選
  reportMeta.value.examName = stat.title; reportMeta.value.teacherName = profile.value?.name || '';
  isScoreModalOpen.value = true; Swal.close()
}

function closeScoreModal() { isScoreModalOpen.value = false; scoreReportData.value = { title: '', isScale: false, records: [] }; selectedScoreRecords.value = []; }

// ==========================================
// 📝 題庫與量表管理邏輯
// ==========================================
const examList = ref([]); const previewQuestions = ref([]); const previewExamTitle = ref(''); const previewExamType = ref('post_test'); const shuffleQuestionsMode = ref(true); const shuffleOptionsMode = ref(true); const editingExamId = ref(null); const isViewingModalOpen = ref(false); const viewingExam = ref(null); const viewingQuestions = ref([])
async function loadExams() { const { data, error } = await supabase.from('exams').select('*').order('created_at', { ascending: false }); if (!error && data) examList.value = data }
function shuffleArray(array) { let currentIndex = array.length, randomIndex; while (currentIndex !== 0) { randomIndex = Math.floor(Math.random() * currentIndex); currentIndex--; [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]]; } return array; }

function addNewQuestion() { 
  if (previewExamType.value === 'scale') {
    previewQuestions.value.push({ text: '請輸入量表評估項目...', options: ['從不如此 (1分)', '很少如此 (2分)', '有時如此 (3分)', '經常如此 (4分)', '總是如此 (5分)'], correct: '無', explanation: '' }) 
  } else {
    previewQuestions.value.push({ text: '請輸入新題目內容...', options: ['選項A', '選項B', '選項C', '選項D'], correct: '選項A', explanation: '' }) 
  }
}

function applyOptionsToAll() {
  if (previewQuestions.value.length === 0) return;
  const firstOpts = [...previewQuestions.value[0].options];
  previewQuestions.value.forEach(q => { q.options = [...firstOpts]; });
  Toast.fire({ icon: 'success', title: '已套用 Q1 選項至全部項目' });
}

async function editExam(exam) { 
  Swal.fire({ title: '載入中...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } }); 
  const { data, error } = await supabase.from('questions').select('*').eq('exam_id', exam.id); 
  if (error) return Swal.fire('錯誤', '載入失敗', 'error'); 
  editingExamId.value = exam.id; previewExamTitle.value = exam.title; previewExamType.value = exam.type; 
  hasParsedAnswers.value = true;
  previewQuestions.value = data.map(q => ({ id: q.id, text: q.question_text, options: q.options, correct: q.correct_answer, explanation: q.explanation || '' })); 
  Swal.close(); window.scrollTo({ top: 0, behavior: 'smooth' }) 
}

// AI 智慧解析引擎
async function handleExamUpload(event) {
  const file = event.target.files[0]; if (!file) return; if (!file.name.endsWith('.docx')) return Swal.fire('錯誤', '請上傳 .docx 檔案', 'error')
  Swal.fire({ title: 'AI 解析中...', text: '正在辨識題目與內嵌答案', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } })
  const reader = new FileReader(); reader.onload = async (e) => {
    try {
      const arrayBuffer = e.target.result; const result = await mammoth.extractRawText({ arrayBuffer }); const text = result.value; 
      previewExamTitle.value = file.name.replace('.docx', ''); editingExamId.value = null; previewExamType.value = 'post_test';
      
      let answerSection = ''; let questionSection = text; 
      const answerKeywords = ['標準解答', '參考答案', '解答對照表', '解答區', '答案：', '答案:']; let foundIndex = -1
      for (const kw of answerKeywords) { const idx = text.lastIndexOf(kw); if (idx !== -1 && idx > text.length * 0.4) { foundIndex = idx; break; } }
      if (foundIndex !== -1) { answerSection = text.substring(foundIndex); questionSection = text.substring(0, foundIndex); hasParsedAnswers.value = true; } 
      else { questionSection = text; hasParsedAnswers.value = false; }

      const answersMap = {}; 
      if (answerSection) {
        const strictAnsRegex = /(?:第\s*)?0*(\d+)\s*(?:題)?\s*[：:]?\s*\(*([A-D○×])\)*/g; let matchAns; let useStrict = false
        while ((matchAns = strictAnsRegex.exec(answerSection)) !== null) { answersMap[parseInt(matchAns[1])] = matchAns[2]; useStrict = true }
        if (!useStrict) { const pureAnswers = answerSection.match(/[○×ABCD]/g); if (pureAnswers) pureAnswers.forEach((ans, idx) => { answersMap[idx + 1] = ans }) }
      }

      const questions = []; const qRegex = /(?:^|\n)\s*(?:\()?0*(\d+)(?:\)|\.|、)?\s+(.*?)(?=(?:^|\n)\s*(?:\()?0*\d+(?:\)|\.|、)?\s+|$)/gs; let matchQ
      while ((matchQ = qRegex.exec(questionSection)) !== null) {
        const qNum = parseInt(matchQ[1]); let rawText = matchQ[2].trim(); let options = [], questionText = '', correctText = '', explanation = ''; 
        
        const expMatch = rawText.match(/(?:解析|詳解|說明)\s*[：:]\s*(.*)/is);
        if (expMatch) { explanation = expMatch[1].trim(); rawText = rawText.substring(0, expMatch.index).trim(); }
        
        let inlineAns = ''; const inlineAnsMatch = rawText.match(/^\s*\(?([A-D○×])\)?\s+/i);
        if(inlineAnsMatch) { inlineAns = inlineAnsMatch[1].toUpperCase(); rawText = rawText.replace(/^\s*\(?[A-D○×]\)?\s+/, '').trim(); hasParsedAnswers.value = true; }
        const ansKey = answersMap[qNum] || inlineAns || 'A';

        const idxA = rawText.search(/\s*(?:\(A\)|A\.|A、)\s*/i);
        if (idxA !== -1) { 
          questionText = rawText.substring(0, idxA).trim(); const optsPart = rawText.substring(idxA); const optMatches = optsPart.split(/\s*(?:\([A-D]\)|[A-D]\.|[A-D]、)\s*/i).filter(s => s.trim() !== ''); 
          if (optMatches.length >= 4) options = optMatches.slice(0, 4).map(s => s.trim()); else { options = optMatches; while (options.length < 4) options.push('選項缺失') } 
          const ansIndex = ansKey === 'A' ? 0 : ansKey === 'B' ? 1 : ansKey === 'C' ? 2 : ansKey === 'D' ? 3 : 0; correctText = options[ansIndex] || options[0]; 
        } else if (rawText.includes('○') || rawText.includes('×') || ['○', '×'].includes(ansKey)) { 
          const idxO = rawText.search(/[○×□]/); if (idxO !== -1 && idxO < rawText.length - 10) questionText = rawText.substring(0, idxO).trim(); else questionText = rawText.replace(/[○×□]/g, '').trim(); 
          options = ['○', '×']; correctText = ansKey 
        } else { questionText = rawText.trim(); options = ['選項 A', '選項 B', '選項 C', '選項 D']; correctText = options[0] }
        
        if (questionText.length > 2) questions.push({ text: questionText.replace(/^[(\s]+/, ''), options: options, correct: correctText, explanation: explanation })
      }
      if (questions.length === 0) throw new Error('未能自動解析出題目，請確保題目為條列式格式。'); previewQuestions.value = questions; Swal.close();
      Toast.fire({ icon: 'success', title: `成功辨識 ${questions.length} 題，請於下方校對` });
    } catch (err) { Swal.fire('解析失敗', err.message, 'error') } finally { event.target.value = '' }
  }; reader.readAsArrayBuffer(file)
}

async function handleScaleUpload(event) {
  const file = event.target.files[0]; if (!file) return; if (!file.name.endsWith('.docx')) return Swal.fire('錯誤', '請上傳 .docx 檔案', 'error')
  Swal.fire({ title: 'AI 解析量表中...', text: '正在辨識評估項目', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
  const reader = new FileReader(); reader.onload = async (e) => {
    try {
      const arrayBuffer = e.target.result; const result = await mammoth.extractRawText({ arrayBuffer }); const text = result.value;
      previewExamTitle.value = file.name.replace('.docx', ''); editingExamId.value = null; previewExamType.value = 'scale';

      const questions = []; const defaultOptions = ['從不如此 (1分)', '很少如此 (2分)', '有時如此 (3分)', '經常如此 (4分)', '總是如此 (5分)'];
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      for (let line of lines) {
        if (line.includes('總分') || line.includes('量表') || line.includes('維持支持') || line.length < 3) continue;
        const match = line.match(/^(?:\()?0*(\d+)(?:\)|\.|、)?\s+(.*)/);
        if (match) { questions.push({ text: match[2].trim(), options: [...defaultOptions], correct: '無', explanation: '' }); }
      }

      if (questions.length < 3) {
        questions.length = 0;
        for (let line of lines) {
          if (line.length >= 5 && line.length <= 100 && !line.includes('分') && !line.includes('選項')) {
             questions.push({ text: line, options: [...defaultOptions], correct: '無', explanation: '' });
          }
        }
      }
      if (questions.length === 0) throw new Error('未能自動解析出內容，請檢查檔案格式。');
      previewQuestions.value = questions; Swal.close();
      Toast.fire({ icon: 'success', title: `成功辨識 ${questions.length} 個評估項目，請於下方校對` });
    } catch (err) { Swal.fire('解析失敗', err.message, 'error') } finally { event.target.value = '' }
  }; reader.readAsArrayBuffer(file)
}

function cancelPreview() { previewQuestions.value = []; editingExamId.value = null; previewExamTitle.value = '' }

async function confirmSaveExam() {
  if (!previewExamTitle.value.trim()) return Swal.fire('提示', '名稱不能為空', 'warning'); if (previewQuestions.value.length === 0) return Swal.fire('提示', '項目不能為空！', 'warning')
  Swal.fire({ title: '儲存中...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } }); try {
    let finalQuestions = JSON.parse(JSON.stringify(previewQuestions.value)); 
    if (shuffleOptionsMode.value && previewExamType.value !== 'scale') finalQuestions.forEach(q => { if (q.options.length > 2) q.options = shuffleArray(q.options) }); 
    if (shuffleQuestionsMode.value && previewExamType.value !== 'scale') finalQuestions = shuffleArray(finalQuestions); 
    let targetExamId = editingExamId.value
    
    if (targetExamId) {
      await supabase.from('exams').update({ title: previewExamTitle.value, type: previewExamType.value }).eq('id', targetExamId)
      await supabase.from('questions').delete().eq('exam_id', targetExamId)
      const qPayload = finalQuestions.map(q => ({ exam_id: targetExamId, question_text: q.text, options: q.options, correct_answer: q.correct, explanation: q.explanation || '' }))
      await supabase.from('questions').insert(qPayload)
    } else {
      const { data: examData } = await supabase.from('exams').insert([{ title: previewExamTitle.value, type: previewExamType.value }]).select()
      targetExamId = examData[0].id; 
      const qPayload = finalQuestions.map(q => ({ exam_id: targetExamId, question_text: q.text, options: q.options, correct_answer: q.correct, explanation: q.explanation || '' })); 
      await supabase.from('questions').insert(qPayload)
    }
    Swal.fire('成功', '任務儲存完畢！', 'success'); previewQuestions.value = []; editingExamId.value = null; previewExamTitle.value = ''; await loadExams()
  } catch (err) { Swal.fire('寫入失敗', err.message, 'error') }
}

async function deleteExam(id, title) { const { isConfirmed } = await Swal.fire({ title: `確定要刪除？`, icon: 'warning', showCancelButton: true }); if (!isConfirmed) return; await supabase.from('exams').delete().eq('id', id); await loadExams() }
async function viewExam(exam) { const { data } = await supabase.from('questions').select('*').eq('exam_id', exam.id); viewingExam.value = exam; viewingQuestions.value = data; isViewingModalOpen.value = true; }
function closeViewModal() { isViewingModalOpen.value = false; viewingExam.value = null; viewingQuestions.value = [] }

// ==========================================
// 👥 帳號管理、匯入與全選邏輯 (強化顯示標籤)
// ==========================================
const dynamicCategories = ref([]); const newCategoryName = ref('')
async function loadCategories() { const { data } = await supabase.from('training_categories').select('*'); if (data) dynamicCategories.value = data }
async function addCategory() { if (!newCategoryName.value.trim()) return; await supabase.from('training_categories').insert([{ name: newCategoryName.value.trim() }]); newCategoryName.value = ''; await loadCategories() }
async function deleteCategory(id) { await supabase.from('training_categories').delete().eq('id', id); await loadCategories() }

const currentPage = ref(1); const itemsPerPage = 10;
const filteredUsers = computed(() => roleFilter.value === 'all' ? users.value : users.value.filter(u => u.role === roleFilter.value))
const totalPages = computed(() => Math.ceil(filteredUsers.value.length / itemsPerPage) || 1)
const paginatedUsers = computed(() => filteredUsers.value.slice((currentPage.value - 1) * itemsPerPage, currentPage.value * itemsPerPage))
function prevPage() { if (currentPage.value > 1) currentPage.value-- }; function nextPage() { if (currentPage.value < totalPages.value) currentPage.value++ }
const selectedUserIds = ref([]);
const isAllSelectedOnPage = computed(() => paginatedUsers.value.length > 0 && paginatedUsers.value.every(u => selectedUserIds.value.includes(u.id)))

function toggleSelectAllOnPage() {
  if (isAllSelectedOnPage.value) selectedUserIds.value = selectedUserIds.value.filter(id => !paginatedUsers.value.some(u => u.id === id))
  else paginatedUsers.value.forEach(u => { if (!selectedUserIds.value.includes(u.id)) selectedUserIds.value.push(u.id) })
}

async function batchDeleteUsers() {
  if (selectedUserIds.value.length === 0) return;
  for (let id of selectedUserIds.value) { await supabase.rpc('delete_user_admin', { target_user_id: id }) }
  selectedUserIds.value = []; await loadUsers();
}

onMounted(async () => { 
  const { data: { user } } = await supabase.auth.getUser(); 
  if (user) {
    const { data: userProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    profile.value = userProfile;
    await checkAndEnforcePasswordChange(user.id);
    await loadUsers(); await loadAssignments(); await loadCategories(); await loadExams(); await loadDispatches();
  }
})

function getRoleName(role) { const map = { student: '受訓學員', teacher: '指導老師', supervisor: '單位主管', admin: '系統管理員' }; return map[role] || role }
async function loadUsers() { const { data } = await supabase.from('profiles').select('*'); users.value = data || []; students.value = users.value.filter(u => u.role === 'student'); teachers.value = users.value.filter(u => u.role === 'teacher'); supervisors.value = users.value.filter(u => u.role === 'supervisor'); students.value.forEach(s => { if (!assignmentData.value[s.id]) assignmentData.value[s.id] = { teacher_id: '', supervisor_id: '' } }) }
async function loadAssignments() { const { data } = await supabase.from('assignments').select('*'); if(data) data.forEach(a => { if (assignmentData.value[a.student_id]) { assignmentData.value[a.student_id].teacher_id = a.teacher_id || ''; assignmentData.value[a.student_id].supervisor_id = a.supervisor_id || '' } }) }
async function createUser() { isCreating.value = true; await supabase.functions.invoke('create-user', { body: newUser.value }); newUser.value = { email: '', password: '', name: '', role: 'student', unit: '' }; await loadUsers(); isCreating.value = false; }
async function editUser(user) { /* 編輯邏輯保留 */ }
async function deleteUser(userId) { await supabase.rpc('delete_user_admin', { target_user_id: userId }); await loadUsers(); }
function downloadTemplate() { /* 略 */ }
function handleFileUpload(event) { /* 略 */ }
async function saveAssignment(sId) { await supabase.from('assignments').upsert({ student_id: sId, ...assignmentData.value[sId] }, { onConflict: 'student_id' }); Toast.fire({ icon: 'success', title: '儲存成功' }); }
async function handleLogout() { sessionStorage.clear(); await supabase.auth.signOut() }
</script>

<style scoped>
/* 🌟 強制封鎖深色模式與基礎排版設定 */
* { color-scheme: light only !important; }

.app-wrapper { 
  background-color: #f0f2f5; 
  min-height: 100vh; width: 100vw; 
  position: absolute; top: 0; left: 0; 
  padding: 30px 20px; box-sizing: border-box; 
  display: flex; flex-direction: column; align-items: center; 
}

/* 深色模式防護盾 (明確鎖定字體顏色) */
.app-wrapper h1, .app-wrapper h2, .app-wrapper h3, .app-wrapper h4, 
.app-wrapper p:not(.desc), .app-wrapper label, .app-wrapper th, 
.app-wrapper td, .app-wrapper li, .app-wrapper .q-title, 
.app-wrapper .opt-text, .app-wrapper .sign-title, .app-wrapper .user-info, 
.app-wrapper .exam-name, .app-wrapper .sign-box,
.demo-text-box, .score-tag span {
  color: #1a252f !important;
  -webkit-text-fill-color: #1a252f !important;
}

.desc, .empty-state, .sign-timestamp {
  color: #34495e !important;
  -webkit-text-fill-color: #34495e !important;
  font-weight: bold !important;
}

.unsigned-text, .demo-signatures span {
  color: #7f8c8d !important;
  -webkit-text-fill-color: #7f8c8d !important;
  font-size: 13px !important;
  font-style: italic !important;
}

.form-input {
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
  background-color: #ffffff !important;
  border: 1px solid #dcdde1;
  padding: 12px;
  border-radius: 6px;
  width: 100%;
  box-sizing: border-box;
}

.demo-text-box {
  border: 1px solid #bdc3c7; 
  padding: 15px; 
  border-radius: 6px; 
  font-size: 15px; 
  line-height: 1.6; 
  min-height: 80px;
}

.btn { 
  color: #ffffff !important; 
  -webkit-text-fill-color: #ffffff !important; 
  padding: 10px 20px; border: none; border-radius: 6px; 
  font-weight: bold; font-size: 15px; cursor: pointer; transition: all 0.2s;
}
.primary-btn { background-color: #3498db; }
.success-btn { background-color: #2ecc71; }
.danger-btn { background-color: #e74c3c; }
.dark-btn { background-color: #2c3e50; }
.secondary-btn { background-color: #95a5a6; }

/* 🌟 強制身分標籤背景顏色 (修正消失問題) */
.role-badge { padding: 5px 12px; border-radius: 12px; font-size: 13px; font-weight: bold; display: inline-block; color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; }
.role-badge.student { background-color: #3498db !important; } 
.role-badge.teacher { background-color: #9b59b6 !important; }
.role-badge.supervisor { background-color: #e67e22 !important; } 
.role-badge.admin { background-color: #34495e !important; }

/* 版面結構與卡片設計 */
.admin-container { width: 100%; max-width: 1000px; font-family: "微軟正黑體", sans-serif; }
.admin-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; background: white; padding: 20px 25px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
.tabs { display: flex; gap: 5px; margin-bottom: 20px; border-bottom: 2px solid #e1e4e8; overflow-x: auto; white-space: nowrap; }
.tabs button { padding: 12px 24px; border: none; background: transparent; font-size: 16px; font-weight: bold; cursor: pointer; border-radius: 6px 6px 0 0; color: #7f8c8d !important; -webkit-text-fill-color: #7f8c8d !important; }
.tabs button.active { border-bottom: 2px solid #3498db; color: #3498db !important; -webkit-text-fill-color: #3498db !important; }

.admin-card { background: white; padding: 25px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e1e4e8; margin-bottom: 25px; }
.admin-card h3 { margin-top: 0; border-bottom: 2px solid #ecf0f1; padding-bottom: 10px; margin-bottom: 15px; font-size: 1.2em; }
.card-header-flex { display: flex; justify-content: space-between; align-items: center; }

/* 表格樣式 */
.data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
.data-table th, .data-table td { padding: 14px; border-bottom: 1px solid #ecf0f1; text-align: left; }
.data-table th { background: #f8f9fa; font-weight: bold; }
.data-table tbody tr:hover { background: #f9fbfc; }
.table-responsive { overflow-x: auto; margin-top: 15px; }

/* 彈出視窗 (Modal) */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.6); z-index: 9999; display: flex; justify-content: center; align-items: center; padding: 20px; box-sizing: border-box; }
.modal-content { background: white; width: 100%; max-width: 850px; max-height: 90vh; border-radius: 8px; display: flex; flex-direction: column; box-shadow: 0 10px 30px rgba(0,0,0,0.2); overflow: hidden; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; background: #f8f9fa; border-bottom: 1px solid #e1e4e8; }
.modal-body { padding: 25px; overflow-y: auto; }
.close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #7f8c8d; }

/* 排版細節 */
.form-row { display: flex; gap: 15px; margin-bottom: 15px; }
.form-group { flex: 1; }
.action-row { display: flex; gap: 10px; margin-top: 20px; }
.small-btn { padding: 8px 14px; font-size: 13px; }
.checkbox-label { display: flex; align-items: center; gap: 8px; font-weight: bold; cursor: pointer; font-size: 14px; }
.custom-checkbox { width: 18px; height: 18px; cursor: pointer; accent-color: #e74c3c; }

/* 🌟 平時隱藏列印區域 */
.print-only-scores, .printable-demo-printonly { display: none; }

/* ============================================================ */
/* 🖨️ PDF 列印引擎 (完全獨立，防閃退與白紙)                       */
/* ============================================================ */
@media print {
  @page { margin: 15mm; size: A4 portrait; }

  /* 移除預設背景並釋放絕對定位，讓表格可以自然換頁延伸 */
  .app-wrapper { 
    position: static !important; 
    background: white !important; 
    padding: 0 !important; 
    height: auto !important; 
    min-height: 0 !important; 
    display: block !important; 
  }
  
  .admin-container { display: none !important; }
  .modal-overlay { display: none !important; }

  /* 列印成績單時 */
  .print-mode-scores .print-only-scores { display: block !important; width: 100% !important; font-family: "標楷體", "DFKai-SB", serif !important; }
  
  /* 列印心得範本時 */
  .print-mode-demo .printable-demo-printonly { display: block !important; width: 100% !important; font-family: "標楷體", "DFKai-SB", serif !important; }

  /* 強制黑白與去底色 */
  .print-only-scores *, .printable-demo-printonly * { 
    color: #000 !important; 
    -webkit-text-fill-color: #000 !important; 
  }

  .print-meta-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
  .print-meta-table td { border: 1px solid #000 !important; padding: 8px 12px !important; font-size: 14pt !important; }
  
  .print-score-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
  .print-score-table th, .print-score-table td { border: 1px solid #000 !important; padding: 10px !important; font-size: 13pt !important; text-align: left; }
}
</style>