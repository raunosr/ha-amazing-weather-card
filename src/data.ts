import type {
  CardConfig,
  CurrentWeather,
  HassEntity,
  History,
  HistoryEntry,
  HistoryResponse,
  HomeAssistant,
  RawForecast,
  Reading,
  SensorField,
  WeatherPoint,
} from "./types";
import {
  bearing,
  numeric,
  precipitation,
  pressure,
  temperature,
  windSpeed,
} from "./units";
import { dayKey, HOUR, localDayStart, MINUTE } from "./time";

export const unavailable = (entity?: HassEntity): boolean =>
  !entity || ["unknown", "unavailable"].includes(entity.state);
export const reportedAt = (entity?: HassEntity): number =>
  entity ? Date.parse(entity.last_reported || entity.last_updated) : NaN;
export const displayTemperatureUnit = (
  config: CardConfig,
  hass: HomeAssistant,
): string =>
  config.temperature_unit === "°F" || config.temperature_unit === "°C"
    ? config.temperature_unit
    : hass.config.unit_system.temperature === "°F"
      ? "°F"
      : "°C";

export function currentWeather(
  hass: HomeAssistant,
  config: CardConfig,
  now: number,
): CurrentWeather {
  const weather = hass.states[config.entity],
    target = displayTemperatureUnit(config, hass);
  function read(
    field: SensorField,
    attribute: string | null,
    convert: (v: unknown, unit: unknown) => number | null,
    unitAttribute?: string,
  ): Reading {
    const id = config[field],
      entity = id ? hass.states[id] : weather;
    const source = id ? "station" : "weather";
    const value = id
      ? entity?.state
      : attribute
        ? entity?.attributes[attribute]
        : undefined;
    const unit = id
      ? entity?.attributes.unit_of_measurement
      : unitAttribute
        ? entity?.attributes[unitAttribute]
        : undefined;
    const failed = unavailable(entity) || (!id && !attribute);
    const stale =
      !!entity &&
      !!config.stale_after &&
      now - reportedAt(entity) > config.stale_after * MINUTE;
    return {
      value: failed ? null : convert(value, unit),
      entity: id || attribute ? entity : undefined,
      source,
      stale,
      unavailable: failed,
    };
  }
  const temp = (v: unknown, unit: unknown) =>
    temperature(v, unit || hass.config.unit_system.temperature, target);
  return {
    temperature: read(
      "temperature_entity",
      "temperature",
      temp,
      "temperature_unit",
    ),
    feelsLike: read(
      "feels_like_entity",
      "apparent_temperature",
      temp,
      "temperature_unit",
    ),
    humidity: read("humidity_entity", "humidity", (v) => {
      const n = numeric(v);
      return n !== null && n >= 0 && n <= 100 ? n : null;
    }),
    pressure: read("pressure_entity", "pressure", pressure, "pressure_unit"),
    uv: read("uv_entity", "uv_index", (v) => {
      const n = numeric(v);
      return n !== null && n >= 0 ? n : null;
    }),
    wind: read("wind_speed_entity", "wind_speed", windSpeed, "wind_speed_unit"),
    gust: read(
      "wind_gust_entity",
      "wind_gust_speed",
      windSpeed,
      "wind_speed_unit",
    ),
    direction: read("wind_direction_entity", "wind_bearing", bearing),
    rainToday: read("rain_today_entity", null, precipitation),
    condition: unavailable(weather) ? null : weather!.state,
  };
}

export function normalizeForecast(
  raw: RawForecast[],
  entity: HassEntity | undefined,
  target: string,
  daily: boolean,
  zone: string,
): WeatherPoint[] {
  if (!entity) return [];
  const attributes = entity.attributes;
  const sorted = [
    ...new Map(
      raw
        .filter((p) => Number.isFinite(Date.parse(p.datetime)))
        .map((p) => [Date.parse(p.datetime), p]),
    ).entries(),
  ].sort((a, b) => a[0] - b[0]);
  const seen = new Set<string>();
  return sorted.flatMap(([time, point], index) => {
    const key = dayKey(time, zone);
    if (daily && seen.has(key)) return [];
    seen.add(key);
    const previous = sorted[index - 1]?.[0],
      next = sorted[index + 1]?.[0];
    const interval = daily
      ? 24 * HOUR
      : next
        ? next - time
        : previous
          ? time - previous
          : HOUR;
    return [
      {
        time,
        end: time + Math.max(MINUTE, Math.min(interval, 24 * HOUR)),
        temperature: temperature(
          point.temperature,
          attributes.temperature_unit,
          target,
        ),
        low: temperature(point.templow, attributes.temperature_unit, target),
        rain: precipitation(point.precipitation, attributes.precipitation_unit),
        probability: numeric(point.precipitation_probability),
        wind: windSpeed(point.wind_speed, attributes.wind_speed_unit),
        gust: windSpeed(point.wind_gust_speed, attributes.wind_speed_unit),
        direction: bearing(point.wind_bearing),
        condition: typeof point.condition === "string" ? point.condition : null,
        kind: "forecast" as const,
        daily,
      },
    ];
  });
}

