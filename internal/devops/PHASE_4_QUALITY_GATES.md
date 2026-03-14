# Phase 4 Quality Gates

Cập nhật: 2026-03-13

## 1) Mục tiêu

Thiết lập cổng chất lượng bắt buộc trước khi merge/deploy:
- Không merge khi fail lint/test/build.
- Có kiểm tra security dependency cơ bản.
- Có tiêu chí xác nhận runtime hardening (JWT, rate limit, headers).

## 2) CI bắt buộc

### Backend
- Lint (flake8/ruff theo workflow)
- Unit + integration tests
- Coverage gate cho `learning.py` (>= 80%)
- `pip-audit` dependency scan

### Frontend
- Type check (`tsc --noEmit`)
- Build (`npm run build`)
- `npm audit --audit-level=high`

## 3) Runtime hardening bắt buộc

- `ENFORCE_STRONG_JWT_SECRET=true` trên production
- `JWT_SECRET_KEY` mạnh (>= 32 ký tự)
- Rate limit middleware bật
- Security headers middleware bật
- Access log middleware bật

## 4) Gate cho deploy

Chỉ deploy tự động khi:
1. CI workflow xanh toàn bộ jobs.
2. Không có CVE mức high trở lên chưa xử lý.
3. Smoke test tối thiểu pass sau deploy.

## 5) Quy trình xác nhận nhanh

```powershell
# Frontend
Set-Location "C:\Users\HIEU\PycharmProjects\NovaTutor_AI\frontend"
npm run build

# Backend integration (docker)
Set-Location "C:\Users\HIEU\PycharmProjects\NovaTutor_AI"
docker compose build backend
docker compose run --rm backend pytest tests/integration/test_auth_security.py tests/integration/test_learning_api.py -q
```

## 6) Kết quả hiện tại

- Auth hardening tests: pass
- Learning integration tests: pass
- Frontend build: pass (có warning `@react-three/fiber`, không chặn build)

