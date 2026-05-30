import type { MiddlewareHandler } from 'hono';

// Rejects requests whose Content-Length exceeds the limit.
// Covers the common case — clients that omit Content-Length are not caught here,
// but JSON body parsing in controllers will still time out or fail on huge payloads.
export function createBodyLimitMiddleware(maxBytes: number): MiddlewareHandler {
  return async (c, next) => {
    const contentLength = c.req.header('content-length');
    if (contentLength && Number(contentLength) > maxBytes) {
      return c.json({ error: `Request body exceeds limit of ${maxBytes} bytes` }, 413);
    }
    await next();
  };
}

export function createBodyLimitFromEnv(): MiddlewareHandler {
  const maxBytes = Number(process.env.BODY_LIMIT_BYTES ?? 65_536); // 64 KB default
  return createBodyLimitMiddleware(maxBytes);
}
