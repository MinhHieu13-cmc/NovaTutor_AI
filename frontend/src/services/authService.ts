// Auth Service - GCP Backend Integration
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'student' | 'teacher';
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  role: 'student' | 'teacher';
}

export interface LoginData {
  email: string;
  password: string;
}

class AuthService {
  private tokenKey = 'novatutor_token';
  private userKey = 'novatutor_user';
  private roleCookieKey = 'novatutor_role';

  // Register new user
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }

    const authData: AuthResponse = await response.json();
    this.setToken(authData.access_token);
    this.setUser(authData.user);
    return authData;
  }

  // Login user
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const authData: AuthResponse = await response.json();
    this.setToken(authData.access_token);
    this.setUser(authData.user);
    return authData;
  }

  // Google OAuth
  async googleAuth(idToken: string): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: idToken }),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Google authentication failed');
    }

    const authData: AuthResponse = await response.json();
    this.setToken(authData.access_token);
    this.setUser(authData.user);
    return authData;
  }

  // Get current user
  async getCurrentUser(): Promise<User> {
    const token = this.getToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    });

    if (!response.ok) {
      this.logout();
      throw new Error('Session expired');
    }

    const user: User = await response.json();
    this.setUser(user);
    return user;
  }

  private setCookie(name: string, value: string, maxAgeSeconds: number): void {
    if (typeof document === 'undefined') return;
    const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
  }

  private clearCookie(name: string): void {
    if (typeof document === 'undefined') return;
    const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
  }

  private clearSession(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
      this.clearCookie(this.tokenKey);
      this.clearCookie(this.roleCookieKey);
    }
  }

  // Logout
  logout(redirect: boolean = true): void {
    this.clearSession();
    if (redirect && typeof window !== 'undefined') {
      window.location.href = '/auth?mode=login';
    }
  }

  // Token management
  setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.tokenKey, token);
      this.setCookie(this.tokenKey, token, 60 * 60 * 24 * 7);
    }
  }

  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.tokenKey);
    }
    return null;
  }

  // User management
  setUser(user: User): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.userKey, JSON.stringify(user));
      this.setCookie(this.roleCookieKey, user.role, 60 * 60 * 24 * 7);
    }
  }

  getUser(): User | null {
    if (typeof window !== 'undefined') {
      const token = this.getToken();
      if (!token) return null;

      const userData = localStorage.getItem(this.userKey);
      if (!userData) return null;

      try {
        return JSON.parse(userData) as User;
      } catch {
        localStorage.removeItem(this.userKey);
        return null;
      }
    }
    return null;
  }

  // Check auth status
  isAuthenticated(): boolean {
    return !!this.getToken() && !!this.getUser();
  }

  // Get auth headers
  getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async validateSession(): Promise<User | null> {
    const token = this.getToken();
    const cachedUser = this.getUser();
    if (!token || !cachedUser) {
      this.clearSession();
      return null;
    }

    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (!response.ok) {
        this.clearSession();
        return null;
      }

      const user: User = await response.json();
      this.setUser(user);
      return user;
    } catch {
      this.clearSession();
      return null;
    }
  }
}

export const authService = new AuthService();

