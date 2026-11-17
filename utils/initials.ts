/** "Khubaib Qaiser" -> "KQ"; one word -> one letter. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0];
  if (!first) return '';
  const last = words.length > 1 ? words[words.length - 1]! : '';
  return (first.charAt(0) + last.charAt(0)).toUpperCase();
}