export function decodeHistory(raw: HistoryResponse): History {
  const result: History = {};
  for (const [id, entries] of Object.entries(raw)) {
    let attributes: Record<string, unknown> = {};
    result[id] = entries
      .flatMap((entry) => {
        const time = (entry.lu ?? entry.lc ?? NaN) * 1000;
        if (!Number.isFinite(time)) return [];
        if (entry.a) attributes = entry.a;
        return [
          { time, value: numeric(entry.s), rawValue: entry.s, attributes },
        ];
      })
      .sort((a, b) => a.time - b.time);
  }
  return result;
}

export function atTime(
  entries: HistoryEntry[],
  time: number,
): HistoryEntry | undefined {
  let low = 0,
    high = entries.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (entries[mid]!.time <= time) low = mid + 1;
    else high = mid;
  }
  return entries[low - 1];
}

function historyValue(
  history: History,
  id: string | undefined,
  time: number,
  convert: (value: unknown, unit: unknown) => number | null,
  hass: HomeAssistant,
): number | null {
  if (!id) return null;
  const point = atTime(history[id] || [], time);
  if (!point) return null;
  return convert(
    point.value ?? point.rawValue,
    point.attributes.unit_of_measurement ||
      hass.states[id]?.attributes.unit_of_measurement,
  );
}

export function rainInInterval(
  entries: HistoryEntry[],
  start: number,
  end: number,
  unit: unknown,
  daily: boolean,
  zone: string,
): number | null {
  const baseline = atTime(entries, start),
    final = atTime(entries, end);
  if (!baseline || !final || baseline.value === null || final.value === null)
    return null;
  const changes = [
    baseline,
    ...entries.filter((p) => p.time > start && p.time <= end),
  ];
  let sum = 0;
  for (let i = 1; i < changes.length; i++) {
    const previous = changes[i - 1]!,
      current = changes[i]!;
    if (previous.value === null || current.value === null) return null;
    const a = precipitation(
        previous.value,
        previous.attributes.unit_of_measurement || unit,
      ),
      b = precipitation(
        current.value,
        current.attributes.unit_of_measurement || unit,
      );
    if (a === null || b === null) return null;
    if (b >= a) sum += b - a;
    else if (
      !daily ||
      dayKey(previous.time, zone) !== dayKey(current.time, zone)
    )
      sum += b;
    else return null; // An unexplained mid-day reset is not zero rain.
  }
  return sum;
}

export function measuredPoints(
  history: History,
  hass: HomeAssistant,
  config: CardConfig,
  now: number,
  zone: string,
): WeatherPoint[] {
  if (!config.history_hours || !Object.keys(history).length) return [];
  const target = displayTemperatureUnit(config, hass),
    rainId = config.rain_total_entity || config.rain_today_entity;
  const first = Math.floor((now - config.history_hours * HOUR) / HOUR) * HOUR,
    points: WeatherPoint[] = [];
  for (let time = first; time <= now; time += HOUR) {
    const temperatureValue = historyValue(
      history,
      config.temperature_entity,
      time,
      (v, u) => temperature(v, u, target),
      hass,
    );
    const point: WeatherPoint = {
      time,
      end: time + HOUR,
      temperature: temperatureValue,
      low: null,
      rain:
        rainId && time + HOUR <= now
          ? rainInInterval(
              history[rainId] || [],
              time,
              time + HOUR,
              hass.states[rainId]?.attributes.unit_of_measurement,
              !config.rain_total_entity,
              zone,
            )
          : null,
      wind: historyValue(
        history,
        config.wind_speed_entity,
        time,
        windSpeed,
        hass,
      ),
      gust: historyValue(
        history,
        config.wind_gust_entity,
        time,
        windSpeed,
        hass,
      ),
      direction: historyValue(
        history,
        config.wind_direction_entity,
        time,
        bearing,
        hass,
      ),
      probability: null,
      condition: null,
      kind: "measured",
    };
    points.push(point);
  }
  return points.some((point) =>
    [
      point.temperature,
      point.rain,
      point.wind,
      point.gust,
      point.direction,
    ].some((value) => value !== null),
  )
    ? points
    : [];
}

