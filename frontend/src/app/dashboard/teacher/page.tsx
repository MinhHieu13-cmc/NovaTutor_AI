'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

// Teacher Sidebar
const TeacherSidebar = ({ active }: { active: string }) => {
  return (
    <aside className="w-64 bg-gradient-to-b from-slate-900 to-slate-950 border-r border-slate-800 h-screen fixed left-0 top-0 flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          NovaTutor
        </h1>
        <p className="text-xs text-slate-400 mt-1">Giảng viên</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {[
          { id: 'dashboard', label: '📊 Bảng điều khiển', icon: '📊' },
          { id: 'courses', label: '📚 Quản lý khóa học', icon: '📚' },
          { id: 'knowledge', label: '📖 Kho tri thức', icon: '📖' },
          { id: 'students', label: '👥 Theo dõi học sinh', icon: '👥' },
          { id: 'analytics', label: '📈 Phân tích chi tiết', icon: '📈' },
          { id: 'ai-config', label: '🎛️ Cấu hình AI', icon: '🎛️' },
        ].map((item) => (
          <Link
            key={item.id}
            href={`/dashboard/teacher/${item.id}`}
            className={`block px-4 py-3 rounded-lg transition-all ${
              active === item.id
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 space-y-2">
        <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all text-sm font-bold">
          + Tạo khóa học
        </button>
        <button className="w-full px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-all text-sm">
          Đăng xuất
        </button>
      </div>
    </aside>
  );
};

// Stat Card
const StatCard = ({ icon, label, value, trend }: any) => (
  <motion.div
    whileHover={{ y: -5 }}
    className="backdrop-blur-md bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all"
  >
    <div className="flex justify-between items-start mb-2">
      <span className="text-3xl">{icon}</span>
      {trend && (
        <span className={`text-sm font-bold ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </span>
      )}
    </div>
    <p className="text-slate-400 text-sm mb-1">{label}</p>
    <p className="text-2xl font-bold text-white">{value}</p>
  </motion.div>
);

// Course Item
const CourseItem = ({ course }: { course: any }) => (
  <motion.div
    whileHover={{ x: 5 }}
    className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all"
  >
    <div className="flex justify-between items-start mb-4">
      <div>
        <h4 className="text-lg font-bold text-white mb-1">{course.name}</h4>
        <p className="text-sm text-slate-400">{course.students} học sinh • {course.documents} tài liệu</p>
      </div>
      <button className="text-slate-400 hover:text-white transition-colors">⋯</button>
    </div>

    {/* Stats */}
    <div className="grid grid-cols-3 gap-4 mb-4 pt-4 border-t border-white/10">
      <div className="text-center">
        <div className="text-xs text-slate-400">Tương tác</div>
        <div className="text-sm font-bold text-blue-400">{course.engagement}%</div>
      </div>
      <div className="text-center">
        <div className="text-xs text-slate-400">Hoàn thành</div>
        <div className="text-sm font-bold text-green-400">{course.completion}%</div>
      </div>
      <div className="text-center">
        <div className="text-xs text-slate-400">Trung bình</div>
        <div className="text-sm font-bold text-purple-400">{course.avgScore}</div>
      </div>
    </div>

    <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all text-sm font-bold">
      Quản lý
    </button>
  </motion.div>
);

export default function TeacherDashboard() {
  const [active, setActive] = useState('dashboard');

  const [courses, setCourses] = useState([
    {
      id: '1',
      name: 'Toán học cơ bản',
      students: 28,
      documents: 15,
      engagement: 85,
      completion: 72,
      avgScore: 7.8,
    },
    {
      id: '2',
      name: 'Tiếng Anh giao tiếp',
      students: 32,
      documents: 22,
      engagement: 92,
      completion: 68,
      avgScore: 7.5,
    },
    {
      id: '3',
      name: 'Vật lý thực hành',
      students: 18,
      documents: 20,
      engagement: 78,
      completion: 55,
      avgScore: 7.2,
    },
  ]);

  return (
    <main className="w-full min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <TeacherSidebar active={active} />

      {/* Main Content */}
      <div className="ml-64 p-8">
        {/* Header */}
        <div className="mb-12">
          <h2 className="text-4xl font-bold mb-2">Bảng điều khiển giảng viên</h2>
          <p className="text-slate-400">Quản lý khóa học, tài liệu, và theo dõi tiến độ học sinh</p>
        </div>

        {/* Dashboard Section */}
        {active === 'dashboard' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            {/* Overview Stats */}
            <section>
              <h3 className="text-2xl font-bold mb-6">📊 Tổng quan</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard icon="👥" label="Tổng học sinh" value="78" trend={12} />
                <StatCard icon="📚" label="Khóa học hoạt động" value="3" trend={0} />
                <StatCard icon="📄" label="Tài liệu" value="57" trend={8} />
                <StatCard icon="⭐" label="Avg Engagement" value="85%" trend={5} />
              </div>
            </section>

            {/* Heatmap Cảm xúc */}
            <section>
              <h3 className="text-2xl font-bold mb-6">😊 Trạng thái cảm xúc lớp học</h3>
              <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-8">
                <div className="grid grid-cols-5 gap-4 text-center">
                  {[
                    { emoji: '😊', label: 'Vui vẻ', count: 42 },
                    { emoji: '😐', label: 'Trung lập', count: 28 },
                    { emoji: '🤔', label: 'Tập trung', count: 18 },
                    { emoji: '😓', label: 'Căng thẳng', count: 8 },
                    { emoji: '😴', label: 'Mệt mỏi', count: 2 },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="text-4xl mb-2">{item.emoji}</div>
                      <p className="text-sm text-slate-400 mb-1">{item.label}</p>
                      <p className="text-lg font-bold text-white">{item.count}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Recent Courses */}
            <section>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">📚 Khóa học của bạn</h3>
                <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all text-sm font-bold">
                  + Khóa học mới
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <CourseItem key={course.id} course={course} />
                ))}
              </div>
            </section>

            {/* Quick Actions */}
            <section>
              <h3 className="text-2xl font-bold mb-6">🚀 Hành động nhanh</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { icon: '📄', label: 'Upload tài liệu', href: '#' },
                  { icon: '🎛️', label: 'Cấu hình AI Voice', href: '#' },
                  { icon: '📊', label: 'Xem báo cáo', href: '#' },
                  { icon: '⚙️', label: 'Cài đặt khóa học', href: '#' },
                ].map((action, idx) => (
                  <Link
                    key={idx}
                    href={action.href}
                    className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all text-center group"
                  >
                    <div className="text-3xl mb-3">{action.icon}</div>
                    <p className="font-bold text-white group-hover:text-purple-300 transition-colors text-sm">{action.label}</p>
                  </Link>
                ))}
              </div>
            </section>
          </motion.div>
        )}

        {/* Courses Management */}
        {active === 'courses' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h3 className="text-2xl font-bold mb-6">📚 Quản lý khóa học</h3>
            <button className="mb-6 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all font-bold">
              + Tạo khóa học mới
            </button>
            <div className="grid grid-cols-1 gap-6">
              {courses.map((course) => (
                <CourseItem key={course.id} course={course} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Knowledge Base */}
        {active === 'knowledge' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h3 className="text-2xl font-bold mb-6">📖 Kho tri thức</h3>
            <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-8">
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📄</div>
                <h4 className="text-xl font-bold mb-2">Upload tài liệu</h4>
                <p className="text-slate-400 mb-6">Kéo và thả PDF, Docx hoặc file Word của bạn vào đây</p>
                <button className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all font-bold">
                  Chọn file
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Students Tracking */}
        {active === 'students' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h3 className="text-2xl font-bold mb-6">👥 Theo dõi học sinh</h3>
            <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-6">
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📊</div>
                <h4 className="text-xl font-bold mb-2">Danh sách học sinh</h4>
                <p className="text-slate-400">Chi tiết tiến độ và thành tích sẽ hiển thị ở đây</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Analytics */}
        {active === 'analytics' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h3 className="text-2xl font-bold mb-6">📈 Phân tích chi tiết</h3>
            <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-6">
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📊</div>
                <h4 className="text-xl font-bold mb-2">Biểu đồ phân tích</h4>
                <p className="text-slate-400">Dữ liệu chi tiết về hiệu suất lớp học</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* AI Config */}
        {active === 'ai-config' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h3 className="text-2xl font-bold mb-6">🎛️ Cấu hình AI</h3>
            <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-8 space-y-6">
              {courses.map((course) => (
                <div key={course.id} className="border-b border-white/10 pb-6 last:border-0">
                  <h4 className="text-lg font-bold mb-4">{course.name}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm text-slate-400 block mb-2">Giọng nói</label>
                      <select className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none">
                        <option>Zephyr</option>
                        <option>Phoebe</option>
                        <option>Charon</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-slate-400 block mb-2">Tốc độ</label>
                      <input type="range" min="0.5" max="2" step="0.1" defaultValue="1" className="w-full" />
                    </div>
                    <div>
                      <label className="text-sm text-slate-400 block mb-2">Phong cách</label>
                      <select className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none">
                        <option>Chuyên nghiệp</option>
                        <option>Thân thiện</option>
                        <option>Khuyến khích</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              <button className="w-full mt-6 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all font-bold">
                Lưu cấu hình
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}

