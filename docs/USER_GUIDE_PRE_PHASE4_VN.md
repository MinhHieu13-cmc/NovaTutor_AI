# NovaTutor AI - Huong Dan Vai Tro Nguoi Dung Truoc Phase 4

Cap nhat: 2026-03-12
Pham vi: Truoc Phase 4 (hardening/deploy production)

## 1) Muc dich tai lieu
Tai lieu nay giup team hinh dung nhanh:
- Hoc sinh vao app de lam gi theo tung buoc.
- Giang vien vao app de van hanh lop hoc nhu the nao.
- Vi du thuc te theo tung truong hop.
- Lich theo ngay de onboarding, demo, va training de hon.

---

## 2) Vai tro 1 - Hoc sinh vao app de lam gi?

### Muc tieu chinh cua hoc sinh
- Dang nhap va theo doi tien do hoc.
- Vao khoa hoc da enroll de tiep tuc hoc.
- Dung AI Lab/AI Assistant de hoi bai, lam mini quiz.
- Theo doi weak topics, streak, goi y buoc hoc tiep theo.

### Luong su dung chuan (student journey)
1. Dang nhap tai trang Auth.
2. Vao `Student Dashboard` de xem:
   - So khoa hoc dang hoc.
   - Learning hours.
   - Tien do theo tuan.
3. Mo tab `My Courses` de tiep tuc khoa hoc dang hoc.
4. Neu chua co khoa hoc, vao danh sach khoa hoc va `Enroll`.
5. Vao `AI Lab` (`/ai-chat`) de:
   - Dat session goal.
   - Chat voi AI theo ngu canh khoa hoc.
   - Lam mini adaptive quiz.
6. Xem ket qua: weak topic, streak, next suggestion.
7. Quay lai dashboard de xac nhan tien do da cap nhat.

### Vi du 1 (hoc sinh moi)
- Nhan vat: Minh (lop 10), moi tao tai khoan.
- Muc tieu: Hoc nhanh chu de "Linear Equations".
- Hanh dong:
  - Dang nhap -> vao `My Courses` -> enroll khoa "Math Foundation".
  - Vao AI Lab, dat goal: "Nho cach giai he phuong trinh 2 an".
  - Chat 4-6 cau hoi de lam ro ly thuyet.
  - Lam mini quiz 5 cau.
- Ket qua ky vong:
  - Co score lan dau.
  - Dashboard hien weak topic.
  - Co goi y hoc tiep theo ngay hom sau.

### Vi du 2 (hoc sinh da hoc 1 tuan)
- Nhan vat: An, da co 3 lan quiz.
- Muc tieu: Cai thien diem tu 58 -> 70+.
- Hanh dong:
  - Mo dashboard xem weekly scores.
  - Vao AI Lab o mode auto weak-topic.
  - Lam quiz muc medium/hard tuy goi y.
- Ket qua ky vong:
  - Diem trung binh 21 ngay tang.
  - Streak tang them 2-3 ngay.

---

## 3) Vai tro 2 - Giang vien vao app de lam gi?

### Muc tieu chinh cua giang vien
- Tao va quan ly khoa hoc.
- Upload tai lieu de phuc vu RAG/AI tutoring.
- Theo doi hoc sinh co nguy co roi bo (at-risk).
- Dung AI Copilot de tao noi dung nhanh (lesson outline, quiz draft, announcement).

### Luong su dung chuan (teacher journey)
1. Dang nhap voi role teacher.
2. Vao `Teacher Dashboard` de xem tong quan.
3. Tao khoa hoc moi (`Create Course`).
4. Vao `My Courses` -> upload PDF tai lieu hoc.
5. Theo doi tab analytics/students:
   - At-risk students.
   - Avg score 21d.
   - Weak topic theo hoc sinh.
6. Vao tab `AI Copilot` de tao nhanh:
   - Lesson outline cho chuong moi.
   - Quiz draft theo topic.
   - Announcement gui hoc sinh.
7. Review/chinh sua noi dung AI truoc khi publish.

