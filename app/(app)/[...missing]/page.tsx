import { notFound } from 'next/navigation';

// Catches every unmatched URL so the 404 renders in the (app) segment, inside the shell.
export default function Missing() {
  notFound();
}
