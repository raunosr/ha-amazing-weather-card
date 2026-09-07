export const HOUR = 3_600_000;
export const MINUTE = 60_000;

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(locale: string, zone: string, kind: "day" | "time" | "key") {
  const key = `${locale}:${zone}:${kind}`;
  let value = formatters.get(key);
  if (!value) {
    const options: Intl.DateTimeFormatOptions =
      kind === "key"
        ? { year: "numeric", month: "2-digit", day: "2-digit" }
        : kind === "time"
          ? { hour: "2-digit", minute: "2-digit", hour12: false }
          : { weekday: "short", day: "numeric", month: "numeric" };
    value = new Intl.DateTimeFormat(locale, { timeZone: zone, ...options });
    if (formatters.size >= 32)
      formatters.delete(formatters.keys().next().value!);
    formatters.set(key, value);
  }
  return value;
}

export function validZone(zone: string | undefined): string {
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone }).format();
    return zone || "UTC";
  } catch {
    return "UTC";
  }
}

export function dayKey(time: number, zone: string): string {
  const parts = formatter("en-CA", zone, "key").formatToParts(time);
  return ["year", "month", "day"]
    .map((type) => parts.find((p) => p.type === type)!.value)
    .join("-");
}

export function localDayStart(time: number, zone: string): number {
  const key = dayKey(time, zone);
  // Search on UTC instants: local days may be 23 or 25 hours during DST.
  let low = time - 30 * HOUR,
    high = time;
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (dayKey(mid, zone) < key) low = mid;
    else high = mid;
  }
  return high;
}

export function formatTime(
  time: number,
  language: string,
  zone: string,
): string {
  return formatter(language === "fi" ? "fi-FI" : "en-GB", zone, "time").format(
    time,
  );
}

export function formatDay(
  time: number,
  language: string,
  zone: string,
): string {
  return formatter(language === "fi" ? "fi-FI" : "en-GB", zone, "day").format(
    time,
  );
}
