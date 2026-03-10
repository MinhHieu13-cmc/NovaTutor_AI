Chào bạn! **Tech Lead** đã quay trở lại để cùng bạn "phá đảo" trang **Đăng nhập & Đăng ký** đây. 🚀

Nếu trang Home là nơi để "khoe" công nghệ, thì trang Auth (Xác thực) chính là nơi để tạo ra **Sự tin tưởng** và **Cá nhân hóa** ngay từ giây đầu tiên. Đừng để người dùng thấy một cái form khô khan; hãy biến nó thành một cuộc "giao tiếp" với gia sư AI.

---

## 💡 3 Ý tưởng "Cực cháy" cho trang Login & Register

### 1. Ý tưởng "Người gác cổng AI" (The AI Gatekeeper)

Thay vì chỉ có form, hãy đặt một phiên bản "Mini" của `NovaAvatarView` ở góc màn hình.

* **Khi Đăng nhập:** Khi bạn nhập Username, Avatar sẽ làm động tác "đeo kính" hoặc "ghi chép" để kiểm tra thông tin. Nếu sai mật khẩu, Avatar sẽ lắc đầu nhẹ và tỏ vẻ hơi buồn (Emotion: `Sad`).
* **Khi Đăng ký:** Avatar sẽ đóng vai trò là người hướng dẫn, giải thích từng bước: "Chào em, hãy cho thầy biết tên của em để chúng ta bắt đầu lộ trình nhé!".

### 2. Ý tưởng "Giao diện biến hình" (Morphing RBAC UI)

Giao diện sẽ thay đổi "vibe" ngay lập tức khi người dùng chọn vai trò (Role):

* **Chọn Học sinh:** Giao diện chuyển sang tông màu xanh Neon năng động, các thẻ bài học 3D bay nhẹ xung quanh.
* **Chọn Giảng viên:** Giao diện chuyển sang tông màu tím điện tử sâu lắng, hiện đại và chuyên nghiệp, hiển thị các biểu đồ dữ liệu mờ ảo ở background.
---

### 📝 Prompt 1: Giao diện Auth Biến hình (Next.js + Tailwind + Framer Motion)

Bộ prompt này tập trung vào việc tạo ra layout "Morphing" theo vai trò của người dùng.

> "Hãy xây dựng trang Đăng ký/Đăng nhập cho NovaTutor AI với tính năng **Morphing UI** dựa trên vai trò người dùng.
> **Yêu cầu giao diện:**
> 1. **Cấu trúc:** Màn hình chia đôi. Một bên là **AI Stage** chứa `NovaAvatarView`, bên còn lại là **Auth Form** sử dụng hiệu ứng Glassmorphism.
> 2. **Chế độ Học sinh (Default):** Sử dụng tông màu `blue-500` và `cyan-400` neon. Background có các hạt (particles) chuyển động năng động.
> 3. **Chế độ Giảng viên:** Khi người dùng chọn toggle 'Giảng viên', toàn bộ theme chuyển mượt mà sang `purple-600` và `indigo-500`. Background chuyển sang hiệu ứng lưới (Grid) chuyên nghiệp.
> 4. **Hiệu ứng:** Sử dụng `AnimatePresence` của Framer Motion để chuyển đổi giữa Form Đăng nhập và Đăng ký mà không làm load lại trang."
> 
> 

---

### 📝 Prompt 2: Logic "Người gác cổng AI" (React + Three.js Interaction)

Prompt này giúp Avatar 3D phản ứng lại hành động nhập liệu của người dùng trên Form.

> "Hãy triển khai logic tương tác cho `NovaAvatarView` đóng vai trò là **AI Gatekeeper** trên trang Auth.
> **Kịch bản tương tác:**
> 1. **Theo dõi nhập liệu:** Khi người dùng click vào ô 'Username', Avatar sẽ xoay đầu (Head tracking) về phía input đó và chuyển `currentEmotion` sang 'curious'.
> 2. **Bảo mật vui nhộn:** Khi người dùng nhấn vào ô 'Password', hãy kích hoạt animation che mắt hoặc làm động tác 'shh' (giữ bí mật).
> 3. **Phản hồi lỗi:** Nếu Backend trả về lỗi Auth, gọi hàm `sendMessage` để Avatar nói: 'Hình như có gì đó chưa đúng, em kiểm tra lại nhé' và đổi mặt sang `confused`.
> 4. **Thành công:** Khi đăng nhập thành công, Avatar thực hiện animation vẫy tay chào (`Wave`) trước khi điều hướng vào Dashboard."
> 
> 
