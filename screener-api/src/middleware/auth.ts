import { jwt } from 'hono/jwt';
import { HTTPException } from 'hono/http-exception';
import type { MiddlewareHandler } from 'hono';

// Returns a no-op when JWT_SECRET is unset so local dev works without a token.
// Set JWT_SECRET in production to enforce Bearer token validation on all routes.
// SSE endpoints can't send headers, so we also accept ?token=<jwt> as a fallback.
export function createAuthMiddleware(): MiddlewareHandler {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return (_c, next) => next();
  }
  const jwtMiddleware = jwt({ secret, alg: 'HS256' });
  return (c, next) => {
    if (c.req.path === '/health') return next();
    // If no Authorization header but ?token= is present, promote it to a header
    // so the standard jwt() middleware can verify it.
    if (!c.req.header('Authorization')) {
      const tokenParam = c.req.query('token');
      if (!tokenParam) throw new HTTPException(401, { message: 'Unauthorized' });
      c.req.raw.headers.set('Authorization', `Bearer ${tokenParam}`);
    }
    return jwtMiddleware(c, next);
  };
}
