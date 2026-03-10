'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Sidebar Navigation
const Sidebar = ({ active }: { active: string }) => {
  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 h-screen fixed left-0 top-0 flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
          NovaTutor
        </h1>
        <p className="text-xs text-slate-400 mt-1">Học sinh</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {[
          { id: 'dashboard', label: '📊 Tổng quan', icon: '📊' },
          { id: 'courses', label: '📚 Khóa học của tôi', icon: '📚' },
          { id: 'ai-lab', label: '🤖 AI Learning Lab', icon: '🤖' },
          { id: 'progress', label: '📈 Tiến độ', icon: '📈' },
          { id: 'settings', label: '⚙️ Cài đặt', icon: '⚙️' },
        ].map((item) => (
          <Link
            key={item.id}
            href={`/dashboard/student/${item.id}`}
            className={`block px-4 py-3 rounded-lg transition-all ${
              active === item.id
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button className="w-full px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-all text-sm">
          Đăng xuất
        </button>
      </div>
    </aside>
  );
};

// Course Card
const CourseCard = ({ course }: { course: any }) => (
  <motion.div
    whileHover={{ y: -5 }}
    className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all cursor-pointer group"
  >
    <div className="flex justify-between items-start mb-4">
      <div>
        <h3 className="text-lg font-bold text-white mb-1">{course.name}</h3>
        <p className="text-sm text-slate-400">{course.subject}</p>
      </div>
      <span className="px-3 py-1 bg-blue-600/20 text-blue-300 rounded-full text-xs font-bold">
        {course.progress}%
      </span>
    </div>

    {/* Progress Bar */}
    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden mb-4">
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: `${course.progress}%` }}
        transition={{ duration: 1 }}
        className="h-full bg-gradient-to-r from-blue-600 to-cyan-500"
      />
    </div>

    <p className="text-xs text-slate-400 mb-4">{course.lessons} bài học</p>

    <Link
      href={`/dashboard/student/ai-lab/${course.id}`}
      className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-bold group-hover:shadow-lg group-hover:shadow-blue-500/50"
    >
      Tiếp tục học
    </Link>
  </motion.div>
);

// Progress Card
const ProgressCard = ({ subject, score, total }: { subject: string; score: number; total: number }) => (
  <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-4">
    <div className="flex justify-between items-center mb-3">
      <h4 className="font-bold text-white">{subject}</h4>
      <span className="text-blue-400 font-bold">{Math.round((score / total) * 100)}%</span>
    </div>
    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: `${(score / total) * 100}%` }}
        transition={{ duration: 1.5 }}
        className="h-full bg-gradient-to-r from-blue-600 to-purple-600"
      />
    </div>
  </div>
);

export default function StudentDashboard() {
  const router = useRouter();
  const [active, setActive] = useState('dashboard');
  const [myCourses, setMyCourses] = useState([
    {
      id: '1',
      name: 'Toán học cơ bản',
      subject: 'Math',
      progress: 75,
      lessons: 12,
    },
    {
      id: '2',
      name: 'Tiếng Anh giao tiếp',
      subject: 'English',
      progress: 55,
      lessons: 18,
    },
    {
      id: '3',
      name: 'Vật lý thực hành',
      subject: 'Physics',
      progress: 40,
      lessons: 15,
    },
  ]);

  const [availableCourses, setAvailableCourses] = useState([
    {
      id: '4',
      name: 'Lập trình Python',
      subject: 'Programming',
      lessons: 20,
    },
    {
      id: '5',
      name: 'Lịch sử thế giới',
      subject: 'History',
      lessons: 25,
    },
  ]);

  return (
    <>
      <Sidebar active={active} />
      <main className="w-full min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
        {/* Main Content */}
        <div className="ml-64 p-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-12">
          <div>
            <h2 className="text-4xl font-bold mb-2">Chào bạn! 👋</h2>
            <p className="text-slate-400">Hôm nay bạn đã học 45 phút, tiếp tục thêm 15 phút nữa nào!</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-400">67 điểm</div>
            <p className="text-sm text-slate-400">Hôm nay</p>
          </div>
        </div>

        {/* Dashboard Section */}
        {active === 'dashboard' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            {/* Learning Stats */}
            <section>
              <h3 className="text-2xl font-bold mb-6">📊 Tiến độ học tập</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ProgressCard subject="Toán học" score={9} total={12} />
                <ProgressCard subject="Tiếng Anh" score={10} total={18} />
                <ProgressCard subject="Vật lý" score={6} total={15} />
              </div>
            </section>

            {/* My Courses */}
            <section>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">📚 Khóa học của tôi</h3>
                <Link href="/dashboard/student/courses" className="text-blue-400 hover:text-blue-300 text-sm font-bold">
                  Xem tất cả →
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {myCourses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            </section>

            {/* Available Courses */}
            <section>
              <h3 className="text-2xl font-bold mb-6">✨ Khóa học mới</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {availableCourses.map((course) => (
                  <motion.div
                    key={course.id}
                    whileHover={{ y: -5 }}
                    className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all"
                  >
                    <h4 className="text-lg font-bold text-white mb-2">{course.name}</h4>
                    <p className="text-sm text-slate-400 mb-4">{course.lessons} bài học</p>
                    <button className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all font-bold">
                      Tham gia khóa học
                    </button>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Quick Actions */}
            <section>
              <h3 className="text-2xl font-bold mb-6">🚀 Hành động nhanh</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { icon: '🤖', label: 'Bắt đầu AI Lab', href: '/dashboard/student/ai-lab' },
                  { icon: '📝', label: 'Làm bài tập', href: '#' },
                  { icon: '🎯', label: 'Kiểm tra thực hành', href: '#' },
                  { icon: '📞', label: 'Hỏi gia sư', href: '#' },
                ].map((action, idx) => (
                  <Link
                    key={idx}
                    href={action.href}
                    className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all text-center group"
                  >
                    <div className="text-3xl mb-3">{action.icon}</div>
                    <p className="font-bold text-white group-hover:text-blue-300 transition-colors">{action.label}</p>
                  </Link>
                ))}
              </div>
            </section>
          </motion.div>
        )}

        {/* Courses Section */}
        {active === 'courses' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h3 className="text-2xl font-bold mb-6">📚 Tất cả khóa học</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...myCourses, ...availableCourses].map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </motion.div>
        )}

        {/* AI Lab Section */}
        {active === 'ai-lab' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <h3 className="text-3xl font-bold mb-4">🤖 AI Learning Lab</h3>
            <p className="text-slate-400 mb-8">Chọn một khóa học để bắt đầu học với gia sư AI</p>
            <Link
              href="/ai-lab"
              className="inline-block px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg font-bold hover:shadow-lg hover:shadow-blue-500/50 transition-all"
            >
              Vào AI Lab
            </Link>
          </motion.div>
        )}
      </div>
      </main>
    </>
  );
}

