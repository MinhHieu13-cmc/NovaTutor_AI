'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService, type User } from '@/services/authService';

type GuardMode = 'guest' | 'protected';

interface RouteGuardOptions {
  mode: GuardMode;
  role?: 'student' | 'teacher';
  redirectTo?: string;
}

export function useRouteGuard(options: RouteGuardOptions) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      const validUser = await authService.validateSession();
      if (!mounted) return;

      setUser(validUser);

      if (options.mode === 'guest') {
        if (validUser) {
          if (validUser.role === 'teacher') router.replace('/teacher');
          else router.replace('/student');
        }
      } else {
        if (!validUser) {
          router.replace(options.redirectTo || '/auth?mode=login');
        } else if (options.role && validUser.role !== options.role) {
          router.replace(validUser.role === 'teacher' ? '/teacher' : '/student');
        }
      }

      setLoading(false);
    };

    check();
    return () => {
      mounted = false;
    };
  }, [router, options.mode, options.redirectTo, options.role]);

  return { loading, user };
}

