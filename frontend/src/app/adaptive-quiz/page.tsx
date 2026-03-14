'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRouteGuard } from '@/hooks/useRouteGuard';
import { courseService, type Course } from '@/services/courseService';
import {
  learningService,
  type GeneratedAdaptiveQuiz,
  type SubmittedAdaptiveQuiz,
} from '@/services/learningService';

export default function AdaptiveQuizPage() {
  const router = useRouter();
  const { loading: guardLoading, user } = useRouteGuard({ mode: 'protected', role: 'student' });
  const activeCourseKey = user ? `novatutor_learning_active_course_${user.id}` : null;
  const legacyAiLabCourseKey = user ? `novatutor_ai_lab_course_${user.id}` : null;

  const [courses, setCourses] = useState<Course[]>([]);
  const [activeCourseId, setActiveCourseId] = useState<string>('');
  const [quizTopicMode, setQuizTopicMode] = useState<'auto' | 'manual'>('auto');
  const [manualTopicInput, setManualTopicInput] = useState('');
  const [sessionGoalInput, setSessionGoalInput] = useState('');

  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<GeneratedAdaptiveQuiz | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizResult, setQuizResult] = useState<SubmittedAdaptiveQuiz | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const loadCourses = async () => {
      try {
        const studentCourses = await courseService.getStudentCourses();
        if (cancelled) return;
        setCourses(studentCourses);

        const preferredCourseId =
          (activeCourseKey ? localStorage.getItem(activeCourseKey) : null)
          ?? (legacyAiLabCourseKey ? localStorage.getItem(legacyAiLabCourseKey) : null);

        const nextCourseId = preferredCourseId && studentCourses.some((course) => course.id === preferredCourseId)
          ? preferredCourseId
          : (studentCourses[0]?.id || '');

        setActiveCourseId(nextCourseId);
        if (activeCourseKey && nextCourseId) {
          localStorage.setItem(activeCourseKey, nextCourseId);
        }
      } catch {
        if (!cancelled) {
          setCourses([]);
          setActiveCourseId('');
        }
      }
    };

    loadCourses();
    return () => {
      cancelled = true;
    };
  }, [user?.id, activeCourseKey, legacyAiLabCourseKey]);

  const handleCourseChange = (courseId: string) => {
    setActiveCourseId(courseId);
    if (activeCourseKey) {
      if (courseId) localStorage.setItem(activeCourseKey, courseId);
      else localStorage.removeItem(activeCourseKey);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!activeCourseId || quizLoading) return;

    const manualTopic = manualTopicInput.trim();
    if (quizTopicMode === 'manual' && !manualTopic) {
      setQuizError('Please enter a topic or switch to Auto mode.');
      return;
    }

    setQuizLoading(true);
    setQuizError(null);
    setQuizResult(null);
    setQuizAnswers({});

    try {
      const nextQuiz = await learningService.generateAdaptiveQuiz(
        activeCourseId,
        quizTopicMode === 'manual' ? manualTopic : undefined,
        sessionGoalInput.trim() || undefined,
      );
      setQuiz(nextQuiz);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not generate adaptive quiz right now.';
      setQuizError(message);
      setQuiz(null);
    } finally {
      setQuizLoading(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!quiz || quizLoading) return;

    const answers = quiz.questions.map((_, index) => quizAnswers[index] ?? -1);
    if (answers.some((value) => value < 0)) {
      setQuizError('Please answer all questions before submitting.');
      return;
    }

    setQuizLoading(true);
    setQuizError(null);

    try {
      const result = await learningService.submitAdaptiveQuiz(quiz.quiz_id, answers);
      setQuizResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not submit adaptive quiz.';
      setQuizError(message);
    } finally {
      setQuizLoading(false);
    }
  };

  const getTopicSourceLabel = (source: GeneratedAdaptiveQuiz['topic_source']) => {
    if (source === 'weak_topic') return 'Auto-picked weak topic';
    if (source === 'session_goal') return 'Picked from session goal';
    if (source === 'course_subject') return 'Picked from course subject';
    return 'Manual topic';
  };

  const getQuestionSourceLabel = (source: GeneratedAdaptiveQuiz['question_source']) => {
    if (source === 'teacher_bank') return 'teacher_bank';
    if (source === 'hybrid') return 'hybrid';
    return 'adaptive_template';
  };

  if (guardLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#F5F7FA] text-[#1F2937]">Loading adaptive quiz...</div>;
  }

  if (!user) {
    return <div className="flex min-h-screen items-center justify-center bg-[#F5F7FA] text-[#1F2937]">Redirecting to login...</div>;
  }

  return (
    <main className="min-h-screen bg-[#F5F7FA] text-[#1F2937]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-[1100px] items-center justify-between gap-3 px-4 py-4 md:px-6">
          <div>
            <p className="text-sm font-semibold text-[#2A73FF]">Adaptive Mini Quiz</p>
            <h1 className="text-2xl font-bold">Knowledge Check</h1>
            <p className="mt-1 text-sm text-slate-500">Generate adaptive quizzes based on your weak topics and learning context.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/ai-chat')}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Back to AI Lab
            </button>
            <button
              onClick={() => router.push('/student')}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-[1100px] space-y-5 px-4 py-6 md:px-6">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="quiz-course" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Course
              </label>
              <select
                id="quiz-course"
                value={activeCourseId}
                onChange={(event) => handleCourseChange(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2A73FF] focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="session-goal" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Session goal (optional)
              </label>
              <input
                id="session-goal"
                type="text"
                value={sessionGoalInput}
                onChange={(event) => setSessionGoalInput(event.target.value)}
                placeholder="e.g. Master linear equations"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2A73FF] focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Topic mode</p>
            <div className="mb-2 flex gap-2 text-xs">
              <button
                type="button"
                onClick={() => setQuizTopicMode('auto')}
                className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                  quizTopicMode === 'auto'
                    ? 'bg-[#2A73FF] text-white'
                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                Auto weak-topic
              </button>
              <button
                type="button"
                onClick={() => setQuizTopicMode('manual')}
                className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                  quizTopicMode === 'manual'
                    ? 'bg-[#2A73FF] text-white'
                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                Manual topic
              </button>
            </div>

            {quizTopicMode === 'manual' ? (
              <input
                type="text"
                value={manualTopicInput}
                onChange={(event) => setManualTopicInput(event.target.value)}
                placeholder="Enter topic, e.g. Linear equations"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2A73FF] focus:ring-2 focus:ring-blue-100"
              />
            ) : (
              <p className="text-xs text-slate-600">System prioritizes your weak topic from analytics, then uses session goal/course context.</p>
            )}
          </div>

          <button
            onClick={handleGenerateQuiz}
            disabled={!activeCourseId || quizLoading}
            className="mt-4 rounded-lg bg-[#2A73FF] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {quizLoading ? 'Loading...' : quiz ? 'Refresh Quiz' : 'Generate Quiz'}
          </button>
        </article>

        {quizError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {quizError}
          </div>
        )}

        {quiz ? (
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
              <p className="font-semibold">Topic: {quiz.topic}</p>
              <p className="mt-1">Topic source: {getTopicSourceLabel(quiz.topic_source)}</p>
              <p className="mt-1">Difficulty: {quiz.difficulty}</p>
              <p className="mt-1">Why this level: {quiz.difficulty_reason}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-blue-700">Question source:</span>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                  quiz.question_source === 'teacher_bank'
                    ? 'bg-emerald-100 text-emerald-800'
                    : quiz.question_source === 'hybrid'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-700'
                }`}>
                  {getQuestionSourceLabel(quiz.question_source)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {quiz.questions.map((question, questionIndex) => (
                <div key={question.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-800">
                    {questionIndex + 1}. {question.question}
                  </p>
                  <div className="mt-2 space-y-2">
                    {question.options.map((option, optionIndex) => {
                      const isSelected = quizAnswers[questionIndex] === optionIndex;
                      return (
                        <button
                          key={`${question.id}-${optionIndex}`}
                          type="button"
                          onClick={() => setQuizAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }))}
                          className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition ${
                            isSelected
                              ? 'border-[#2A73FF] bg-blue-50 text-[#1E40AF]'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleSubmitQuiz}
              disabled={quizLoading}
              className="mt-4 w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {quizLoading ? 'Submitting...' : 'Submit Quiz'}
            </button>

            {quizResult && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                <p className="font-semibold">Quiz submitted successfully</p>
                <p className="mt-1">Score: {quizResult.score}% ({quizResult.correct_count}/{quizResult.total_questions})</p>
                <p className="mt-1">Mastery score: {quizResult.mastery_score}%</p>
              </div>
            )}
          </article>
        ) : (
          <article className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 shadow-sm">
            Generate a quiz to start your adaptive assessment.
          </article>
        )}
      </section>
    </main>
  );
}


