# Giai đoạn 2: Mở rộng với GCP và Chuyên gia đa Agent

Hệ thống NovaTutor AI đã được nâng cấp với khả năng lưu trữ bền vững và các Agent chuyên biệt để cá nhân hóa việc học.

## 1. Các thành phần mới

### Hạ tầng (Infrastructure)
- **Cloud SQL**: Lưu trữ hồ sơ sinh viên (`Student Profile`).
- **Firestore**: Lưu trữ nhật ký hội thoại (`Session Logs`) để có bộ nhớ dài hạn.
- **Vertex AI Vector Search**: Công cụ tìm kiếm vector mạnh mẽ để tra cứu tài liệu học tập (Curriculum RAG).

### Các Agent mới
- **MemoryAgent**: "Bộ nhớ" của hệ thống. Nó chịu trách nhiệm đọc/ghi hồ sơ sinh viên và tóm tắt tiến trình học tập.
- **CurriculumAgent**: "Chuyên gia giáo trình". Nó sử dụng RAG để tìm kiếm nội dung học tập chính xác nhất từ kho dữ liệu.

## 2. Cách thiết lập

### Cấu hình biến môi trường
Thêm các tham số sau vào file `.env`:

```env
GCP_PROJECT_ID=your-project-id
GCP_LOCATION=us-central1
DATABASE_URL=postgresql://user:pass@host:port/dbname
VERTEX_INDEX_ID=your-vertex-index-id
VERTEX_ENDPOINT_ID=your-vertex-endpoint-id
```

### Chạy ứng dụng
Hệ thống sẽ tự động khởi tạo các repository tương ứng. Khi gọi API với `use_agent=true`, luồng xử lý sẽ là:
1. `MemoryAgent` kiểm tra hồ sơ học sinh.
2. `CurriculumAgent` tìm tài liệu liên quan.
3. `TutorAgent` tổng hợp thông tin và trả lời người dùng.

## 3. Kiến trúc mã nguồn
- `backend/app/domain/repositories/`: Chứa các interface (trừu tượng hóa việc truy cập dữ liệu).
- `backend/app/infrastructure/persistence/`: Chứa các triển khai cụ thể cho GCP.
- `backend/app/application/agents/`: Chứa định nghĩa các Agent chuyên biệt.
