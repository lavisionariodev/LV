/** Month names matching `<select>` options in profile account UI. */
export const PROFILE_DOB_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * @param {string} iso - YYYY-MM-DD or empty
 * @returns {{ day: string, month: string, year: string }}
 */
export function dobPartsFromIso(iso) {
  if (!iso || typeof iso !== 'string') {
    return { day: '', month: '', year: '' };
  }
  const part = iso.trim().slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(part);
  if (!m) {
    return { day: '', month: '', year: '' };
  }
  const year = m[1];
  const monthIndex = parseInt(m[2], 10) - 1;
  const dayNum = parseInt(m[3], 10);
  if (
    monthIndex < 0 ||
    monthIndex >= PROFILE_DOB_MONTHS.length ||
    !Number.isFinite(dayNum)
  ) {
    return { day: '', month: '', year: '' };
  }
  return {
    year,
    month: PROFILE_DOB_MONTHS[monthIndex],
    day: String(dayNum),
  };
}

/**
 * @param {string} day - 1–31 as string
 * @param {string} month - full month name from PROFILE_DOB_MONTHS
 * @param {string} year - four-digit year
 * @returns {string} YYYY-MM-DD or '' if incomplete / invalid
 */
export function isoFromDobParts(day, month, year) {
  if (!day || !month || !year) return '';
  const mi = PROFILE_DOB_MONTHS.indexOf(month);
  if (mi < 0) return '';
  const d = parseInt(String(day), 10);
  const y = parseInt(String(year), 10);
  if (!Number.isFinite(d) || !Number.isFinite(y) || y < 1900) return '';
  const m = String(mi + 1).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
