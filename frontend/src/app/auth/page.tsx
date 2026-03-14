'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/services/authService';

declare global {
  interface Window {
    google?: any;
  }
}

type Role = 'student' | 'teacher';
type Mode = 'login' | 'register';

type FieldErrors = {
  fullName?: string;
  email?: string;
  password?: string;
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isPasswordValid = (value: string) => {
  const hasLetters = /[A-Za-z]/.test(value);
  const hasNumbers = /\d/.test(value);
  return value.length >= 8 && hasLetters && hasNumbers;
};

const inputClass =
  'w-full rounded-xl border bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#2A73FF] focus:ring-2 focus:ring-blue-100';

const iconClass = 'absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400';

const FieldIcon = ({ type }: { type: 'user' | 'email' | 'lock' }) => {
  if (type === 'user') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={iconClass}>
        <path d="M12 12c2.76 0 5-2.24 5-5S14.76 2 12 2 7 4.24 7 7s2.24 5 5 5Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4 20a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === 'email') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={iconClass}>
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className={iconClass}>
      <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 10V8a4 4 0 1 1 8 0v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
};

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = (searchParams.get('mode') || 'login') as Mode;

  const [role, setRole] = useState<Role>('student');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const passwordRuleText = useMemo(() => {
    if (!password) return 'At least 8 characters, include letters and numbers.';
    return isPasswordValid(password)
      ? 'Strong password format.'
      : 'Password must be 8+ chars and include letters and numbers.';
  }, [password]);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleReady(true);
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    const nextErrors: FieldErrors = {};

    if (mode === 'register' && fullName.trim().length < 2) {
      nextErrors.fullName = 'Please enter your full name.';
    }

    if (!emailRegex.test(email.trim())) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      nextErrors.password = 'Please enter your password.';
    } else if (mode === 'register' && !isPasswordValid(password)) {
      nextErrors.password = 'At least 8 characters with letters and numbers.';
    }

    setErrors(nextErrors);
  }, [mode, fullName, email, password]);

  const navigateByRole = (userRole: Role) => {
    router.push(userRole === 'teacher' ? '/teacher' : '/student');
  };

  const handleAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (Object.keys(errors).length > 0) {
      setServerError('Please fix the highlighted fields before continuing.');
      return;
    }

    setSubmitting(true);
    setServerError('');

    try {
      if (mode === 'register') {
        const res = await authService.register({
          email: email.trim(),
          password,
          full_name: fullName.trim(),
          role,
        });
        navigateByRole(res.user.role as Role);
      } else {
        const res = await authService.login({ email: email.trim(), password });

        if (rememberMe) {
          localStorage.setItem('novatutor_last_email', email.trim());
        } else {
          localStorage.removeItem('novatutor_last_email');
        }

        navigateByRole(res.user.role as Role);
      }
    } catch (e: any) {
      setServerError(e?.message || 'Authentication failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (googleBusy) return;

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || !window.google) {
      setServerError('Google Sign-In is not ready. Please configure NEXT_PUBLIC_GOOGLE_CLIENT_ID.');
      return;
    }

    setGoogleBusy(true);

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: any) => {
        try {
          setSubmitting(true);
          setServerError('');
          const res = await authService.googleAuth(response.credential);
          navigateByRole(res.user.role as Role);
        } catch (e: any) {
          setServerError(e?.message || 'Google sign in failed.');
        } finally {
          setSubmitting(false);
          setGoogleBusy(false);
        }
      },
    });

    try {
      window.google.accounts.id.prompt((notification: any) => {
        if (
          notification?.isNotDisplayed?.() ||
          notification?.isSkippedMoment?.() ||
          notification?.isDismissedMoment?.()
        ) {
          setGoogleBusy(false);
        }
      });
    } catch {
      setGoogleBusy(false);
    }
  };

  const handlePlaceholderSocial = (provider: 'Facebook' | 'Apple') => {
    setServerError(`${provider} login will be available soon.`);
  };

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-slate-900 md:px-6 md:py-12">
      <div className="mx-auto mb-4 w-full max-w-6xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          ← Back to Home
        </Link>
      </div>

      <div className="mx-auto grid w-full max-w-6xl items-stretch gap-8 lg:grid-cols-2">
        <section className="hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-8 shadow-sm lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2A73FF]">NovaTutor</p>
            <h1 className="mt-4 text-4xl font-bold leading-tight">Learn from top universities and companies</h1>
            <p className="mt-3 text-slate-600">Flexible online learning for students and educators, in one modern platform.</p>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-800">Online Learning Illustration</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="h-16 rounded-xl bg-blue-100" />
              <div className="h-16 rounded-xl bg-indigo-100" />
              <div className="h-16 rounded-xl bg-cyan-100" />
            </div>
            <p className="mt-3 text-sm text-slate-500">Student, laptop, books, certificates, and graduation icons style.</p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-6 flex rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => setRole('student')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${role === 'student' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
            >
              Student
            </button>
            <button
              onClick={() => setRole('teacher')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${role === 'teacher' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
            >
              Teacher
            </button>
          </div>

          <h2 className="text-3xl font-bold">{mode === 'login' ? 'Log in to your account' : 'Join for free'}</h2>

          <form className="mt-6 space-y-4" onSubmit={handleAuth}>
            {mode === 'register' && (
              <div>
                <div className="relative">
                  <FieldIcon type="user" />
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Full name"
                    className={`${inputClass} ${errors.fullName ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : 'border-slate-300'}`}
                  />
                </div>
                {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>}
              </div>
            )}

            <div>
              <div className="relative">
                <FieldIcon type="email" />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="Email address"
                  className={`${inputClass} ${errors.email ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : 'border-slate-300'}`}
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
            </div>

            <div>
              <div className="relative">
                <FieldIcon type="lock" />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  className={`${inputClass} pr-24 ${errors.password ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : 'border-slate-300'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#2A73FF]"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
              {mode === 'register' && (
                <p className={`mt-1 text-xs ${isPasswordValid(password) ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {passwordRuleText}
                </p>
              )}
            </div>

            {mode === 'login' && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-slate-600">
                  <input
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-[#2A73FF] focus:ring-[#2A73FF]"
                  />
                  Remember me
                </label>
                <a href="#" className="font-medium text-[#2A73FF] hover:underline">
                  Forgot password
                </a>
              </div>
            )}

            {serverError && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2A73FF] py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />}
              {submitting ? 'Processing...' : mode === 'login' ? 'Log In' : 'Join for Free'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs font-semibold tracking-wide text-slate-400">
            <div className="h-px flex-1 bg-slate-200" />
            OR
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="space-y-3">
            <button
              onClick={handleGoogleLogin}
              disabled={submitting || !googleReady || googleBusy}
              className="w-full rounded-xl border border-slate-300 bg-white py-3 text-sm font-semibold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {googleBusy ? 'Connecting Google...' : mode === 'login' ? 'Continue with Google' : 'Sign up with Google'}
            </button>
            <button
              onClick={() => handlePlaceholderSocial('Facebook')}
              type="button"
              className="w-full rounded-xl border border-slate-300 bg-white py-3 text-sm font-semibold transition hover:bg-slate-50"
            >
              {mode === 'login' ? 'Continue with Facebook' : 'Sign up with Facebook'}
            </button>
            <button
              onClick={() => handlePlaceholderSocial('Apple')}
              type="button"
              className="w-full rounded-xl border border-slate-300 bg-white py-3 text-sm font-semibold transition hover:bg-slate-50"
            >
              {mode === 'login' ? 'Continue with Apple' : 'Sign up with Apple'}
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-slate-600">
            {mode === 'login' ? 'New to the platform?' : 'Already have an account?'}{' '}
            <Link
              href={mode === 'login' ? '/auth?mode=register' : '/auth?mode=login'}
              className="font-semibold text-[#2A73FF]"
            >
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-slate-700">Loading...</div>}>
      <AuthContent />
    </Suspense>
  );
}
