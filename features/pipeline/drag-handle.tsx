import GripVertical from 'lucide-react/icons/grip-vertical';

import { Button } from '@/components/ui/button';

/**
 * The keyboard way into a drag (ADR-0014): Space or Enter picks the card up. It shows only while it has
 * keyboard focus, takes no space while hidden, and lets a pointer through to the card until then
 * (screens-v3.html, DECISIONS row 40). Phones have no drag, so it never shows below 768px.
 */
export function DragHandle({
  name,
  handleRef,
}: {
  name: string;
  handleRef: (el: Element | null) => void;
}) {
  return (
    <Button
      variant="ghost"
      ref={handleRef}
      data-drag-handle
      aria-label={`Drag ${name}`}
      className="absolute right-3 bottom-2.5 z-1 h-7 px-2 text-xs opacity-0 not-focus-visible:pointer-events-none focus-visible:opacity-100 max-md:hidden"
    >
      <GripVertical aria-hidden className="size-4" />
      Drag
    </Button>
  );
}
