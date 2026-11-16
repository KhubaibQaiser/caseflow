import Columns3 from 'lucide-react/icons/columns-3';
import User from 'lucide-react/icons/user';

export const NAV = [
  { href: '/contacts', label: 'Contacts', icon: User },
  { href: '/pipeline', label: 'Pipeline', icon: Columns3 },
] as const;

/** A section stays current on its sub-pages (/contacts/123/edit). */
export const isCurrent = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);
