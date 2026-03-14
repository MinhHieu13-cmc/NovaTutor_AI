'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, OrbitControls } from '@react-three/drei';
import { useRouter } from 'next/navigation';
import { NovaAvatarView } from '@/components/NovaAvatarView';
import { useNovaTutorSocket } from '@/hooks/useNovaTutorSocket';
import { useChatStore } from '@/store/useChatStore';
import { useRouteGuard } from '@/hooks/useRouteGuard';
import { ragService } from '@/services/ragService';
import { courseService, type Course } from '@/services/courseService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ─── Icons ────────────────────────────────────────────────────
const MicIcon = ({ muted }: { muted: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {muted ? (
      <>
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </>
    ) : (
      <>
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </>
    )}
  </svg>
);

const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const RecordDot = ({ active }: { active: boolean }) => (
  <span className={`inline-block h-3 w-3 rounded-full ${active ? 'animate-pulse bg-red-500' : 'bg-red-200'}`} />
);

// ─── Types ────────────────────────────────────────────────────
type SessionMeta = {
  id: string;
  title: string;
  created_at?: string;
  updated_at?: string;
  message_count?: number;
};

type StoreMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: Array<{ document_name: string; chunk_text: string; similarity_score: number }>;
};

// ─── Page ─────────────────────────────────────────────────────
export default function AIChatPage() {
  const router = useRouter();
  const { loading: guardLoading, user } = useRouteGuard({ mode: 'protected' });
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [activeCourseId, setActiveCourseId] = useState<string | undefined>(undefined);

  const {
    connect, disconnect,
    startRecording, stopRecording,
    currentViseme, isConnected, isRecording,
    isSpeaking, currentEmotion, transcript, error,
  } = useNovaTutorSocket();

  const {
    messages, isMuted, isRecording: recordingState,
    setMuted, setRecording, addMessage, setMessages,
  } = useChatStore();

  // ── UI state ──
  const [inputValue, setInputValue] = useState('');
  const [sendingText, setSendingText] = useState(false);
  const [textChatError, setTextChatError] = useState<string | null>(null);
  const [resumeSource, setResumeSource] = useState<'backend' | 'local' | null>(null);

  // ── session state ──
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionGoalInput, setSessionGoalInput] = useState('');
  const [isHistoryHydrated, setIsHistoryHydrated] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeCourseKey = user ? `novatutor_learning_active_course_${user.id}` : null;
  const legacyAiLabCourseKey = user ? `novatutor_ai_lab_course_${user.id}` : null;

  // ── computed keys ──
  const sessionsKey = user
    ? `novatutor_ai_lab_sessions_${user.id}_${activeCourseId || 'global'}`
    : null;
  const selectedKey = user
    ? `novatutor_ai_lab_selected_${user.id}_${activeCourseId || 'global'}`
    : null;
  const historyKey =
    user && selectedSessionId
      ? `novatutor_ai_lab_history_${user.id}_${selectedSessionId}`
      : null;
  const selectedSession = sessions.find((s) => s.id === selectedSessionId) ?? null;

  const saveSessionsLocal = (next: SessionMeta[]) => {
    if (sessionsKey) localStorage.setItem(sessionsKey, JSON.stringify(next));
  };

  useEffect(() => {
    if (!user || user.role !== 'student') return;
    let cancelled = false;

    const loadCourses = async () => {
      try {
        const studentCourses = await courseService.getStudentCourses();
        if (cancelled) return;
        setAvailableCourses(studentCourses);

        const preferredCourseId =
          (activeCourseKey ? localStorage.getItem(activeCourseKey) : null)
          ?? (legacyAiLabCourseKey ? localStorage.getItem(legacyAiLabCourseKey) : null);
        const nextCourseId = preferredCourseId && studentCourses.some((course) => course.id === preferredCourseId)
          ? preferredCourseId
          : studentCourses[0]?.id;

        setActiveCourseId(nextCourseId);
        if (activeCourseKey && nextCourseId) {
          localStorage.setItem(activeCourseKey, nextCourseId);
        }
      } catch {
        if (!cancelled) {
          setAvailableCourses([]);
          setActiveCourseId(undefined);
        }
      }
    };

    loadCourses();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role, activeCourseKey, legacyAiLabCourseKey]);

  // ── Effect 1: Init sessions on mount ──
  useEffect(() => {
    if (!user || !sessionsKey) return;
    let cancelled = false;

    const init = async () => {
      let local: SessionMeta[] = [];
      try {
        const raw = localStorage.getItem(sessionsKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed))
            local = parsed.filter((s) => s && typeof s.id === 'string' && typeof s.title === 'string');
        }
      } catch {
        localStorage.removeItem(sessionsKey);
      }

      let backend: SessionMeta[] = [];
      try {
        backend = await ragService.listSessions(activeCourseId);
      } catch { /* local fallback */ }

      let merged = backend.length > 0 ? backend : local;

      if (merged.length === 0) {
        let seed: SessionMeta = { id: crypto.randomUUID(), title: 'Session 1 - New Goal' };
        try {
          const created = await ragService.createSession(seed.title, activeCourseId);
          seed = { id: created.id, title: created.title, created_at: created.created_at, updated_at: created.updated_at, message_count: 0 };
        } catch { /* keep local seed */ }
        merged = [seed];
      }

      if (cancelled) return;
      setSessions(merged);
      saveSessionsLocal(merged);

      const preferred = selectedKey ? localStorage.getItem(selectedKey) : null;
      const validId = preferred && merged.some((s) => s.id === preferred) ? preferred : merged[0].id;
      setSelectedSessionId(validId);
      if (selectedKey) localStorage.setItem(selectedKey, validId);
    };

    init();
    return () => { cancelled = true; };
  }, [user?.id, activeCourseId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect 2: Hydrate chat history when session changes ──
  useEffect(() => {
    if (!user || !selectedSessionId || !historyKey) return;
    let cancelled = false;
    setIsHistoryHydrated(false);

    const hydrate = async () => {
      let local: StoreMessage[] = [];
      try {
        const raw = localStorage.getItem(historyKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed))
            local = parsed.filter((m) => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant' || m.role === 'system'));
        }
      } catch { localStorage.removeItem(historyKey); }

      let backend: StoreMessage[] = [];
      try {
        const res = await ragService.loadConversation(activeCourseId, 80, selectedSessionId);
        backend = res.messages.map((m) => ({ role: m.role, content: m.content }));
      } catch { /* local fallback */ }

      if (cancelled) return;
      const chosen = backend.length > 0 ? backend : local;
      setResumeSource(backend.length > 0 ? 'backend' : local.length > 0 ? 'local' : null);
      setMessages(chosen);
      setIsHistoryHydrated(true);
    };

    hydrate();
    return () => {
      cancelled = true;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [user?.id, selectedSessionId, historyKey, activeCourseId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect 3: Auto-save ──
  useEffect(() => {
    if (!isHistoryHydrated || !user || !historyKey || !selectedSessionId) return;
    const persisted = messages.filter((m) => m.role === 'user' || m.role === 'assistant');
    localStorage.setItem(historyKey, JSON.stringify(persisted));
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const payload = persisted.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
      ragService.saveConversation(payload, activeCourseId, selectedSessionId).catch(() => undefined);
    }, 700);
  }, [messages, user?.id, historyKey, isHistoryHydrated, activeCourseId, selectedSessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect 4: Auto-scroll ──
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sendingText]);

  // ─── Session actions ──────────────────────────────────────
  const createSession = async () => {
    const title = sessionGoalInput.trim();
    if (!title || !user) return;

    let next: SessionMeta = { id: crypto.randomUUID(), title };
    try {
      const created = await ragService.createSession(title, activeCourseId);
      next = { id: created.id, title: created.title, created_at: created.created_at, updated_at: created.updated_at, message_count: 0 };
    } catch { /* local fallback */ }

    const nextList = [next, ...sessions];
    setSessions(nextList);
    saveSessionsLocal(nextList);
    setSelectedSessionId(next.id);
    if (selectedKey) localStorage.setItem(selectedKey, next.id);
    setSessionGoalInput('');
    setMessages([]);
    setResumeSource(null);
  };

  const switchSession = (id: string) => {
    if (id === selectedSessionId) return;
    setSelectedSessionId(id);
    if (selectedKey) localStorage.setItem(selectedKey, id);
  };

  const deleteSession = async () => {
    if (!selectedSessionId || !user) return;
    await ragService.deleteSession(selectedSessionId).catch(() => undefined);
    if (historyKey) localStorage.removeItem(historyKey);

    const remaining = sessions.filter((s) => s.id !== selectedSessionId);
    setSessions(remaining);
    saveSessionsLocal(remaining);

    if (remaining.length > 0) {
      const nextId = remaining[0].id;
      setSelectedSessionId(nextId);
      if (selectedKey) localStorage.setItem(selectedKey, nextId);
    } else {
      setSelectedSessionId(null);
      if (selectedKey) localStorage.removeItem(selectedKey);
      setMessages([]);
      setResumeSource(null);
    }

  };

  const handleCourseChange = (courseId: string) => {
    const nextCourseId = courseId || undefined;
    setActiveCourseId(nextCourseId);
    if (activeCourseKey) {
      if (nextCourseId) localStorage.setItem(activeCourseKey, nextCourseId);
      else localStorage.removeItem(activeCourseKey);
    }
    setMessages([]);
    setResumeSource(null);
  };

  // ─── Chat send ────────────────────────────────────────────
  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || sendingText || !selectedSessionId) return;

    setTextChatError(null);
    addMessage({ role: 'user', content: text });
    setInputValue('');
    setSendingText(true);

    try {
      const history = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content, timestamp: new Date() }));

      const goalText = selectedSession?.title
        ? `[Session Goal: ${selectedSession.title}] ${text}`
        : text;

      const response = await ragService.chat(goalText, activeCourseId, history, selectedSessionId);
      addMessage({ role: 'assistant', content: response.response, sources: response.sources });
    } catch (e: any) {
      setTextChatError(e?.message || 'Text chat failed. Please try again.');
      addMessage({ role: 'assistant', content: 'Sorry, I could not answer right now. Please try again in a moment.' });
    } finally {
      setSendingText(false);
    }
  };

  // ─── Voice ────────────────────────────────────────────────
  const toggleVoiceChat = async () => {
    if (isConnected) disconnect(); else await connect();
  };

  const toggleRecording = () => {
    if (isRecording) stopRecording(); else startRecording();
    setRecording(!isRecording);
  };

  const emotionLabel =
    currentEmotion === 'happy' ? 'Happy'
    : currentEmotion === 'confused' ? 'Confused'
    : currentEmotion === 'sad' ? 'Sad'
    : currentEmotion === 'angry' ? 'Focused'
    : 'Neutral';

  if (guardLoading)
    return <div className="flex h-screen items-center justify-center bg-[#F5F7FA] text-[#1F2937]">Loading AI Lab...</div>;
  if (!user)
    return <div className="flex h-screen items-center justify-center bg-[#F5F7FA] text-[#1F2937]">Redirecting to login...</div>;

  return (
    <main className="min-h-screen bg-[#F5F7FA] text-[#1F2937]">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between px-4 py-4 md:px-6">
          <div>
            <p className="text-sm font-semibold text-[#2A73FF]">AI Lab</p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold">Nova AI Tutor</h1>
              {resumeSource && (
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                  resumeSource === 'backend'
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                    : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                }`}>
                  {resumeSource === 'backend' ? 'Restored from backend' : 'Restored from local cache'}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={activeCourseId || ''}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#2A73FF] focus:ring-2 focus:ring-blue-100"
            >
              <option value="">General AI Lab</option>
              {availableCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => router.push('/adaptive-quiz')}
              className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-[#2A73FF] hover:bg-blue-100"
            >
              Adaptive Quiz
            </button>
            <button
              onClick={() => router.push('/student')}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Back to Dashboard
            </button>
            <button
              onClick={deleteSession}
              disabled={!selectedSessionId}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              🗑 Delete Session
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-[1500px] gap-6 px-4 py-6 md:px-6 xl:grid-cols-[40%_60%]">
        {/* Left: 3D model + session list */}
        <article className="flex min-h-[760px] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold">3D Tutor Model</h2>
            <p className="text-sm text-slate-500">Interactive avatar for live learning sessions.</p>
          </div>

          <div className="relative flex-1 bg-gradient-to-b from-blue-50 to-white">
            <Canvas camera={{ position: [0, 1.7, 1.2], fov: 35 }}>
              <Suspense fallback={null}>
                <Environment preset="city" />
                <ambientLight intensity={0.5} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
                <NovaAvatarView blendshapes={currentViseme} currentEmotion={currentEmotion} isSpeaking={isSpeaking} rotationY={0.43} />
                <ContactShadows opacity={0.5} scale={10} blur={1} far={10} resolution={256} color="#000000" />
                <OrbitControls target={[0, 1.7, 0]} enableZoom={false} enablePan={false} />
              </Suspense>
            </Canvas>
          </div>

          {/* Session list */}
          <div className="border-t border-slate-200 px-5 py-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Learning Sessions
            </p>
            <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => switchSession(s.id)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                    s.id === selectedSessionId
                      ? 'bg-[#2A73FF] font-semibold text-white'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="line-clamp-1">{s.title}</span>
                  {s.message_count !== undefined && s.message_count > 0 && (
                    <span className={`ml-2 text-[10px] ${s.id === selectedSessionId ? 'text-blue-200' : 'text-slate-400'}`}>
                      {s.message_count} msgs
                    </span>
                  )}
                </button>
              ))}
              {sessions.length === 0 && (
                <p className="py-2 text-center text-xs text-slate-400">No sessions yet. Create one.</p>
              )}
            </div>
          </div>

          <div className="border-t border-slate-200 px-5 py-4">
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Adaptive Mini Quiz</p>
              <p className="mt-2 text-sm text-blue-700">
                Adaptive quiz is now on a dedicated page to keep AI Lab focused on tutoring chat.
              </p>
              <button
                onClick={() => router.push('/adaptive-quiz')}
                className="mt-3 rounded-lg bg-[#2A73FF] px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Open Adaptive Quiz
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-slate-200 p-4 text-sm">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-slate-500">Connection</p>
              <p className={`font-semibold ${isConnected ? 'text-emerald-600' : 'text-slate-700'}`}>
                {isConnected ? 'Connected' : 'Idle'}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-slate-500">Emotion</p>
              <p className="font-semibold text-[#2A73FF]">{emotionLabel}</p>
            </div>
          </div>
        </article>

        {/* Right: Chat */}
        <article className="flex min-h-[760px] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold">Chat History</h2>
            <p className="text-sm text-slate-500">Ask by text or voice. Your conversation appears below.</p>
          </div>

          {/* Session goal header */}
          <div className="border-b border-slate-200 bg-white px-5 py-4 space-y-3">
            {selectedSession ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-[#1E40AF]">
                <p className="font-medium">Session Goal: {selectedSession.title}</p>
                {selectedSession.created_at && (
                  <p className="mt-1 text-xs text-blue-600">
                    Created: {new Date(selectedSession.created_at).toLocaleString()}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">No session selected.</p>
            )}

            {/* New session input — always visible */}
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={sessionGoalInput}
                onChange={(e) => setSessionGoalInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createSession()}
                placeholder="+ New session goal (e.g., Learn Newton's laws)"
                className="flex-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#2A73FF] focus:ring-2 focus:ring-blue-100"
              />
              <button
                onClick={createSession}
                disabled={!sessionGoalInput.trim()}
                className="rounded-lg border border-[#2A73FF] px-4 py-2 text-sm font-semibold text-[#2A73FF] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                + New
              </button>
            </div>
          </div>

          {/* Messages — h-0 min-h-0 grow forces bounded height so overflow-y-auto shows scrollbar */}
          <div className="h-0 min-h-0 grow space-y-4 overflow-y-auto bg-[#F9FBFF] p-5">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-center text-slate-500">
                <div>
                  <p className="mb-1 text-base font-medium text-slate-700">Hello! Ready to learn?</p>
                  <p className="text-sm">Type a question or start voice mode to begin.</p>
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[85%]">
                    <div className={`rounded-xl px-4 py-3 text-sm shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-[#2A73FF] text-white'
                        : 'border border-slate-200 bg-white text-slate-800'
                    }`}>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        className={
                          msg.role === 'user'
                            ? 'prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0'
                            : 'prose prose-sm max-w-none text-slate-800 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0'
                        }
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>

                    {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2 space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Sources</p>
                        {msg.sources.map((src, si) => (
                          <div key={`${idx}-s-${si}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                            <p className="font-semibold text-[#2A73FF]">{src.document_name}</p>
                            <p className="mt-1 line-clamp-3">{src.chunk_text}</p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              Similarity: {typeof src.similarity_score === 'number' ? src.similarity_score.toFixed(2) : src.similarity_score}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input toolbar */}
          <div className="border-t border-slate-200 p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                onClick={toggleVoiceChat}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
                  isConnected ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isConnected ? 'Stop Voice' : 'Start Voice'}
              </button>
              <button
                onClick={toggleRecording}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  recordingState
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <RecordDot active={recordingState} />
                {recordingState ? 'Recording' : 'Record'}
              </button>
              <button
                onClick={() => setMuted(!isMuted)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 transition hover:bg-slate-50"
              >
                <MicIcon muted={isMuted} />
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your question..."
                className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-[#2A73FF] focus:ring-2 focus:ring-blue-100"
              />
              <button
                onClick={handleSend}
                disabled={sendingText || !selectedSessionId}
                className="flex items-center gap-2 rounded-lg bg-[#2A73FF] px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <SendIcon />
                {sendingText ? 'Sending...' : 'Send'}
              </button>
            </div>

            {(transcript || error || textChatError) && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
                {transcript && <p>Transcript: {transcript}</p>}
                {error && <p className="text-red-600">Voice Error: {error}</p>}
                {textChatError && <p className="text-red-600">Text Chat Error: {textChatError}</p>}
              </div>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}

