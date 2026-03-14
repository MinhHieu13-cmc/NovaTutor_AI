'use client';

import { useEffect, useMemo, useState } from 'react';
import { copilotService, type TeacherQuizBankItem } from '@/services/copilotService';
import type { Course } from '@/services/courseService';

type Props = {
  courses: Course[];
  defaultCourseId?: string | null;
};

export default function CourseQuizBankManager({ courses, defaultCourseId }: Props) {
  const [courseId, setCourseId] = useState(defaultCourseId || '');
  const [banks, setBanks] = useState<TeacherQuizBankItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTopic, setEditTopic] = useState('');
  const [editDifficulty, setEditDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [editContent, setEditContent] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!courseId && defaultCourseId) {
      setCourseId(defaultCourseId);
    }
  }, [defaultCourseId, courseId]);

  const activeCourseName = useMemo(
    () => courses.find((course) => course.id === courseId)?.name ?? 'Selected course',
    [courses, courseId],
  );

  const loadBanks = async (targetCourseId = courseId) => {
    if (!targetCourseId) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const result = await copilotService.listQuizBanks(targetCourseId);
      setBanks(result.items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not load course quiz bank');
      setBanks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) {
      loadBanks(courseId).catch(() => undefined);
    }
  }, [courseId]);

  const startEditing = (item: TeacherQuizBankItem) => {
    setEditingId(item.id);
    setEditTopic(item.topic);
    setEditDifficulty(item.difficulty);
    setEditContent(item.quiz_content);
    setError('');
    setSuccess('');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTopic('');
    setEditDifficulty('medium');
    setEditContent('');
  };

  const handleSave = async () => {
    if (!editingId) return;
    setSaveLoading(true);
    setError('');
    setSuccess('');
    try {
      const updated = await copilotService.updateQuizBank(editingId, {
        topic: editTopic,
        difficulty: editDifficulty,
        quizContent: editContent,
      });
      setBanks((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setSuccess(`Updated quiz bank for topic ${updated.topic}`);
      cancelEditing();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not update quiz bank');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteLoadingId(id);
    setError('');
    setSuccess('');
    try {
      await copilotService.deleteQuizBank(id);
      setBanks((prev) => prev.filter((item) => item.id !== id));
      if (editingId === id) {
        cancelEditing();
      }
      setSuccess('Quiz bank deleted successfully');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not delete quiz bank');
    } finally {
      setDeleteLoadingId(null);
    }
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Course Quiz Bank</h2>
          <p className="text-sm text-slate-500">View, edit, and delete quiz banks that were published from AI Copilot.</p>
        </div>
        <button
          onClick={() => loadBanks().catch(() => undefined)}
          disabled={!courseId || loading}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-700">Select Course</label>
        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-[#2A73FF] focus:ring-2 focus:ring-blue-100"
        >
          <option value="">— choose a course —</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>{course.name}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">⚠️ {error}</div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">✅ {success}</div>
      )}

      {!courseId ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
          Select a course to load its quiz banks.
        </div>
      ) : banks.length === 0 && !loading ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
          No quiz banks published yet for <span className="font-semibold">{activeCourseName}</span>.
        </div>
      ) : (
        <div className="space-y-4">
          {banks.map((item) => {
            const isEditing = editingId === item.id;
            return (
              <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{item.topic}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-blue-50 px-2 py-1 font-semibold text-[#2A73FF]">{item.difficulty}</span>
                      <span>{item.question_count} questions</span>
                      {item.updated_at && <span>Updated: {new Date(item.updated_at).toLocaleString()}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEditing(item)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deleteLoadingId === item.id}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deleteLoadingId === item.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="mt-4 space-y-3">
                    <div className="grid gap-3 md:grid-cols-[1fr_180px]">
                      <input
                        value={editTopic}
                        onChange={(e) => setEditTopic(e.target.value)}
                        placeholder="Topic"
                        className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-[#2A73FF] focus:ring-2 focus:ring-blue-100"
                      />
                      <select
                        value={editDifficulty}
                        onChange={(e) => setEditDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                        className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-[#2A73FF]"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>

                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={16}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs text-slate-800 outline-none"
                    />

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSave}
                        disabled={saveLoading || !editTopic.trim() || !editContent.trim()}
                        className="rounded-lg bg-[#2A73FF] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {saveLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <pre className="whitespace-pre-wrap break-words text-xs text-slate-700">{item.quiz_content}</pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}

