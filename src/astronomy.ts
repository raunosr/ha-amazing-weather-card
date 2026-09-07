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
