import { describe, expect, it } from "vitest";
import { astronomy, solarTimeline } from "../src/astronomy";
import { currentWeather, stationFreshness } from "../src/data";
import { validateConfig } from "../src/config";
import { HOUR, MINUTE, localDayStart } from "../src/time";
import { createFixture, demoConfig } from "../demo/fixture";
import type { Reading } from "../src/types";

const now = Date.parse("2026-09-07T18:23:00Z"),
  zone = "Europe/Helsinki";
describe("station update tolerance", () => {
  it("accepts ten-minute latency and quiet UV/rain sensors, then warns strictly after 15 minutes", () => {
    const { hass } = createFixture("normal", now);
    for (const [id, entity] of Object.entries(hass.states)) {
      if (id.startsWith("sensor."))
        entity.last_updated = new Date(now - 10 * MINUTE).toISOString();
    }
    hass.states["sensor.uv"]!.last_updated = new Date(
      now - 12 * HOUR,
    ).toISOString();
    hass.states["sensor.rain_today"]!.last_updated = new Date(
      now - 5 * HOUR,
    ).toISOString();
    const config = validateConfig(demoConfig);
    expect(config.stale_after).toBe(15);
    const current = currentWeather(hass, config, now);
    const readings = Object.values(current).filter(
      (r): r is Reading => typeof r === "object" && r !== null,
    );
    expect(current.uv.stale).toBe(true); // still visible in the detail table
    expect(stationFreshness(readings, now).stale).toBe(false);
    expect(stationFreshness(readings, now + 5 * MINUTE).stale).toBe(false);
    expect(stationFreshness(readings, now + 5 * MINUTE + 1).stale).toBe(true);
    expect(stationFreshness(readings, now + HOUR, 0).stale).toBe(false);
  });
  it("uses actual report times when available, excluding unavailable sensors and forecast refreshes", () => {
    const { hass } = createFixture("normal", now);
    const entity = hass.states["sensor.outdoor_temperature"]!;
    entity.last_updated = new Date(now - 3 * HOUR).toISOString();
    entity.last_reported = new Date(now - 10 * MINUTE).toISOString();
    const current = currentWeather(hass, validateConfig(demoConfig), now);
    expect(current.temperature.stale).toBe(false);
    const unavailable = { ...current.wind, unavailable: true };
    expect(
      stationFreshness([current.temperature, unavailable], now).updated,
    ).toBe(now - 10 * MINUTE);
    const provider = currentWeather(
      hass,
      validateConfig({ entity: "weather.home" }),
      now,
    ).temperature;
    expect(stationFreshness([provider], now).updated).toBeNull();
  });
});
describe("astronomical timeline", () => {
  it("aligns night boundaries with the same exact sun times used in the header", () => {
    const { hass } = createFixture("normal", now);
    const astro = astronomy(now, validateConfig(demoConfig), hass)!;
    const start = localDayStart(now, zone),
      end = start + 24 * HOUR;
    const result = solarTimeline(start, end, astro, zone);
    expect(result.events).toEqual([
      { time: astro.sunrise, kind: "rise" },
      { time: astro.sunset, kind: "set" },
    ]);
    expect(result.nights).toEqual([
      { start, end: astro.sunrise },
      { start: astro.sunset, end },
    ]);
    expect(
      solarTimeline(astro.sunrise + MINUTE, astro.sunset - MINUTE, astro, zone)
        .nights,
    ).toEqual([]);
  });
  it("handles polar day/night without fake or invalid rise/set markers", () => {
    const location = { lat: 69.65, lon: 18.96 };
    for (const season of ["2026-06-21", "2026-12-21"]) {
      const start = Date.parse(season + "T00:00:00Z"),
        end = start + 24 * HOUR;
      const result = solarTimeline(start, end, location, zone);
      expect(result.events).toEqual([]);
      expect(result.nights).toEqual(
        season.includes("12-21") ? [{ start, end }] : [],
      );
    }
  });
  it("does not repeat or skip sunrise/sunset across daylight-saving boundaries", () => {
    for (const date of ["2026-03-29", "2026-10-25"]) {
      const start = localDayStart(Date.parse(date + "T12:00:00Z"), zone);
      const end = localDayStart(start + 30 * HOUR, zone);
      const result = solarTimeline(
        start,
        end,
        { lat: 60.17, lon: 24.94 },
        zone,
      );
      expect(result.events.map((e) => e.kind)).toEqual(["rise", "set"]);
      expect(result.nights[0]!.start).toBe(start);
      expect(result.nights[1]!.end).toBe(end);
    }
  });
});
