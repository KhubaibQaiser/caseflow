'use client';

import dynamic from 'next/dynamic';

import { FormSkeleton } from './form-skeleton';

// Client-only: server-rendered fields would accept a click before hydration and submit natively (a GET with the input in the URL).
// The form pulls in react-hook-form, zod and the calendar (~100 kB gzipped); keep them out of the route's first load.
export const ContactForm = dynamic(
  () => import('./contact-form').then((m) => m.ContactForm),
  { ssr: false, loading: () => <FormSkeleton header={false} /> },
);
