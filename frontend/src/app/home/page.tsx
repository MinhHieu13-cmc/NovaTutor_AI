'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { NovaAvatarView } from '@/components/NovaAvatarView';
import Link from 'next/link';
import { motion } from 'framer-motion';

// Feature Cards with Glassmorphism
const FeatureCard = ({ icon, title, description }: any) => (
  <motion.div
    whileHover={{ y: -5 }}
    className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all"
  >
    <div className="text-4xl mb-4">{icon}</div>
    <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
    <p className="text-slate-300 text-sm">{description}</p>
  </motion.div>
);

// Floating Stat Card
const StatCard = ({ number, label }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="backdrop-blur-md bg-blue-500/10 border border-blue-400/20 rounded-2xl p-6 text-center hover:bg-blue-500/20 transition-all"
  >
    <div className="text-3xl font-bold text-blue-400 mb-2">{number}</div>
    <p className="text-slate-300 text-sm">{label}</p>
  </motion.div>
);

export default function HomePage() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <main className="w-full min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-md bg-slate-950/30 border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            NovaTutor AI
          </h1>
          <div className="flex gap-4">
            <Link
              href="/auth?mode=login"
              className="px-6 py-2 rounded-lg border border-slate-600 hover:border-slate-400 transition-colors"
            >
              Đăng nhập
            </Link>
            <Link
              href="/auth?mode=register"
              className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Đăng ký
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="h-screen flex items-center relative pt-20 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-blue-400 rounded-full"
              initial={{ x: Math.random() * 1000, y: Math.random() * 800, opacity: 0 }}
              animate={{
                x: Math.random() * 1000,
                y: Math.random() * 800,
                opacity: [0, 1, 0],
              }}
              transition={{ duration: Math.random() * 10 + 10, repeat: Infinity }}
            />
          ))}
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-2 gap-12 items-center relative z-10 px-6">
          {/* Left: Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Gia sư <span className="text-transparent bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text">AI 3D</span> Thế hệ mới
            </h2>
            <p className="text-xl text-slate-300 mb-8 leading-relaxed">
              Học tập trực tiếp cùng gia sư AI thông minh, hỗ trợ 24/7 với công nghệ ngôn ngữ tự nhiên tiên tiến.
            </p>
            <div className="flex gap-4">
              <Link
                href="/auth?mode=register"
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg font-bold hover:shadow-lg hover:shadow-blue-500/50 transition-all text-lg"
              >
                Bắt đầu học ngay
              </Link>
              <button className="px-8 py-3 border-2 border-slate-400 rounded-lg font-bold hover:bg-slate-400/10 transition-all">
                Xem Demo
              </button>
            </div>

            {/* Badges */}
            <div className="flex gap-4 mt-12">
              <span className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-full text-sm">
                ✨ Powered by Gemini 2.5 Live
              </span>
              <span className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-full text-sm">
                🎮 ARKit Ready
              </span>
            </div>
          </motion.div>

          {/* Right: 3D Avatar */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="h-96 relative"
          >
            <Canvas camera={{ position: [0, 1.70, 1.2], fov: 35 }}>
              <Suspense fallback={null}>
                <Environment preset="city" />
                <ambientLight intensity={0.5} />
                <spotLight position={[5, 5, 5]} angle={0.15} penumbra={1} intensity={1} />
                <NovaAvatarView
                  modelPath="/models/avaturn_model.glb"
                  blendshapes={{}}
                  currentEmotion="happy"
                  isSpeaking={false}
                  rotationY={0.49}
                />
                <ContactShadows opacity={0.4} scale={10} blur={2.5} far={1.6} resolution={256} color="#000000" />
                <OrbitControls target={[0, 1.70, 0]} minPolarAngle={Math.PI / 2.5} maxPolarAngle={Math.PI / 1.8} enableZoom={false} enablePan={false} />
              </Suspense>
            </Canvas>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="text-4xl font-bold mb-12 text-center"
        >
          Tính năng nổi bật
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon="🎤"
            title="Học qua giọng nói"
            description="Tương tác tự nhiên với gia sư AI bằng tiếng nói thực"
          />
          <FeatureCard
            icon="😊"
            title="Phân tích cảm xúc"
            description="AI theo dõi tâm trạng học tập và điều chỉnh phương pháp"
          />
          <FeatureCard
            icon="📚"
            title="Lộ trình cá nhân"
            description="Mỗi học sinh có lộ trình học tập được tùy chỉnh riêng"
          />
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <StatCard number="98%" label="Học sinh tiến bộ" />
          <StatCard number="24/7" label="Hỗ trợ liên tục" />
          <StatCard number="150+" label="Khóa học" />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 max-w-7xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="backdrop-blur-md bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-400/30 rounded-3xl p-12"
        >
          <h3 className="text-3xl font-bold mb-4">Sẵn sàng bắt đầu?</h3>
          <p className="text-slate-300 mb-8 text-lg">Tham gia hàng nghìn học sinh đang học cùng gia sư AI</p>
          <Link
            href="/auth?mode=register"
            className="inline-block px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg font-bold hover:shadow-lg hover:shadow-blue-500/50 transition-all text-lg"
          >
            Đăng ký miễn phí
          </Link>
        </motion.div>
      </section>
    </main>
  );
}

