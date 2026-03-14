import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
const protectedPrefixes = ['/student', '/teacher', '/ai-chat', '/adaptive-quiz', '/test-animations'];
function isProtected(pathname: string) {
  return protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === '/dashboard/student' || pathname.startsWith('/dashboard/student/')) {
    return NextResponse.redirect(new URL('/student', request.url));
  }
  if (pathname === '/dashboard/teacher' || pathname.startsWith('/dashboard/teacher/')) {
    return NextResponse.redirect(new URL('/teacher', request.url));
  }
  if (!isProtected(pathname)) return NextResponse.next();
  const token = request.cookies.get('novatutor_token')?.value;
  const role = request.cookies.get('novatutor_role')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/auth?mode=login', request.url));
  }
  if (pathname.startsWith('/student') && role && role !== 'student') {
    return NextResponse.redirect(new URL('/teacher', request.url));
  }
  if (pathname.startsWith('/teacher') && role && role !== 'teacher') {
    return NextResponse.redirect(new URL('/student', request.url));
  }
  return NextResponse.next();
}
export const config = {
  matcher: ['/student/:path*', '/teacher/:path*', '/ai-chat/:path*', '/adaptive-quiz/:path*', '/test-animations/:path*', '/dashboard/:path*'],
};
