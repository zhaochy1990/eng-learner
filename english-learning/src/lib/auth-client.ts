const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3002';
const CLIENT_ID = process.env.NEXT_PUBLIC_AUTH_CLIENT_ID || '';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

interface RegisterResponse extends TokenResponse {
  user_id: string;
}

export interface UserProfile {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  email_verified: boolean;
  created_at: string;
}

interface JwtPayload {
  sub: string;
  aud: string;
  iss: string;
  exp: number;
  iat: number;
  scopes: string[];
  role: string;
}

export function decodeJwt(token: string): JwtPayload {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const json = decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join(''),
  );
  return JSON.parse(json);
}

export function getUserRole(): string | null {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const payload = decodeJwt(token);
    return payload.role || null;
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('access_token');
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('refresh_token');
}

function storeTokens(accessToken: string, refreshToken: string) {
  sessionStorage.setItem('access_token', accessToken);
  sessionStorage.setItem('refresh_token', refreshToken);
  document.cookie = 'logged_in=1; path=/; SameSite=Lax; Secure';
}

export function clearTokens() {
  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem('refresh_token');
  document.cookie = 'logged_in=; path=/; max-age=0; SameSite=Lax; Secure';
}

export async function authLogin(email: string, password: string): Promise<TokenResponse> {
  const res = await fetch(`${AUTH_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Id': CLIENT_ID,
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || data.error || 'Login failed');
  }

  const data: TokenResponse = await res.json();
  storeTokens(data.access_token, data.refresh_token);
  return data;
}

export async function authRegister(email: string, password: string, name?: string): Promise<RegisterResponse> {
  const res = await fetch(`${AUTH_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Id': CLIENT_ID,
    },
    body: JSON.stringify({ email, password, name: name || undefined }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || data.error || 'Registration failed');
  }

  const data: RegisterResponse = await res.json();
  storeTokens(data.access_token, data.refresh_token);
  return data;
}

let refreshPromise: Promise<string> | null = null;

export async function authRefresh(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) throw new Error('No refresh token');

      const res = await fetch(`${AUTH_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Id': CLIENT_ID,
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) throw new Error('Refresh failed');

      const data: TokenResponse = await res.json();
      storeTokens(data.access_token, data.refresh_token);
      return data.access_token;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function authLogout(): Promise<void> {
  const token = getAccessToken();
  const refreshToken = getRefreshToken();

  if (token && refreshToken) {
    try {
      await fetch(`${AUTH_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Client-Id': CLIENT_ID,
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch {
      // Best effort
    }
  }

  clearTokens();
}

export async function getMe(): Promise<UserProfile> {
  const token = getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${AUTH_URL}/api/users/me`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Client-Id': CLIENT_ID,
    },
  });

  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
}

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleTokenRefresh() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  const token = getAccessToken();
  if (!token) return;

  try {
    const payload = decodeJwt(token);
    const msUntilExpiry = payload.exp * 1000 - Date.now();
    const delay = Math.max(msUntilExpiry - 60_000, 1_000);
    refreshTimer = setTimeout(async () => {
      try {
        await authRefresh();
        scheduleTokenRefresh();
      } catch {
        // Will redirect on next 401
      }
    }, delay);
  } catch {
    // Invalid token
  }
}

export function stopTokenRefresh() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}
