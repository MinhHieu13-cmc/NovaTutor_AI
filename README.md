# 🎓 NovaTutor AI - Advanced AI Tutoring Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

**NovaTutor AI** là một nền tảng lõi (AI Core) hiện đại, được thiết kế theo mô hình SaaS đa khách hàng (Multi-tenant). Dự án tập trung vào khả năng mở rộng, tính linh hoạt và tuân thủ các nguyên tắc thiết kế phần mềm cao cấp, phù hợp làm nền tảng cho các ứng dụng giáo dục thông minh hoặc trợ lý AI doanh nghiệp.

---

## 🚀 Điểm Nhấn Dự Án (Key Highlights)

- **Kiến Trúc Sạch (Clean Architecture)**: Phân tách rõ ràng giữa Domain, Application, Infrastructure và Presentation. Đảm bảo mã nguồn dễ bảo trì, kiểm thử và thay đổi công nghệ (ví dụ: đổi từ OpenAI sang Gemini chỉ trong 1 nốt nhạc).
- **Hệ Thống RAG (Retrieval-Augmented Generation)**: Tích hợp sẵn cơ chế nạp tài liệu và tìm kiếm ngữ nghĩa, giúp AI trả lời dựa trên kiến thức riêng biệt của từng Workspace.
- **AI Orchestrator**: Bộ điều phối thông minh có khả năng nhận diện ý định (Intent Detection) để quyết định khi nào dùng RAG, khi nào gọi Plugin hoặc sử dụng Agent chuyên biệt.
- **Multi-tenancy & Security**: Cách ly dữ liệu tuyệt đối giữa các khách hàng bằng **PostgreSQL Row Level Security (RLS)** trên Supabase.
- **Real-time Streaming**: Trải nghiệm người dùng mượt mà với Server-Sent Events (SSE), cho phép phản hồi của AI được hiển thị tức thì theo thời gian thực.

---

## 🛠️ Công Nghệ Sử Dụng

### Backend (Python)
- **Framework**: FastAPI (High performance, Async/Await).
- **AI Framework**: Google ADK (Agent Development Kit), LiteLLM.
- **Database/Auth**: Supabase (PostgreSQL + pgvector).
- **Architecture**: Domain-Driven Design (DDD) & Clean Architecture.

### Frontend (TypeScript)
- **Framework**: Next.js 14 (App Router).
- **State Management**: Zustand.
- **Styling**: TailwindCSS.

### Infrastructure & DevOps
- **Containerization**: Docker & Docker Compose.
- **API Documentation**: Swagger/OpenAPI tích hợp sẵn.

---

## 🏗️ Cấu Trúc Thư Mục

```text
├── backend/
│   ├── app/
│   │   ├── domain/         # Thực thể cốt lõi & Giao diện (Interfaces)
│   │   ├── application/    # Logic nghiệp vụ, Agents, Orchestrator
│   │   ├── infrastructure/ # Triển khai chi tiết (Supabase, LLM Providers)
│   │   └── presentation/   # FastAPI Endpoints & Middlewares
├── frontend/               # Next.js Application
├── docs/                   # Tài liệu kiến trúc (ADR, Flowcharts)
└── docker-compose.yml      # Thiết lập môi trường nhanh
```

---

## 🌟 Các Tính Năng Chính

1.  **NovaTutor Agent**: Một Agent chuyên biệt được cấu hình với các công cụ như `Calculator` và `Knowledge Lookup` để hỗ trợ giải bài tập chính xác.
2.  **Plugin System**: Hệ thống plugin linh hoạt cho phép mở rộng khả năng của AI (gọi API bên thứ 3, xử lý dữ liệu...) mà không làm thay đổi logic lõi.
3.  **Workspace Management**: Quản lý không gian làm việc riêng biệt cho từng người dùng hoặc tổ chức.
4.  **Usage Tracking**: Theo dõi và giới hạn mức độ sử dụng Token cho từng khách hàng (SaaS-ready).

---

## 🏁 Bắt Đầu Nhanh

### 1. Cấu hình môi trường
Sao chép file mẫu và điền thông tin API của bạn:
```bash
cp .env.example .env
```

### 2. Triển khai với Docker
```bash
docker-compose up --build
```

### 3. Thiết lập Database
Chạy script SQL tại `backend/app/infrastructure/persistence/supabase_schema.sql` trong SQL Editor của Supabase để khởi tạo cấu trúc bảng và chính sách RLS.

---

## 📈 Định Hướng Phát Triển (Roadmap)
- [ ] Tích hợp thêm các mô hình LLM mã nguồn mở qua Ollama.
- [ ] Xây dựng bảng điều khiển (Dashboard) quản lý Workspace cho Admin.
- [ ] Hỗ trợ đa ngôn ngữ hoàn chỉnh (i18n).

---
*Dự án được phát triển với tư duy Product-first, sẵn sàng để Scale-up thành một sản phẩm thương mại thực thụ.*
