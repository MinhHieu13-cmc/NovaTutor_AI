'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { authService } from '@/services/authService';
import { useRouteGuard } from '@/hooks/useRouteGuard';
import { courseService, type Course } from '@/services/courseService';
import { learningService, type StudentProgress } from '@/services/learningService';
import ChatInterface from '@/components/chat/ChatInterface';

type StudentTab =
  | 'dashboard'
  | 'my-courses'
  | 'guided-projects'
  | 'certificates'
  | 'saved-courses'
  | 'learning-schedule'
  | 'ai-assistant'
  | 'settings';

const studentMenu: Array<{ id: StudentTab; label: string; icon: string }> = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { id: 'my-courses', label: 'My Courses', icon: '📚' },
  { id: 'guided-projects', label: 'Guided Projects', icon: '🧠' },
  { id: 'certificates', label: 'Certificates', icon: '🎓' },
  { id: 'saved-courses', label: 'Saved Courses', icon: '⭐' },
  { id: 'learning-schedule', label: 'Learning Schedule', icon: '📅' },
  { id: 'ai-assistant', label: 'AI Assistant', icon: '🤖' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
];

const weeklyLearning = [4.5, 6.2, 5.1, 7.4, 6.8, 8.2, 5.9];

const upcomingDeadlines = [
  { name: 'Week 3 Quiz', course: 'Machine Learning Basics', due: '2026-03-14' },
  { name: 'Case Study Submission', course: 'Business Analytics', due: '2026-03-17' },
  { name: 'UI Prototype Review', course: 'UX Fundamentals', due: '2026-03-20' },
];

const earnedCertificates = [
  { course: 'Google Data Analytics', issuer: 'Google' },
  { course: 'Modern JavaScript', issuer: 'Meta' },
];

