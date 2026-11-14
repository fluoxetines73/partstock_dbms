import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';

export function requireManager(managerToken?: string): RequestHandler {
  return (request, response, next) => {
    response.set('Cache-Control', 'no-store');
    if (!managerToken || managerToken.trim() === '') {
      response.status(503).json({ error: { code: 'AUTH_NOT_CONFIGURED', message: 'Manager access is not configured' } });
      return;
    }
    const header = request.get('authorization');
    if (!header?.startsWith('Bearer ')) {
      response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Manager token required' } });
      return;
    }
    const supplied = Buffer.from(header.slice(7));
    const expected = Buffer.from(managerToken);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      response.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
      return;
    }
    next();
  };
}

export function isId(value: unknown): value is string {
  return typeof value === 'string' && /^[1-9]\d{0,19}$/.test(value) && BigInt(value) <= 18446744073709551615n;
}
