'use client';

import React, { useEffect, useState, Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { useNovaTutorSocket } from '../hooks/useNovaTutorSocket';
import { NovaAvatarView } from '../components/NovaAvatarView';
import { useChatStore } from '../store/useChatStore';

// Icons placeholders (using simple emoji or Lucide-like icons via SVG)
const MicIcon = ({ muted }: { muted: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {muted ? (
      <>
        <line x1="1" y1="1" x2="23" y2="23"></line>
        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
        <line x1="12" y1="19" x2="12" y2="23"></line>
        <line x1="8" y1="23" x2="16" y2="23"></line>
      </>
    ) : (
      <>
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
        <line x1="12" y1="19" x2="12" y2="23"></line>
        <line x1="8" y1="23" x2="16" y2="23"></line>
      </>
    )}
  </svg>
);

const RecordIcon = ({ active }: { active: boolean }) => (
  <div className={`w-4 h-4 rounded-full ${active ? 'bg-red-500 animate-pulse' : 'bg-red-900/40'}`} />
);

const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

export default function Home() {
  const { connect, disconnect, sendMessage, startRecording, stopRecording, currentViseme, isConnected, isRecording, isSpeaking, currentEmotion, transcript, debugInfo, error } = useNovaTutorSocket();
  const {
    messages, 
    isSpeaking: speakingState,
    currentEmotion: emotionState,
    isMuted,
    isRecording: recordingState,
    criticalError,
    learningProgress,
    setMuted,
    setRecording,
    addMessage,
    setEmotion,
    setSpeaking
  } = useChatStore();

  const [inputValue, setInputValue] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Don't auto-connect, let user start manually
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (inputValue.trim()) {
      const userMsg = { role: 'user' as const, content: inputValue };
      addMessage(userMsg);
      sendMessage({ text: inputValue });
      setInputValue('');
    }
  };

  const toggleVoiceChat = async () => {
    if (isConnected) {
      disconnect();
    } else {
      await connect();
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
    setRecording(!isRecording);
  };

  const getEmotionEmoji = (emotion: string) => {
    switch (emotion.toLowerCase()) {
      case 'happy': return '😊';
      case 'confused': return '🤔';
      case 'excited': return '🤩';
      case 'sad': return '😢';
      case 'angry': return '😠';
      default: return '😐';
    }
  };

  return (
    <main className={`flex h-screen flex-col bg-slate-950 text-slate-100 font-sans overflow-hidden transition-all duration-300 ${criticalError ? 'animate-border-flash' : ''}`}>

      {/* Main Layout: 60/40 Split */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Section (60%): 3D Viewport */}
        <section className="relative w-[60%] h-full bg-slate-900 overflow-hidden border-r border-slate-800">

          {/* Top Overlay: Emotion & Status */}
          <div className="absolute top-6 left-6 z-20 flex items-center gap-4">
            <div className="bg-slate-800/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700/50 shadow-xl flex items-center gap-3">
              <span className="text-2xl" title={`Cảm xúc: ${currentEmotion}`}>
                {getEmotionEmoji(currentEmotion)}
              </span>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Trạng thái</span>
                <span className="text-sm font-medium capitalize">{currentEmotion}</span>
              </div>
            </div>

            <a href="/test-animations" className="bg-slate-800/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700/50 shadow-xl flex items-center gap-2 hover:bg-slate-700 transition-colors text-[10px] uppercase tracking-widest font-bold text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              Test Actions
            </a>

            <div className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${isConnected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              {isConnected ? 'Hệ thống trực tuyến' : 'Mất kết nối'}
            </div>
          </div>

          {/* 3D Canvas */}
          <div className="w-full h-full cursor-grab active:cursor-grabbing">
            <Canvas camera={{ position: [0, 1.70, 1.2], fov: 35 }}>
              <Suspense fallback={null}>
                <Environment preset="city" />
                <ambientLight intensity={0.5} />
                <spotLight position={[5, 5, 5]} angle={0.15} penumbra={1} intensity={1} />
                <pointLight position={[-5, 5, -5]} intensity={0.5} />
                
                <NovaAvatarView 
                  modelPath="/models/avaturn_model.glb"
                  blendshapes={currentViseme}
                  currentEmotion={currentEmotion}
                  isSpeaking={isSpeaking}
                  rotationY={0.49} // Đã chỉnh 0.49 theo quan sát của bạn cho trạng thái Idle
                />
                
                <ContactShadows 
                  opacity={0.4} 
                  scale={10} 
                  blur={2.5} 
                  far={1.6} 
                  resolution={256} 
                  color="#000000" 
                />
                <OrbitControls 
                  target={[0, 1.70, 0]} 
                  minPolarAngle={Math.PI / 2.5} 
                  maxPolarAngle={Math.PI / 1.8}
                  enableZoom={false}
                  enablePan={false}
                />
              </Suspense>
            </Canvas>
          </div>

          {/* Critical Error Alert */}
          {criticalError && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 bg-rose-600 text-white px-6 py-3 rounded-xl shadow-2xl animate-bounce flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase">Cảnh báo hệ thống</span>
                <span className="text-sm font-medium">{criticalError}</span>
              </div>
            </div>
          )}

          {/* Speaking Indicator */}
          {isSpeaking && (
            <div className="absolute bottom-10 left-10 z-20 flex items-center gap-3 bg-blue-600/20 backdrop-blur-sm border border-blue-500/30 px-4 py-2 rounded-full shadow-lg">
              <div className="flex gap-1 h-3 items-end">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s`, height: `${30 + Math.random() * 70}%` }} />
                ))}
              </div>
              <span className="text-xs font-bold text-blue-300 uppercase tracking-widest">Gia sư đang trả lời...</span>
            </div>
          )}
        </section>

        {/* Right Section (40%): Sidebar */}
        <aside className="w-[40%] flex flex-col bg-slate-900/50 backdrop-blur-md h-full">
          
          {/* Progress Section */}
          <div className="p-6 border-b border-slate-800">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-6">Learning Progress</h2>
            <div className="space-y-5">
              {learningProgress.map((item, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-300">{item.subject}</span>
                    <span className="text-blue-400 font-bold">{Math.round((item.score / item.total) * 100)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-1000 ease-out"
                      style={{ width: `${(item.score / item.total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transcript & Debug Info Section */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Transcript & Debug Info</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
              <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Transcript</h3>
                <div className="text-sm text-slate-200 whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {transcript || "Start speaking to see the conversation here..."}
                </div>
              </div>
              {debugInfo && (
                <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Debug Info</h3>
                  <div className="text-xs text-slate-400 font-mono">
                    {debugInfo}
                  </div>
                </div>
              )}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-red-400 mb-3">Error</h3>
                  <div className="text-sm text-red-300">
                    {error}
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom Control Bar */}
      <footer className="h-24 bg-slate-950 border-t border-slate-800 px-8 flex items-center gap-6 z-40">

        {/* Interaction Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleVoiceChat}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              isConnected
              ? 'bg-emerald-500 text-black shadow-emerald-500/40'
              : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
            }`}
            title={isConnected ? 'Dừng voice chat' : 'Bắt đầu voice chat'}
          >
            {isConnected ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="2" ry="2"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7"/>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
            )}
          </button>

          <button
            onClick={() => setMuted(!isMuted)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              isMuted 
              ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' 
              : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
            }`}
            title={isMuted ? 'Bật mic' : 'Tắt mic'}
          >
            <MicIcon muted={isMuted} />
          </button>

          <button 
            onClick={toggleRecording}
            className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border ${
              isRecording 
              ? 'bg-red-500/10 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
              : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
            } ${isSpeaking && isRecording ? 'animate-pulse-red' : ''}`}
            title={isRecording ? 'Dừng ghi âm' : 'Bắt đầu ghi âm'}
          >
            <RecordIcon active={isRecording} />
            <span className="text-[8px] font-bold uppercase tracking-tighter text-red-500/80">Rec</span>
          </button>
        </div>

        {/* Text Input */}
        <div className="flex-1 relative">
          <input 
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Nhập tin nhắn hoặc câu hỏi cho NovaTutor..."
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
          />
          <button 
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:hover:bg-blue-600 text-white rounded-xl flex items-center justify-center transition-all shadow-lg"
          >
            <SendIcon />
          </button>
        </div>

        {/* Shortcut Info */}
        <div className="hidden xl:flex flex-col items-end gap-1 opacity-40">
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px]">Enter</kbd>
            <span className="text-[10px]">Gửi nhanh</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px]">Space</kbd>
            <span className="text-[10px]">Ghi âm</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
