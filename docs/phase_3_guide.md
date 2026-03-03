# Hướng dẫn Giai đoạn 3: Hệ thống Đa Agent ADK

Giai đoạn 3 tập trung vào việc chuyển đổi NovaTutor AI sang kiến trúc đa Agent (Multi-Agent Architecture) sử dụng Google ADK.

## 1. Các thành phần mới

- **AssessmentAgent**: Chuyên gia đánh giá câu trả lời của học sinh.
- **EmotionAdapter**: Phân tích cảm xúc và điều chỉnh tông giọng gia sư.
- **ToolPolicyLayer**: Hệ thống quản lý quyền hạn của Agent đối với các công cụ.
- **Traceability**: Khả năng truy vết luồng xử lý thông qua Session ID.

## 2. Luồng xử lý đa Agent

Hệ thống sử dụng một pipeline tuần tự (Sequential Pipeline) để thu thập đầy đủ ngữ cảnh trước khi phản hồi:

1. **Emotion Analysis**: Hiểu tâm trạng người học.
2. **Context Retrieval**: Lấy hồ sơ (Memory) và kiến thức (Curriculum).
3. **Performance Assessment**: Đánh giá nếu người học đang thực hiện bài tập.
4. **Final Tutoring**: Tổng hợp và đưa ra phản hồi cuối cùng.

## 3. Cấu hình & Sử dụng

### Tool Policy
Quyền hạn được định nghĩa trong `backend/app/application/services/tool_policy.py`. Điều này giúp kiểm soát chặt chẽ Agent nào được phép làm gì.

### Traceability
Bạn có thể theo dõi logs trong terminal để xem trạng thái hoàn thành của Multi-Agent Flow với prefix `[Trace]`.

## 4. Tài liệu chi tiết
Xem sơ đồ luồng tại `docs/multi_agent_flow.md`.
