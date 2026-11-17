import { formatPhoneLite } from '@/utils/format-phone';
import { telHref } from '@/utils/tel-href';

// z-1 lifts the link above a card's stretched row link.
export function PhoneLink({ phone }: { phone: string }) {
  return (
    <a
      href={telHref(phone)}
      className="text-ink-2 hover:text-ink relative z-1 inline-flex min-h-6 shrink-0 items-center underline-offset-3 hover:underline"
    >
      {formatPhoneLite(phone)}
    </a>
  );
}
