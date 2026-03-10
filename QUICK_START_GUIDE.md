# NovaTutor AI - Quick Start Guide

**Version**: Phase 3 - Production  
**Last Updated**: March 10, 2026

---

## 🚀 Access the Application

### Live URLs
- **Frontend**: https://novatutor-frontend-366729322781.us-central1.run.app
- **API**: https://novatutor-backend-366729322781.us-central1.run.app/api/v1
- **Documentation**: https://novatutor-backend-366729322781.us-central1.run.app/docs

---

## 👤 User Quick Start

### Option 1: As a Student

**Step 1: Register**
1. Go to: https://novatutor-frontend-366729322781.us-central1.run.app/auth?mode=register
2. Select role: **Student**
3. Fill in:
   - Email: Your email address
   - Full Name: Your name
   - Password: Strong password (8+ chars)
4. Click **Register**

**Step 2: Browse Courses**
1. After login, click **Available Courses** tab
2. See list of courses offered
3. Click **Enroll Now** on any course

**Step 3: Start Learning**
1. Click **Chat with Nova** tab
2. Select your enrolled course from dropdown
3. Start typing your questions
4. Watch the 3D avatar respond!

### Option 2: As a Teacher

**Step 1: Register**
1. Go to: https://novatutor-frontend-366729322781.us-central1.run.app/auth?mode=register
2. Select role: **Teacher**
3. Fill in registration details
4. Click **Register**

**Step 2: Create Course**
1. Go to Teacher Dashboard
2. Click **Create Course**
3. Fill in:
   - Course Name: e.g., "Python Basics"
   - Description: Course overview
   - Subject: e.g., "Programming"
4. Click **Create**

**Step 3: Manage Course**
1. See course in your dashboard
2. Can view enrolled students (coming soon)
3. Can track progress (coming soon)

---

## 🔐 Test Accounts (For Demo)

### Demo Student Account
```
Email: student001@example.com
Password: SecurePass@123
Role: Student
```

### Demo Teacher Account
```
Email: teacher001@example.com
Password: SecurePass@123
Role: Teacher
```

---

## 📱 Using the Chat Interface

### Chat with Nova Avatar

1. **Open Student Dashboard**
   - Login as student
   - Click "Chat with Nova" tab

2. **Select Course**
   - Choose from dropdown
   - Avatar loads on left side

3. **Ask Questions**
   - Type your question in chat input
   - Press Enter or click Send
   - Avatar responds in real-time
   - Watch emotions change based on context

4. **Avatar Features**
   - 😊 Changes emotions based on response
   - 🗣️ Synchronized mouth animations
   - 🎭 Multiple emotion states
   - 🎵 Voice synthesis (future)

---

## 🔍 Using the API

### Get API Token

**Register & Get Token:**
```bash
curl -X POST "https://novatutor-backend-366729322781.us-central1.run.app/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password@123",
    "full_name": "User Name",
    "role": "student"
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": "user123",
    "email": "user@example.com",
    "full_name": "User Name",
    "role": "student"
  }
}
```

### Get Available Courses

```bash
curl -X GET "https://novatutor-backend-366729322781.us-central1.run.app/api/v1/courses/available" \
  -H "Content-Type: application/json"
```

### Enroll in Course

```bash
curl -X POST "https://novatutor-backend-366729322781.us-central1.run.app/api/v1/courses/{course_id}/enroll?student_id={student_id}" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Get Your Courses

```bash
curl -X GET "https://novatutor-backend-366729322781.us-central1.run.app/api/v1/courses/my-courses-student?student_id={student_id}" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ⚙️ Admin & Monitoring

### Check System Health

```bash
# Backend health
curl https://novatutor-backend-366729322781.us-central1.run.app/api/v1/health

# Expected: {"status":"healthy"}
```

### View API Documentation

Open: https://novatutor-backend-366729322781.us-central1.run.app/docs

- Interactive Swagger UI
- Try out endpoints
- See response formats
- View error codes

### Monitor via GCP Console

1. Go to: https://console.cloud.google.com/
2. Select project: `novatotorai-489214`
3. Navigate to **Cloud Run**
4. View service status, logs, and metrics

---

## 🆘 Troubleshooting

### "Cannot connect to backend"
- Check if backend is running: https://novatutor-backend-366729322781.us-central1.run.app/docs
- If not responding, check GCP Cloud Run dashboard

### "Avatar not showing"
- Refresh the page
- Check browser console for errors (F12)
- Ensure JavaScript is enabled
- Try a different browser

### "Login failed"
- Verify email is correct (case-sensitive)
- Verify password is correct
- Try registering a new account
- Check if account exists

### "Course enrollment failed"
- Make sure you're logged in as student
- Check if course is available
- Try refreshing the page

### "Database connection error"
- Backend is trying to connect to Cloud SQL
- Contact admin if issue persists
- Check GCP Cloud SQL dashboard