### Vi du 1 (giang vien khoi tao khoa hoc moi)
- Nhan vat: Co Lan, mon Toan.
- Muc tieu: Tao khoa hoc "Algebra Basics" trong 30 phut.
- Hanh dong:
  - Create Course.
  - Upload 2 file PDF bai giang.
  - Mo AI Copilot tao lesson outline cho "Chapter 1".
  - Tao quiz draft 5 cau muc medium.
  - Tao announcement thong bao lich quiz.
- Ket qua ky vong:
  - Co bo noi dung day hoc co ban trong ngay.
  - Hoc sinh co the vao hoc va lam quiz ngay.

### Vi du 2 (giang vien xu ly nhom hoc sinh at-risk)
- Nhan vat: Thay Nam, mon Physics.
- Muc tieu: Giam so hoc sinh at-risk tu 12 -> 6 trong 2 tuan.
- Hanh dong:
  - Xem danh sach at-risk va weak topic.
  - Tao announcement nhac hoc bu doi voi nhom diem thap.
  - Tao quiz bo sung theo dung weak topic.
- Ket qua ky vong:
  - Tang muc do tham gia hoc.
  - Diem trung binh 21 ngay cai thien.

---

## 4) Lich 7 ngay mau de hinh dung (co the ap dung cho sprint onboarding)

> Ghi chu: Day la lich mau de team demo/training. Co the doi ngay thuc te theo ke hoach.

| Ngay | Student lam gi | Teacher lam gi | Dau ra ky vong |
|---|---|---|---|
| Day 1 | Dang nhap, vao dashboard, enroll 1 khoa | Tao 1 khoa hoc moi, upload tai lieu | Course + enrollment san sang |
| Day 2 | Vao AI Lab, dat session goal, chat 5-10 tin nhan | Tao lesson outline bang AI Copilot | Co khung bai hoc cho chapter |
| Day 3 | Lam mini quiz lan 1 | Tao quiz draft va review | Quiz co dap an va giai thich |
| Day 4 | Hoc tiep weak topic theo goi y | Xem at-risk students, chon nhom can can thiep | Danh sach uu tien can ho tro |
| Day 5 | Lam mini quiz lan 2, so sanh diem | Tao announcement nhac hoc + deadline | Hoc sinh nhan thong bao ro rang |
| Day 6 | Theo doi streak, tiep tuc AI Lab | Dieu chinh noi dung theo ket qua hoc sinh | Noi dung day hoc sat nhu cau hon |
| Day 7 | Tong ket tuan: xem weekly score + next suggestion | Tong ket lop: avg score, weak topic, at-risk | Bao cao tuan cho ca 2 vai tro |

---

## 5) Minh hoa theo ngay cu the (mau 1 tuan)

Vi du tuan mau:
- Thu 5 (2026-03-12): Day 1
- Thu 6 (2026-03-13): Day 2
- Thu 7 (2026-03-14): Day 3
- Chu Nhat (2026-03-15): Day 4
- Thu 2 (2026-03-16): Day 5
- Thu 3 (2026-03-17): Day 6
- Thu 4 (2026-03-18): Day 7

Neu team bat dau tu ngay khac, chi can shift toan bo lich day tuong ung.

---

## 6) Checklist nhanh cho demo truoc Phase 4

### Cho Student
- [ ] Dang nhap duoc voi role student.
- [ ] Enroll duoc khoa hoc.
- [ ] Vao duoc AI Lab, chat va nhan response.
- [ ] Lam duoc mini quiz va thay ket qua tren dashboard.

### Cho Teacher
- [ ] Dang nhap duoc voi role teacher.
- [ ] Tao duoc khoa hoc va upload duoc PDF.
- [ ] Xem duoc danh sach at-risk students.
- [ ] Dung duoc AI Copilot cho 3 tac vu (outline/quiz/announcement).
- [ ] Co buoc review noi dung AI truoc khi publish.

---

## 7) Luu y khi su dung thuc te truoc Phase 4
- Noi dung AI can review thu cong truoc khi gui cho hoc sinh.
- Nen uu tien theo doi weak topics va streak de can thiep som.
- Cac metric day du cho production se tiep tuc hardening o Phase 4.

---

Tai lieu lien quan:
- `docs/PROJECT_EXECUTION_ROADMAP_VN.md`
- `docs/LOCAL_SMOKE_TEST_CHECKLIST_VN.md`
- `internal/RECURRING_ERROR_HISTORY_VN.md`

