'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { courseService, type Course, type CourseDocument } from '@/services/courseService';
import { authService } from '@/services/authService';
import { useRouteGuard } from '@/hooks/useRouteGuard';
import { learningService, type AtRiskStudent, type TeacherStatsResponse } from '@/services/learningService';
import {
  copilotService,
  type LessonOutlineResult,
  type QuizContentResult,
  type AnnouncementResult,
  type PublishQuizBankResult,
} from '@/services/copilotService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CourseQuizBankManager from '@/components/teacher/CourseQuizBankManager';

type TeacherTab =
  | 'dashboard'
  | 'my-courses'
  | 'create-course'
  | 'students'
  | 'analytics'
  | 'earnings'
  | 'reviews'
  | 'settings'
  | 'ai-copilot'
  | 'course-quiz-bank';

const teacherMenu: Array<{ id: TeacherTab; label: string; icon: string }> = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { id: 'my-courses', label: 'My Courses', icon: '📚' },
  { id: 'create-course', label: 'Create Course', icon: '➕' },
  { id: 'students', label: 'Students', icon: '👩‍🎓' },
  { id: 'analytics', label: 'Analytics', icon: '📊' },
  { id: 'ai-copilot', label: 'AI Copilot ✨', icon: '🤖' },
  { id: 'course-quiz-bank', label: 'Course Quiz Bank', icon: '🗂️' },
  { id: 'earnings', label: 'Earnings', icon: '💰' },
  { id: 'reviews', label: 'Reviews', icon: '⭐' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
];

const studentActivities = [
  'John enrolled in "Machine Learning Basics"',
  'Sarah completed Lesson 3',
  'Michael left a review ★★★★★',
  'Amelia completed the final quiz',
];

const recentReviews = [
  {
    name: 'Daniel R.',
    course: 'Python for Data Analysis',
    comment: 'Great pacing and practical assignments. Loved the capstone project.',
  },
  {
    name: 'Mina L.',
    course: 'Prompt Engineering Fundamentals',
    comment: 'Clear explanations and useful real-world examples.',
  },
];

const monthlyRevenue = [1.8, 2.4, 2.1, 2.9, 3.2, 3.8, 4.1];

