# Adaptive Mini Quiz - Giải thích chi tiết

Cập nhật: 2026-03-13
Phạm vi: Chức năng `Adaptive Quiz` cho học sinh và dữ liệu liên quan cho giảng viên

---

## 1) Adaptive Mini Quiz là gì?

`Adaptive Mini Quiz` là bài kiểm tra ngắn giúp đo mức hiểu bài của học sinh sau khi học với AI.

Mục tiêu chính:
- Đánh giá nhanh mức độ nắm kiến thức theo từng chủ đề.
- Điều chỉnh độ khó câu hỏi theo năng lực thực tế.
- Cập nhật dữ liệu tiến bộ để hiển thị trên dashboard.

---

## 2) Luồng sử dụng thực tế

### Bước 1: Học sinh mở trang quiz
- Route: `/adaptive-quiz`
- Chọn khóa học cần kiểm tra.

### Bước 2: Chọn cách lấy chủ đề
- `Auto weak-topic`: hệ thống tự chọn chủ đề yếu nhất.
- `Manual topic`: học sinh tự nhập chủ đề muốn kiểm tra.

### Bước 3: Tạo quiz
- Hệ thống gọi API tạo quiz theo course + topic + dữ liệu lịch sử.
- Trả về bộ câu hỏi trắc nghiệm.
- Nếu khóa học đã có `Quiz Draft` do giảng viên tạo và parse được cấu trúc câu hỏi, hệ thống sẽ ưu tiên dùng bộ câu hỏi đó.
- Nếu ngân hàng câu hỏi của giảng viên không đủ số lượng, hệ thống tự bù thêm câu adaptive template (hybrid).

### Bước 4: Nộp bài
- Hệ thống chấm điểm.
- Trả về:
  - `score` (điểm lần này)
  - `mastery_score` (điểm tích lũy năng lực)

### Bước 5: Cập nhật analytics
- Dashboard học sinh cập nhật `weak_topics`, `streak`, `next_suggestion`.
- Dashboard giảng viên cập nhật nhóm học sinh có nguy cơ tụt tiến độ (`at-risk`).

---

## 3) Cách hệ thống chọn chủ đề (topic)

Thứ tự ưu tiên:
1. Nếu học sinh nhập thủ công -> dùng `manual`.
2. Nếu có dữ liệu chủ đề yếu -> dùng `weak_topic`.
3. Nếu chưa có dữ liệu yếu nhưng có session goal -> dùng `session_goal`.
4. Nếu chưa có cả 3 -> fallback theo môn học của khóa (`course_subject`).

---

## 4) Cách hệ thống chọn độ khó

Hệ thống cân nhắc:
- `mastery_score` hiện tại theo topic.
- Điểm các lần quiz gần nhất.
- Xu hướng điểm (đang tăng hay giảm).

Kết quả có thể là:
- `easy` khi cần củng cố nền tảng.
- `medium` khi trình độ đang cân bằng.
- `hard` khi học sinh đã làm tốt và có xu hướng tăng.

---

## 5) Score và Mastery khác nhau thế nào?

- `Score`: điểm của riêng lần nộp hiện tại.
- `Mastery score`: điểm năng lực tích lũy theo thời gian, có làm mượt lịch sử.

Ý nghĩa:
- Tránh việc một lần làm tốt làm sai lệch đánh giá năng lực thật.
- Tránh việc một lần làm kém khiến hệ thống hạ đánh giá quá mạnh.

---

## 6) Liên quan của giảng viên với Adaptive Quiz

Giảng viên **không trực tiếp làm Adaptive Quiz**, nhưng nhận dữ liệu từ quiz để:
- Xác định học sinh có nguy cơ tụt tiến độ.
- Biết chủ đề yếu phổ biến để điều chỉnh bài dạy.
- Dùng `AI Copilot` tạo tài liệu/quiz/announcement phù hợp hơn.

---

## 7) Đồng bộ với AI Lab

- Khóa học đang chọn giữa `AI Lab` và `Adaptive Quiz` được đồng bộ.
- Mục đích: học sinh không phải chọn lại course khi chuyển trang.

---

## 8) API chính liên quan

- `POST /api/v1/learning/quiz/generate`
- `POST /api/v1/learning/quiz/submit`
- `GET /api/v1/learning/student/progress`
- `GET /api/v1/learning/teacher/at-risk`

Response `quiz/generate` hiện có thêm `question_source`:
- `teacher_bank`: dùng hoàn toàn từ bộ câu hỏi giảng viên.
- `hybrid`: kết hợp câu hỏi giảng viên + câu hỏi adaptive template.
- `adaptive_template`: chưa có bộ câu hỏi giảng viên phù hợp.

---

## 9) Các lỗi thường gặp và cách kiểm tra nhanh

### Lỗi: Không tạo được quiz
Kiểm tra:
- Đã chọn khóa học chưa.
- Token đăng nhập còn hạn không.
- Backend có chạy không.

### Lỗi: Làm xong quiz nhưng dashboard chưa đổi ngay
Kiểm tra:
- Refresh dashboard.
- Gọi thử API `student/progress` để xác nhận dữ liệu đã cập nhật.

### Lỗi: Auto không chọn đúng topic yếu
Nguyên nhân phổ biến:
- Chưa có đủ lịch sử quiz cho course/topic đó.

---

## 10) Tài liệu liên quan

- `docs/HE_THONG_CHUC_NANG_NGUOI_DUNG_CUOI_VN.md`
- `docs/HE_THONG_CHUC_NANG_QA_DEV_TECHNICAL_VN.md`
- `docs/LOCAL_SMOKE_TEST_CHECKLIST_VN.md`



