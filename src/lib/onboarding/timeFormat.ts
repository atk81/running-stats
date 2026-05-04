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

export function formatSecondsToTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}