export function todayExtrema(
  history: History,
  hass: HomeAssistant,
  config: CardConfig,
  now: number,
  zone: string,
): { low: number; high: number } | null {
  if (!config.temperature_entity || !history[config.temperature_entity]?.length)
    return null;
  const entries = history[config.temperature_entity]!,
    start = localDayStart(now, zone),
    unit =
      hass.states[config.temperature_entity]?.attributes.unit_of_measurement,
    target = displayTemperatureUnit(config, hass);
  const startEntry = atTime(entries, start);
  const values = [
    ...(startEntry ? [startEntry] : []),
    ...entries.filter((p) => p.time >= start && p.time <= now),
  ]
    .map((p) =>
      temperature(p.value, p.attributes.unit_of_measurement || unit, target),
    )
    .filter((v): v is number => v !== null);
  const current = currentWeather(hass, config, now).temperature;
  if (
    current.value !== null &&
    !current.stale &&
    reportedAt(current.entity) >= start &&
    reportedAt(current.entity) <= now
  )
    values.push(current.value);
  return values.length
    ? { low: Math.min(...values), high: Math.max(...values) }
    : null;
}

export function pressureTrend(
  history: History,
  hass: HomeAssistant,
  config: CardConfig,
  now: number,
): number | null {
  const id = config.pressure_entity;
  if (!id) return null;
  const before = historyValue(history, id, now - 3 * HOUR, pressure, hass),
    current = currentWeather(hass, config, now).pressure.value;
  return before !== null && current !== null ? current - before : null;
}

export function forecastRain(
  points: WeatherPoint[],
  now: number,
): {
  amount: number | null;
  hours: number;
  complete: boolean;
  start: number | null;
  end: number | null;
} {
  const upcoming = points
      .filter((p) => p.time >= now)
      .sort((a, b) => a.time - b.time),
    start = upcoming[0]?.time;
  if (start === undefined)
    return { amount: null, hours: 0, complete: false, start: null, end: null };
  // Sum complete provider periods, starting at the next forecast timestamp.
  // Display that start time, rather than inventing rainfall for a partial period.
  const future = upcoming.filter((p) => p.end <= start + 24 * HOUR);
  if (!future.length)
    return { amount: null, hours: 0, complete: false, start, end: null };
  let amount = 0,
    end = start,
    valid = true;
  for (const p of future) {
    if (p.time !== end || p.rain === null) valid = false;
    if (p.rain !== null) amount += p.rain;
    end = p.end;
  }
  return {
    amount: valid ? amount : null,
    hours: (end - start) / HOUR,
    complete: valid && end === start + 24 * HOUR,
    start,
    end,
  };
}

export interface WindRose {
  bins: number[][];
  calm: number;
  coveredHours: number;
}
export function windRose(
  history: History,
  hass: HomeAssistant,
  config: CardConfig,
  now: number,
): WindRose {
  const bins = Array.from({ length: 8 }, () => [0, 0, 0]),
    start = now - 24 * HOUR;
  const speed = config.wind_speed_entity,
    directionId = config.wind_direction_entity;
  if (!speed || !directionId) return { bins, calm: 0, coveredHours: 0 };
  const boundaries = [
    ...new Set([
      start,
      now,
      ...[...(history[speed] || []), ...(history[directionId] || [])]
        .map((p) => p.time)
        .filter((t) => t > start && t < now),
    ]),
  ].sort((a, b) => a - b);
  let total = 0,
    calm = 0;
  for (let i = 0; i < boundaries.length - 1; i++) {
    const time = boundaries[i]!,
      duration = boundaries[i + 1]! - time,
      wind = historyValue(history, speed, time, windSpeed, hass),
      dir = historyValue(history, directionId, time, bearing, hass);
    if (wind === null || (dir === null && wind >= 0.3)) continue;
    total += duration;
    if (wind < 0.3) {
      calm += duration;
      continue;
    }
    const bucket = Math.round(dir! / 45) % 8,
      level = wind < 3 ? 0 : wind < 6 ? 1 : 2;
    bins[bucket]![level]! += duration;
  }
  return {
    bins: bins.map((bin) => bin.map((v) => (total ? (v / total) * 100 : 0))),
    calm: total ? (calm / total) * 100 : 0,
    coveredHours: total / HOUR,
  };
}
