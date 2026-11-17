/** National format for +1 numbers; anything else comes back as stored. Zero dependencies, for lists and cards (the full formatter lives in lib/phone). */
export function formatPhoneLite(phone: string): string {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(phone);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : phone;
}
