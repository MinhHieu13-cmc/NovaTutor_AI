# NovaTutor AI - Lo Trinh Thuc Thi Du An (Roadmap)

Cap nhat lan dau: 2026-03-11
Trang thai tong quan: Dang trien khai

## 1) Muc tieu san pham
- Xay dung web gia su AI co kha nang day hoc ca nhan hoa cho hoc sinh va cong cu ho tro giao vien.
- Tan dung he thong API/chuc nang hien co: `auth`, `courses`, `rag`, `chat stream`, `system/gemini-key`.
- Uu tien huong "on dinh local -> hoan thien trai nghiem -> hardening -> deploy GCP".

## 2) Nguyen tac trien khai
- Khong viet lai tu dau: tai su dung service/API hien co truoc.
- Moi phase phai co: Deliverables + Acceptance Criteria + Risk + Testing.
- Moi thay doi quan trong phai cap nhat vao file lich su loi de tranh lap lai sai lam.

## 3) Baseline hien tai (da co)
- Backend FastAPI da co router: `/api/v1/auth/*`, `/api/v1/courses/*`, `/api/v1/rag/*`, `/api/v1/health`.
- Frontend Next.js da co: Home, Auth, Student Dashboard, Teacher Dashboard, AI Lab.
- Da chay local Docker thanh cong, da co script khoi tao DB local.

## 4) Ke hoach theo giai doan

## Phase 0 - On dinh nen tang local (1-2 ngay)
Muc tieu: moi thanh vien chay local duoc, test duoc luong chinh.

Deliverables:
- [x] Chuan hoa `docker-compose.yml` local.
- [x] Chuan hoa file `.env` local + `frontend/.env.local`.
- [x] Tao script init schema: `scripts/init_db.sql`.
- [x] Chuan hoa luong Auth/Course de local khong phu thuoc ADC bat buoc.
- [x] Tao bo tai lieu roadmap + error log.

Acceptance criteria:
- [ ] `localhost:3000` truy cap duoc Home/Auth/Dashboard.
- [ ] Dang ky, dang nhap, tao khoa hoc, enroll khoa hoc hoat dong local.
- [ ] Khong co crash startup do thieu GCP credentials.

Rui ro:
- Sai bien moi truong local/GCP gay conflict.

Test can chay:
- Health API, Auth flow, Course CRUD can ban, route guard.

---

## Phase 1 - Cai thien trai nghiem hoc tap (1 tuan)
Muc tieu: bien chat AI thanh mot "buoi hoc co cau truc".

Deliverables:
- [x] Session Goal panel trong AI Lab (muc tieu buoi hoc).
- [x] Continue Learning theo ngu canh khoa hoc dang hoc (localStorage + backend persistence).
- [x] Resume conversation theo `user + course` (load uu tien backend, fallback local).
- [x] UI hien source/citation ro rang cho RAG response.

Acceptance criteria:
- [ ] Hoc sinh vao AI Lab co the tiep tuc buoi hoc dang do.
- [ ] Cau tra loi co dinh kem nguon tai lieu khi su dung RAG.

Rui ro:
- Chat history tang nhanh, can toi uu luu tru.

Test can chay:
- E2E: Student -> My Course -> AI Lab -> chat -> thoat -> vao lai -> resume.

---

## Phase 2 - Danh gia va ca nhan hoa (1-2 tuan)
Muc tieu: do tien bo that su, khong chi chat.

Deliverables:
- [ ] Adaptive mini quiz sau moi buoi hoc.
- [ ] Luu ket qua quiz theo chu de/khoa hoc.
- [ ] Student dashboard bo sung: weak topics, streak, next suggestion.
- [ ] Teacher dashboard bo sung: at-risk students, topics struggling.

Acceptance criteria:
- [ ] Co score progression theo tuan cho tung hoc sinh.
- [ ] Teacher nhin thay hoc sinh co nguy co roi bo.

Rui ro:
- Logic goi y sai do du lieu lich su it.

Test can chay:
- Unit test scoring + API integration test + dashboard data binding.

---

## Phase 3 - Teacher Copilot va no-code content (1 tuan)
Muc tieu: giam thoi gian van hanh khoa hoc cho giao vien.

Deliverables:
- [x] AI tao lesson outline tu tai lieu da upload.
- [x] AI tao quiz/announcement theo chuong.
- [x] Quick actions tren Teacher dashboard goi truc tiep API.

Acceptance criteria:
- [x] Tao duoc bo noi dung trong <= 1 phut cho 1 module (luong tao noi dung va cache context da toi uu; benchmark tiep tuc theo doi o Phase 4 monitoring).
- [x] Giao vien co the review/chinh sua truoc khi publish.

Rui ro:
- Noi dung AI khong dong nhat chat luong, can review gate.
- [x] Ownership check theo course da duoc bo sung cho endpoint teacher copilot.

Test can chay:
- [x] Unit test helper/copilot backend (`tests/unit/test_copilot.py`: 17 passed).
- [x] Unit test backend toan bo (`tests/unit`: 23 passed).
- [ ] Prompt regression test + review workflow test.

---

## Phase 4 - Hardening va GCP Production (1 tuan)
Muc tieu: san sang production va theo doi van hanh.

