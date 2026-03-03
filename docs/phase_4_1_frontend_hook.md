# Hướng dẫn tích hợp Frontend: useNovaTutorSocket (Giai đoạn 4.1)

Do Ready Player Me (RPM) đã ngừng hoạt động vào ngày 31/01/2026, hệ thống NovaTutor AI đã chuyển sang hỗ trợ mô hình **Avaturn** sử dụng chuẩn **ARKit 52 Blendshapes**.

## 1. Cài đặt Custom Hook

Hook `useNovaTutorSocket` nằm tại `frontend/src/hooks/useNovaTutorSocket.ts`. Nó chịu trách nhiệm quản lý kết nối WebSocket, phát âm thanh và đồng bộ khẩu hình (Lip-sync).

## 2. Cách sử dụng trong React

```tsx
import React, { useEffect } from 'react';
import { useNovaTutorSocket } from './hooks/useNovaTutorSocket';

const ChatInterface = () => {
  const { 
    connect, 
    sendMessage, 
    currentViseme, 
    currentEmotion, 
    isSpeaking, 
    isConnected 
  } = useNovaTutorSocket();

  useEffect(() => {
    connect();
  }, [connect]);

  const handleSend = () => {
    sendMessage({ text: "Chào gia sư!" });
  };

  return (
    <div>
      <p>Trạng thái: {isConnected ? 'Đã kết nối' : 'Đang ngắt'}</p>
      <p>Cảm xúc hiện tại: {currentEmotion}</p>
      <p>Đang nói: {isSpeaking ? 'Có' : 'Không'}</p>
      
      {/* Truyền currentViseme vào component Avatar 3D (ThreeJS) */}
      <Avatar3D blendshapes={currentViseme} />

      <button onClick={handleSend}>Gửi tin nhắn</button>
    </div>
  );
};
```

## 3. Cấu trúc dữ liệu ARKit Blendshapes

`currentViseme` trả về một object ánh xạ tên Blendshape ARKit sang giá trị cường độ (0-1).
Ví dụ khi Avatar đang phát âm 'O':
```json
{
  "jawOpen": 0.5,
  "mouthClose": 0.0,
  "mouthPucker": 0.8
}
```
*Lưu ý: Bạn cần cấu hình Model Avaturn trong ThreeJS để nhận các giá trị này và cập nhật `morphTargetInfluences`.*

## 4. Xử lý âm thanh

Hook sử dụng **Web Audio API** để đảm bảo độ trễ thấp nhất và khả năng đồng bộ hóa `currentTime` chính xác với các mốc Lip-sync nhận được từ server.
