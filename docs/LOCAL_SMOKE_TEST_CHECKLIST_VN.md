# NovaTutor AI - Local Smoke Test Checklist (Phase 0)

Muc tieu:
- Chot checklist local de test nhanh toan bo luong chinh.
- Moi testcase co cot PASS/FAIL + ghi chu de truy vet loi.

Phien ban: v1.0
Bat dau su dung: 2026-03-11
Pham vi: Local Docker

---

## 1) Dieu kien truoc khi test
- Da `docker compose up --build -d` thanh cong.
- Da init DB local (neu chay lan dau):

```powershell
Get-Content scripts\init_db.sql | docker exec -i novatutor_db psql -U postgres -d novatutor
```

- Da cau hinh toi thieu trong `.env`:
  - `JWT_SECRET_KEY`
  - `DATABASE_URL` (local)
  - `NEXT_PUBLIC_API_URL` (frontend local)

---

## 2) Lenh kiem tra nhanh truoc smoke test

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:8000/api/v1/health
Invoke-WebRequest -UseBasicParsing http://localhost:3000
```

Neu can xem log:

```powershell
docker compose logs backend -f
docker compose logs frontend -f
```

---

## 3) Checklist smoke test (PASS/FAIL)

| ID | Hang muc test | Buoc thuc hien | Ket qua mong doi | PASS/FAIL | Ghi chu |
|---|---|---|---|-----------|---|
| SMK-001 | Backend Health | GET `/api/v1/health` | 200 + status healthy | PASS      |  |
| SMK-002 | Frontend Home | Mo `http://localhost:3000` | Trang home hien thi | PASS      |  |
| SMK-003 | Auth Register Student | `/auth?mode=register` tao tk student | Tao thanh cong + redirect `/student` | PASS      |  |
| SMK-004 | Auth Register Teacher | `/auth?mode=register` tao tk teacher | Tao thanh cong + redirect `/teacher` | PASS      |  |
| SMK-005 | Auth Login | Dang xuat -> dang nhap lai | Login thanh cong theo role | PASS      |  |
| SMK-006 | Route Guard Student | Dang nhap student, vao `/teacher` | Bi chuyen huong ve `/student` | PASS      |  |
| SMK-007 | Route Guard Teacher | Dang nhap teacher, vao `/student` | Bi chuyen huong ve `/teacher` | PASS      |  |
| SMK-008 | Home Account Dropdown | Tu dashboard bam logo ve home | Hien dropdown tai khoan: Dashboard/Logout | PASS      |  |
| SMK-009 | Student Dashboard UI | Mo `/student` | Sidebar, card, AI Lab link hoat dong | PASS      |  |
| SMK-010 | Teacher Dashboard UI | Mo `/teacher` | Sidebar, card, create course modal hoat dong | PASS      |  |
| SMK-011 | Create Course | Teacher tao khoa hoc | Khoa hoc moi xuat hien trong danh sach | PASS      |  |
| SMK-012 | Enroll Course | Student enroll khoa hoc | Khoa hoc vao My Courses | PASS      |  |
| SMK-013 | AI Lab Navigation | Student bam menu `AI Lab` | Mo `/ai-chat` thanh cong | PASS      |  |
| SMK-014 | AI Lab Layout 40/60 | Vao `/ai-chat` desktop | Khung model ~40%, chat ~60% | PASS      |  |
| SMK-015 | AI Chat Text | Gui tin nhan text | Tin nhan hien trong chat history | PASS      |  |
| SMK-016 | Logout | Chon Logout tu dropdown home | Session xoa, ve trang auth/home dung logic | PASS      |  |

### Phase 2 - Adaptive Quiz & Analytics

| ID | Hang muc test | Buoc thuc hien | Ket qua mong doi | PASS/FAIL | Ghi chu |
|---|---|---|---|-----------|---|
| PH2-001 | Generate Adaptive Quiz | Student vao AI Lab, chon course, bam `Start Quiz` | Nhan duoc quiz 3-5 cau hoi | PASS | Da verify bang API local 2026-03-12 |
| PH2-002 | Submit Adaptive Quiz | Chon dap an va bam `Submit Quiz` | Hien score + mastery score | PASS | Da verify bang API local 2026-03-12 |
| PH2-003 | Student Progress Analytics | Mo dashboard student sau khi nop quiz | Hien `streak`, `weak topics`, `next suggestion` | PASS | Endpoint `/learning/student/progress` tra du lieu |
| PH2-004 | Teacher At-risk Analytics | Teacher mo dashboard analytics/students | Hien hoc sinh nguy co roi bo | PASS | Endpoint `/learning/teacher/at-risk` tra 1 hoc sinh risk |
| PH2-005 | Auto weak-topic selection | Tao 1 topic diem thap, sau do generate quiz o mode auto | Topic moi duoc chon tu `weak_topic` | PASS | API tra `topic_source=weak_topic`, `difficulty=easy` |

