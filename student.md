
# Prompt thiết kế giao diện Student Dashboard (Coursera Style)

**PROMPT:**

> Thiết kế giao diện **Student Dashboard cho một nền tảng học trực tuyến giống Coursera**, phong cách **modern EdTech dashboard, clean UI, professional learning platform**.

---

# 1. Layout tổng thể

* Layout dạng **dashboard**
* Có **sidebar bên trái + nội dung chính bên phải**
* Thiết kế **grid layout rõ ràng**
* Responsive desktop + tablet + mobile
* Background trắng / xám rất nhạt
* Card UI có **soft shadow + bo góc**

---

# 2. Top Navigation Bar

Thanh trên cùng gồm:

**Bên trái**

* Logo platform

**Ở giữa**

* Search bar lớn

  ```
  Search for courses, skills, instructors
  ```

**Bên phải**

* Notification icon 🔔
* Messages icon 💬
* User avatar dropdown

Dropdown gồm:

* Profile
* My Courses
* Certificates
* Settings
* Log out

---

# 3. Sidebar Menu (Navigation)

Sidebar bên trái gồm:

* 🏠 Dashboard
* 📚 My Courses
* 🧠 Guided Projects
* 🎓 Certificates
* ⭐ Saved Courses
* 📅 Learning Schedule
* 🤖 AI Assistant
* ⚙ Settings

Menu active có **highlight màu xanh**.

---

# 4. Welcome Section

Phần đầu trang hiển thị:

```
Welcome back, Student 👋
Continue your learning journey
```

Hiển thị **learning statistics** dạng card:

Card gồm:

* Courses in progress
* Completed courses
* Certificates earned
* Learning hours

---

# 5. Continue Learning Section

Card hiển thị **khóa học đang học**.

Course card gồm:

* Thumbnail khóa học
* Tên khóa học
* Instructor / University
* Progress bar (% completed)
* Button:

```
Continue Learning
```

Layout:

```
[ Course Card ] [ Course Card ] [ Course Card ]
```

---

# 6. Recommended Courses

AI recommendation section:

```
Recommended for you
```

Course card gồm:

* Thumbnail
* Course title
* Rating ⭐
* Number of students
* Course level (Beginner / Intermediate)

---

# 7. Learning Progress Visualization

Biểu đồ learning progress:

* Weekly learning time
* Courses progress

Ví dụ:

* Line chart: learning hours per week
* Progress bar cho từng course

---

# 8. Upcoming Deadlines

Section hiển thị:

```
Upcoming deadlines
```

Card gồm:

* Assignment name
* Course name
* Due date
* Button:

```
Go to Assignment
```

---

# 9. Certificates Section

Hiển thị các chứng chỉ đã đạt:

Card gồm:

* Certificate thumbnail
* Course name
* University logo
* Button:

```
View Certificate
Download PDF
```

---

# 10. Footer

Footer đơn giản:

* About
* Help Center
* Terms
* Privacy

---

# 11. UI Design Style

Phong cách:

* Modern SaaS Dashboard
* EdTech UI
* Clean typography
* Soft shadows
* Rounded card
* Blue accent color

---

# 12. Color Palette

Primary

```
#2A73FF
```

Secondary

```
#F5F7FA
```

Text

```
#1F2937
```

Accent

```
#10B981
```

---

# 13. Micro Interactions

* Hover card animation
* Smooth sidebar transition
* Progress bar animation
* Loading skeleton

---