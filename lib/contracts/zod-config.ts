import { z } from 'zod';

// Browser only: zod's `new Function` probe is caught, but our CSP still reports it as a violation.
// The server has no CSP and keeps the JIT for big list parses. Imported first by every contract module.
if (typeof window !== 'undefined') z.config({ jitless: true });
