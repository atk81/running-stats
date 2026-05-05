const MM_SS = /^([0-9]{1,3}):([0-5][0-9])$/;
const HH_MM_SS = /^([0-9]{1,3}):([0-5][0-9]):([0-5][0-9])$/;

export function parseTimeToSeconds(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const hms = HH_MM_SS.exec(trimmed);
  if (hms) {
    const [, h, m, s] = hms;
    return Number(h) * 3600 + Number(m) * 60 + Number(s);
  }
  const ms = MM_SS.exec(trimmed);
  if (ms) {
    const [, m, s] = ms;
    return Number(m) * 60 + Number(s);
  }
  return null;
}

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function formatMovingTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${m}:${pad2(s)}`;
}

export function formatPace(secPerKm: number | null | undefined): string {
  if (!secPerKm || secPerKm <= 0) return "—";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${pad2(s)}`;
}

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatActivityDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${SHORT_MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export const UPPER_MONTH_ABBRS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
] as const;

export function formatPaceDate(d: Date): string {
  return `${UPPER_MONTH_ABBRS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}
