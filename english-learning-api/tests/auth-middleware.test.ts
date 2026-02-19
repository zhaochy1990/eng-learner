import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// Mock jsonwebtoken before importing the module under test
vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
  },
}));

// Mock fs to avoid reading actual key files
vi.mock('fs', () => ({
  default: {
    readFileSync: vi.fn(() => 'mock-public-key'),
  },
}));

import jwt from 'jsonwebtoken';
import { requireAuth, requireRole } from '../src/middleware/auth';

function mockReq(authHeader?: string): Partial<Request> {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
  };
}

function mockRes(): Partial<Response> & { _status: number; _json: unknown } {
  const res: Partial<Response> & { _status: number; _json: unknown } = {
    _status: 0,
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

describe('requireAuth', () => {
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    next = vi.fn();
  });

  it('returns 401 when Authorization header is missing', () => {
    const req = mockReq();
    const res = mockRes();

    requireAuth(req as Request, res as Response, next);

    expect(res._status).toBe(401);
    expect(res._json).toEqual({ error: 'Missing or invalid Authorization header' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header does not start with Bearer', () => {
    const req = mockReq('Basic abc123');
    const res = mockRes();

    requireAuth(req as Request, res as Response, next);

    expect(res._status).toBe(401);
    expect(res._json).toEqual({ error: 'Missing or invalid Authorization header' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is invalid', () => {
    vi.mocked(jwt.verify).mockImplementation(() => {
      throw new Error('invalid signature');
    });

    const req = mockReq('Bearer invalid-token');
    const res = mockRes();

    requireAuth(req as Request, res as Response, next);

    expect(res._status).toBe(401);
    expect(res._json).toEqual({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is expired', () => {
    vi.mocked(jwt.verify).mockImplementation(() => {
      const err = new Error('jwt expired');
      err.name = 'TokenExpiredError';
      throw err;
    });

    const req = mockReq('Bearer expired-token');
    const res = mockRes();

    requireAuth(req as Request, res as Response, next);

    expect(res._status).toBe(401);
    expect(res._json).toEqual({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('sets req.userId and calls next() with a valid token', () => {
    vi.mocked(jwt.verify).mockReturnValue({
      sub: 'user-123',
      iss: 'auth-service',
      exp: Math.floor(Date.now() / 1000) + 3600,
    } as unknown as ReturnType<typeof jwt.verify>);

    const req = mockReq('Bearer valid-token');
    const res = mockRes();

    requireAuth(req as Request, res as Response, next);

    expect(req.userId).toBe('user-123');
    expect(next).toHaveBeenCalledOnce();
    expect(res._status).toBe(0); // status() never called
  });

  it('sets req.userRole from token role claim', () => {
    vi.mocked(jwt.verify).mockReturnValue({
      sub: 'user-123',
      role: 'admin',
    } as unknown as ReturnType<typeof jwt.verify>);

    const req = mockReq('Bearer valid-token');
    const res = mockRes();

    requireAuth(req as Request, res as Response, next);

    expect(req.userRole).toBe('admin');
    expect(next).toHaveBeenCalledOnce();
  });

  it('leaves req.userRole undefined when token has no role', () => {
    vi.mocked(jwt.verify).mockReturnValue({
      sub: 'user-123',
    } as unknown as ReturnType<typeof jwt.verify>);

    const req = mockReq('Bearer valid-token');
    const res = mockRes();

    requireAuth(req as Request, res as Response, next);

    expect(req.userRole).toBeUndefined();
    expect(next).toHaveBeenCalledOnce();
  });

  it('verifies token with RS256 algorithm', () => {
    vi.mocked(jwt.verify).mockReturnValue({
      sub: 'user-456',
    } as unknown as ReturnType<typeof jwt.verify>);

    const req = mockReq('Bearer some-token');
    const res = mockRes();

    requireAuth(req as Request, res as Response, next);

    expect(jwt.verify).toHaveBeenCalledWith('some-token', expect.any(String), {
      algorithms: ['RS256'],
      issuer: expect.any(String),
    });
  });
});

describe('requireRole', () => {
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    next = vi.fn();
  });

  it('calls next() when role matches', () => {
    const req = { userRole: 'admin' } as Partial<Request>;
    const res = mockRes();

    requireRole('admin')(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res._status).toBe(0);
  });

  it('calls next() when role matches one of multiple allowed roles', () => {
    const req = { userRole: 'editor' } as Partial<Request>;
    const res = mockRes();

    requireRole('admin', 'editor')(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res._status).toBe(0);
  });

  it('returns 403 when role does not match', () => {
    const req = { userRole: 'user' } as Partial<Request>;
    const res = mockRes();

    requireRole('admin')(req as Request, res as Response, next);

    expect(res._status).toBe(403);
    expect(res._json).toEqual({ error: 'Forbidden: insufficient role' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when userRole is undefined', () => {
    const req = {} as Partial<Request>;
    const res = mockRes();

    requireRole('admin')(req as Request, res as Response, next);

    expect(res._status).toBe(403);
    expect(res._json).toEqual({ error: 'Forbidden: insufficient role' });
    expect(next).not.toHaveBeenCalled();
  });
});
