<template>
  <div class="admin-container">
    <div class="header">
      <h2>⚙️ 系統管理員配對後台</h2>
      <button @click="handleLogout" class="btn logout-btn">登出系統</button>
    </div>

    <div v-if="isLoading" class="loading">載入資料中...</div>

    <div v-else class="dashboard-content">
      <p class="description">請為每位學員指派對應的臨床老師與單位主管：</p>
      
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
          <tr v-for="student in students" :key="student.id">
            <td>
              <div class="user-name">{{ student.name || '未填寫姓名' }}</div>
              <div class="user-email">{{ student.email }}</div>
            </td>
            <td>
              <select v-model="assignmentsForm[student.id].teacher_id" class="select-input">
                <option value="">-- 尚未指派 --</option>
                <option v-for="teacher in teachers" :key="teacher.id" :value="teacher.id">
                  {{ teacher.name }} ({{ teacher.email }})
                </option>
              </select>
            </td>
            <td>
              <select v-model="assignmentsForm[student.id].supervisor_id" class="select-input">
                <option value="">-- 尚未指派 --</option>
                <option v-for="supervisor in supervisors" :key="supervisor.id" :value="supervisor.id">
                  {{ supervisor.name }} ({{ supervisor.email }})
                </option>
              </select>
            </td>
            <td>
              <button @click="saveAssignment(student.id)" class="btn save-btn">儲存配對</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../supabase'

const students = ref([])
const teachers = ref([])
const supervisors = ref([])
const assignmentsForm = ref({}) 
const isLoading = ref(true)

onMounted(async () => {
  await loadUsers()
  await loadExistingAssignments()
  isLoading.value = false
})

async function loadUsers() {
  const { data, error } = await supabase.from('profiles').select('*')
  if (error) {
    console.error('載入使用者失敗:', error)
    return
  }

  students.value = data.filter(u => u.role === 'student')
  teachers.value = data.filter(u => u.role === 'teacher')
  supervisors.value = data.filter(u => u.role === 'supervisor')

  students.value.forEach(student => {
    assignmentsForm.value[student.id] = { teacher_id: '', supervisor_id: '' }
  })
}

async function loadExistingAssignments() {
  const { data, error } = await supabase.from('assignments').select('*')
  if (error) return

  data.forEach(assignment => {
    if (assignmentsForm.value[assignment.student_id]) {
      assignmentsForm.value[assignment.student_id].teacher_id = assignment.teacher_id || ''
      assignmentsForm.value[assignment.student_id].supervisor_id = assignment.supervisor_id || ''
    }
  })
}

async function saveAssignment(studentId) {
  const teacherId = assignmentsForm.value[studentId].teacher_id || null
  const supervisorId = assignmentsForm.value[studentId].supervisor_id || null

  const { error } = await supabase.from('assignments').upsert({
    student_id: studentId,
    teacher_id: teacherId,
    supervisor_id: supervisorId
  }, { onConflict: 'student_id' })

  if (error) {
    alert('配對儲存失敗：' + error.message)
  } else {
    alert('配對已成功儲存！')
  }
}

async function handleLogout() {
  await supabase.auth.signOut()
}
</script>

<style scoped>
.admin-container { max-width: 950px; margin: 40px auto; padding: 30px; background: white; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); font-family: "微軟正黑體", sans-serif; }
.header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #34495e; padding-bottom: 15px; margin-bottom: 25px; }
h2 { color: #2c3e50; margin: 0; }
.description { color: #555; margin-bottom: 20px; font-size: 16px; }
.loading { text-align: center; font-size: 18px; color: #7f8c8d; padding: 40px; }

.assignment-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
.assignment-table th, .assignment-table td { border: 1px solid #ddd; padding: 12px; text-align: left; vertical-align: middle; }
.assignment-table th { background-color: #f8f9fa; font-weight: bold; color: #333; }

/* 姓名與信箱排版樣式 */
.user-name { font-size: 16px; font-weight: bold; color: #2c3e50; margin-bottom: 3px; }
.user-email { font-size: 13px; color: #7f8c8d; }

.select-input { width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ccc; font-family: inherit; font-size: 14px; }

.btn { padding: 8px 15px; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; }
.logout-btn { background: #e74c3c; color: white; }
.save-btn { background: #2ecc71; color: white; width: 100%; }
.save-btn:hover { background: #27ae60; }
</style>