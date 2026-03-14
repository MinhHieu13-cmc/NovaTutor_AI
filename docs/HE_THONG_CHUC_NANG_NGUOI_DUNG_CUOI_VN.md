# NovaTutor AI - Hướng dẫn chức năng cho người dùng cuối

Cập nhật: 2026-03-13  
Đối tượng: Học sinh và giảng viên (không kỹ thuật)

---

## 1) NovaTutor AI giúp bạn làm gì?

NovaTutor AI là nền tảng học tập có trợ giảng AI, gồm 2 vai trò chính:
- **Học sinh**: học với AI, làm bài kiểm tra thích ứng, theo dõi tiến bộ.
- **Giảng viên**: quản lý khóa học, theo dõi học viên, dùng AI Copilot để soạn nội dung nhanh.

---

## 2) Dành cho học sinh

### 2.1 Dashboard học sinh (`/student`)
Bạn có thể:
- Xem tổng quan học tập.
- Xem khóa học đã đăng ký và gợi ý khóa học.
- Xem chủ đề còn yếu (`Weak topics`) và gợi ý bước học tiếp theo (`Next suggestion`).
- Đi nhanh tới:
  - `AI Lab` để học qua hội thoại.
  - `Adaptive Quiz` để kiểm tra kiến thức.

### 2.2 AI Lab (`/ai-chat`)
Bạn có thể:
- Chat với trợ giảng AI bằng văn bản.
- Tạo mục tiêu học theo từng phiên (session goal).
- Quay lại phiên học cũ (hệ thống tự khôi phục hội thoại).
- Xem câu trả lời AI ở định dạng Markdown dễ đọc.

Lưu ý:
- Hệ thống có thể hiển thị nhãn khôi phục hội thoại như:
  - `Restored from backend`
  - `Restored from local cache`

### 2.3 Adaptive Quiz (`/adaptive-quiz`)
Bạn có thể:
- Chọn khóa học để làm quiz.
- Chọn chế độ chủ đề:
  - **Auto weak-topic**: hệ thống tự chọn chủ đề bạn còn yếu.
  - **Manual topic**: bạn tự nhập chủ đề.
- Nhận điểm và chỉ số mastery sau khi nộp bài.

Lưu ý:
- Khóa học đang chọn được đồng bộ giữa `AI Lab` và `Adaptive Quiz` để bạn không phải chọn lại.

---

## 3) Dành cho giảng viên

### 3.1 Dashboard giảng viên (`/teacher`)
Bạn có thể:
- Tạo, chọn, chỉnh sửa, xóa khóa học.
- Upload tài liệu PDF cho khóa học.
- Theo dõi học viên có nguy cơ tụt tiến độ (at-risk students).
- Xem số liệu tổng quan như tổng số khóa học và tổng số học viên.

### 3.2 AI Copilot (trong dashboard giảng viên)
AI Copilot có 3 công cụ:
1. Tạo dàn ý bài giảng (Lesson Outline)
2. Tạo nháp đề quiz (Quiz Draft)
3. Tạo thông báo lớp học (Announcement)

Các điểm nổi bật:
- Nội dung sinh ra có thể **chỉnh sửa trực tiếp**.
- Có chế độ **Edit Markdown** và **Preview**.
- Có thể dùng Quick Action để mở Copilot và tự điền khóa học.
- Khi AI có dùng ngữ cảnh từ tài liệu khóa học, sẽ hiện nhãn:
  - `Grounded by course docs (N)`

---

## 4) Câu hỏi thường gặp

### Tại sao AI Lab và Adaptive Quiz tách riêng?
Để trải nghiệm rõ ràng hơn: AI Lab tập trung học qua hội thoại, còn Adaptive Quiz tập trung kiểm tra và đo tiến bộ.

### Vì sao đôi lúc AI trả lời khác kỳ vọng?
Chất lượng trả lời phụ thuộc vào nội dung tài liệu và ngữ cảnh câu hỏi. Bạn nên đặt câu hỏi cụ thể hơn và chọn đúng khóa học.

### Giảng viên có thể dùng Copilot cho khóa học của người khác không?
Không. Hệ thống có kiểm tra quyền sở hữu khóa học.

---

## 5) Quy trình dùng nhanh (gợi ý)

### Với học sinh
1. Đăng nhập.
2. Mở `AI Lab` và học theo session.
3. Chuyển sang `Adaptive Quiz` để kiểm tra ngay sau phiên học.
4. Quay lại dashboard để xem `Weak topics` và `Next suggestion`.

### Với giảng viên
1. Đăng nhập.
2. Tạo khóa học và upload tài liệu PDF.
3. Mở `AI Copilot` để tạo nhanh dàn ý/quiz/thông báo.
4. Chỉnh sửa nội dung trước khi công bố cho học viên.

---

## 6) Hạn chế hiện tại cần lưu ý

- Một số biểu đồ/analytics nâng cao có thể còn ở mức tiền hoàn thiện.
- Copilot là công cụ hỗ trợ soạn thảo, vẫn cần giảng viên duyệt trước khi dùng chính thức.
- Nếu backend tạm thời không hoạt động, giao diện vẫn mở được nhưng các chức năng AI/API sẽ lỗi.

---

## 7) Tài liệu liên quan

- `docs/HE_THONG_CHUC_NANG_QA_DEV_TECHNICAL_VN.md` (bản kỹ thuật cho QA/Dev)
- `docs/LOCAL_SMOKE_TEST_CHECKLIST_VN.md`
- `docs/PROJECT_EXECUTION_ROADMAP_VN.md`

