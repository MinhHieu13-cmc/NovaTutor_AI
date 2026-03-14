# NovaTutor AI - Tài liệu kỹ thuật chức năng hiện tại (QA/Dev)

Cập nhật: 2026-03-13  
Đối tượng: QA, Dev, Tech Lead

> Ghi chú: các JSON dưới đây là **mẫu expected response** dựa trên contract hiện tại, giá trị thực tế phụ thuộc dữ liệu.

---

## 1) Phạm vi module hiện có

### Frontend
- `Home`, `Auth`, `Student Dashboard`, `Teacher Dashboard`, `AI Lab`, `Adaptive Quiz`.
- `Teacher Copilot` đã có Edit/Preview markdown.
- Badge grounding: `Grounded by course docs (N)` khi backend trả metadata grounded.

### Backend
- Auth/Course/RAG API hoạt động theo `/api/v1/*`.
- Learning API:
  - Adaptive quiz + submit + progress + at-risk.
  - Teacher copilot 3 endpoint.
  - Teacher stats endpoint.

---

## 2) Matrix endpoint quan trọng (Learning)

## 2.1 Adaptive Quiz

### `POST /api/v1/learning/quiz/generate`
Mục đích: Sinh quiz theo course/topic/session goal.

Request mẫu:
```json
{
  "course_id": "course-123",
  "topic": "Linear equations",
  "session_goal": "Master linear equations",
  "question_count": 5
}
```

Response `200` mẫu:
```json
{
  "quiz_id": "b6db5e1d-8c13-4b67-9e2f-8db7f2f2d1f1",
  "topic": "Linear equations",
  "topic_source": "manual",
  "difficulty": "medium",
  "difficulty_reason": "Balanced challenge based on current mastery",
  "question_source": "teacher_bank",
  "questions": [
    {
      "id": "q1",
      "question": "How would you apply Linear equations to solve a practical task?",
      "options": ["...", "...", "...", "..."]
    }
  ]
}
```

Response lỗi thường gặp:
- `403`: role không phải student
- `404`: course không tồn tại
- `503`: lỗi DB

Giá trị `question_source`:
- `teacher_bank`: dùng hoàn toàn từ ngân hàng câu hỏi giảng viên
- `hybrid`: kết hợp ngân hàng giảng viên + adaptive template
- `adaptive_template`: chỉ dùng template adaptive hiện có

### `POST /api/v1/learning/quiz/submit`
Mục đích: Nộp đáp án, chấm điểm, cập nhật mastery.

Request mẫu:
```json
{
  "quiz_id": "b6db5e1d-8c13-4b67-9e2f-8db7f2f2d1f1",
  "answers": [1, 0, 3, 2, 1]
}
```

Response `200` mẫu:
```json
{
  "quiz_id": "b6db5e1d-8c13-4b67-9e2f-8db7f2f2d1f1",
  "topic": "Linear equations",
  "score": 80.0,
  "correct_count": 4,
  "total_questions": 5,
  "mastery_score": 73.5
}
```

---

## 2.2 Analytics

### `GET /api/v1/learning/student/progress?course_id=<id>`
Response `200` mẫu:
```json
{
  "streak_days": 3,
  "weak_topics": ["Fractions", "Algebra"],
  "next_suggestion": "Focus on Fractions with one 10-minute practice session today.",
  "weekly_scores": [
    { "week_label": "10/03", "score": 72.5 },
    { "week_label": "17/03", "score": 80.0 }
  ]
}
```

### `GET /api/v1/learning/teacher/at-risk?course_id=<id>`
Response `200` mẫu:
```json
{
  "students": [
    {
      "student_id": "stu-1",
      "student_name": "Nguyen Van A",
      "course_id": "course-123",
      "course_name": "Math Basics",
      "avg_score_21d": 52.0,
      "last_activity_at": "2026-03-13T09:00:00+00:00",
      "weak_topic": "Fractions",
      "risk_level": "high",
      "reason": "Average quiz score in 21 days is below 55"
    }
  ]
}
```

### `GET /api/v1/learning/teacher/stats`
Response `200` mẫu:
```json
{
  "total_courses": 2,
  "total_students": 35,
  "courses": [
    { "course_id": "course-123", "course_name": "Math Basics", "student_count": 20 },
    { "course_id": "course-456", "course_name": "Physics Intro", "student_count": 15 }
  ]
}
```

---

## 2.3 Teacher Copilot

### `POST /api/v1/learning/teacher/generate-lesson-outline`
Response `200` mẫu:
```json
{
  "chapter_title": "Introduction to Neural Networks",
  "outline": "## Introduction to Neural Networks\n...",
  "estimated_duration_min": 60,
  "grounded_by_docs": true,
  "context_chunk_count": 4
}
```

### `POST /api/v1/learning/teacher/generate-quiz-content`
Response `200` mẫu:
```json
{
  "topic": "Gradient Descent",
  "difficulty": "medium",
  "question_count": 5,
  "quiz_content": "## Quiz: Gradient Descent (Medium)\n...",
  "grounded_by_docs": true,
  "context_chunk_count": 2
}
```

