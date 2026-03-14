# NovaTutor AI - Lich Su Loi va Bai Hoc (Recurring Error History)

Muc tieu:
- Ghi lai loi tu thoi diem hien tai de tranh lap lai.
- Moi loi deu co: dau hieu, nguyen nhan goc, cach sua, cach phong ngua.

Bat dau ghi nhan tu: 2026-03-11

## 1) Quy tac ghi log
- Moi incident tao mot muc moi theo template duoi.
- Neu loi lap lai, cap nhat cung incident va tang bo dem `So lan lap lai`.
- Luon gan file/endpoint lien quan de debug nhanh.

## 2) Template incident
## [ID] Ten loi ngan gon
- Thoi gian phat hien:
- Moi truong: Local Docker / Staging / Production
- Muc do: P0 / P1 / P2 / P3
- Trang thai: Open / Mitigated / Resolved / Monitoring
- Nguoi xu ly:

Mo ta:
- Trieu chung:
- Pham vi anh huong:

Ky thuat:
- Root cause:
- File/endpoint lien quan:
- Cach tai hien:

Xu ly:
- Fix da ap dung:
- Commit/PR/Link:

Phong ngua tai phat:
- Guardrail moi:
- Test bo sung:
- Monitoring/Alert:

Bai hoc rut ra:
- 

---

## 3) Incident log

## [ERR-2026-03-11-001] Backend khong boot do thieu GCP ADC
- Thoi gian phat hien: 2026-03-11
- Moi truong: Local Docker
- Muc do: P0
- Trang thai: Resolved
- Nguoi xu ly: Team

Mo ta:
- Trieu chung: `localhost:8000` khong ket noi duoc, container backend restart.
- Pham vi anh huong: Toan bo API local khong su dung duoc.

Ky thuat:
- Root cause: Module-level init (`storage.Client()`, `aiplatform.init`) trong cac file backend yeu cau ADC ngay luc import.
- File/endpoint lien quan:
  - `backend/app/application/services/rag_production.py`
  - `backend/app/presentation/api/v1/deps.py`
  - mot phan trong `auth`/`courses`
- Cach tai hien: Chay local Docker khi khong set `GOOGLE_APPLICATION_CREDENTIALS`.

Xu ly:
- Fix da ap dung: Them lazy-init + try/except, fallback local de app van boot.
- Commit/PR/Link: (dien sau)

Phong ngua tai phat:
- Guardrail moi: Cam module-level client init khong duoc guard.
- Test bo sung: Smoke test boot backend local khong ADC.
- Monitoring/Alert: Theo doi startup error trong logs.

Bai hoc rut ra:
- Local dev phai co fallback ro rang, khong rang buoc ADC tu dau.

---

## [ERR-2026-03-11-002] Frontend port mapping sai trong Docker
- Thoi gian phat hien: 2026-03-11
- Moi truong: Local Docker
- Muc do: P1
- Trang thai: Resolved
- Nguoi xu ly: Team

Mo ta:
- Trieu chung: `localhost:3000` khong vao duoc hoac bi close bat ngo.
- Pham vi anh huong: Khong test duoc UI local.

Ky thuat:
- Root cause: Next standalone chay trong container o `8080` nhung compose map `3000:3000`.
- File/endpoint lien quan: `docker-compose.yml`, `frontend/Dockerfile`.
- Cach tai hien: Build frontend standalone va map sai cổng.

Xu ly:
- Fix da ap dung: doi port mapping thanh `3000:8080`.
- Commit/PR/Link: (dien sau)

Phong ngua tai phat:
- Guardrail moi: Moi thay doi Dockerfile phai doi chieu voi compose ports.
- Test bo sung: smoke test `GET /` tai `localhost:3000` sau deploy local.
- Monitoring/Alert: N/A local.

Bai hoc rut ra:
- Coi `PORT` runtime trong container la source of truth.

---

## [ERR-2026-03-11-003] Sai base URL va token key o chat stream frontend
- Thoi gian phat hien: 2026-03-11
- Moi truong: Local + Production
- Muc do: P1
- Trang thai: Resolved
- Nguoi xu ly: Team

Mo ta:
- Trieu chung: Chat stream loi 401/404.
- Pham vi anh huong: AI chat khong su dung duoc.

Ky thuat:
- Root cause:
  1) `NEXT_PUBLIC_API_URL` da co `/api/v1` nhung code noi them `/api/v1` nua.
  2) Doc token bang key `token` thay vi `novatutor_token`.
- File/endpoint lien quan: `frontend/src/services/chatService.ts`.
- Cach tai hien: Dang nhap, mo AI chat, gui stream request.

Xu ly:
- Fix da ap dung:
  - Chuan hoa endpoint stream thanh `${API_BASE}/chat/stream`.
  - Dung `authService.getToken()`.
- Commit/PR/Link: (dien sau)

Phong ngua tai phat:
- Guardrail moi: API base duoc centralize, cam hardcode endpoint segment lap.
- Test bo sung: integration test cho stream endpoint.
- Monitoring/Alert: ghi log 4xx theo endpoint.

Bai hoc rut ra:
- Luon thong nhat 1 nguon su that cho auth token + API base.

---

## [ERR-2026-03-11-004] AI text chat local fail do `/rag/chat` phu thuoc Vertex ADC
- Thoi gian phat hien: 2026-03-11
- Moi truong: Local Docker
- Muc do: P1
- Trang thai: Resolved
- Nguoi xu ly: Team

Mo ta:
- Trieu chung: Testcase `SMK-015` fail voi loi `Chat failed: Unable to authenticate your request...`.
- Pham vi anh huong: AI Lab text chat khong tra loi duoc assistant.

Ky thuat:
- Root cause:
  1) Backend `/api/v1/rag/chat` dung Vertex/GCP auth flow phu thuoc ADC.
  2) Frontend AI Lab text input chua noi day du vao luong `ragService.chat` de nhan response assistant that.
- File/endpoint lien quan:
  - `backend/app/presentation/api/v1/rag.py`
  - `frontend/src/app/ai-chat/page.tsx`
- Cach tai hien: Dang nhap local -> vao `/ai-chat` -> gui text message.

Xu ly:
- Fix da ap dung:
  - Chuyen `/rag/chat` sang goi Gemini qua API key (`GEMINI_API_KEY`) trong local.
  - Giu RAG context o che do best-effort, khong de ADC lam fail ca request.
  - Noi text input cua AI Lab vao `ragService.chat` va hien response assistant.
  - Retest xac nhan: `SMK-015` PASS trong RUN-002 (16/16 PASS).
- Commit/PR/Link: (dien sau)

Phong ngua tai phat:
- Guardrail moi: API local khong duoc phu thuoc ADC neu da co key runtime thay the.
- Test bo sung: Them smoke test rieng cho `SMK-015` sau moi lan doi AI Lab backend/frontend.
- Monitoring/Alert: Ghi log 5xx tren `/api/v1/rag/chat`.

Bai hoc rut ra:
- Local mode va production mode phai co duong di auth rieng ro rang cho AI services.

---

## 4) Check-list review hang tuan
- [ ] Co incident moi nao chua duoc ghi?
- [ ] Co loi nao lap lai >1 lan?
- [ ] Da co test phong ngua cho incident P0/P1 chua?
- [ ] Da cap nhat roadmap neu incident anh huong deadline?
