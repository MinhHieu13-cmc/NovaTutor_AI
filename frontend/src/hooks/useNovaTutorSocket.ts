import { useState, useEffect, useCallback, useRef } from 'react';

interface LipSyncFrame {
  time: number;
  shape: string; // Tên của blendshape ARKit
}

interface AvatarEvent {
  type: 'avatar_event';
  audio: string; // Base64
  lip_sync: LipSyncFrame[];
  emotion: string;
}

interface NovaTutorSocketHook {
  connect: () => void;
  disconnect: () => void;
  sendMessage: (message: any) => void;
  currentViseme: Record<string, number>; // ARKit Blendshapes { eyeBlinkLeft: 0, jawOpen: 0.5, ... }
  currentEmotion: string;
  isSpeaking: boolean;
  isConnected: boolean;
}

/**
 * Custom Hook React: useNovaTutorSocket
 * Dành cho dự án NovaTutor AI (Phase 4.1)
 * Hỗ trợ Web Audio API, ARKit 52 Blendshapes và WebSocket streaming.
 */
export const useNovaTutorSocket = (url: string = 'ws://localhost:8000/api/v1/ws/chat'): NovaTutorSocketHook => {
  const [isConnected, setIsConnected] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentViseme, setCurrentViseme] = useState<Record<string, number>>({});

  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Khởi tạo AudioContext
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Xử lý âm thanh và LipSync
  const handleAvatarEvent = useCallback(async (event: AvatarEvent) => {
    if (!audioContextRef.current) return;

    // 1. Chuyển đổi Base64 sang ArrayBuffer
    const audioData = atob(event.audio);
    const arrayBuffer = new ArrayBuffer(audioData.length);
    const view = new Uint8Array(arrayBuffer);
    for (let i = 0; i < audioData.length; i++) {
      view[i] = audioData.charCodeAt(i);
    }

    // 2. Decode Audio
    try {
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);

      const startTime = audioContextRef.current.currentTime;
      source.start(startTime);
      setIsSpeaking(true);
      setCurrentEmotion(event.emotion);

      // 3. Đồng bộ khẩu hình (LipSync) theo thời gian thực
      const updateLipSync = () => {
        if (!audioContextRef.current) return;
        const elapsedTime = audioContextRef.current.currentTime - startTime;

        if (elapsedTime >= audioBuffer.duration) {
          setIsSpeaking(false);
          setCurrentViseme({});
          if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
          return;
        }

        // Tìm frame phù hợp nhất trong mảng timings
        // Với ARKit, chúng ta thường ánh xạ shape name sang giá trị intensity (0-1)
        const currentFrame = event.lip_sync.reduce((prev, curr) => {
          return (Math.abs(curr.time - elapsedTime) < Math.abs(prev.time - elapsedTime) ? curr : prev);
        });

        // Ánh xạ sang cấu trúc Blendshape (Ví dụ: "jawOpen")
        // Giả sử server trả về shape theo tên ARKit
        const newViseme: Record<string, number> = {};
        if (currentFrame && elapsedTime >= currentFrame.time - 0.05) {
             newViseme[currentFrame.shape] = 1.0; // Full intensity cho viseme hiện tại
        }
        
        setCurrentViseme(newViseme);
        animationFrameRef.current = requestAnimationFrame(updateLipSync);
      };

      animationFrameRef.current = requestAnimationFrame(updateLipSync);

      source.onended = () => {
        setIsSpeaking(false);
        setCurrentViseme({});
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };

    } catch (err) {
      console.error("Error decoding audio:", err);
    }
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;

    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => setIsConnected(true);
    socket.onclose = () => setIsConnected(false);
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'avatar_event') {
          handleAvatarEvent(data);
        }
      } catch (e) {
        console.error("Socket message error:", e);
      }
    };

    return () => socket.close();
  }, [url, handleAvatarEvent]);

  const disconnect = useCallback(() => {
    socketRef.current?.close();
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.warn("Socket is not open.");
    }
  }, []);

  return {
    connect,
    disconnect,
    sendMessage,
    currentViseme,
    currentEmotion,
    isSpeaking,
    isConnected
  };
};
