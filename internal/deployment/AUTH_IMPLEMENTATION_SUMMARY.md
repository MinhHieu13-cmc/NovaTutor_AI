# 📋 NovaTutor Auth + Dashboard Implementation Summary

## ✅ Đã triển khai

### Backend (FastAPI + Supabase)

#### 1. Authentication Endpoints (`backend/app/presentation/api/v1/auth.py`)
- `POST /api/v1/register` - Đăng ký người dùng (email/password + role)
- `POST /api/v1/login` - Đăng nhập (email/password)
- `POST /api/v1/google` - OAuth Google Sign-in/Sign-up
- `GET /api/v1/me` - Lấy thông tin user hiện tại
- `POST /api/v1/logout` - Đăng xuất

**Features:**
- Role-based (student/teacher)
- Supabase Auth integration
- Google OAuth support
- Token-based authentication

#### 2. Course Management Endpoints (`backend/app/presentation/api/v1/courses.py`)

**Teacher Endpoints:**
- `POST /api/v1/courses/create` - Tạo khóa học mới
- `GET /api/v1/courses/my-courses` - Lấy danh sách khóa học của giảng viên
- `PUT /api/v1/courses/{course_id}` - Chỉnh sửa khóa học
- `DELETE /api/v1/courses/{course_id}` - Xóa khóa học
- `POST /api/v1/courses/{course_id}/upload-document` - Upload PDF tài liệu
- `POST /api/v1/courses/{course_id}/configure-voice` - Cấu hình AI voice

**Student Endpoints:**
- `GET /api/v1/courses/available` - Lấy danh sách khóa học có sẵn
- `POST /api/v1/courses/{course_id}/enroll` - Tham gia khóa học
- `GET /api/v1/courses/my-courses-student` - Lấy khóa học đã tham gia
- `GET /api/v1/courses/{course_id}/documents` - Lấy tài liệu của khóa học

**Database Schema:**
- `users` table: id, email, full_name, role, created_at
- `courses` table: id, teacher_id, name, description, subject, voice_config, created_at
- `enrollments` table: id, student_id, course_id, joined_at
- `course_documents` table: id, course_id, document_url, document_type, uploaded_at

---

### Frontend (Next.js + React Three Fiber)

#### 1. Homepage (`frontend/src/app/home/page.tsx`)
**Features:**
- Hero section với Avatar 3D interactive
- Feature cards (Glassmorphism style)
- Animated background particles
- Stat cards hiển thị dữ liệu dự án
- CTA buttons (Đăng ký / Đăng nhập)
- Responsive design

#### 2. Auth Page (`frontend/src/app/auth/page.tsx`)
**Features:**
- Morphing UI theo vai trò (Student = Blue, Teacher = Purple)
- Avatar "Gatekeeper" phản hồi động theo emotion
- Cảm xúc Avatar thay đổi theo trạng thái:
  - `curious`: khi form mở
  - `happy`: khi đăng ký/đăng nhập thành công
  - `confused`: khi có lỗi
- Form Login/Register với validation
- Google OAuth button
- Role selector (Học sinh / Giảng viên)
- Loading states

#### 3. Student Dashboard (`frontend/src/app/dashboard/student/page.tsx`)
**Sections:**
- Sidebar navigation (6 trang: Dashboard, Courses, AI Lab, Progress, Settings)
- Dashboard main:
  - Learning progress stats (3 môn học)
  - My courses (với progress bar)
  - Available courses
  - Quick actions
- Responsive grid layout
- Glassmorphism design

**Course Card Component:**
- Course name + subject
- Progress percentage
- Number of lessons
- "Continue learning" button

#### 4. Teacher Dashboard (`frontend/src/app/dashboard/teacher/page.tsx`)
**Sections:**
- Sidebar navigation (6 trang: Dashboard, Courses, Knowledge Base, Students, Analytics, AI Config)
- Dashboard main:
  - Overview stats (4 cards with trend indicators)
  - Emotion heatmap of classroom
  - Course management
  - Quick actions
- Course management page
- Knowledge base (document upload area)
- Students tracking
- Analytics page
- AI configuration page (voice settings per course)

**Features:**
- Teacher-specific color theme (Purple/Pink)
- Course management with CRUD
- Voice configuration per course
- Student tracking dashboard
- Analytics dashboard placeholder

---

## 🔧 Cấu hình cần thiết

### Environment Variables

```env
# Backend
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
DATABASE_URL=postgresql://...

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_GEMINI_API_KEY=your-gemini-key
```

