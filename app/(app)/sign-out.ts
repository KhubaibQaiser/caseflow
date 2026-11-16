'use server';

import { redirect } from 'next/navigation';

// ponytail: T22 replaces this with the Supabase sign-out action.
export async function signOut() {
  redirect('/login');
}
