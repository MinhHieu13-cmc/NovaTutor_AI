# Hướng dẫn tích hợp Component: NovaAvatarView (Giai đoạn 4.2)

`NovaAvatarView` là component React Three Fiber chịu trách nhiệm hiển thị và điều khiển gia sư 3D sử dụng mô hình **Avaturn** với chuẩn **ARKit 52 Blendshapes**.

## 1. Cài đặt Component

Component nằm tại `frontend/src/components/NovaAvatarView.tsx`. Để sử dụng, bạn cần cài đặt các thư viện cần thiết:

```bash
npm install three @types/three @react-three/fiber @react-three/drei
```

## 2. Cách tích hợp với Custom Hook

Sử dụng `useNovaTutorSocket` để lấy dữ liệu Lip-sync và Emotion, sau đó truyền vào `NovaAvatarView`.

```tsx
import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { useNovaTutorSocket } from '../hooks/useNovaTutorSocket';
import { NovaAvatarView } from './NovaAvatarView';

const AvatarScene = () => {
  const { currentViseme, currentEmotion } = useNovaTutorSocket();

  return (
    <div style={{ width: '100%', height: '500px' }}>
      <Canvas camera={{ position: [0, 1.5, 2], fov: 45 }}>
        <Suspense fallback={null}>
          <Environment preset="city" />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          
          <NovaAvatarView 
            modelPath="/models/avaturn_model.glb"
            blendshapes={currentViseme} 
            currentEmotion={currentEmotion} 
          />
          
          <OrbitControls target={[0, 1.5, 0]} />
        </Suspense>
      </Canvas>
    </div>
  );
};
```

## 3. Các tính năng nổi bật

- **Tương thích ARKit**: Ánh xạ trực tiếp 52 blendshapes của ARKit (như `jawOpen`, `mouthPucker`) vào mô hình 3D.
- **Emotion Mapping**: Tự động biến đổi khuôn mặt dựa trên cảm xúc (`happy`, `confused`, `excited`).
- **Cử động tự nhiên**: Tích hợp sẵn logic chớp mắt tự động (Blinking) và chuyển động Idle (nhịp thở, lắc đầu nhẹ).
- **Lerp Smoothing**: Sử dụng nội suy tuyến tính (Linear Interpolation) để các chuyển động môi và biểu cảm mượt mà hơn, không bị giật lag.

## 4. Chuẩn bị Model

Đảm bảo bạn đã đặt tệp mô hình Avaturn tại:
`frontend/public/models/avaturn_model.glb`

Mô hình này cần có các Morph Targets theo đúng tên chuẩn ARKit để component có thể nhận diện và điều khiển.
