# 🏛️ NovaTutor Portal Dashboard - Thiết kế và Triển khai
---

## 🏛️ Cấu trúc Portal: NovaTutor Management System

### 1. Bố cục chung (Layout)

* **Top Headbar:** Chứa Logo, Thanh tìm kiếm nhanh, Thông báo, và Menu User (Avatar người dùng, Profile, Logout).
* **Side Navigation:** Danh sách các trang tính năng tùy theo Role (Học sinh/Giảng viên).
* **Main Content Area:** Vùng hiển thị nội dung riêng biệt cho từng trang.

### 2. Danh mục trang (Pages)

| Vai trò | Trang chính | Nội dung chi tiết |
| --- | --- | --- |
| **Học sinh** | **Tổng quan** | Biểu đồ tiến độ, các môn học đang dang dở. |
|  | **Khóa học của tôi** | Danh sách khóa học dạng Grid/List. |
|  | **AI Learning Lab** | **Căn phòng 3D**, nơi tương tác Live với gia sư. |
|  | **Hồ sơ & Thành tích** | Chứng chỉ và lịch sử ghi nhớ từ `MemoryAgent`. |
| **Giảng viên** | **Bảng điều khiển** | Thống kê toàn lớp, cảnh báo học sinh yếu. |
|  | **Kho tài liệu (RAG)** | Upload và quản lý tài liệu tri thức cho AI. |
|  | **Quản lý Khóa học** | Chỉnh sửa nội dung, cấu hình giọng nói AI. |
|  | **Báo cáo Chi tiết** | Phân tích sâu từ `AssessmentAgent`. |

---

## 📝 Bộ Prompt Triển khai Portal Dashboard

### Prompt 1: Layout Portal & Headbar (Next.js + Tailwind)

> "Hãy thiết kế cấu trúc Layout chính cho Portal NovaTutor AI.
> **Yêu cầu:**
> 1. **Headbar:** Cố định ở trên cùng, chứa Logo 'NovaTutor', thanh tìm kiếm, và cụm User Profile bên phải.
> 2. **Sidebar:** Bên trái màn hình, sử dụng các icon từ `lucide-react` để phân chia các mục: Dashboard, Courses, AI Lab, Settings. Sidebar có thể thu gọn (Collapse).
> 3. **Main Content:** Vùng trắng/tối lớn ở giữa để render các trang con thông qua `children`.
> 4. **Phong cách:** Hiện đại, sạch sẽ, sử dụng tông màu chủ đạo là Indigo và Slate."
> 
> 

### Prompt 2: Trang "AI Learning Lab" (Nơi chứa 3D Avatar)

> "Hãy tạo trang `AI Learning Lab` - đây là một trang riêng biệt trong Portal dành cho học sinh.
> **Yêu cầu:**
> 1. Trang này sẽ không có Sidebar để tối ưu không gian hiển thị 3D (Focus Mode).
> 2. Trung tâm màn hình là `NovaAvatarView` hiển thị gia sư 3D.
> 3. Phía dưới là thanh công cụ Live: Nút bật/tắt Mic, Transcript thời gian thực, và bảng trạng thái cảm xúc của AI.
> 4. Tích hợp nút 'Thoát khỏi Lab' để quay lại trang Dashboard chính của Portal."
> 
> 

### Prompt 3: Trang Kho tri thức cho Giảng viên (RAG Management)

> "Hãy thiết kế trang `Knowledge Base` dành cho giảng viên để quản lý hệ thống RAG.
> **Yêu cầu:**
> 1. Một bảng (Table) hiển thị danh sách các tài liệu đã tải lên kèm theo kích thước, ngày tải, và trạng thái 'Đã được AI học'.
> 2. Nút 'Thêm tài liệu mới' mở ra một Modal để upload file PDF/Docx.
> 3. Tích hợp một thanh Search để giảng viên tìm nhanh các tài liệu đã vector hóa trong hệ thống."
> 
> 

---
