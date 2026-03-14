'use client';

import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { NovaAvatarView } from '../../components/NovaAvatarView';
import { useChatStore } from '../../store/useChatStore';

/**
 * Trang kiểm thử (Test Page) cho các hành động (animations) của NovaAvatar.
 * Cho phép nhà phát triển kích hoạt thủ công các trạng thái để kiểm tra chuyển động.
 */
export default function TestAnimationsPage() {
  const { 
    isSpeaking, 
    currentEmotion, 
    setEmotion, 
    setSpeaking,
    isMuted,
    setMuted
  } = useChatStore();

  const [testBlendshapes, setTestBlendshapes] = useState<Record<string, number>>({
    jawOpen: 0,
    mouthSmileLeft: 0,
    mouthSmileRight: 0,
    eyeBlinkLeft: 0,
    eyeBlinkRight: 0,
    browInnerUp: 0,
    mouthPucker: 0,
    eyeWideLeft: 0,
  });
  const [rotationY, setRotationY] = useState(0.43);
  const [autoDemo, setAutoDemo] = useState(false);

  const emotions = ['neutral', 'happy', 'sad', 'confused', 'excited', 'angry'];

  const presets = {
    smile: () => setTestBlendshapes({ ...testBlendshapes, mouthSmileLeft: 1, mouthSmileRight: 1 }),
    talk: () => setTestBlendshapes({ ...testBlendshapes, jawOpen: 0.5 }),
    blink: () => setTestBlendshapes({ ...testBlendshapes, eyeBlinkLeft: 1, eyeBlinkRight: 1 }),
    surprised: () => setTestBlendshapes({ ...testBlendshapes, eyeWideLeft: 1, jawOpen: 0.5 }),
    kiss: () => setTestBlendshapes({ ...testBlendshapes, mouthPucker: 1 }),
  };

  const handleBlendshapeChange = (name: string, value: number) => {
    setTestBlendshapes(prev => ({ ...prev, [name]: value }));
  };

  return (
    <main className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Cửa sổ xem 3D (Bên trái) */}
      <section className="relative w-2/3 h-full bg-slate-900 border-r border-slate-800">
        <div className="absolute top-4 left-4 z-10 bg-slate-800/80 p-3 rounded-lg border border-slate-700">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Trạng thái hiện tại</h2>
          <p className="text-lg font-medium">Cảm xúc: <span className="text-blue-400 capitalize">{currentEmotion}</span></p>
          <p className="text-lg font-medium">Đang nói: <span className={isSpeaking ? "text-green-400" : "text-rose-400"}>{isSpeaking ? 'BẬT' : 'TẮT'}</span></p>
        </div>

        <Canvas camera={{ position: [0, 1.70, 1.2], fov: 35 }}>
          <Suspense fallback={null}>
            <Environment preset="city" />
            <ambientLight intensity={0.5} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
            
            <NovaAvatarView 
              blendshapes={testBlendshapes} 
              currentEmotion={currentEmotion} 
              isSpeaking={isSpeaking}
              rotationY={rotationY}
            />
            
            <ContactShadows opacity={0.5} scale={10} blur={1} far={10} resolution={256} color="#000000" />
            <OrbitControls 
              target={[0, 1.70, 0]} 
              enableZoom={false}
              enablePan={false}
            />
          </Suspense>
        </Canvas>
      </section>

      {/* Bảng điều khiển (Bên phải) */}
      <section className="w-1/3 h-full p-8 flex flex-col gap-8 bg-slate-950 overflow-y-auto">
        <div>
          <h1 className="text-2xl font-bold mb-2">Kiểm thử Giao diện AI</h1>
          <p className="text-slate-400 text-sm">Kiểm tra Animation, Cảm xúc và Lip-sync của NovaAvatar.</p>
        </div>

        {/* Lip-sync & Face Test */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Lip-sync & Biểu cảm (Blendshapes)</h3>

          {/* Preset Buttons */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <button onClick={presets.smile} className="px-3 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-xs font-medium transition-colors">
              😊 Smile
            </button>
            <button onClick={presets.talk} className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-medium transition-colors">
              💬 Talk
            </button>
            <button onClick={presets.blink} className="px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-xs font-medium transition-colors">
              😉 Blink
            </button>
            <button onClick={presets.surprised} className="px-3 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-xs font-medium transition-colors">
              😲 Surprise
            </button>
            <button onClick={presets.kiss} className="px-3 py-2 bg-pink-600 hover:bg-pink-500 rounded-lg text-xs font-medium transition-colors">
              😘 Kiss
            </button>
            <button
              onClick={() => setAutoDemo(!autoDemo)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                autoDemo ? 'bg-green-600 hover:bg-green-500 animate-pulse' : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              {autoDemo ? '⏸️ Stop' : '▶️ Auto'}
            </button>
          </div>

          <div className="space-y-3 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
            {Object.entries(testBlendshapes).map(([name, value]) => (
              <div key={name} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">{name}</span>
                  <span className="text-blue-400 font-mono">{value.toFixed(2)}</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01" 
                  value={value}
                  onChange={(e) => handleBlendshapeChange(name, parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            ))}
            <button 
              onClick={() => setTestBlendshapes({
                jawOpen: 0, mouthSmileLeft: 0, mouthSmileRight: 0, 
                eyeBlinkLeft: 0, eyeBlinkRight: 0, browInnerUp: 0,
                mouthPucker: 0, eyeWideLeft: 0
              })}
              className="w-full mt-2 py-2 text-xs bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Reset Blendshapes
            </button>
          </div>
        </div>

        {/* Nhóm nút Cảm xúc */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Xoay Model (Rotation Y)</h3>
          <div className="space-y-3 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Angle (Radians)</span>
              <span className="text-blue-400 font-mono">{rotationY.toFixed(2)}</span>
            </div>
            <input 
              type="range" 
              min="-3.14" 
              max="3.14" 
              step="0.01" 
              value={rotationY}
              onChange={(e) => setRotationY(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <button 
              onClick={() => setRotationY(0.43)}
              className="w-full mt-2 py-2 text-xs bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Reset Rotation
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Kích hoạt Body Animation</h3>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => { setEmotion('excited'); setSpeaking(true); }}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium transition-colors flex flex-col items-center gap-1"
            >
              <span>Bắt đầu nói</span>
              <span className="text-[10px] opacity-70">(Talking_2)</span>
            </button>
            <button 
              onClick={() => { setEmotion('neutral'); setSpeaking(true); }}
              className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-medium transition-colors flex flex-col items-center gap-1"
            >
              <span>Tiếp tục nói</span>
              <span className="text-[10px] opacity-70">(Talking_1)</span>
            </button>
            <button 
              onClick={() => { setEmotion('angry'); setSpeaking(false); }}
              className="px-4 py-3 bg-orange-600 hover:bg-orange-500 rounded-xl font-medium transition-colors flex flex-col items-center gap-1"
            >
              <span>Tức giận</span>
              <span className="text-[10px] opacity-70">(Angry)</span>
            </button>
            <button 
              onClick={() => { setEmotion('sad'); setSpeaking(false); }}
              className="px-4 py-3 bg-rose-600 hover:bg-rose-500 rounded-xl font-medium transition-colors flex flex-col items-center gap-1"
            >
              <span>Buồn bã</span>
              <span className="text-[10px] opacity-70">(Sad)</span>
            </button>
          </div>
        </div>

        {/* Điều khiển riêng lẻ */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Trạng thái Cảm xúc (Emotion)</h3>
          <div className="flex flex-wrap gap-2">
            {emotions.map(e => (
              <button
                key={e}
                onClick={() => setEmotion(e)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  currentEmotion === e 
                    ? 'bg-white text-slate-900 scale-105 shadow-lg' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {e.charAt(0).toUpperCase() + e.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Trạng thái Nói (Speaking)</h3>
          <button
            onClick={() => setSpeaking(!isSpeaking)}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              isSpeaking 
                ? 'bg-rose-500 hover:bg-rose-600 animate-pulse' 
                : 'bg-slate-800 hover:bg-slate-700'
            }`}
          >
            {isSpeaking ? 'DỪNG NÓI' : 'BẮT ĐẦU NÓI'}
          </button>
        </div>

        <div className="mt-auto pt-8 border-t border-slate-800">
          <a 
            href="/"
            className="text-slate-500 hover:text-white transition-colors flex items-center gap-2"
          >
            ← Quay lại Dashboard chính
          </a>
        </div>
      </section>
    </main>
  );
}
