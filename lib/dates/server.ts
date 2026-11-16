import 'server-only';
import { cookies } from 'next/headers';
import { resolveTimeZone } from './date-only';

export async function getRequestTimeZone(): Promise<string> {
  return resolveTimeZone((await cookies()).get('tz')?.value);
}
