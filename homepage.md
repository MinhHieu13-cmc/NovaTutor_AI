# NovaTutor AI - Trang Home
## 💡 3 Ý tưởng Đột phá cho Trang Home

### 1. The Interactive "Welcome Stage" (Sân khấu Chào mừng)

Thay vì một hình ảnh tĩnh, trung tâm trang Home sẽ là component `NovaAvatarView`. Khi người dùng di chuyển chuột, mắt của gia sư AI sẽ dõi theo. Nếu người dùng nhấn nút "Chào Nova", AI sẽ thực hiện một động tác chào hỏi và cất tiếng nói giới thiệu ngắn gọn nhờ vào `gemini-live-2.5-flash-native-audio`.

### 2. Glassmorphism Stats Clouds (Đám mây Chỉ số)

Xung quanh mô hình 3D là các thẻ chỉ số lơ lửng (floating cards) sử dụng hiệu ứng **Glassmorphism** (kính mờ). Các thẻ này hiển thị dữ liệu thực tế từ hệ thống:

* "98% Học sinh tiến bộ vượt bậc".
* "Hỗ trợ 24 ngôn ngữ thời gian thực".
* "Phân tích cảm xúc chính xác 95%".

### 3. "The Brain" Visualization (Trực quan hóa Bộ não AI)

Một section cuộn (scroll) hiển thị cách 5 Agent (Memory, Curriculum, Emotion, v.v.) phối hợp với nhau. Khi người dùng cuộn đến đâu, các luồng dữ liệu (data lines) sẽ phát sáng từ các Agent chạy về phía trung tâm là Gia sư AI.

---

## 📝 Bộ Prompt Triển khai (Dành cho AI Thiết kế)

### Prompt 1: Tổng thể Layout (Next.js + Tailwind + Framer Motion)

> "Hãy thiết kế giao diện Landing Page (Home Page) cho NovaTutor AI.
> **Phong cách:** Hiện đại, Futuristic, Dark Mode với tông màu xanh neon và tím điện tử.
> **Cấu trúc:** > 1. **Hero Section:** Bên trái là tiêu đề 'Gia sư AI 3D Thế hệ mới' và nút CTA 'Bắt đầu học ngay'. Bên phải chiếm 60% màn hình là `NovaAvatarView` hiển thị mô hình Avaturn sống động.
> 2. **Feature Cards:** Sử dụng `backdrop-blur` của Tailwind để tạo các thẻ tính năng: 'Học qua giọng nói', 'Phân tích cảm xúc', 'Lộ trình cá nhân hóa'.
> 3. **Interactive Background:** Sử dụng các hạt (particles) chuyển động nhẹ nhàng để tạo chiều sâu cho không gian 3D."

### Prompt 2: Hero Section - Tương tác với Avatar

> "Hãy viết code React cho Hero Section của NovaTutor.
> **Yêu cầu:**
> 1. Tích hợp `Canvas` từ `@react-three/fiber` để chứa `NovaAvatarView`.
> 2. Khi người dùng hover vào vùng Hero, Avatar sẽ thực hiện animation `Talking_1` và hiển thị một bong bóng thoại (Speech Bubble) chào mừng.
> 3. Nút CTA phải có hiệu ứng 'Glow' và 'Pulse' để kích thích người dùng nhấn vào.
> 4. Hiển thị các Badge nhỏ như 'Powered by Gemini 2.5 Live' và 'ARKit Ready' ở các góc tinh tế."
> 
> 

### Prompt 3: Section "Khóa học 3D AI"

> "Hãy tạo component `CourseShowcase` hiển thị các khóa học dưới dạng thẻ 3D.
> **Yêu cầu:**
> 1. Mỗi thẻ khóa học (Tiếng Anh, Toán, Lý) có một icon 3D nổi bật và thanh Progress Bar hiển thị 'Độ khó' và 'Thời lượng'.
> 2. Khi nhấn vào khóa học, sẽ có một hiệu ứng chuyển cảnh (Transition) mượt mà dẫn vào Dashboard học sinh.
> 3. Hiển thị số lượng học sinh đang 'Online' trong mỗi khóa học bằng một chấm xanh nhấp nháy."
> 
> 

---

## 🛠️ Kỹ thuật tối ưu UX cho Trang Home

Để trang Home không bị nặng khi nạp Model 3D, bạn nên áp dụng các kỹ thuật sau:

* **Progressive Loading:** Hiển thị một ảnh render chất lượng cao của Avatar trước, sau đó mới nạp file `.glb` chạy ngầm.
* **Pre-warm API:** Khởi tạo kết nối WebSocket với `gemini-live-2.5-flash-native-audio` ngay khi người dùng ở trang Home để khi vào học không bị trễ.

---

