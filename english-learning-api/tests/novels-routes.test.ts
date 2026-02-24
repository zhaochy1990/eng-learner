import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../src/lib/db', () => ({
  getAllNovels: vi.fn(),
  getNovelById: vi.fn(),
  createNovel: vi.fn(),
  updateNovel: vi.fn(),
  deleteNovel: vi.fn(),
  createChapter: vi.fn(),
}));

vi.mock('../src/middleware/auth', () => ({
  requireRole: vi.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
}));

import router from '../src/routes/novels';
import { getAllNovels, getNovelById, createNovel, updateNovel, deleteNovel, createChapter } from '../src/lib/db';

function findHandler(method: string, path: string) {
  for (const layer of (router as any).stack) {
    if (layer.route?.path === path && layer.route.methods[method]) {
      const handlers = layer.route.stack.map((s: any) => s.handle);
      return handlers[handlers.length - 1];
    }
  }
  throw new Error(`No handler for ${method} ${path}`);
}

function mockReq(overrides?: Partial<Request>): Partial<Request> {
  return {
    userId: 'user-123',
    userRole: 'admin',
    headers: {},
    body: {},
    params: {},
    ...overrides,
  };
}

function mockRes(): Partial<Response> & { _status: number; _json: unknown } {
  const res: Partial<Response> & { _status: number; _json: unknown } = {
    _status: 200,
    _json: null,
    status(code: number) {
      res._status = code;
      return res as Response;
    },
    json(body: unknown) {
      res._json = body;
      return res as Response;
    },
  };
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET / (list novels)', () => {
  const handler = findHandler('get', '/');

  it('returns novels from getAllNovels', async () => {
    const novels = [{ id: 1, title: 'Test Novel' }];
    vi.mocked(getAllNovels).mockResolvedValue(novels as any);

    const req = mockReq();
    const res = mockRes();

    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json).toEqual(novels);
  });

  it('passes userId to getAllNovels', async () => {
    vi.mocked(getAllNovels).mockResolvedValue([]);

    const req = mockReq({ userId: 'user-456' });
    const res = mockRes();

    await handler(req, res);

    expect(getAllNovels).toHaveBeenCalledWith('user-456');
  });

  it('returns 500 on db error', async () => {
    vi.mocked(getAllNovels).mockRejectedValue(new Error('db error'));

    const req = mockReq();
    const res = mockRes();

    await handler(req, res);

    expect(res._status).toBe(500);
    expect(res._json).toEqual({ error: 'Failed to fetch novels' });
  });
});

describe('POST / (create novel)', () => {
  const handler = findHandler('post', '/');

  it('returns 400 when title missing', async () => {
    const req = mockReq({ body: {} });
    const res = mockRes();

    await handler(req, res);

    expect(res._status).toBe(400);
    expect(res._json).toEqual({ error: 'Title is required' });
  });

  it('returns 400 for invalid difficulty', async () => {
    const req = mockReq({ body: { title: 'My Novel', difficulty: 'expert' } });
    const res = mockRes();

    await handler(req, res);

    expect(res._status).toBe(400);
    expect(res._json).toEqual({ error: expect.stringContaining('Invalid difficulty') });
  });

  it('creates novel and returns 201 with id', async () => {
    vi.mocked(createNovel).mockResolvedValue(42);

    const req = mockReq({ body: { title: 'My Novel', difficulty: 'beginner' } });
    const res = mockRes();

    await handler(req, res);

    expect(res._status).toBe(201);
    expect(res._json).toEqual({ id: 42 });
  });

  it('passes correct fields to createNovel', async () => {
    vi.mocked(createNovel).mockResolvedValue(1);

    const body = {
      title: 'My Novel',
      author: 'Author',
      cover_image_url: 'http://example.com/cover.jpg',
      description: 'A description',
      difficulty: 'intermediate',
    };
    const req = mockReq({ body });
    const res = mockRes();

    await handler(req, res);

    expect(createNovel).toHaveBeenCalledWith({
      title: 'My Novel',
      author: 'Author',
      cover_image_url: 'http://example.com/cover.jpg',
      description: 'A description',
      difficulty: 'intermediate',
    });
  });
});