export default function TeacherDashboard() {
  const { loading: guardLoading, user } = useRouteGuard({ mode: 'protected', role: 'teacher' });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TeacherTab>('dashboard');
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [documents, setDocuments] = useState<CourseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudent[]>([]);
  const [teacherStats, setTeacherStats] = useState<TeacherStatsResponse | null>(null);

  // ── AI Copilot state ───────────────────────────────────────────────────
  type CopilotTool = 'outline' | 'quiz' | 'announcement';
  const [copilotTool, setCopilotTool] = useState<CopilotTool>('outline');
  const [copilotCourseId, setCopilotCourseId] = useState('');
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotError, setCopilotError] = useState('');
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishResult, setPublishResult] = useState<PublishQuizBankResult | null>(null);
  // editable result content + preview toggle
  const [editableContent, setEditableContent] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  // outline
  const [outlineChapter, setOutlineChapter] = useState('');
  const [outlineObjectives, setOutlineObjectives] = useState('');
  const [outlineLevel, setOutlineLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [outlineResult, setOutlineResult] = useState<LessonOutlineResult | null>(null);
  // quiz
  const [quizTopic, setQuizTopic] = useState('');
  const [quizCount, setQuizCount] = useState(5);
  const [quizDifficulty, setQuizDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [quizResult, setQuizResult] = useState<QuizContentResult | null>(null);
  // announcement
  const [announcementSubject, setAnnouncementSubject] = useState('');
  const [announcementTone, setAnnouncementTone] = useState<'formal' | 'friendly' | 'motivational'>('friendly');
  const [announcementContext, setAnnouncementContext] = useState('');
  const [announcementResult, setAnnouncementResult] = useState<AnnouncementResult | null>(null);
  // copy feedback
  const [copied, setCopied] = useState(false);
  const copilotResultRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoading(true);
        const data = await courseService.getTeacherCourses();
        setCourses(data);

        try {
          const riskData = await learningService.getTeacherAtRisk();
          setAtRiskStudents(riskData.students);
        } catch {
          setAtRiskStudents([]);
        }

        try {
          const stats = await learningService.getTeacherStats();
          setTeacherStats(stats);
        } catch {
          setTeacherStats(null);
        }
      } finally {
        setLoading(false);
      }
    };

    loadCourses().catch(() => undefined);
  }, []);

  const loadDocuments = async (courseId: string) => {
    const docs = await courseService.getCourseDocuments(courseId);
    setDocuments(docs);
  };

  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    setActiveTab('my-courses');
    loadDocuments(course.id).catch(() => undefined);
  };

  const refreshCourses = async () => {
    const data = await courseService.getTeacherCourses();
    setCourses(data);
  };

  const handleCreateCourse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await courseService.createCourse({
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      subject: formData.get('subject') as string,
    });
    setShowCreateModal(false);
    await refreshCourses();
  };

  const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedCourse || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    if (file.type !== 'application/pdf') return;

    setUploading(true);
    await courseService.uploadDocument(selectedCourse.id, file);
    await loadDocuments(selectedCourse.id);
    setUploading(false);
    e.target.value = '';
  };

  const handleDeleteCourse = async (courseId: string) => {
    await courseService.deleteCourse(courseId);
    await refreshCourses();
    setSelectedCourse(null);
    setDocuments([]);
  };

  // ── AI Copilot handlers ────────────────────────────────────────────────
  const handleCopyResult = () => {
    if (!editableContent) return;
    navigator.clipboard.writeText(editableContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleGenerateOutline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copilotCourseId || !outlineChapter.trim()) return;
    setCopilotLoading(true);
    setCopilotError('');
    setPublishResult(null);
    setOutlineResult(null);
    setEditableContent('');
    setPreviewMode(false);
    try {
      const result = await copilotService.generateLessonOutline(copilotCourseId, outlineChapter.trim(), {
        learningObjectives: outlineObjectives.trim() || undefined,
        audienceLevel: outlineLevel,
      });
      setOutlineResult(result);
      setEditableContent(result.outline);
    } catch (err: unknown) {
      setCopilotError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setCopilotLoading(false);
    }
  };

  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copilotCourseId || !quizTopic.trim()) return;
    setCopilotLoading(true);
    setCopilotError('');
    setPublishResult(null);
    setQuizResult(null);
    setEditableContent('');
    setPreviewMode(false);
    try {
      const result = await copilotService.generateQuizContent(copilotCourseId, quizTopic.trim(), {
        questionCount: quizCount,
        difficulty: quizDifficulty,
      });
      setQuizResult(result);
      setEditableContent(result.quiz_content);
    } catch (err: unknown) {
      setCopilotError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setCopilotLoading(false);
    }
  };

  const handleGenerateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copilotCourseId || !announcementSubject.trim()) return;
    setCopilotLoading(true);
    setCopilotError('');
    setPublishResult(null);
    setAnnouncementResult(null);
    setEditableContent('');
    setPreviewMode(false);
    try {
      const result = await copilotService.generateAnnouncement(copilotCourseId, announcementSubject.trim(), {
        tone: announcementTone,
        extraContext: announcementContext.trim() || undefined,
      });
      setAnnouncementResult(result);
      setEditableContent(result.announcement);
    } catch (err: unknown) {
      setCopilotError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setCopilotLoading(false);
    }
  };

  const handlePublishQuizBank = async () => {
    const topic = quizResult?.topic || quizTopic.trim();
    const difficulty = quizResult?.difficulty || quizDifficulty;

    if (!copilotCourseId || !topic || !editableContent.trim()) return;

    setPublishLoading(true);
    setCopilotError('');
    setPublishResult(null);
    try {
      const result = await copilotService.publishQuizBank(copilotCourseId, topic, difficulty, editableContent);
      setPublishResult(result);
    } catch (err: unknown) {
      setCopilotError(err instanceof Error ? err.message : 'Could not publish quiz bank');
    } finally {
      setPublishLoading(false);
    }
  };

  const stats = useMemo(() => {
    const totalCourses = teacherStats?.total_courses ?? courses.length;
    const totalStudents = teacherStats?.total_students ?? 0;
    const totalRevenue = totalStudents * 4.1;

    return [
      { label: 'Total Courses', value: String(totalCourses) },
      { label: 'Total Students', value: String(totalStudents) },
      { label: 'Course Rating', value: '4.8' },
      { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString('en-US')}` },
    ];
  }, [courses.length, teacherStats]);

  const courseStudentCountById = useMemo(() => {
    const entries: Array<[string, number]> = (teacherStats?.courses ?? []).map((course) => [
      course.course_id,
      course.student_count,
    ]);
    return new Map(entries);
  }, [teacherStats]);

  const activeGrounding = useMemo(() => {
    if (copilotTool === 'outline') {
      return {
        grounded: Boolean(outlineResult?.grounded_by_docs),
        chunks: outlineResult?.context_chunk_count ?? 0,
      };
    }
    if (copilotTool === 'quiz') {
      return {
        grounded: Boolean(quizResult?.grounded_by_docs),
        chunks: quizResult?.context_chunk_count ?? 0,
      };
    }
    return {
      grounded: Boolean(announcementResult?.grounded_by_docs),
      chunks: announcementResult?.context_chunk_count ?? 0,
    };
  }, [copilotTool, outlineResult, quizResult, announcementResult]);

  if (guardLoading || loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#F5F7FA]">Loading instructor dashboard...</div>;
  }

  const handleTabChange = (tab: TeacherTab) => {
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
              placeholder="Search courses, students, analytics"
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-[#2A73FF] focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm">🔔</button>
            <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm">💬</button>
            <details className="relative">
              <summary className="list-none cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-sm">
                {user?.full_name || 'Instructor'}
              </summary>
              <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-2 text-sm shadow-md">
                <button className="w-full rounded-lg px-2 py-2 text-left hover:bg-slate-50">Profile</button>
                <button className="w-full rounded-lg px-2 py-2 text-left hover:bg-slate-50">Instructor settings</button>
                <button onClick={() => setActiveTab('earnings')} className="w-full rounded-lg px-2 py-2 text-left hover:bg-slate-50">
                  Earnings
                </button>
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
            {teacherMenu.map((item) => (
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
          </nav>
        </aside>

        <section className="space-y-6">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-bold">Welcome back, Instructor 👋</h1>
            <p className="mt-1 text-slate-600">Manage your courses and students</p>
          </article>

          {(activeTab === 'dashboard' || activeTab === 'analytics') && (
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
          )}

          {(activeTab === 'dashboard' || activeTab === 'my-courses') && (
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold">Your Courses</h2>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="rounded-lg bg-[#2A73FF] px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Create Course
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {courses.map((course, index) => (
                  <article
                    key={course.id}
                    className="rounded-xl border border-slate-200 p-4 transition hover:border-[#2A73FF] hover:shadow-sm"
                  >
                    <div className="mb-3 h-24 rounded-lg bg-slate-100" />
                    <h3 className="font-semibold">{course.name}</h3>
                    <p className="text-xs text-slate-500">{courseStudentCountById.get(course.id) ?? 0} students</p>
                    <p className="text-xs text-slate-500">4.{7 + (index % 3)} ★</p>
                    <p className="text-xs text-slate-500">Last updated: 2026-03-{10 + index}</p>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleSelectCourse(course)}
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                      >
                        Edit Course
                      </button>
                      <button
                        onClick={() => setActiveTab('analytics')}
                        className="flex-1 rounded-lg bg-[#2A73FF] px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        View Analytics
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </article>
          )}

          {(activeTab === 'dashboard' || activeTab === 'students') && (
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold">Recent Student Activity</h2>
              <div className="space-y-3">
                {studentActivities.map((activity, index) => (
                  <div key={activity} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-[#2A73FF]">
                      S{index + 1}
                    </div>
                    <p className="text-sm text-slate-700">{activity}</p>
                  </div>
                ))}
              </div>
            </article>
          )}

          {(activeTab === 'dashboard' || activeTab === 'analytics' || activeTab === 'students') && (
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold">At-risk students (Phase 2)</h2>
                <span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">
                  {atRiskStudents.length} flagged
                </span>
              </div>

              {atRiskStudents.length === 0 ? (
                <p className="text-sm text-slate-500">No at-risk students detected yet. Quiz data will appear here after submissions.</p>
              ) : (
                <div className="space-y-3">
                  {atRiskStudents.slice(0, 8).map((student) => (
                    <div key={`${student.student_id}-${student.course_id}`} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold">{student.student_name}</p>
                          <p className="text-xs text-slate-500">{student.course_name}</p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            student.risk_level === 'high'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {student.risk_level.toUpperCase()}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-700">{student.reason}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>Score 21d: {student.avg_score_21d ?? 'N/A'}</span>
                        <span>Weak topic: {student.weak_topic || 'N/A'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          )}

          {(activeTab === 'dashboard' || activeTab === 'analytics') && (
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold">Course Analytics</h2>
              <div className="grid gap-4 xl:grid-cols-3">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="mb-2 text-sm font-semibold">Student enrollment over time</p>
                  <div className="flex h-36 items-end gap-2 rounded-lg bg-slate-50 p-3">
                    {[25, 40, 35, 60, 70, 65, 85].map((v, i) => (
                      <div key={`enroll-${i}`} className="flex-1 rounded-sm bg-[#2A73FF]" style={{ height: `${v}%` }} />
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="mb-2 text-sm font-semibold">Completion rate</p>
                  <div className="space-y-3 rounded-lg bg-slate-50 p-3 text-sm">
                    <div>
                      <div className="mb-1 flex justify-between">
                        <span>Course A</span>
                        <span>72%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200">
                        <div className="h-2 w-[72%] rounded-full bg-emerald-500" />
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between">
                        <span>Course B</span>
                        <span>58%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200">
                        <div className="h-2 w-[58%] rounded-full bg-amber-500" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="mb-2 text-sm font-semibold">Student engagement</p>
                  <div className="flex h-36 items-center justify-center rounded-lg bg-slate-50">
                    <div className="text-center">
                      <p className="text-4xl font-bold text-[#2A73FF]">84%</p>
                      <p className="text-sm text-slate-500">Weekly active learners</p>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          )}

          {(activeTab === 'dashboard' || activeTab === 'earnings') && (
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold">Instructor Earnings</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm text-slate-500">Total revenue</p>
                  <p className="mt-1 text-2xl font-bold">$12,450</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm text-slate-500">Monthly revenue</p>
                  <p className="mt-1 text-2xl font-bold">$1,980</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm text-slate-500">Payout history</p>
                  <p className="mt-1 text-2xl font-bold">12 payouts</p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 p-4">
                <p className="mb-3 text-sm font-semibold">Monthly revenue chart</p>
                <div className="flex h-36 items-end gap-3 rounded-lg bg-slate-50 p-3">
                  {monthlyRevenue.map((value, index) => (
                    <div key={`rev-${index}`} className="flex flex-1 flex-col items-center gap-1">
                      <div className="w-full rounded-sm bg-[#2A73FF]" style={{ height: `${Math.round(value * 20)}%` }} />
                      <span className="text-[11px] text-slate-500">M{index + 1}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button className="mt-4 rounded-lg bg-[#10B981] px-4 py-2 font-semibold text-white hover:bg-emerald-600">
                Withdraw Earnings
              </button>
            </article>
          )}

          {(activeTab === 'dashboard' || activeTab === 'reviews') && (
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold">Reviews</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {recentReviews.map((review, index) => (
                  <div key={review.name} className="rounded-xl border border-slate-200 p-4">
                    <div className="mb-2 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-[#2A73FF]">
                        U{index + 1}
                      </div>
                      <div>
                        <p className="font-semibold">{review.name}</p>
                        <p className="text-xs text-slate-500">{review.course}</p>
                      </div>
                    </div>
                    <p className="text-sm text-amber-500">★★★★★</p>
                    <p className="mt-2 text-sm text-slate-700">{review.comment}</p>
                    <button className="mt-3 rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
                      Reply to review
                    </button>
                  </div>
                ))}
              </div>
            </article>
          )}

          {(activeTab === 'dashboard' || activeTab === 'create-course') && (
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold">Quick Actions</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <button onClick={() => setShowCreateModal(true)} className="rounded-xl border border-slate-300 p-4 text-left hover:bg-slate-50">
                  Create New Course
                </button>
                <button
                  onClick={() => selectedCourse && document.getElementById('upload-pdf')?.click()}
                  className="rounded-xl border border-slate-300 p-4 text-left hover:bg-slate-50"
                >
                  Upload Lecture
                </button>
                <button
                  onClick={() => {
                    setCopilotTool('quiz');
                    if (selectedCourse) setCopilotCourseId(selectedCourse.id);
                    handleTabChange('ai-copilot');
                  }}
                  className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-left text-indigo-700 hover:bg-indigo-100"
                >
                  🤖 AI: Create Quiz
                </button>
                <button
                  onClick={() => {
                    setCopilotTool('announcement');
                    if (selectedCourse) setCopilotCourseId(selectedCourse.id);
                    handleTabChange('ai-copilot');
                  }}
                  className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-left text-indigo-700 hover:bg-indigo-100"
                >
                  🤖 AI: Post Announcement
                </button>
              </div>
            </article>
          )}

          {activeTab === 'my-courses' && selectedCourse && (
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">{selectedCourse.name}</h2>
                  <p className="mt-1 text-sm text-slate-600">{selectedCourse.description}</p>
                  <span className="mt-2 inline-block rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-[#2A73FF]">
                    {selectedCourse.subject}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteCourse(selectedCourse.id)}
                  className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  Delete Course
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold">Course Documents ({documents.length})</h3>
                  <label className="cursor-pointer rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black">
                    {uploading ? 'Uploading...' : 'Upload PDF'}
                    <input
                      id="upload-pdf"
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={handleUploadDocument}
                      disabled={uploading}
                    />
                  </label>
                </div>

                {documents.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                    No documents yet. Upload a PDF to enable course knowledge processing.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                        <div>
                          <p className="font-medium">{doc.document_name}</p>
                          <p className="text-xs text-slate-500">{new Date(doc.uploaded_at).toLocaleString()}</p>
                        </div>
                        <a
                          href={doc.document_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                        >
                          View
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </article>
          )}

          {activeTab === 'ai-copilot' && (
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🤖</span>
                <div>
                  <h2 className="text-xl font-bold">AI Copilot</h2>
                  <p className="text-sm text-slate-500">Generate lesson outlines, quiz drafts, and announcements in seconds. Review before publishing.</p>
                </div>
              </div>

              {/* Tool selector */}
              <div className="flex gap-2 flex-wrap">
                {([
                  { id: 'outline', label: '📋 Lesson Outline' },
                  { id: 'quiz', label: '📝 Quiz Draft' },
                  { id: 'announcement', label: '📢 Announcement' },
                ] as const).map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => {
                      setCopilotTool(tool.id);
                      setCopilotError('');
                      setPublishResult(null);
                    }}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      copilotTool === tool.id
                        ? 'bg-[#2A73FF] text-white shadow'
                        : 'border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {tool.label}
                  </button>
                ))}
              </div>

              {/* Course selector */}
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Select Course</label>
                <select
                  value={copilotCourseId}
                  onChange={(e) => setCopilotCourseId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-[#2A73FF] focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">— choose a course —</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* ── OUTLINE FORM ── */}
              {copilotTool === 'outline' && (
                <form onSubmit={handleGenerateOutline} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Chapter / Module Title <span className="text-red-500">*</span></label>
                    <input
                      required
                      value={outlineChapter}
                      onChange={(e) => setOutlineChapter(e.target.value)}
                      placeholder="e.g. Introduction to Neural Networks"
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-[#2A73FF] focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Learning Objectives (optional)</label>
                    <input
                      value={outlineObjectives}
                      onChange={(e) => setOutlineObjectives(e.target.value)}
                      placeholder="e.g. Understand backpropagation, build a simple MLP"
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-[#2A73FF] focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Audience Level</label>
                    <select
                      value={outlineLevel}
                      onChange={(e) => setOutlineLevel(e.target.value as typeof outlineLevel)}
                      className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-[#2A73FF]"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={copilotLoading || !copilotCourseId}
                    className="rounded-xl bg-[#2A73FF] px-6 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {copilotLoading ? '⏳ Generating…' : '✨ Generate Outline'}
                  </button>
                </form>
              )}

              {/* ── QUIZ FORM ── */}
              {copilotTool === 'quiz' && (
                <form onSubmit={handleGenerateQuiz} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Topic <span className="text-red-500">*</span></label>
                    <input
                      required
                      value={quizTopic}
                      onChange={(e) => setQuizTopic(e.target.value)}
                      placeholder="e.g. Gradient Descent"
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-[#2A73FF] focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Questions</label>
                      <input
                        type="number"
                        min={3} max={10}
                        value={quizCount}
                        onChange={(e) => setQuizCount(Number(e.target.value))}
                        className="w-24 rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#2A73FF]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Difficulty</label>
                      <select
                        value={quizDifficulty}
                        onChange={(e) => setQuizDifficulty(e.target.value as typeof quizDifficulty)}
                        className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-[#2A73FF]"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={copilotLoading || !copilotCourseId}
                    className="rounded-xl bg-[#2A73FF] px-6 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {copilotLoading ? '⏳ Generating…' : '✨ Generate Quiz Draft'}
                  </button>
                </form>
              )}

              {/* ── ANNOUNCEMENT FORM ── */}
              {copilotTool === 'announcement' && (
                <form onSubmit={handleGenerateAnnouncement} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Subject <span className="text-red-500">*</span></label>
                    <input
                      required
                      value={announcementSubject}
                      onChange={(e) => setAnnouncementSubject(e.target.value)}
                      placeholder="e.g. New assignment uploaded, Quiz next week"
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-[#2A73FF] focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Tone</label>
                    <select
                      value={announcementTone}
                      onChange={(e) => setAnnouncementTone(e.target.value as typeof announcementTone)}
                      className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-[#2A73FF]"
                    >
                      <option value="friendly">Friendly</option>
                      <option value="formal">Formal</option>
                      <option value="motivational">Motivational</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Extra Context (optional)</label>
                    <input
                      value={announcementContext}
                      onChange={(e) => setAnnouncementContext(e.target.value)}
                      placeholder="e.g. Deadline is Friday, submission via Google Classroom"
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-[#2A73FF] focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={copilotLoading || !copilotCourseId}
                    className="rounded-xl bg-[#2A73FF] px-6 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {copilotLoading ? '⏳ Generating…' : '✨ Generate Announcement'}
                  </button>
                </form>
              )}

              {/* Error */}
              {copilotError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  ⚠️ {copilotError}
                </div>
              )}

              {/* Result panel */}
              {editableContent && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-800">
                      {copilotTool === 'outline' && outlineResult && (
                        <>📋 {outlineResult.chapter_title} <span className="ml-2 text-xs font-normal text-slate-500">~{outlineResult.estimated_duration_min} min</span></>
                      )}
                      {copilotTool === 'quiz' && quizResult && (
                        <>📝 Quiz: {quizResult.topic} · {quizResult.difficulty} · {quizResult.question_count}Q</>
                      )}
                      {copilotTool === 'announcement' && announcementResult && (
                        <>📢 {announcementResult.subject} · {announcementResult.tone}</>
                      )}
                      </p>
                      {activeGrounding.grounded && (
                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                          Grounded by course docs ({activeGrounding.chunks})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {copilotTool === 'quiz' && (
                        <button
                          onClick={handlePublishQuizBank}
                          disabled={publishLoading || !copilotCourseId || !editableContent.trim()}
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {publishLoading ? 'Publishing...' : 'Publish to Course Quiz Bank'}
                        </button>
                      )}
                      <button
                        onClick={handleCopyResult}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                      >
                        {copied ? '✅ Copied!' : '📋 Copy'}
                      </button>
                    </div>
                  </div>

                  {publishResult && copilotTool === 'quiz' && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                      ✅ {publishResult.message} · Saved {publishResult.saved_question_count} questions for topic <span className="font-semibold">{publishResult.topic}</span>.
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewMode(false)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        !previewMode
                          ? 'bg-[#2A73FF] text-white'
                          : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Edit Markdown
                    </button>
                    <button
                      onClick={() => setPreviewMode(true)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        previewMode
                          ? 'bg-[#2A73FF] text-white'
                          : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Preview
                    </button>
                  </div>

                  {previewMode ? (
                    <div className="max-h-[620px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        className="prose prose-sm max-w-none text-slate-800 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                      >
                        {editableContent}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <textarea
                      ref={copilotResultRef}
                      value={editableContent}
                      onChange={(e) => setEditableContent(e.target.value)}
                      rows={24}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs text-slate-800 outline-none"
                    />
                  )}

                  <p className="text-xs text-slate-400">
                    👆 Review and edit this Markdown content before publishing it to students.
                  </p>
                </div>
              )}
            </article>
          )}

          {activeTab === 'course-quiz-bank' && (
            <CourseQuizBankManager
              courses={courses}
              defaultCourseId={selectedCourse?.id ?? courses[0]?.id ?? null}
            />
          )}

          {activeTab === 'settings' && (
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold">Settings</h2>
              <p className="text-slate-600">Manage instructor profile, payout account, and notification preferences here.</p>
            </article>
          )}
        </section>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form
            onSubmit={handleCreateCourse}
            className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            <h3 className="text-xl font-semibold">Create New Course</h3>
            <input
              name="name"
              required
              placeholder="Course title"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#2A73FF] focus:ring-2 focus:ring-blue-100"
            />
            <input
              name="subject"
              required
              placeholder="Subject"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#2A73FF] focus:ring-2 focus:ring-blue-100"
            />
            <textarea
              name="description"
              required
              rows={4}
              placeholder="Course description"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#2A73FF] focus:ring-2 focus:ring-blue-100"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button type="submit" className="rounded-lg bg-[#2A73FF] px-4 py-2 font-semibold text-white hover:bg-blue-700">
                Create Course
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
