import { z } from 'zod';

// Zod probes `new Function` once; under our CSP the caught probe still logs a violation.
z.config({ jitless: true });
