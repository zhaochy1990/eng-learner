import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock auth-client before importing api module
vi.mock('@/lib/auth-client', () => ({
  getAccessToken: vi.fn(),
  authRefresh: vi.fn(),
  clearTokens: vi.fn(),
}));

import { getAccessToken, authRefresh, clearTokens } from '@/lib/auth-client';
import { apiFetch } from '@/lib/api';

const mockGetAccessToken = vi.mocked(getAccessToken);
const mockAuthRefresh = vi.mocked(authRefresh);
const mockClearTokens = vi.mocked(clearTokens);

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiFetch', () => {
  it('attaches Bearer token to request when token exists', async () => {
    mockGetAccessToken.mockReturnValue('test-token');
    mockFetch.mockResolvedValue(new Response('{}', { status: 200 }));

    await apiFetch('/api/articles');

    expect(mockFetch).toHaveBeenCalledOnce();
    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers.get('Authorization')).toBe('Bearer test-token');
  });

  it('does not attach Authorization header when no token', async () => {
    mockGetAccessToken.mockReturnValue(null);
    mockFetch.mockResolvedValue(new Response('{}', { status: 200 }));

    await apiFetch('/api/articles');

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers.has('Authorization')).toBe(false);
  });

  it('returns response directly on success', async () => {
    mockGetAccessToken.mockReturnValue('valid-token');
    const body = JSON.stringify({ data: 'test' });
    mockFetch.mockResolvedValue(new Response(body, { status: 200 }));

    const res = await apiFetch('/api/stats');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: 'test' });
  });

  it('retries with new token on 401', async () => {
    mockGetAccessToken.mockReturnValue('expired-token');
    mockAuthRefresh.mockResolvedValue('new-token');

    const body401 = new Response('Unauthorized', { status: 401 });
    const body200 = new Response('{"ok":true}', { status: 200 });
    mockFetch.mockResolvedValueOnce(body401).mockResolvedValueOnce(body200);

    const res = await apiFetch('/api/vocabulary');

    expect(mockAuthRefresh).toHaveBeenCalledOnce();
    expect(mockFetch).toHaveBeenCalledTimes(2);
    // Second call should use the new token
    const [, retryInit] = mockFetch.mock.calls[1];
    expect(retryInit.headers.get('Authorization')).toBe('Bearer new-token');
    expect(res.status).toBe(200);
  });

  it('clears tokens and redirects when refresh fails', async () => {
    mockGetAccessToken.mockReturnValue('expired-token');
    mockAuthRefresh.mockRejectedValue(new Error('Refresh failed'));

    const body401 = new Response('Unauthorized', { status: 401 });
    mockFetch.mockResolvedValue(body401);

    // Mock window.location
    const locationSpy = { href: '' };
    vi.stubGlobal('window', { location: locationSpy });

    // apiFetch returns a never-resolving promise after redirecting to /login,
    // so race with a short timeout to avoid hanging
    await Promise.race([
      apiFetch('/api/vocabulary'),
      new Promise((r) => setTimeout(r, 50)),
    ]);

    expect(mockClearTokens).toHaveBeenCalledOnce();
    expect(locationSpy.href).toBe('/login');
  });

  it('does not attempt refresh when no token existed', async () => {
    mockGetAccessToken.mockReturnValue(null);
    const body401 = new Response('Unauthorized', { status: 401 });
    mockFetch.mockResolvedValue(body401);

    const res = await apiFetch('/api/articles');

    expect(mockAuthRefresh).not.toHaveBeenCalled();
    expect(res.status).toBe(401);
  });

  it('preserves custom headers from init', async () => {
    mockGetAccessToken.mockReturnValue('token');
    mockFetch.mockResolvedValue(new Response('{}', { status: 200 }));

    await apiFetch('/api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers.get('Content-Type')).toBe('application/json');
    expect(init.headers.get('Authorization')).toBe('Bearer token');
  });

  it('preserves method and body from init', async () => {
    mockGetAccessToken.mockReturnValue('token');
    mockFetch.mockResolvedValue(new Response('{}', { status: 200 }));

    const body = JSON.stringify({ word: 'test' });
    await apiFetch('/api/vocabulary', { method: 'POST', body });

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain('/api/vocabulary');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(body);
  });
});
