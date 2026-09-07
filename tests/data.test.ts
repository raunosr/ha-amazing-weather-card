import { describe, it, expect } from "vitest";
import {
  bearing,
  circularMean,
  numeric,
  precipitation,
  pressure,
  temperature,
  windSpeed,
} from "../src/units";
import {
  currentWeather,
  decodeHistory,
  forecastRain,
  normalizeForecast,
  rainInInterval,
  todayExtrema,
  windRose,
} from "../src/data";
import { validateConfig } from "../src/config";
import { HOUR, localDayStart, dayKey } from "../src/time";
import { astronomy } from "../src/astronomy";
import { createFixture, demoConfig } from "../demo/fixture";
import type { HistoryEntry } from "../src/types";

const now = Date.parse("2026-09-07T18:00:00Z"),
  zone = "Europe/Helsinki";
describe("missing values and unit conversion", () => {
  it("preserves genuine zero and rejects unavailable, blank, null and non-finite values", () => {
    expect(numeric(0)).toBe(0);
    expect(numeric("0")).toBe(0);
    for (const value of [
      "",
      null,
      undefined,
      "unknown",
      "unavailable",
      NaN,
      Infinity,
      "12 frogs",
    ])
      expect(numeric(value)).toBeNull();
  });
  it("converts station and forecast units before combining them", () => {
    expect(temperature(32, "°F", "°C")).toBe(0);
    expect(temperature(-40, "°C", "°F")).toBe(-40);
    expect(temperature(273.15, "K", "°C")).toBe(0);
    expect(windSpeed(36, "km/h")).toBe(10);
    expect(windSpeed(10, "mph")).toBeCloseTo(4.4704);
    expect(precipitation(1, "in")).toBe(25.4);
    expect(pressure(101200, "Pa")).toBe(1012);
    expect(pressure(29.92, "inHg")).toBeCloseTo(1013.207, 2);
  });
  it("does not guess unsupported units", () => {
    expect(windSpeed(12, "unknown")).toBeNull();
    expect(precipitation(1, undefined)).toBeNull();
    expect(temperature(12, "unknown", "°C")).toBeNull();
  });
  it("handles compass directions and circular means", () => {
    expect(bearing("SW")).toBe(225);
    expect(bearing(-90)).toBe(270);
    expect(bearing("bad")).toBeNull();
    expect(
      circularMean([
        { direction: 359, weight: 1 },
        { direction: 1, weight: 1 },
      ]),
    ).toBeCloseTo(0);
    expect(
      circularMean([
        { direction: 0, weight: 1 },
        { direction: 180, weight: 1 },
      ]),
    ).toBeNull();
  });
});
describe("configuration and current sources", () => {
  it("validates IDs, ranges, coordinates and booleans", () => {
    expect(validateConfig({ entity: "weather.home" }).history_hours).toBe(24);
    for (const config of [
      { entity: "sensor.home" },
      { entity: "weather.home", latitude: 60 },
      { entity: "weather.home", history_hours: 1000 },
      { entity: "weather.home", animated: "false" },
      { entity: "weather.home", temperature_entity: "<img>" },
    ])
      expect(() => validateConfig(config)).toThrow();
  });
  it("keeps a selected missing station source missing instead of falling back", () => {
    const { hass } = createFixture("offline", now);
    const current = currentWeather(hass, validateConfig(demoConfig), now);
    expect(current.temperature.value).toBeNull();
    expect(current.temperature.source).toBe("station");
    expect(current.temperature.unavailable).toBe(true);
  });
  it("labels weather-only values as provider estimates", () => {
    const { hass } = createFixture("normal", now);
    expect(
      currentWeather(hass, validateConfig({ entity: "weather.home" }), now)
        .temperature.source,
    ).toBe("weather");
  });
  it("shows zero values and honors explicit Fahrenheit conversion", () => {
    const { hass } = createFixture("zero", now);
    const current = currentWeather(
      hass,
      validateConfig({ ...demoConfig, temperature_unit: "°F" }),
      now,
    );
    expect(current.temperature.value).toBe(32);
    expect(current.wind.value).toBe(0);
    expect(current.uv.value).toBe(0);
  });
  it("marks old measurements and allows the age heuristic to be disabled", () => {
    const { hass } = createFixture("normal", now);
    hass.states["sensor.outdoor_temperature"]!.last_updated = new Date(
      now - 2 * HOUR,
    ).toISOString();
    expect(
      currentWeather(hass, validateConfig(demoConfig), now).temperature.stale,
    ).toBe(true);
    expect(
      currentWeather(
        hass,
        validateConfig({ ...demoConfig, stale_after: 0 }),
        now,
      ).temperature.stale,
    ).toBe(false);
  });
});
describe("rain accumulation", () => {
  const row = (time: number, value: number | null): HistoryEntry => ({
    time,
    value,
    attributes: { unit_of_measurement: "mm" },
  });
  it("converts counters to interval rain, including a lifetime counter reset", () => {
    const rows = [row(0, 100), row(HOUR, 100.5), row(2 * HOUR, 0.2)];
    expect(rainInInterval(rows, 0, HOUR, "mm", false, zone)).toBe(0.5);
    expect(rainInInterval(rows, HOUR, 2 * HOUR, "mm", false, zone)).toBe(0.2);
  });
  it("handles the daily reset in the HA timezone", () => {
    const midnight = Date.parse("2026-09-07T21:00:00Z"),
      rows = [
        row(midnight - HOUR, 4),
        row(midnight, 0),
        row(midnight + HOUR, 0.7),
      ];
    expect(
      rainInInterval(rows, midnight - HOUR, midnight + HOUR, "mm", true, zone),
    ).toBe(0.7);
  });
  it("does not turn a missing baseline, unknown state or unexplained reset into dry weather", () => {
    expect(
      rainInInterval([row(HOUR, 5)], 0, HOUR, "mm", false, zone),
    ).toBeNull();
    expect(
      rainInInterval([row(0, 5), row(HOUR, null)], 0, HOUR, "mm", false, zone),
    ).toBeNull();
    expect(
      rainInInterval(
        [row(now, 5), row(now + HOUR, 0)],
        now,
        now + HOUR,
        "mm",
        true,
        zone,
      ),
    ).toBeNull();
  });
  it("sums only complete provider periods and reports missing rain instead of a false total", () => {
    const { hass, hourly } = createFixture("normal", now);
    const points = normalizeForecast(
      hourly,
      hass.states["weather.home"],
      "°C",
      false,
      zone,
    );
    const result = forecastRain(points, now);
    expect(result.complete).toBe(true);
    expect(result.hours).toBe(24);
    expect(result.start).toBe(now + HOUR);
    expect(result.amount).toBeCloseTo(3.5);
    points[3]!.rain = null;
    expect(forecastRain(points, now).amount).toBeNull();
  });
});
describe("forecast and history integrity", () => {
  it("keeps text compass directions in recorded wind history", () => {
    const fixture = createFixture("normal", now);
    const history = decodeHistory({
      "sensor.wind_direction": [{ s: "SW", lc: (now - 24 * HOUR) / 1000 }],
      "sensor.wind_speed": [
        {
          s: "2",
          lc: (now - 24 * HOUR) / 1000,
          a: { unit_of_measurement: "m/s" },
        },
      ],
    });
    const rose = windRose(
      history,
      fixture.hass,
      validateConfig(demoConfig),
      now,
    );
    expect(rose.coveredHours).toBe(24);
    expect(rose.bins[5]![0]).toBe(100);
  });
  it("includes a new current maximum before the next recorder refresh", () => {
    const fixture = createFixture("normal", now),
      history = decodeHistory(fixture.history);
    fixture.hass.states["sensor.outdoor_temperature"]!.state = "21";
    expect(
      todayExtrema(history, fixture.hass, validateConfig(demoConfig), now, zone)
        ?.high,
    ).toBe(21);
  });
  it("sorts, deduplicates and preserves multi-hour intervals without fabricating samples", () => {
    const { hass } = createFixture("normal", now);
    const raw = [
      {
        datetime: new Date(now + 6 * HOUR).toISOString(),
        temperature: 10,
        precipitation: 3,
      },
      {
        datetime: new Date(now).toISOString(),
        temperature: 14,
        precipitation: 2,
      },
    ];
    const result = normalizeForecast(
      raw,
      hass.states["weather.home"],
      "°C",
      false,
      zone,
    );
    expect(result).toHaveLength(2);
    expect(result[0]!.end - result[0]!.time).toBe(6 * HOUR);
    expect(result[0]!.rain).toBe(2);
    expect(result[0]!.wind).toBeNull();
  });
  it("does not invent a daily low when the provider omits it", () => {
    const { hass } = createFixture("normal", now);
    expect(
      normalizeForecast(
        [{ datetime: new Date(now).toISOString(), temperature: 10 }],
        hass.states["weather.home"],
        "°C",
        true,
        zone,
      )[0]!.low,
    ).toBeNull();
  });
  it("decodes compact history, carries units and keeps unknown-state breaks", () => {
    const history = decodeHistory({
      "sensor.a": [
        { s: "0", a: { unit_of_measurement: "°C" }, lc: 10 },
        { s: "unavailable", lu: 20 },
        { s: "4", lu: 30 },
      ],
    });
    expect(history["sensor.a"]!.map((p) => p.value)).toEqual([0, null, 4]);
    expect(history["sensor.a"]![2]!.attributes.unit_of_measurement).toBe("°C");
  });
  it("calculates local measured extrema from real samples", () => {
    const fixture = createFixture("normal", now);
    const extrema = todayExtrema(
      decodeHistory(fixture.history),
      fixture.hass,
      validateConfig(demoConfig),
      now,
      zone,
    );
    expect(extrema?.low).toBeCloseTo(11.7);
    expect(extrema?.high).toBeCloseTo(16.9);
  });
  it("weights the wind rose by time, not by sensor update frequency", () => {
    const fixture = createFixture("normal", now),
      config = validateConfig(demoConfig),
      r = (time: number, value: number) => ({
        time,
        value,
        attributes: { unit_of_measurement: "m/s" },
      });
    const history = {
      "sensor.wind_speed": [r(now - 24 * HOUR, 2), r(now - 12 * HOUR, 4)],
      "sensor.wind_direction": [r(now - 24 * HOUR, 0), r(now - 12 * HOUR, 180)],
    };
    const rose = windRose(history, fixture.hass, config, now);
    expect(rose.coveredHours).toBe(24);
    expect(rose.bins[0]![0]).toBe(50);
    expect(rose.bins[4]![1]).toBe(50);
  });
});
describe("timezones and astronomy", () => {
  it("finds local midnight across the spring and autumn DST changes", () => {
    for (const [date, length] of [
      ["2026-03-29T12:00:00Z", 23],
      ["2026-10-25T12:00:00Z", 25],
    ] as const) {
      const start = localDayStart(Date.parse(date), zone),
        next = localDayStart(start + 30 * HOUR, zone);
      expect((next - start) / HOUR).toBe(length);
      expect(dayKey(start, zone)).toBe(date.slice(0, 10));
    }
  });
  it("uses a shared moon phase but location-dependent sun times", () => {
    const { hass } = createFixture("normal", now),
      config = validateConfig(demoConfig),
      helsinki = astronomy(now, config, hass)!,
      oulu = astronomy(
        now,
        { ...config, latitude: 65.0121, longitude: 25.4651 },
        hass,
      )!;
    expect(helsinki.fraction).toBeCloseTo(oulu.fraction);
    expect(helsinki.sunrise).not.toBe(oulu.sunrise);
    expect(helsinki.fraction).toBeGreaterThan(0);
    expect(helsinki.fraction).toBeLessThan(1);
  });
  it("keeps missing polar sunrise/sunset as missing events", () => {
    const { hass } = createFixture("normal", now),
      result = astronomy(
        Date.parse("2026-06-21T12:00:00Z"),
        { ...validateConfig(demoConfig), latitude: 69.65, longitude: 18.96 },
        hass,
      )!;
    expect(Number.isNaN(result.sunrise)).toBe(true);
    expect(Number.isNaN(result.sunset)).toBe(true);
  });
});
