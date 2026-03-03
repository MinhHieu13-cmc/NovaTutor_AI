# Hướng dẫn Chạy ứng dụng NovaTutor AI (Thực tế)

Tài liệu này hướng dẫn cách khởi chạy toàn bộ hệ thống NovaTutor AI (Backend & Frontend) để bạn có thể trải nghiệm đầy đủ các tính năng từ Agent, RAG cho đến Avatar 3D.

## 1. Các file quan trọng cần lưu ý

Để hiểu cách hệ thống vận hành, hãy xem các file cốt lõi sau:

### Backend (Python/FastAPI)
- `.env`: Nơi cấu hình tất cả các API Key (Google, OpenAI, GCP).
- `backend/app/main.py`: Điểm khởi đầu của server.
- `backend/app/presentation/api/v1/endpoints.py`: Định nghĩa các API HTTP và WebSocket.
- `backend/app/application/services/orchestrator.py`: "Bộ não" điều phối luồng đa Agent.
- `backend/app/application/agents/`: Thư mục chứa logic của 5 Agent chuyên biệt.

### Frontend (React/Next.js)
- `frontend/src/hooks/useNovaTutorSocket.ts`: Quản lý kết nối WebSocket và xử lý Lip-sync.
- `frontend/src/components/NovaAvatarView.tsx`: Hiển thị và điều khiển Avatar 3D.
- `frontend/public/models/avaturn_model.glb`: File mô hình 3D (cần bạn thêm vào).

---

## 2. Các bước triển khai Backend

### Bước 1: Cài đặt môi trường
Mở terminal tại thư mục gốc dự án:
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate
pip install -r requirements.txt
```

### Bước 2: Cấu hình biến môi trường
Mở file `.env` và điền các thông tin bắt buộc:
- `GOOGLE_API_KEY`: Key để dùng Gemini (ADK).
- `GCP_PROJECT_ID`: ID dự án Google Cloud của bạn.
- Các API Key khác nếu bạn dùng LiteLLM với model khác.

### Bước 3: Khởi chạy Server
Từ thư mục `backend`, chạy lệnh:
```bash
set PYTHONPATH=.
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
*(Lưu ý: Việc chuẩn hóa import yêu cầu bạn chạy uvicorn từ thư mục `backend` và đảm bảo thư mục hiện tại có trong PYTHONPATH)*

Server sẽ chạy tại: `http://localhost:8000`. Bạn có thể xem tài liệu API tại `http://localhost:8000/docs`.

---

## 3. Các bước triển khai Frontend

### Bước 1: Cài đặt dependencies
Mở một terminal mới:
```bash
cd frontend
npm install
```

### Bước 2: Chuẩn bị Model 3D
1. Tải mô hình .glb từ Avaturn (hoặc dùng bất kỳ model ARKit nào).
2. Đổi tên thành `avaturn_model.glb`.
3. Copy vào thư mục: `frontend/public/models/`.

### Bước 3: Khởi chạy ứng dụng
```bash
npm run dev
```
Ứng dụng sẽ chạy tại: `http://localhost:3000`.

---

## 4. Kiểm tra luồng hoạt động (Workflow)

1. **Kết nối**: Khi bạn vào trang web, `useNovaTutorSocket` sẽ tự động kết nối tới `ws://localhost:8000/api/v1/ws/chat`.
2. **Giao tiếp**: 
   - Bạn gửi tin nhắn văn bản hoặc audio.
   - Backend `Orchestrator` sẽ chạy qua 5 Agent: Cảm xúc -> Bộ nhớ -> Giáo trình -> Đánh giá -> Gia sư chính.
3. **Phản hồi**: 
   - Backend trả về Text (từng phần) và một `avatar_event`.
   - `avatar_event` chứa Audio Base64, mảng Lip-sync và Emotion.
4. **Hiển thị**:
   - Hook phát âm thanh qua Web Audio API.
   - `NovaAvatarView` nhận dữ liệu và làm cho nhân vật 3D mấp máy môi, biểu cảm đúng theo nội dung nói.

## 5. Lưu ý quan trọng
- **GCP Services**: Một số module (Firestore, Cloud SQL, Vertex AI) đang được Mock (giả lập) trong code để bạn có thể chạy ngay mà không cần setup GCP phức tạp. Để chạy thực tế trên GCP, hãy thay đổi các import trong `backend/app/presentation/api/v1/deps.py` sang các repository thật.
- **WebSocket**: Đảm bảo firewall không chặn cổng 8000.
