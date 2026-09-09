import SunCalc from "suncalc";
import { HOUR, localDayStart } from "./time";
import type { CardConfig, HomeAssistant, Language } from "./types";

export function astronomy(
  time: number,
  config: CardConfig,
  hass: HomeAssistant,
) {
  const lat = config.latitude ?? hass.config.latitude,
    lon = config.longitude ?? hass.config.longitude;
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    Math.abs(lat) > 90 ||
    Math.abs(lon) > 180
  )
    return null;
  const moment = new Date(time),
    noon = new Date(localDayStart(time, hass.config.time_zone) + 12 * HOUR);
  const light = SunCalc.getMoonIllumination(moment),
    moon = SunCalc.getMoonPosition(moment, lat, lon),
    sun = SunCalc.getPosition(moment, lat, lon),
    times = SunCalc.getTimes(noon, lat, lon);
  return {
    phase: light.phase,
    fraction: light.fraction,
    moonAltitude: moon.altitude,
    sunAltitude: sun.altitude,
    sunrise: times.sunrise.getTime(),
    sunset: times.sunset.getTime(),
    lat,
    lon,
  };
}
export function moonPhaseName(phase: number, language: Language): string {
  const index =
    phase < 0.02 || phase > 0.98
      ? 0
      : phase < 0.235
        ? 1
        : phase < 0.265
          ? 2
          : phase < 0.48
            ? 3
            : phase < 0.52
              ? 4
              : phase < 0.735
                ? 5
                : phase < 0.765
                  ? 6
                  : 7;
  return (
    language === "fi"
      ? [
          "Uusikuu",
          "Kasvava sirppi",
          "Ensimmäinen neljännes",
          "Kasvava kuu",
          "Täysikuu",
          "Vähenevä kuu",
          "Viimeinen neljännes",
          "Vähenevä sirppi",
        ]
      : [
          "New moon",
          "Waxing crescent",
          "First quarter",
          "Waxing gibbous",
          "Full moon",
          "Waning gibbous",
          "Last quarter",
          "Waning crescent",
        ]
  )[index]!;
}

/** Use the same astronomical event times for both labels and night shading.
 * Sampling whole local days also covers DST changes and polar day/night. */
export function solarTimeline(
  start: number,
  end: number,
  location: { lat: number; lon: number },
  zone: string,
) {
  const events: { time: number; kind: "rise" | "set" }[] = [];
  const nights: { start: number; end: number }[] = [];
  const { lat, lon } = location;
  if (
    ![start, end, lat, lon].every(Number.isFinite) ||
    end <= start ||
    Math.abs(lat) > 90 ||
    Math.abs(lon) > 180
  )
    return { events, nights };
  const days = new Set<number>();
  // Twelve-hour samples avoid skipping a local day during daylight saving.
  for (
    let time = start - 24 * HOUR;
    time <= end + 24 * HOUR;
    time += 12 * HOUR
  ) {
    const day = localDayStart(time, zone);
    if (days.has(day)) continue;
    days.add(day);
    const times = SunCalc.getTimes(new Date(day + 12 * HOUR), lat, lon);
    for (const [kind, date] of [
      ["rise", times.sunrise],
      ["set", times.sunset],
    ] as const) {
      const at = date.getTime();
      if (
        at >= start &&
        at <= end &&
        !events.some((e) => e.time === at && e.kind === kind)
      )
        events.push({ time: at, kind });
    }
  }
  events.sort((a, b) => a.time - b.time);
  // The first event determines which side of the horizon we start on.
  // With no events (polar day/night), use SunCalc's sunrise altitude.
  let night = events.length
    ? events[0]!.kind === "rise"
    : SunCalc.getPosition(new Date(start), lat, lon).altitude <
      (-0.833 * Math.PI) / 180;
  let boundary = start;
  for (const event of events) {
    if (night && event.time > boundary)
      nights.push({ start: boundary, end: event.time });
    night = event.kind === "set";
    boundary = event.time;
  }
  if (night && end > boundary) nights.push({ start: boundary, end });
  return { events, nights };
}
export function moonPolygon(phase: number, fraction: number): string {
  const r = 19,
    c = 22,
    side = phase < 0.5 ? 1 : -1,
    terminator = 1 - 2 * fraction,
    points: number[][] = [];
  for (let i = 0; i <= 48; i++) {
    const y = -r + (2 * r * i) / 48;
    points.push([
      c + side * terminator * Math.sqrt(Math.max(0, r * r - y * y)),
      c + y,
    ]);
  }
  for (let i = 48; i >= 0; i--) {
    const y = -r + (2 * r * i) / 48;
    points.push([c + side * Math.sqrt(Math.max(0, r * r - y * y)), c + y]);
  }
  return points.map((p) => p.map((v) => v.toFixed(2)).join(",")).join(" ");
}
