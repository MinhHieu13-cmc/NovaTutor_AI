# 🚀 NovaTutor Auth + Dashboard - Quick Start

## 📋 Checklist Setup (5 phút)

### Step 1: Supabase Setup (2 phút)

```bash
# 1. Vào https://app.supabase.com → Create Project
# 2. Copy Project URL + Anon Key

# 3. Tạo tables (vào SQL Editor):
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher')),
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  voice_config JSONB DEFAULT '{"voice_name": "Zephyr", "language": "en"}',
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id),
  course_id UUID NOT NULL REFERENCES courses(id),
  joined_at TIMESTAMP DEFAULT now(),
  UNIQUE(student_id, course_id)
);

CREATE TABLE course_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id),
  document_url TEXT NOT NULL,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT now()
);

# 4. Enable Storage (vào Storage → Create bucket: course-documents)
# 5. Setup Google OAuth (vào Authentication → Providers → Google)
```

### Step 2: Environment Variables (1 phút)

**Backend (.env.local hoặc .env):**
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
DATABASE_URL=postgresql://postgres:password@localhost:5432/novatutor
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_GEMINI_API_KEY=AIza...
```

### Step 3: Install Dependencies (1 phút)

**Backend:**
```bash
cd backend
pip install supabase python-dotenv
```

**Frontend:**
```bash
cd frontend
npm install framer-motion
```

### Step 4: Run Servers (1 phút)

**Terminal 1 - Backend:**
```bash
cd backend
python -m uvicorn app.main:app --reload
# Backend running at http://localhost:8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Frontend running at http://localhost:3000
```

---

## 🎯 Testing the Flow

### Test User Registration

1. **Go to**: http://localhost:3000/auth?mode=register
2. **Select Role**: Student (Blue) or Teacher (Purple)
3. **Fill Form**:
   - Name: "Nguyễn Văn A"
   - Email: "test@example.com"
   - Password: "test123456"
4. **Click**: Đăng ký
5. **Expected**: Avatar shows 😊 happy, redirects to dashboard

### Test User Login

1. **Go to**: http://localhost:3000/auth?mode=login
2. **Fill Form**:
   - Email: "test@example.com"
   - Password: "test123456"
3. **Click**: Đăng nhập
4. **Expected**: Avatar shows 😊 happy, redirects to dashboard

### Test Homepage

1. **Go to**: http://localhost:3000/home
2. **See**: Hero with Avatar, Feature cards, Stat cards
3. **Click**: "Bắt đầu học ngay" → Should go to /auth?mode=register

### Test Dashboards

**Student Dashboard:**
- URL: http://localhost:3000/dashboard/student
- See: Sidebar, My Courses, Progress, Quick actions

**Teacher Dashboard:**
- URL: http://localhost:3000/dashboard/teacher
- See: Sidebar, Course management, Analytics, AI config

---

## 📝 API Testing (Postman/Thunder Client)

### Register
```
POST http://localhost:8000/api/v1/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "test123456",
  "full_name": "Nguyễn Văn A",
  "role": "student"
}
```

### Login
```
POST http://localhost:8000/api/v1/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "test123456"
}
```

### Get Current User
```
GET http://localhost:8000/api/v1/me
Authorization: Bearer <access_token>
```

### Create Course (Teacher)
```
POST http://localhost:8000/api/v1/courses/create
Content-Type: application/json
Authorization: Bearer <teacher_token>

{
  "name": "Toán học cơ bản",
  "description": "Khóa học toán cho lớp 10",
  "subject": "Math"
}
```

### Get My Courses (Teacher)
```
GET http://localhost:8000/api/v1/courses/my-courses?teacher_id=<teacher_id>
Authorization: Bearer <teacher_token>
```

### Enroll Course (Student)
```
POST http://localhost:8000/api/v1/courses/<course_id>/enroll
Authorization: Bearer <student_token>

{
  "student_id": "<student_id>"
}
```

---

## 🐛 Troubleshooting

### Issue: "Cannot connect to Supabase"
- ✅ Check SUPABASE_URL and SUPABASE_ANON_KEY in .env
- ✅ Verify Supabase project is active
- ✅ Check internet connection

### Issue: "CORS error on frontend"
- ✅ Verify CORS middleware in backend (main.py has CORS configured)
- ✅ Check NEXT_PUBLIC_API_URL points to backend

### Issue: "Avatar not showing"
- ✅ Check /models/ folder has avaturn_model.glb
- ✅ Check Canvas component renders without errors (console)

### Issue: "Google OAuth not working"
- ✅ Setup Google OAuth credentials in Google Cloud Console
- ✅ Configure redirect URI in Supabase
- ✅ Check CORS settings allow OAuth provider

### Issue: "Database tables not created"
- ✅ Run SQL migrations in Supabase SQL Editor
- ✅ Check table structure: RLS policies might block writes
- ✅ Disable RLS for testing: Settings → RLS → Disable

---

## ✅ Verification Checklist

- [ ] Backend server runs without errors
- [ ] Frontend server runs without errors
- [ ] Homepage loads (http://localhost:3000/home)
- [ ] Auth page loads with morphing UI
- [ ] Can register new user
- [ ] Can login with credentials
- [ ] Student dashboard loads
- [ ] Teacher dashboard loads
- [ ] API endpoints respond (check http://localhost:8000/docs)
- [ ] Supabase tables have test data

---

## 📚 Next: Integration Steps

After basic setup works:

1. **Connect Avatar to Auth Page**
   - Avatar emotion changes based on form interaction ✅ (already done)
   - Avatar speaks greeting on successful auth (TODO)

2. **Connect Auth to API**
   - Store token in localStorage
   - Use token in API requests

3. **Load Real Data in Dashboards**
   - Fetch courses from API
   - Fetch enrollment data
   - Fetch progress data

4. **Add AI Lab Integration**
   - Connect 3D tutor to backend
   - Stream responses from LLM
   - Save chat history

---

**Estimated Setup Time**: 20-30 minutes (including Supabase setup)
**Support**: Check docs/ and internal/ folders for detailed guides

