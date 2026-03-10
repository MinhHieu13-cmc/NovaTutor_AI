# 🔐 NovaTutor Auth Implementation Roadmap

## Mục tiêu
Xây dựng hệ thống xác thực hoàn chỉnh với 2 vai trò (Student/Teacher) + OAuth Google + Dashboard theo vai trò.

## Giai đoạn 1: Backend Auth Setup

### 1.1 Thiết lập Supabase Auth + Database Schema
- Tạo User table với fields: `id`, `email`, `role` (student/teacher), `created_at`
- Tạo Course table với fields: `id`, `teacher_id`, `name`, `description`, `voice_config`, `created_at`
- Tạo Enrollment table với fields: `id`, `student_id`, `course_id`, `joined_at`
- Tạo CourseDocument table với fields: `id`, `course_id`, `document_url`, `document_type`

### 1.2 Cấu hình Google OAuth
- Tạo OAuth credentials trên Google Cloud Console
- Setup Supabase Authentication Providers
- Test OAuth flow

### 1.3 Backend API Endpoints
```
POST /api/auth/register - Đăng ký với role
POST /api/auth/login - Đăng nhập (email/password)
POST /api/auth/google - OAuth Google
GET /api/auth/me - Lấy thông tin user hiện tại
POST /api/auth/logout - Đăng xuất

Teacher Endpoints:
POST /api/courses - Tạo khóa học
GET /api/courses - Lấy danh sách khóa học (của teacher)
PUT /api/courses/:id - Chỉnh sửa khóa học
DELETE /api/courses/:id - Xóa khóa học
POST /api/courses/:id/upload-document - Upload PDF tài liệu
POST /api/courses/:id/configure-voice - Cấu hình AI voice

Student Endpoints:
GET /api/courses - Lấy danh sách khóa học có sẵn
POST /api/courses/:id/enroll - Tham gia khóa học
GET /api/me/courses - Lấy khóa học của student
GET /api/me/progress - Lấy tiến độ cá nhân
```

## Giai đoạn 2: Frontend Pages

### 2.1 Trang Home (Homepage)
- Hero Section với Avatar 3D interactive
- Feature Cards (Glassmorphism)
- CTA buttons để Đăng ký/Đăng nhập

### 2.2 Trang Auth (Login/Register)
- Morphing UI theo vai trò (Student/Teacher)
- Avatar "Gatekeeper" phản hồi động
- Google OAuth button
- Form validation

### 2.3 Trang Dashboard Giảng viên
- Sidebar navigation
- Course management (CRUD)
- Document upload & management
- Analytics & Statistics
- Voice configuration per course

### 2.4 Trang Dashboard Học sinh
- Course list & enrollment
- Learning progress tracker
- Personal learning path
- Access to 3D tutor AI Lab

## Giai đoạn 3: Integration & Testing
- End-to-end testing
- Security audit
- Performance optimization
- Deployment to Cloud Run

---

## Timeline
- **Week 1:** Backend Auth + Database
- **Week 2:** Frontend Pages
- **Week 3:** Integration + Testing