---

## 📚 Course Examples

### Sample Courses Available

**1. Introduction to Python**
- Subject: Programming
- Level: Beginner
- Duration: 20 lessons

**2. Data Science Fundamentals**
- Subject: Data Science
- Level: Beginner
- Duration: 25 lessons

**3. Web Development with React**
- Subject: Web Development
- Level: Intermediate
- Duration: 30 lessons

---

## 💡 Tips & Tricks

### 1. Better Chat Experience
- Ask specific questions for better answers
- Reference course material when asking
- Avatar responds faster to simple questions

### 2. Improve Learning
- Take notes while chatting with Nova
- Ask follow-up questions
- Review completed lessons regularly

### 3. Teacher Features
- Create multiple courses (one for each subject)
- Update course content regularly
- Monitor student progress (in development)

### 4. Account Management
- Use a strong password (8+ characters, mix upper/lower/numbers/symbols)
- Don't share your login credentials
- You can have multiple accounts (different roles)

---

## 📞 Support

### Report an Issue
1. Check troubleshooting section above
2. Screenshot error message
3. Note the time of issue
4. Contact development team

### Request Features
1. Describe the feature
2. Explain why it would be useful
3. Provide example use case
4. Submit to development team

### General Questions
- Check API documentation at `/docs`
- Review project documentation in main folder
- Contact your administrator

---

## 🔄 Common Workflows

### Workflow 1: Student Learning Path
```
1. Register as Student
2. Browse Available Courses
3. Enroll in Course
4. Open Chat Interface
5. Select Enrolled Course
6. Chat with Nova Avatar
7. Track Progress (coming soon)
```

### Workflow 2: Teacher Setup
```
1. Register as Teacher
2. Create Course
3. Add Course Description
4. Configure Voice Settings
5. Upload Course Materials (coming soon)
6. Monitor Enrollments
7. View Student Progress (coming soon)
```

### Workflow 3: API Integration
```
1. Get Authentication Token
2. List Available Courses
3. Enroll User in Course
4. Query Course Details
5. Get User Progress
6. Submit Learning Results
```

---

## 📊 What's Next?

### Coming Soon (Phase 4)
- [ ] Document upload system
- [ ] Advanced analytics dashboard
- [ ] Progress certificates
- [ ] Mobile app
- [ ] Video recording
- [ ] Peer-to-peer learning

### Feature Roadmap
- [ ] Email notifications
- [ ] Quiz system
- [ ] Assignments
- [ ] Grading rubrics
- [ ] Discussion forums
- [ ] Video tutorials

---

## 🎓 Learning Resources

### Getting Started
1. Read: `PROJECT_SUMMARY_CURRENT_STATE.md`
2. Explore: https://novatutor-backend-366729322781.us-central1.run.app/docs
3. Try: Create an account and enroll in a course

### For Developers
1. Architecture: `docs/architecture.md`
2. Testing: `TESTING_VALIDATION_GUIDE.md`
3. Deployment: `CICD_SETUP_GUIDE.md`

### For Administrators
1. Deployment Status: `DEPLOYMENT_STATUS_PHASE3.md`
2. Monitoring: GCP Console
3. Logs: Cloud Run logs

---

## 🔐 Security Reminder

- ✅ Don't share passwords
- ✅ Use HTTPS only (always)
- ✅ Don't expose API tokens in client code
- ✅ Report security issues immediately
- ✅ Use strong, unique passwords
- ✅ Enable 2FA when available

---

## 📝 Quick Reference

### Important URLs
| Service | URL |
|---------|-----|
| Frontend | https://novatutor-frontend-366729322781.us-central1.run.app |
| Backend API | https://novatutor-backend-366729322781.us-central1.run.app |
| API Docs | https://novatutor-backend-366729322781.us-central1.run.app/docs |
| GCP Console | https://console.cloud.google.com/ |

### API Endpoints
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Login |
| GET | `/auth/me` | Get profile |
| GET | `/courses/available` | List courses |
| POST | `/courses/create` | Create course (teacher) |
| POST | `/courses/{id}/enroll` | Enroll in course |

### Test Credentials
```
Student: student001@example.com / SecurePass@123
Teacher: teacher001@example.com / SecurePass@123
```

---

## 🎯 Quick Goals

### New Student
- [ ] Register account
- [ ] Enroll in first course
- [ ] Chat with Nova
- [ ] Complete one lesson

### New Teacher
- [ ] Register account
- [ ] Create first course
- [ ] View student enrollments
- [ ] Configure course settings

### New Developer
- [ ] Clone repository
- [ ] Set up local environment
- [ ] Run backend locally
- [ ] Run frontend locally
- [ ] Make first change
- [ ] Deploy to dev environment

---

**Need Help?** Check the documentation files or contact your administrator.

**Happy Learning! 🚀**

---

*Last Updated: March 10, 2026*