export default function StudentDashboard() {
  const { loading, user } = useRouteGuard({ mode: 'protected', role: 'student' });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<StudentTab>('dashboard');
  const [courses, setCourses] = useState<Course[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [progress, setProgress] = useState<StudentProgress | null>(null);

  useEffect(() => {
    const load = async () => {
      const my = await courseService.getStudentCourses();
      const all = await courseService.getAvailableCourses();
      setCourses(my);
      setAvailableCourses(all.filter((c) => !my.some((m) => m.id === c.id)));

      try {
        const progressData = await learningService.getStudentProgress(my[0]?.id);
        setProgress(progressData);
      } catch {
        setProgress(null);
      }
    };

    load().catch(() => undefined);
  }, []);

  const handleEnroll = async (courseId: string) => {
    await courseService.enrollInCourse(courseId);
    const my = await courseService.getStudentCourses();
    const all = await courseService.getAvailableCourses();
    setCourses(my);
    setAvailableCourses(all.filter((c) => !my.some((m) => m.id === c.id)));
  };

  const stats = useMemo(() => {
    return [
      { label: 'Courses in progress', value: String(courses.length || 0) },
      { label: 'Completed courses', value: String(Math.max(courses.length - 1, 0)) },
      { label: 'Certificates earned', value: String(earnedCertificates.length) },
      { label: 'Learning hours', value: '28h' },
    ];
  }, [courses.length]);

  const continueLearning = courses.slice(0, 3).map((course, index) => ({
    ...course,
    progress: 35 + index * 18,
  }));

  const recommendedCourses = availableCourses.slice(0, 4).map((course, index) => ({
    ...course,
    rating: (4.6 + index * 0.1).toFixed(1),
    students: `${(index + 3) * 12}k students`,
    level: index % 2 === 0 ? 'Beginner' : 'Intermediate',
  }));

  const progressBars =
    progress?.weekly_scores && progress.weekly_scores.length > 0
      ? progress.weekly_scores.map((item) => ({
          label: item.week_label,
          value: Math.max(0, Math.min(100, Math.round(item.score))),
        }))
      : weeklyLearning.map((value, index) => ({
          label: `W${index + 1}`,
          value: Math.round(value * 10),
        }));

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#F5F7FA]">Loading student dashboard...</div>;
  }

  const handleTabChange = (tab: StudentTab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  return (
    <main className="min-h-screen bg-[#F5F7FA] text-[#1F2937]">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-[1400px] items-center gap-3 px-4 py-3 md:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm lg:hidden"
          >
            ☰
          </button>

          <div className="min-w-[150px]">
            <Link href="/" className="text-lg font-bold text-[#2A73FF] hover:opacity-90">
              NovaTutor
            </Link>
          </div>

          <div className="hidden flex-1 md:block">
            <input
              type="text"
              placeholder="Search for courses, skills, instructors"
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-[#2A73FF] focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm">🔔</button>
            <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm">💬</button>
            <details className="relative">
              <summary className="list-none cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-sm">
                {user?.full_name || 'Student'}
              </summary>
              <div className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-2 text-sm shadow-md">
                <button className="w-full rounded-lg px-2 py-2 text-left hover:bg-slate-50">Profile</button>
                <button className="w-full rounded-lg px-2 py-2 text-left hover:bg-slate-50">My Courses</button>
                <button className="w-full rounded-lg px-2 py-2 text-left hover:bg-slate-50">Certificates</button>
                <button className="w-full rounded-lg px-2 py-2 text-left hover:bg-slate-50">Settings</button>
                <button
                  onClick={() => authService.logout()}
                  className="w-full rounded-lg px-2 py-2 text-left text-red-600 hover:bg-red-50"
                >
                  Log out
                </button>
              </div>
            </details>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-6 px-4 py-6 md:px-6 lg:grid-cols-[260px_1fr]">
        <aside
          className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-24 lg:block lg:h-fit ${
            sidebarOpen ? 'block' : 'hidden'
          }`}
        >
          <nav className="space-y-1">
            {studentMenu.map((item) => (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                  activeTab === item.id
                    ? 'bg-blue-50 text-[#2A73FF]'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}

            <a
              href="/ai-chat"
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <span>🧪</span>
              <span>AI Lab</span>
            </a>

            <a
              href="/adaptive-quiz"
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <span>📝</span>
              <span>Adaptive Quiz</span>
            </a>
          </nav>
        </aside>

        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-bold">Welcome back, Student 👋</h1>
            <p className="mt-1 text-slate-600">Continue your learning journey</p>
          </div>

          {(activeTab === 'dashboard' || activeTab === 'my-courses') && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((item) => (
                  <article
                    key={item.label}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <p className="text-sm text-slate-500">{item.label}</p>
                    <p className="mt-2 text-3xl font-bold text-[#2A73FF]">{item.value}</p>
                  </article>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">Learning streak</p>
                  <p className="mt-2 text-3xl font-bold text-[#2A73FF]">{progress?.streak_days ?? 0} days</p>
                  <p className="mt-2 text-xs text-slate-500">Keep your daily momentum with a quick adaptive quiz.</p>
                </article>
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">Weak topics</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(progress?.weak_topics ?? []).slice(0, 3).map((topic) => (
                      <span key={topic} className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                        {topic}
                      </span>
                    ))}
                    {(!progress?.weak_topics || progress.weak_topics.length === 0) && (
                      <span className="text-sm text-slate-500">No weak topics yet. Start a quiz to unlock insights.</span>
                    )}
                  </div>
                  <a
                    href="/adaptive-quiz"
                    className="mt-3 inline-flex rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-[#2A73FF] hover:bg-blue-100"
                  >
                    Go to Adaptive Quiz
                  </a>
                </article>
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">Next suggestion</p>
                  <p className="mt-2 text-sm font-medium text-slate-700">
                    {progress?.next_suggestion || 'Open Adaptive Quiz and complete one mini quiz to get personalized guidance.'}
                  </p>
                  <a
                    href="/adaptive-quiz"
                    className="mt-3 inline-flex rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-[#2A73FF] hover:bg-blue-100"
                  >
                    Go to Adaptive Quiz
                  </a>
                </article>
              </div>

              <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold">Continue Learning</h2>
                  <button onClick={() => setActiveTab('my-courses')} className="text-sm font-semibold text-[#2A73FF]">
                    View all
                  </button>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {continueLearning.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                      No active courses yet. Enroll in a course to start learning.
                    </div>
                  )}
                  {continueLearning.map((course) => (
                    <div
                      key={course.id}
                      className="rounded-xl border border-slate-200 p-4 transition hover:border-[#2A73FF] hover:shadow-sm"
                    >
                      <div className="mb-3 h-28 rounded-lg bg-slate-100" />
                      <p className="text-xs text-slate-500">{course.subject}</p>
                      <h3 className="mt-1 font-semibold">{course.name}</h3>
                      <p className="text-xs text-slate-500">NovaTutor Instructor Team</p>
                      <div className="mt-3 h-2 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-[#2A73FF] transition-all" style={{ width: `${course.progress}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{course.progress}% completed</p>
                      <button
                        onClick={() => {
                          setSelectedCourse(course);
                          setActiveTab('ai-assistant');
                        }}
                        className="mt-3 w-full rounded-lg bg-[#2A73FF] px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        Continue Learning
                      </button>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-bold">Recommended for you</h2>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {recommendedCourses.map((course) => (
                    <div
                      key={course.id}
                      className="rounded-xl border border-slate-200 p-4 transition hover:border-[#2A73FF] hover:shadow-sm"
                    >
                      <div className="mb-3 h-24 rounded-lg bg-slate-100" />
                      <h3 className="text-sm font-semibold leading-6">{course.name}</h3>
                      <p className="text-xs text-slate-500">{course.rating} ★</p>
                      <p className="text-xs text-slate-500">{course.students}</p>
                      <span className="mt-2 inline-block rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-[#2A73FF]">
                        {course.level}
                      </span>
                      <button
                        onClick={() => handleEnroll(course.id)}
                        className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                      >
                        Enroll
                      </button>
                    </div>
                  ))}
                </div>
              </article>
            </>
          )}

          {(activeTab === 'dashboard' || activeTab === 'learning-schedule') && (
            <div className="grid gap-6 xl:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-bold">Learning Progress</h2>
                <p className="mb-3 text-sm text-slate-500">Weekly learning time (hours)</p>
                <div className="flex h-40 items-end gap-3 rounded-xl bg-slate-50 p-4">
                  {progressBars.map((item, index) => (
                    <div key={`week-${index + 1}`} className="flex flex-1 flex-col items-center gap-2">
                      <div
                        className="w-full rounded-md bg-[#2A73FF] transition-all"
                        style={{ height: `${item.value}%` }}
                      />
                      <span className="text-[11px] text-slate-500">{item.label}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-bold">Upcoming deadlines</h2>
                <div className="space-y-3">
                  {upcomingDeadlines.map((item) => (
                    <div key={item.name} className="rounded-xl border border-slate-200 p-4">
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-slate-500">{item.course}</p>
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <span className="text-amber-600">Due: {item.due}</span>
                        <button className="rounded-lg bg-[#2A73FF] px-3 py-1.5 font-semibold text-white hover:bg-blue-700">
                          Go to Assignment
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          )}

          {(activeTab === 'dashboard' || activeTab === 'certificates') && (
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold">Certificates</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {earnedCertificates.map((item) => (
                  <div key={item.course} className="rounded-xl border border-slate-200 p-4">
                    <div className="mb-3 h-24 rounded-lg bg-slate-100" />
                    <p className="font-semibold">{item.course}</p>
                    <p className="text-sm text-slate-500">{item.issuer}</p>
                    <div className="mt-3 flex gap-2">
                      <button className="rounded-lg bg-[#2A73FF] px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                        View Certificate
                      </button>
                      <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
                        Download PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          )}

          {activeTab === 'my-courses' && (
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold">My Courses</h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {courses.map((course) => (
                  <div key={course.id} className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs text-slate-500">{course.subject}</p>
                    <h3 className="mt-1 font-semibold">{course.name}</h3>
                    <p className="mt-2 line-clamp-3 text-sm text-slate-600">{course.description}</p>
                    <button
                      onClick={() => {
                        setSelectedCourse(course);
                        setActiveTab('ai-assistant');
                      }}
                      className="mt-3 w-full rounded-lg bg-[#2A73FF] px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Learn with AI
                    </button>
                  </div>
                ))}
              </div>
            </article>
          )}

          {activeTab === 'guided-projects' && (
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold">Guided Projects</h2>
              <p className="text-slate-600">Hands-on mini projects will appear here based on your enrolled tracks.</p>
            </article>
          )}

          {activeTab === 'saved-courses' && (
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold">Saved Courses</h2>
              <p className="text-slate-600">No saved courses yet. Start saving from recommendations to build your list.</p>
            </article>
          )}

          {activeTab === 'ai-assistant' && (
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">AI Assistant</h2>
                  <p className="text-sm text-slate-600">
                    {selectedCourse ? `Context: ${selectedCourse.name}` : 'Select a course to start contextual chat.'}
                  </p>
                </div>
                {selectedCourse && (
                  <button
                    onClick={() => setSelectedCourse(null)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    Clear course
                  </button>
                )}
              </div>
              <div className="h-[620px]">
                <ChatInterface
                  courseId={selectedCourse?.id}
                  courseName={selectedCourse?.name}
                  onVoiceStateChange={() => undefined}
                />
              </div>
            </article>
          )}

          {activeTab === 'settings' && (
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold">Settings</h2>
              <p className="text-slate-600">Profile, notification, and learning preference settings will be managed here.</p>
            </article>
          )}

          <footer className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-500 shadow-sm">
            About · Help Center · Terms · Privacy
          </footer>
        </section>
      </div>
    </main>
  );
}
