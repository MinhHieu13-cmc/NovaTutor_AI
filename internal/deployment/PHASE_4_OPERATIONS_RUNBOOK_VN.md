# Phase 4 Operations Runbook (VN)

Cập nhật: 2026-03-13
Phạm vi: Hardening + vận hành trước/sau deploy GCP

## 1) Biến môi trường bắt buộc (production)

- `JWT_SECRET_KEY` (>= 32 ký tự, không dùng secret mặc định)
- `ENFORCE_STRONG_JWT_SECRET=true`
- `GEMINI_API_KEY` hoặc `GOOGLE_API_KEY`
- `DATABASE_URL`
- `NEXT_PUBLIC_API_URL` (frontend)

## 2) Pre-deploy checklist

1. CI xanh: lint + test + build + security scan.
2. Xác nhận migration/schema tương thích.
3. Xác nhận secret trên môi trường deploy đã cập nhật.
4. Kiểm tra endpoint health cơ bản.

## 3) Post-deploy smoke checklist

- Backend:
  - `GET /api/v1/health` -> 200
  - `GET /api/v1/learning/teacher/stats` (teacher token) -> 200
- Frontend:
  - mở `/teacher` và `/student` thành công
  - AI Lab chat được
  - Adaptive Quiz generate/submit được
- Copilot:
  - endpoint copilot pass với course sở hữu
  - copilot fail `403` với course không sở hữu

## 4) Rollback tối thiểu

1. Rollback backend service revision trước đó.
2. Rollback frontend revision trước đó.
3. Kiểm tra health và luồng đăng nhập lại.
4. Đánh dấu incident trong `internal/RECURRING_ERROR_HISTORY_VN.md`.

## 5) Sự cố thường gặp

### 5.1 `JWT_SECRET_KEY is weak`
- Nguyên nhân: bật strict secret nhưng đang dùng secret yếu/mặc định.
- Cách xử lý: thay secret mạnh và redeploy.

### 5.2 `429 Rate limit exceeded`
- Nguyên nhân: vượt hạn mức rpm.
- Cách xử lý: kiểm tra client retry/backoff, điều chỉnh `DEFAULT_RATE_LIMIT_RPM` hoặc `RATE_LIMIT_AUTH_RPM`.

### 5.3 Copilot không grounded
- Nguyên nhân: khóa học chưa có chunk tài liệu.
- Cách xử lý: upload PDF và kiểm tra pipeline xử lý tài liệu.