### `POST /api/v1/learning/teacher/generate-announcement`
Response `200` mẫu:
```json
{
  "subject": "Exam Reminder",
  "tone": "friendly",
  "announcement": "## 📢 Exam Reminder\n...",
  "grounded_by_docs": true,
  "context_chunk_count": 1
}
```

Response lỗi quan trọng (3 endpoint copilot):
- `403`: không phải teacher hoặc teacher không sở hữu `course_id`
  - detail kỳ vọng: `You do not own this course`
- `503`: thiếu Gemini API key
- `502`: Gemini API trả lỗi

### `POST /api/v1/learning/teacher/quiz-bank/publish`
Mục đích: nhận markdown quiz đã chỉnh sửa trong AI Copilot và lưu vào ngân hàng câu hỏi của khóa học.

Request mẫu:
```json
{
  "course_id": "course-123",
  "topic": "Linear equations",
  "difficulty": "medium",
  "quiz_content": "## Quiz: Linear equations (Medium)\n..."
}
```

Response `200` mẫu:
```json
{
  "course_id": "course-123",
  "topic": "Linear equations",
  "difficulty": "medium",
  "saved_question_count": 5,
  "message": "Quiz bank published successfully"
}
```

Response lỗi thường gặp:
- `400`: markdown không parse được về format Q1/A-D/Answer Key
- `403`: teacher không sở hữu course

### `GET /api/v1/learning/teacher/quiz-bank?course_id=<id>`
Response `200` mẫu:
```json
{
  "items": [
    {
      "id": "bank-1",
      "course_id": "course-123",
      "topic": "Linear equations",
      "difficulty": "medium",
      "question_count": 5,
      "quiz_content": "## Quiz: Linear equations (Medium)\n...",
      "created_at": "2026-03-13T10:00:00+00:00",
      "updated_at": "2026-03-13T10:05:00+00:00"
    }
  ]
}
```

### `PUT /api/v1/learning/teacher/quiz-bank/{bank_id}`
Response `200` mẫu:
```json
{
  "id": "bank-1",
  "course_id": "course-123",
  "topic": "Linear equations advanced",
  "difficulty": "hard",
  "question_count": 5,
  "quiz_content": "## Quiz: Linear equations advanced (Hard)\n...",
  "created_at": "2026-03-13T10:00:00+00:00",
  "updated_at": "2026-03-13T10:15:00+00:00"
}
```

### `DELETE /api/v1/learning/teacher/quiz-bank/{bank_id}`
Response `200` mẫu:
```json
{
  "message": "Quiz bank deleted successfully",
  "id": "bank-1"
}
```

---

## 3) Contract UI quan trọng cần QA

### 3.1 AI Lab / Adaptive Quiz đồng bộ course
- Key localStorage: `novatutor_learning_active_course_{userId}`
- Kỳ vọng:
  - đổi course ở `AI Lab` -> qua `Adaptive Quiz` giữ đúng course
  - đổi ngược ở `Adaptive Quiz` -> quay lại `AI Lab` vẫn đúng

### 3.2 Chat resume source
- Kỳ vọng badge:
  - `Restored from backend` nếu load được từ backend
  - `Restored from local cache` nếu fallback local

### 3.3 Teacher Copilot grounding badge
- Điều kiện hiển thị:
  - `grounded_by_docs === true`
- Text kỳ vọng:
  - `Grounded by course docs (N)`

---

## 4) Smoke test đề xuất (technical)

1. Student tạo quiz + submit -> check `mastery_score` thay đổi.
2. Student dashboard check `weak_topics`, `streak_days`, `weekly_scores`.
3. Teacher at-risk endpoint trả đúng risk level theo dữ liệu seed.
4. Copilot ownership fail:
   - teacher A gọi course teacher B -> `403`.
5. Copilot ownership pass:
   - teacher A gọi course của mình -> `200`.
6. Copilot grounded:
   - course có chunks -> `grounded_by_docs=true`, `context_chunk_count>0`.

---

## 5) Lệnh kiểm tra nhanh

### Frontend build
```powershell
Set-Location "C:\Users\HIEU\PycharmProjects\NovaTutor_AI\frontend"
npm run build
```

### Backend integration test (chạy qua Docker)
```powershell
Set-Location "C:\Users\HIEU\PycharmProjects\NovaTutor_AI"
docker compose build backend
docker compose run --rm backend pytest tests/integration/test_learning_api.py -q
```

---

## 6) Tài liệu liên quan

- `docs/HE_THONG_CHUC_NANG_NGUOI_DUNG_CUOI_VN.md`
- `docs/LOCAL_SMOKE_TEST_CHECKLIST_VN.md`
- `docs/PROJECT_EXECUTION_ROADMAP_VN.md`
- `internal/RECURRING_ERROR_HISTORY_VN.md`

