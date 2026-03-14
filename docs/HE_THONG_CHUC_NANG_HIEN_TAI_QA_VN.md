# NovaTutor AI - Giai dap chuc nang he thong hien tai (FAQ)

> Khuyen nghi su dung ban moi co dau, tach theo doi tuong:
> - `docs/HE_THONG_CHUC_NANG_NGUOI_DUNG_CUOI_VN.md`
> - `docs/HE_THONG_CHUC_NANG_QA_DEV_TECHNICAL_VN.md`

Cap nhat: 2026-03-13
Pham vi: Frontend + Backend dang co trong workspace hien tai

---

## 1) Tong quan he thong dang lam duoc gi?

He thong hien tai la mot web gia su AI gom 2 vai tro chinh:
- Student: hoc voi AI, lam adaptive quiz, theo doi tien bo.
- Teacher: quan ly khoa hoc, tai lieu, theo doi hoc vien, dung AI Copilot tao noi dung.

Cac module chinh dang hoat dong:
- Auth (dang ky, dang nhap, route guard theo role)
- Course management (tao khoa hoc, enroll, upload tai lieu)
- AI Lab (chat + luu/restore hoi thoai)
- Adaptive Quiz (trang rieng)
- Learning analytics (student progress + teacher at-risk)
- Teacher Copilot (lesson outline, quiz draft, announcement)

---

## 2) Home va Auth co gi?

### Home
- Hien giao dien gioi thieu san pham.
- Co dieu huong den dang nhap/dang ky.
- Khi da dang nhap, quay ve home van giu session; co dropdown tai khoan de vao dashboard hoac logout.

### Auth
- Dang ky theo role `student` hoac `teacher`.
- Dang nhap theo token/cookie auth.
- Route guard:
  - Student khong vao duoc route teacher.
  - Teacher khong vao duoc route student.

---

## 3) Student dang dung duoc nhung gi?

### Student Dashboard (`/student`)
- Card tong quan hoc tap.
- My Courses / Recommended / Learning schedule.
- Weak topics + Next suggestion (lay tu analytics API).
- Link nhanh:
  - `AI Lab` (`/ai-chat`)
  - `Adaptive Quiz` (`/adaptive-quiz`)

### AI Lab (`/ai-chat`)
- Chat voi AI tutor (text + voice controls trong UI).
- Session-based learning:
  - Tao session goal
  - Chuyen session
  - Xoa session
- Resume hoi thoai:
  - Uu tien load tu backend
  - Fallback local cache
  - Co badge xac nhan nguon restore
- Hien markdown cho cau tra loi AI.
- Khung history co scroll.

### Adaptive Quiz (`/adaptive-quiz`)
- Tach rieng khoi AI Lab de de tap trung.
- Chon course + topic mode:
  - Auto weak-topic
  - Manual topic
- Tao quiz, nop quiz, nhan score + mastery.
- Dong bo `activeCourseId` voi AI Lab qua localStorage.

---

## 4) Teacher dang dung duoc nhung gi?

### Teacher Dashboard (`/teacher`)
- Quan ly khoa hoc:
  - Tao course
  - Chon/sua/xoa course
  - Upload PDF tai lieu
- Analytics:
  - At-risk students
  - So lieu tong quan teacher stats (total courses/students)

### Teacher Copilot (`AI Copilot` tab)
Co 3 cong cu:
1. Generate lesson outline
2. Generate quiz draft
3. Generate announcement

Cac diem da cai thien:
- Ownership guard theo course: teacher chi duoc dung copilot cho course minh so huu.
- Ket qua copilot co the edit truc tiep (khong con read-only).
- Co toggle `Edit Markdown` / `Preview`.
- Quick Action tu dashboard co the auto-fill course vao Copilot.
- Neu prompt co context tu tai lieu khoa hoc, UI hien badge:
  - `Grounded by course docs (N)`

---

## 5) Learning analytics hien tai tinh nhu the nao?

### Student progress (`/learning/student/progress`)
Tra ve:
- `streak_days`
- `weak_topics`
- `next_suggestion`
- `weekly_scores`

### Teacher at-risk (`/learning/teacher/at-risk`)
Tra ve danh sach hoc vien co rui ro theo nguong diem/hoat dong.

### Adaptive scoring
- Quiz submit xong se cap nhat `topic_mastery`.
- Mastery dung cong thuc weighted (giu lich su + diem moi).

---

## 6) API chinh dang dung

### Auth / Course / RAG
- `POST /api/v1/auth/*`
- `GET|POST /api/v1/courses/*`
- `POST /api/v1/rag/chat`
- `GET /api/v1/rag/*` (health, sessions, conversation...)

### Learning
- `POST /api/v1/learning/quiz/generate`
- `POST /api/v1/learning/quiz/submit`
- `GET /api/v1/learning/student/progress`
- `GET /api/v1/learning/teacher/at-risk`
- `GET /api/v1/learning/teacher/stats`
- `POST /api/v1/learning/teacher/generate-lesson-outline`
- `POST /api/v1/learning/teacher/generate-quiz-content`
- `POST /api/v1/learning/teacher/generate-announcement`

---

## 7) Cac cau hoi thuong gap

### Q1. Tai sao AI Lab va Adaptive Quiz tach rieng?
De AI Lab tap trung vao tutoring chat, con quiz la buoc danh gia ket qua hoc.

### Q2. Vi sao vao Adaptive Quiz lai tu chon dung course vua hoc o AI Lab?
Vi he thong dong bo `activeCourseId` qua localStorage theo user.

### Q3. Badge `Grounded by course docs` co y nghia gi?
Nghia la prompt da duoc bo sung context chunks lay tu tai lieu khoa hoc da upload.

### Q4. Teacher co the tao noi dung cho course nguoi khac khong?
Khong. Backend da co ownership check va tra 403 neu course khong thuoc teacher do.

### Q5. Neu backend khong len thi frontend co vao duoc khong?
UI co the vao, nhung cac chuc nang goi API (chat, quiz, analytics, copilot) se loi do khong ket noi duoc backend.

---

## 8) Gioi han hien tai can luu y

- Chat/citation chat luong phu thuoc du lieu tai lieu va pipeline RAG.
- Copilot can review cua teacher truoc khi publish (khong auto publish).
- So lieu 1 so card analytics nang cao van co the dang o muc demo.
- Moi truong local va production can dong bo env de tranh loi runtime.

---

## 9) Huong dan kiem tra nhanh (smoke)

1. Dang nhap student -> vao `AI Lab` -> chat -> reload -> kiem tra resume.
2. Vao `Adaptive Quiz` -> tao quiz -> submit -> quay lai dashboard xem weak topics.
3. Dang nhap teacher -> tao course -> upload PDF.
4. Vao `AI Copilot` -> tao outline/quiz/announcement.
5. Kiem tra badge grounded xuat hien khi course co chunks tu tai lieu.
6. Thu case ownership (teacher khac course) -> API phai tra 403.

---

## 10) Tai lieu lien quan

- `docs/PROJECT_EXECUTION_ROADMAP_VN.md`
- `docs/LOCAL_SMOKE_TEST_CHECKLIST_VN.md`
- `docs/USER_GUIDE_PRE_PHASE4_VN.md`
- `internal/RECURRING_ERROR_HISTORY_VN.md`


