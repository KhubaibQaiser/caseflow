import { parsePhoneNumberFromString } from 'libphonenumber-js/min';

/** National format for US and CA (+1), international for the rest, the stored text if it does not parse. */
export function formatPhone(phone: string): string {
  const p = parsePhoneNumberFromString(phone);
  if (!p?.isValid()) return phone;
  return p.countryCallingCode === '1'
    ? p.formatNational()
    : p.formatInternational();
}