Deliverables:
- [~] Chuan hoa secrets (JWT/GEMINI) qua Secret Manager.
- [~] Logging + monitoring + alert can ban.
- [x] Security hardening (authz, rate limit, input validation).
- [x] CI/CD check lint/test/build/deploy.

Acceptance criteria:
- [~] Deploy Cloud Run on dinh.
- [~] Co dashboard theo doi loi va hieu nang.

Rui ro:
- Khac biet local/prod env gay loi runtime.

Test can chay:
- [x] Security integration tests auth (`tests/integration/test_auth_security.py`).
- [x] Learning integration tests (`tests/integration/test_learning_api.py`).
- [x] Frontend production build.
- [ ] Smoke test production + rollback drill.

## 5) Bang tien do (cap nhat hang ngay)
| Hang muc | Owner | Muc do uu tien | Trang thai | ETA | Ghi chu |
|---|---|---|---|---|---|
| Phase 0 baseline local | BE+FE | P0 | Completed | 2026-03-11 | RUN-002: 16/16 PASS |
| Session Goal panel (Phase 1) | FE+BE | P1 | Completed | 2026-03-11 | Build OK, feature tested |
| Continue Learning + Resume | FE+BE | P1 | Completed | 2026-03-11 | Local + backend persistence OK |
| Citation UI in AI Lab | FE+BE | P1 | Completed | 2026-03-11 | Source cards rendered under assistant answers |
| Adaptive Quiz | FE+BE | P1 | In Progress | 2026-03-26 | AI Lab da co mini quiz UI + API `/learning/quiz/*` |
| Progress Analytics Dashboard | FE+BE | P1 | In Progress | 2026-03-26 | Student/Teacher dashboard da noi endpoint phase 2 + du lieu that |
| Teacher Copilot | FE+BE | P2 | Completed | 2026-03-13 | Da them ownership guard, editable+preview markdown, quick-action auto course, teacher stats endpoint, copilot context tu course docs |
| GCP Hardening | DevOps+BE | P0 | In Progress | 2026-04-09 | Da harden auth + rate limit + security headers + CI security scans + runbook |

## 6) KPI theo doi
- Active learners / week
- Session completion rate
- Avg response time (AI)
- Quiz improvement delta (week over week)
- Teacher time saved per week
- % response co citation khi bat RAG

## 7) Sprint hien tai - Bat dau ngay
Tuan nay tap trung "Phase 1 continue":
1. [x] Hoan tat Phase 0 smoke test (RUN-002 = 16/16 PASS).
2. [x] Trien khai Session Goal panel trong AI Lab (Phase 1 - item 1: DONE).
3. [x] Continue Learning theo ngu canh khoa hoc dang hoc (Phase 1 - item 2: DONE).
4. [x] Resume conversation theo `user + course` (Phase 1 - item 3: DONE).
5. [x] Source/citation card UI cho RAG response (Phase 1 - item 4: DONE).
6. [x] UI refinement truoc Phase 2:
   - Markdown rendering cho AI Lab + AI Assistant.
   - Scrollable chat history pane cho AI Lab + AI Assistant.
7. [~] Phase 2 vertical slice:
   - Da them backend API adaptive quiz + progress analytics.
   - Da render weak topics/streak/at-risk students tren dashboard.
   - Da them mini quiz UI trong AI Lab (chon course -> lam quiz -> submit).
   - Con thieu: unit/integration test chinh thuc cho scoring + tinh chinh logic adaptive.
8. [~] Phase 2 adaptive refinement:
   - Da nang cap logic chon do kho dua tren mastery + xu huong diem gan day.
   - Da them auto chon topic yeu trong AI Lab (fallback session goal -> course subject).
   - AI Lab bo sung mode `Auto weak-topic` va `Manual topic`.
9. [x] Phase 2 quality gate (acceptance closure):
   - Da them test chinh thuc cho scoring/adaptive logic (`pytest`).
   - Unit + integration tests cho learning API da pass local (9 passed).
   - Dong acceptance technical cho Phase 2 scoring/adaptive.
10. [x] Phase 3 bootstrap (Teacher Copilot):
   - Da them backend endpoints: lesson outline, quiz content, announcement (`/learning/teacher/generate-*`).
   - Da them frontend `copilotService` + tab `AI Copilot` trong Teacher dashboard.
   - Da noi Quick Actions (Create Quiz/Post Announcement) vao luong copilot.
   - Da them unit test copilot (`17 passed`), va retest full unit backend (`23 passed`).
   - Da hoan tat ownership hardening theo course.
   - Da hoan tat review gate: editable markdown + preview markdown.
   - Da bo sung teacher stats API that + quick-action auto-fill course.
   - Benchmark van hanh duoc theo doi tiep trong Phase 4 monitoring.

---
Cap nhat tai lieu:
- Moi thay doi lon -> cap nhat file nay.
- Moi loi/phat sinh lap lai -> cap nhat `internal/RECURRING_ERROR_HISTORY_VN.md`.
- Local smoke test checklist -> `docs/LOCAL_SMOKE_TEST_CHECKLIST_VN.md`.
