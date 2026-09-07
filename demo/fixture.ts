import type {
  CardConfig,
  ForecastEvent,
  HassEntity,
  HistoryResponse,
  HomeAssistant,
  RawForecast,
} from "../src/types";
import { dayKey, HOUR } from "../src/time";

export const demoConfig: CardConfig = {
  type: "custom:ha-amazing-weather-card",
  entity: "weather.home",
  name: "Kotipihan sää",
  language: "fi",
  theme: "dark",
  temperature_entity: "sensor.outdoor_temperature",
  feels_like_entity: "sensor.feels_like",
  humidity_entity: "sensor.humidity",
  pressure_entity: "sensor.pressure",
  uv_entity: "sensor.uv",
  wind_speed_entity: "sensor.wind_speed",
  wind_gust_entity: "sensor.wind_gust",
  wind_direction_entity: "sensor.wind_direction",
  rain_today_entity: "sensor.rain_today",
  rain_total_entity: "sensor.rain_total",
  history_hours: 24,
};
export type Scenario =
  | "normal"
  | "missing-rain"
  | "offline"
  | "seven-days"
  | "daily-only"
  | "zero"
  | "imperial"
  | "history-error"
  | "forecast-error";

export function createFixture(scenario: Scenario = "normal", now = Date.now()) {
  const zone = "Europe/Helsinki",
    hour = Math.floor(now / HOUR) * HOUR,
    states: Record<string, HassEntity> = {},
    history: HistoryResponse = {};
  const entity = (
    id: string,
    value: string | number,
    attributes: Record<string, unknown> = {},
  ) => ({
    entity_id: id,
    state: String(value),
    attributes,
    last_updated: new Date(now - 60000).toISOString(),
    last_changed: new Date(now - 60000).toISOString(),
  });
  const add = (id: string, value: number, unit: string, name: string) =>
    (states[id] = entity(id, value, {
      unit_of_measurement: unit,
      friendly_name: name,
    }));
  const fahrenheit = scenario === "imperial";
  states["weather.home"] = entity("weather.home", "partlycloudy", {
    friendly_name: "Home",
    supported_features: scenario === "daily-only" ? 1 : 3,
    temperature: 15,
    temperature_unit: "°C",
    pressure: 1012,
    pressure_unit: "hPa",
    humidity: 89,
    wind_speed: 7.56,
    wind_gust_speed: 15.12,
    wind_speed_unit: "km/h",
    wind_bearing: 225,
    precipitation_unit: "mm",
    uv_index: 0,
    attribution: "Demonstration data · not a live weather forecast",
  });
  add(
    "sensor.outdoor_temperature",
    fahrenheit ? 58.1 : scenario === "zero" ? 0 : 14.5,
    fahrenheit ? "°F" : "°C",
    "Outdoor temperature",
  );
  add("sensor.feels_like", 14, "°C", "Feels like");
  add("sensor.humidity", 89, "%", "Humidity");
  add("sensor.pressure", 1012.2, "hPa", "Pressure");
  add("sensor.uv", 0, "", "UV");
  add("sensor.wind_speed", scenario === "zero" ? 0 : 2.1, "m/s", "Wind speed");
  add("sensor.wind_gust", 4.2, "m/s", "Wind gust");
  add("sensor.wind_direction", 225, "°", "Wind direction");
  add("sensor.rain_today", 0.5, "mm", "Rain today");
  add("sensor.rain_total", 51, "mm", "Total rainfall");
  if (scenario === "offline")
    for (const id of Object.keys(states).filter((id) =>
      id.startsWith("sensor."),
    ))
      states[id] = { ...states[id]!, state: "unavailable" };
  if (scenario === "missing-rain") {
    states["sensor.rain_today"] = {
      ...states["sensor.rain_today"]!,
      state: "unavailable",
    };
    states["sensor.rain_total"] = {
      ...states["sensor.rain_total"]!,
      state: "unavailable",
    };
  }
  let total = 50,
    daily = 0,
    previousDay = "";
  for (let time = hour - 74 * HOUR; time <= now; time += HOUR / 6) {
    const localHour = Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: zone,
        hour: "2-digit",
        hour12: false,
      }).format(time),
    );
    const day = dayKey(time, zone);
    if (day !== previousDay) {
      daily = 0;
      previousDay = day;
    }
    if (localHour === 9) {
      total += 0.5 / 6;
      daily += 0.5 / 6;
    }
    const temperature =
        14.3 + 2.6 * Math.cos(((localHour - 15) * Math.PI) / 12),
      wind = 2.7 + 1.3 * Math.sin((time - hour) / HOUR / 8),
      values: Record<string, number> = {
        "sensor.outdoor_temperature": fahrenheit
          ? temperature * 1.8 + 32
          : temperature,
        "sensor.pressure": 1013 + Math.sin((time - hour) / HOUR / 7),
        "sensor.wind_speed": wind,
        "sensor.wind_gust": wind + 2.1,
        "sensor.wind_direction": 225 + 40 * Math.sin((time - hour) / HOUR / 12),
        "sensor.rain_today": daily,
        "sensor.rain_total": total,
      };
    for (const [id, value] of Object.entries(values)) {
      history[id] ||= [];
      history[id]!.push({
        s:
          scenario === "missing-rain" && id.includes("rain")
            ? "unavailable"
            : value.toFixed(3),
        a: states[id]!.attributes,
        lu: time / 1000,
      });
    }
  }
  const hourly: RawForecast[] = [];
  for (let i = 1; i <= 48; i++) {
    const time = hour + i * HOUR,
      clock = Number(
        new Intl.DateTimeFormat("en-GB", {
          timeZone: zone,
          hour: "2-digit",
          hour12: false,
        }).format(time),
      );
    const wet = clock >= 7 && clock <= 13,
      rain = wet ? [0.1, 0.3, 0.7, 1.1, 0.8, 0.4, 0.1][clock - 7]! : 0;
    hourly.push({
      datetime: new Date(time).toISOString(),
      temperature: 14.3 + 2.6 * Math.cos(((clock - 15) * Math.PI) / 12),
      precipitation: rain,
      precipitation_probability: wet ? 65 : 5,
      condition: wet
        ? "rainy"
        : clock >= 21 || clock < 6
          ? "clear-night"
          : clock > 11 && clock < 17
            ? "partlycloudy"
            : "cloudy",
      wind_speed: (2.8 + 1.4 * Math.sin(i / 8)) * 3.6,
      wind_gust_speed: (4.8 + 1.4 * Math.sin(i / 8)) * 3.6,
      wind_bearing: 225 + 35 * Math.sin(i / 12),
    });
  }
  const dailyForecast: RawForecast[] = Array.from(
    { length: scenario === "seven-days" ? 7 : 10 },
    (_, i) => ({
      datetime: new Date(hour + i * 24 * HOUR).toISOString(),
      temperature: 17 - Math.sin(i) * 1.5,
      templow: 11 - Math.sin(i / 3) * 3,
      precipitation: [0, 3.5, 0.4, 7.2, 1.8, 0, 0.5, 4.1, 2.4, 0.3][i]!,
      condition:
        i === 5
          ? "sunny"
          : [1, 3, 4, 7, 8].includes(i)
            ? "rainy"
            : "partlycloudy",
      wind_speed: (2.1 + (i % 4)) * 3.6,
      wind_gust_speed: (4.2 + (i % 4)) * 3.6,
      wind_bearing: 225 + i * 10,
    }),
  );
  let active = 0,
    subscriptions = 0,
    historyCalls = 0;
  const hass: HomeAssistant = {
    states,
    language: "fi",
    locale: { language: "fi" },
    themes: { darkMode: true },
    config: {
      latitude: 60.1699,
      longitude: 24.9384,
      time_zone: zone,
      unit_system: { temperature: fahrenheit ? "°F" : "°C", length: "km" },
      location_name: "Demo home",
    },
    connection: {
      async subscribeMessage<T>(
        callback: (event: T) => void,
        message: Record<string, unknown>,
      ) {
        subscriptions++;
        if (scenario === "forecast-error")
          throw new Error("Fixture subscription failed");
        active++;
        let stopped = false;
        queueMicrotask(() => {
          if (!stopped)
            callback({
              type: message.forecast_type,
              forecast:
                message.forecast_type === "hourly" ? hourly : dailyForecast,
            } as ForecastEvent as T);
        });
        return () => {
          if (!stopped) {
            stopped = true;
            active--;
          }
        };
      },
    },
    async callWS<T>(message: Record<string, unknown>) {
      historyCalls++;
      if (scenario === "history-error")
        throw new Error("Fixture history denied");
      if (message.type !== "history/history_during_period")
        throw new Error("Unexpected command");
      const start = Date.parse(message.start_time as string),
        end = Date.parse(message.end_time as string),
        result: HistoryResponse = {};
      for (const id of message.entity_ids as string[]) {
        const entries = history[id] || [],
          previous = entries.filter((p) => p.lu! * 1000 < start).at(-1);
        result[id] = [
          ...(previous ? [previous] : []),
          ...entries.filter(
            (p) => p.lu! * 1000 >= start && p.lu! * 1000 <= end,
          ),
        ];
      }
      return result as T;
    },
  };
  return {
    hass,
    history,
    hourly,
    daily: dailyForecast,
    get active() {
      return active;
    },
    get subscriptions() {
      return subscriptions;
    },
    get historyCalls() {
      return historyCalls;
    },
  };
}