### Phase 3 - Teacher Copilot

| ID | Hang muc test | Buoc thuc hien | Ket qua mong doi | PASS/FAIL | Ghi chu |
|---|---|---|---|-----------|---|
| PH3-001 | Copilot ownership guard | Teacher A goi endpoint copilot voi `course_id` cua Teacher B | API tra 403 (`You do not own this course`) | PASS      | Da them check ownership o backend |
| PH3-002 | Lesson outline generation | Teacher vao tab AI Copilot, tao lesson outline | Nhan duoc markdown outline co section day du | PASS      | Endpoint `/learning/teacher/generate-lesson-outline` |
| PH3-003 | Inline edit + preview markdown | Sau khi generate, chinh sua noi dung va chuyen Preview | Noi dung co the edit va render markdown dung | PASS      | Frontend da bo `readOnly` |
| PH3-004 | Quick action auto-fill course | O trang My Courses chon 1 course, bam `AI: Create Quiz` | Vao AI Copilot va dropdown course duoc chon san | PASS      | UX lien mach |
| PH3-005 | Teacher stats real data | Mo dashboard teacher sau khi co enrollments | Total Courses/Students lay tu API `/learning/teacher/stats` | PASS      | Da bo dummy `courses.length * 86` |
| PH3-006 | Copilot context from docs | Course co PDF chunks, tao outline/quiz | Noi dung tao ra co lien quan hon tai lieu khoa hoc | PASS      | Prompt da duoc bo sung context chunks |
| PH3-007 | Publish to Course Quiz Bank | Teacher edit quiz markdown trong AI Copilot va bam `Publish to Course Quiz Bank` | API luu thanh cong vao quiz bank va adaptive quiz uu tien su dung | PASS      | Endpoint `/learning/teacher/quiz-bank/publish` |
| PH3-008 | Manage Course Quiz Bank | Teacher vao tab `Course Quiz Bank`, xem/sua/xoa bo cau hoi da publish | CRUD hoat dong dung va adaptive badge hien `question_source` phu hop | PASS      | Endpoint GET/PUT/DELETE `/learning/teacher/quiz-bank*` |

---

## 4) Tong hop ket qua theo lan test

| Test Run | Ngay gio | So testcase | Pass | Fail | Ti le | Nguoi test | Ghi chu |
|---|---|---:|-----:|-----:|------:|------------|---|
| RUN-001 | 2026-03-11 | 16 |   15 |    1 | 15/16 | Hiếu       | Blocker o `SMK-015`, da co fix va cho retest |
| RUN-002 | 2026-03-11 | 16 |   16 |    0 | 16/16 | Team       | Retest hoan tat, `SMK-015` da PASS |
| RUN-003 | 2026-03-12 | 4 |    4 |    0 | 4/4 | Copilot    | API flow Phase 2 PASS: register -> create/enroll -> quiz -> progress -> at-risk |
| RUN-004 | 2026-03-12 | 1 |    1 |    0 | 1/1 | Copilot    | Adaptive refinement PASS: auto weak-topic + difficulty reason |
| RUN-005 | 2026-03-12 | 9 |    9 |    0 | 9/9 | Copilot    | Pytest official suite PASS: unit + integration cho scoring/adaptive |

---

## 5) Quy tac xu ly khi FAIL
1. Ghi ro testcase ID + trieu chung vao cot `Ghi chu`.
2. Tao hoac cap nhat incident trong `internal/RECURRING_ERROR_HISTORY_VN.md`.
3. Neu loi P0/P1, dung merge deploy cho den khi co fix va retest pass.
4. Retest lai testcase fail + testcase lien quan.

---

## 6) Sign-off Phase 0 - Muc so 1
Dieu kien de danh dau hoan tat:
- Checklist da duoc thong nhat va luu tai lieu chinh thuc.
- Co it nhat 1 test run co day du ket qua PASS/FAIL.
- Cac loi FAIL da co incident log.
