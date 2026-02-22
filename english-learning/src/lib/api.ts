import { getAccessToken, authRefresh, clearTokens } from './auth-client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = apiUrl(path);
  const token = getAccessToken();

  const headers = new Headers(init?.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let res = await fetch(url, { ...init, headers });

  if (res.status === 401) {
    if (token) {
      try {
        const newToken = await authRefresh();
        headers.set('Authorization', `Bearer ${newToken}`);
        res = await fetch(url, { ...init, headers });
      } catch {
        // refresh failed
      }
    }

    if (res.status === 401) {
      clearTokens();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }

  return res;
}
