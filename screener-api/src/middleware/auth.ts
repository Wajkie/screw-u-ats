import { jwt } from 'hono/jwt';
import type { MiddlewareHandler } from 'hono';

// Returns a no-op when JWT_SECRET is unset so local dev works without a token.
// Set JWT_SECRET in production to enforce Bearer token validation on all routes.
export function createAuthMiddleware(): MiddlewareHandler {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return (_c, next) => next();
  }
  const jwtMiddleware = jwt({ secret, alg: 'HS256' });
  return (c, next) => {
    if (c.req.path === '/health') return next();
    return jwtMiddleware(c, next);
  };
}
