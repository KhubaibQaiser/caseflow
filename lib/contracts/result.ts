type ErrorCode =
  | 'validation'
  | 'forbidden'
  | 'unauthorized'
  | 'conflict'
  | 'not_found'
  | 'invalid_credentials'
  | 'rate_limited'
  | 'server';

export type Result<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: ErrorCode;
        message: string;
        fieldErrors?: Record<string, string>;
        retryAfter?: number;
      };
    };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function fail(
  code: ErrorCode,
  message: string,
  extra?: { fieldErrors?: Record<string, string>; retryAfter?: number },
): Result<never> {
  return { ok: false, error: { code, message, ...extra } };
}

// First message per field; the issue path's head is the form field name.
export function zodFieldErrors(error: {
  issues: { path: PropertyKey[]; message: string }[];
}): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const k = String(i.path[0] ?? 'form');
    out[k] ??= i.message;
  }
  return out;
}
