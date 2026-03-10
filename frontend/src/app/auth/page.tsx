'use client';

import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { NovaAvatarView } from '@/components/NovaAvatarView';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/services/authService';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
  exit: { opacity: 0, transition: { duration: 0.3 } },
};

const formVariants = {
  hidden: { x: 100, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { duration: 0.4 } },
  exit: { x: -100, opacity: 0, transition: { duration: 0.3 } },
};

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') || 'login';

  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [avatarEmotion, setAvatarEmotion] = useState<'curious' | 'happy' | 'confused' | 'neutral'>('curious');

  const isStudent = role === 'student';

  const handleRegister = async () => {
    setIsLoading(true);
    setError('');
    setAvatarEmotion('curious');

    try {
      const response = await authService.register({ email, password, full_name: fullName, role });

      setAvatarEmotion('happy');
      setTimeout(() => {
        router.push(role === 'teacher' ? '/teacher' : '/student');
      }, 1500);
    } catch (err: any) {
      setAvatarEmotion('confused');
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    setError('');
    setAvatarEmotion('curious');

    try {
      const data = await authService.login({ email, password });

      setAvatarEmotion('happy');
      setTimeout(() => {
        router.push(data.user.role === 'teacher' ? '/teacher' : '/student');
      }, 1500);
    } catch (err: any) {
      setAvatarEmotion('confused');
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    // Implementation for Google OAuth would go here
    console.log('Google auth clicked');
  };

  return (
    <main className={`w-full min-h-screen flex overflow-hidden transition-all duration-500 ${
      isStudent
        ? 'bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950'
        : 'bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950'
    }`}>
      {/* Left: Avatar Stage */}
      <div className="hidden md:flex w-1/2 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0">
          {/* Particle Effects */}
          {[...Array(10)].map((_, i) => (
            <motion.div
              key={i}
              className={`absolute w-2 h-2 rounded-full ${isStudent ? 'bg-blue-400' : 'bg-purple-400'}`}
              animate={{
                x: [Math.random() * 500, Math.random() * 500],
                y: [Math.random() * 500, Math.random() * 500],
                opacity: [0, 1, 0],
              }}
              transition={{ duration: Math.random() * 8 + 8, repeat: Infinity }}
            />
          ))}
        </div>

        <div className="relative z-10 w-96 h-96">
          <Canvas camera={{ position: [0, 1.70, 1.2], fov: 35 }}>
            <Suspense fallback={null}>
              <Environment preset="city" />
              <ambientLight intensity={0.5} />
              <spotLight position={[5, 5, 5]} angle={0.15} penumbra={1} intensity={1} />
              <NovaAvatarView
                modelPath="/models/avaturn_model.glb"
                blendshapes={{}}
                currentEmotion={avatarEmotion}
                isSpeaking={false}
                rotationY={0.49}
              />
              <ContactShadows opacity={0.4} scale={10} blur={2.5} far={1.6} resolution={256} color="#000000" />
              <OrbitControls target={[0, 1.70, 0]} minPolarAngle={Math.PI / 2.5} maxPolarAngle={Math.PI / 1.8} enableZoom={false} enablePan={false} />
            </Suspense>
          </Canvas>
        </div>

        {/* Welcome Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="absolute bottom-10 left-6 right-6 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 text-center"
        >
          <p className="text-sm text-slate-300 mb-2">Chào bạn! Tôi là NovaTutor</p>
          <p className="text-xs text-slate-400">Hãy cho tôi biết về bạn để chúng ta bắt đầu</p>
        </motion.div>
      </div>

      {/* Right: Auth Form */}
      <div className={`w-full md:w-1/2 flex items-center justify-center p-6 relative`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Role Selector */}
          <div className="mb-8 flex gap-4 justify-center">
            {(['student', 'teacher'] as const).map((r) => (
              <motion.button
                key={r}
                onClick={() => { setRole(r); setAvatarEmotion('curious'); setError(''); }}
                className={`px-6 py-2 rounded-lg font-bold transition-all ${
                  role === r
                    ? isStudent
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50'
                      : 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {r === 'student' ? '🎓 Học sinh' : '👨‍🏫 Giảng viên'}
              </motion.button>
            ))}
          </div>

          {/* Form Container */}
          <AnimatePresence mode="wait">
            {mode === 'login' ? (
              <motion.div key="login" variants={formVariants} initial="hidden" animate="visible" exit="exit">
                <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-3xl p-8 space-y-6">
                  <h2 className="text-2xl font-bold">Đăng nhập</h2>

                  <div className="space-y-4">
                    <input
                      type="email"
                      placeholder="Email của bạn"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 transition-colors"
                    />
                    <input
                      type="password"
                      placeholder="Mật khẩu"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 transition-colors"
                    />
                  </div>

                  {error && <p className="text-red-400 text-sm">{error}</p>}

                  <button
                    onClick={handleLogin}
                    disabled={isLoading}
                    className={`w-full py-3 rounded-lg font-bold transition-all ${
                      isStudent
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    } disabled:opacity-50`}
                  >
                    {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                  </button>

                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-px bg-white/20"></div>
                    <p className="text-sm text-slate-400">Hoặc</p>
                    <div className="flex-1 h-px bg-white/20"></div>
                  </div>

                  <button
                    onClick={handleGoogleAuth}
                    className="w-full py-3 rounded-lg border border-white/20 hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                  >
                    <span>🔐</span> Đăng nhập bằng Google
                  </button>

                  <p className="text-center text-slate-400">
                    Chưa có tài khoản?{' '}
                    <Link href="/auth?mode=register" className="text-blue-400 hover:text-blue-300">
                      Đăng ký ngay
                    </Link>
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div key="register" variants={formVariants} initial="hidden" animate="visible" exit="exit">
                <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-3xl p-8 space-y-6">
                  <h2 className="text-2xl font-bold">Đăng ký</h2>

                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Họ tên"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 transition-colors"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 transition-colors"
                    />
                    <input
                      type="password"
                      placeholder="Mật khẩu"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 transition-colors"
                    />
                  </div>

                  {error && <p className="text-red-400 text-sm">{error}</p>}

                  <button
                    onClick={handleRegister}
                    disabled={isLoading}
                    className={`w-full py-3 rounded-lg font-bold transition-all ${
                      isStudent
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    } disabled:opacity-50`}
                  >
                    {isLoading ? 'Đang đăng ký...' : 'Đăng ký'}
                  </button>

                  <p className="text-center text-slate-400">
                    Đã có tài khoản?{' '}
                    <Link href="/auth?mode=login" className="text-blue-400 hover:text-blue-300">
                      Đăng nhập
                    </Link>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="w-full min-h-screen bg-slate-950 flex items-center justify-center">Loading...</div>}>
      <AuthPageContent />
    </Suspense>
  );
}

