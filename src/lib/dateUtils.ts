const SHORT_MONTHS_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

export function formatShortDateId(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = SHORT_MONTHS_ID[date.getMonth()] || 'Jan';
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTimeHm(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

export function addYears(date: Date, years: number): Date {
  const next = new Date(date.getTime());
  next.setFullYear(next.getFullYear() + years);
  return next;
}

export function formatSlashDateId(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDmLabel(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

const MONTH_NAME_MAP: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  mei: '05',
  may: '05',
  jun: '06',
  jul: '07',
  agu: '08',
  aug: '08',
  sep: '09',
  okt: '10',
  oct: '10',
  nov: '11',
  des: '12',
  dec: '12',
};

export function parseShortDateToIso(input?: string | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/);
  if (!match) return null;
  const day = match[1].padStart(2, '0');
  const monthKey = match[2].slice(0, 3).toLowerCase();
  const month = MONTH_NAME_MAP[monthKey];
  if (!month) return null;
  return `${match[3]}-${month}-${day}`;
}