### Database Setup

Supabase SQL migrations needed:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher')),
  created_at TIMESTAMP DEFAULT now()
);

-- Courses table
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  voice_config JSONB DEFAULT '{"voice_name": "Zephyr", "language": "en"}',
  created_at TIMESTAMP DEFAULT now()
);

-- Enrollments table
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id),
  course_id UUID NOT NULL REFERENCES courses(id),
  joined_at TIMESTAMP DEFAULT now(),
  UNIQUE(student_id, course_id)
);

-- Course documents table
CREATE TABLE course_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id),
  document_url TEXT NOT NULL,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT now()
);
```

---

## 🚀 Installation & Setup

### 1. Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Add to requirements.txt:
supabase>=2.0.0

# Run migrations (in Supabase dashboard)
# Copy SQL from above

# Start server
python -m uvicorn app.main:app --reload
```

### 2. Frontend Setup

```bash
cd frontend

# Install framer-motion if not already installed
npm install framer-motion

# Run dev server
npm run dev
```

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URIs:
   - `http://localhost:3000/auth/callback`
   - `https://yourdomain.com/auth/callback`
4. Copy credentials to `.env`

### 4. Supabase Setup

1. Create Supabase project
2. Go to Authentication → Providers → Google
3. Configure Google OAuth
4. Create tables using SQL migrations above
5. Enable RLS (Row Level Security) policies

---

## 📊 Data Flow

### Registration Flow
```
Frontend Register Form
  ↓
Validate input
  ↓
POST /api/v1/register (email, password, full_name, role)
  ↓
Supabase Auth creates user
  ↓
Backend creates user profile in DB
  ↓
Return user data + token
  ↓
Frontend stores token → Redirect to Dashboard
```

### Login Flow
```
Frontend Login Form
  ↓
POST /api/v1/login (email, password)
  ↓
Supabase Auth verifies credentials
  ↓
Backend fetches user profile
  ↓
Return user data + token
  ↓
Frontend stores token → Redirect to Dashboard based on role
```

### Course Enrollment Flow
```
Student clicks "Join Course"
  ↓
POST /api/v1/courses/{course_id}/enroll
  ↓
Backend checks if already enrolled
  ↓
Creates enrollment record
  ↓
Student can now access course materials
```

---

## 🎨 UI/UX Details

### Colors by Role
- **Student**: Blue/Cyan theme (`from-blue-400 to-cyan-400`)
- **Teacher**: Purple/Pink theme (`from-purple-400 to-pink-400`)

### Components Used
- `Canvas` + `@react-three/fiber` - 3D Avatar rendering
- `framer-motion` - Animations & transitions
- `next/link` - Client routing
- `tailwindcss` - Styling (Glassmorphism, gradients)

### Responsive Design
- Mobile: Full-width stacked layout
- Tablet: Adjusted sidebar + content
- Desktop: Full 2-column layout for auth, sidebar + main for dashboards

---

## 🔐 Security Considerations

### Implemented
✅ Password hashing (via Supabase Auth)
✅ JWT token-based auth
✅ Role-based access control
✅ CORS middleware
✅ Secure storage of tokens (localStorage → httpOnly in production)

### TODO
- [ ] Implement refresh token rotation
- [ ] Add rate limiting on auth endpoints
- [ ] Set up RLS policies in Supabase
- [ ] Implement CSRF protection
- [ ] Audit logging for sensitive operations

---

## 📱 Next Steps

### Phase 1: Optimize & Test
- [ ] Integration testing (Auth + Courses)
- [ ] Load testing
- [ ] UI/UX polish
- [ ] Mobile optimization

### Phase 2: Deploy
- [ ] Deploy backend to Cloud Run
- [ ] Deploy frontend to Vercel
- [ ] Setup CI/CD pipelines
- [ ] Configure SSL certificates

### Phase 3: Advanced Features
- [ ] Document analytics dashboard
- [ ] Student progress tracking
- [ ] AI voice customization UI
- [ ] Notification system
- [ ] Payment integration (if premium courses)

---

## 📞 Support & Documentation

- **Backend API Docs**: `http://localhost:8000/docs` (Swagger)
- **Frontend**: `http://localhost:3000`
- **Supabase Console**: https://app.supabase.com
- **Google OAuth Docs**: https://developers.google.com/identity/protocols/oauth2

---

**Status**: ✅ Ready for Integration Testing
**Last Updated**: 2026-03-09

