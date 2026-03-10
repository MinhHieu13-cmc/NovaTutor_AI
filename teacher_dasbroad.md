# 🚀 Thiết kế Dashboard Giảng viên cho NovaTutor AI
---

## 💡 3 Ý tưởng "Trạm điều khiển AI" cho Giảng viên

### 1. Ý tưởng "Phòng thí nghiệm Tri thức" (The Knowledge Lab)

Thay vì một danh sách tệp tin PDF khô khan, hãy biến khu vực quản lý tài liệu thành một không gian 3D.

* **Trực quan hóa RAG:** Khi giảng viên upload một tài liệu, hệ thống sẽ hiển thị hiệu ứng các luồng dữ liệu đang được "hấp thụ" vào bộ não của `CurriculumAgent`.
* **Cấu hình Agent:** Giảng viên có một bảng điều khiển để tinh chỉnh "tính cách" của gia sư (ví dụ: Nghiêm khắc, Vui vẻ, hoặc Khuyến khích) thông qua việc thay đổi System Prompt của `TutorAgent`.

### 2. Ý tưởng "Bản đồ Tư duy Học sinh" (Student Insight Map)

Sử dụng dữ liệu từ `MemoryAgent` và `AssessmentAgent` để tạo ra cái nhìn tổng thể về lớp học.

* **Heatmap cảm xúc:** Biểu đồ hiển thị trạng thái cảm xúc chung của học sinh khi học (Hào hứng hay Căng thẳng) dựa trên dữ liệu từ `EmotionAdapter`.
* **Cảnh báo hổng kiến thức:** Tự động gắn cờ những học sinh thường xuyên gặp lỗi `[CRITICAL_ERROR]` để giảng viên có thể can thiệp kịp thời.

### 3. Ý tưởng "Gia sư ảo đồng hành" (The Co-Tutor)

Trong Dashboard giảng viên, `NovaAvatarView` sẽ đóng vai trò là một **Trợ lý ảo**.

* Avatar sẽ báo cáo nhanh: "Thưa thầy/cô, hôm nay có 5 bạn hoàn thành xuất sắc bài tập Tiếng Anh".
* Giảng viên có thể "thử giọng"  trực tiếp các đoạn giải thích của AI trước khi xuất bản khóa học.

---

## 📝 Bộ Prompt Triển khai Dashboard Giảng viên

### Prompt 1: Giao diện Command Center (Next.js + Tailwind)

> "Hãy thiết kế Dashboard cho Giảng viên trong dự án NovaTutor AI.
> **Yêu cầu giao diện:**
> 1. **Phong cách:** Chuyên nghiệp, hiện đại với tông màu tím điện tử (`indigo-900`) và xám không gian.
> 2. **Bố cục:** Sidebar chứa các mục: Tổng quan, Kho tri thức, Quản lý học sinh, Cấu hình AI.
> 3. **Thành phần:** Sử dụng các thẻ Glassmorphism để hiển thị số lượng học sinh online và số tài liệu đã được vector hóa thành công.
> 4. **Trực quan:** Tích hợp biểu đồ `Recharts` để hiển thị tỷ lệ hoàn thành bài học của học sinh."
> 
> 

### Prompt 2: Quản lý RAG & Tri thức (Knowledge Management)

> "Hãy tạo component `KnowledgeBase` cho giảng viên để tương tác với `CurriculumAgent`.
> **Yêu cầu:**
> 1. **Upload:** Khu vực kéo thả file (PDF, Docx) với hiệu ứng loading thể hiện quá trình AI đang 'đọc' và 'trích xuất' kiến thức vào Vertex AI Search.
> 2. **Danh sách:** Hiển thị danh sách tài liệu kèm theo trạng thái: 'Đang xử lý', 'Đã sẵn sàng' hoặc 'Lỗi'.
> 3. **Ghi chú:** Cho phép giảng viên thêm các 'Chỉ dẫn đặc biệt' (System Instructions) để AI ưu tiên sử dụng tài liệu nào trong quá trình giảng dạy."
> 
> 