describe('GET /:id (get novel)', () => {
  const handler = findHandler('get', '/:id');

  it('returns novel when found', async () => {
    const novel = { id: 1, title: 'Test Novel', chapters: [] };
    vi.mocked(getNovelById).mockResolvedValue(novel as any);

    const req = mockReq({ params: { id: '1' } });
    const res = mockRes();

    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json).toEqual(novel);
  });

  it('returns 404 when not found', async () => {
    vi.mocked(getNovelById).mockResolvedValue(undefined as any);

    const req = mockReq({ params: { id: '999' } });
    const res = mockRes();

    await handler(req, res);

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ error: 'Novel not found' });
  });

  it('returns 500 on db error', async () => {
    vi.mocked(getNovelById).mockRejectedValue(new Error('db error'));

    const req = mockReq({ params: { id: '1' } });
    const res = mockRes();

    await handler(req, res);

    expect(res._status).toBe(500);
    expect(res._json).toEqual({ error: 'Failed to fetch novel' });
  });
});

describe('PUT /:id (update novel)', () => {
  const handler = findHandler('put', '/:id');

  it('returns 400 for invalid difficulty', async () => {
    const req = mockReq({ params: { id: '1' }, body: { difficulty: 'expert' } });
    const res = mockRes();

    await handler(req, res);

    expect(res._status).toBe(400);
    expect(res._json).toEqual({ error: expect.stringContaining('Invalid difficulty') });
  });

  it('returns 404 when novel not found', async () => {
    vi.mocked(updateNovel).mockResolvedValue(false);

    const req = mockReq({ params: { id: '999' }, body: { title: 'Updated' } });
    const res = mockRes();

    await handler(req, res);

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ error: 'Novel not found' });
  });

  it('returns success when updated', async () => {
    vi.mocked(updateNovel).mockResolvedValue(true);

    const req = mockReq({ params: { id: '1' }, body: { title: 'Updated' } });
    const res = mockRes();

    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json).toEqual({ success: true });
  });
});

describe('DELETE /:id (delete novel)', () => {
  const handler = findHandler('delete', '/:id');

  it('returns success when novel exists', async () => {
    vi.mocked(deleteNovel).mockResolvedValue(true);

    const req = mockReq({ params: { id: '1' } });
    const res = mockRes();

    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json).toEqual({ success: true });
  });

  it('returns 404 when novel not found', async () => {
    vi.mocked(deleteNovel).mockResolvedValue(false);

    const req = mockReq({ params: { id: '999' } });
    const res = mockRes();

    await handler(req, res);

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ error: 'Novel not found' });
  });
});

describe('POST /:id/chapters (create chapter)', () => {
  const handler = findHandler('post', '/:id/chapters');

  it('returns 400 when title missing', async () => {
    const req = mockReq({ params: { id: '1' }, body: { content: 'some content' } });
    const res = mockRes();

    await handler(req, res);

    expect(res._status).toBe(400);
    expect(res._json).toEqual({ error: 'Title and content are required' });
  });

  it('returns 400 when content missing', async () => {
    const req = mockReq({ params: { id: '1' }, body: { title: 'Chapter 1' } });
    const res = mockRes();

    await handler(req, res);

    expect(res._status).toBe(400);
    expect(res._json).toEqual({ error: 'Title and content are required' });
  });

  it('returns 404 when novel not found', async () => {
    vi.mocked(getNovelById).mockResolvedValue(undefined as any);

    const req = mockReq({ params: { id: '999' }, body: { title: 'Ch 1', content: 'text' } });
    const res = mockRes();

    await handler(req, res);

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ error: 'Novel not found' });
  });

  it('creates chapter with auto-incremented chapter_number', async () => {
    const novel = { id: 1, title: 'Novel', chapters: [{ chapter_number: 1 }, { chapter_number: 2 }] };
    vi.mocked(getNovelById).mockResolvedValue(novel as any);
    vi.mocked(createChapter).mockResolvedValue(10);

    const req = mockReq({ params: { id: '1' }, body: { title: 'Ch 3', content: 'text' } });
    const res = mockRes();

    await handler(req, res);

    expect(createChapter).toHaveBeenCalledWith(1, {
      title: 'Ch 3',
      content: 'text',
      chapter_number: 3,
    });
  });

  it('returns 201 with id and chapter_number', async () => {
    const novel = { id: 1, title: 'Novel', chapters: [{ chapter_number: 1 }] };
    vi.mocked(getNovelById).mockResolvedValue(novel as any);
    vi.mocked(createChapter).mockResolvedValue(10);

    const req = mockReq({ params: { id: '1' }, body: { title: 'Ch 2', content: 'text' } });
    const res = mockRes();

    await handler(req, res);

    expect(res._status).toBe(201);
    expect(res._json).toEqual({ id: 10, chapter_number: 2 });
  });
});
