export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
  last_reported?: string;
}

export type Unsubscribe = () => void | Promise<void>;
export interface HassConnection {
  subscribeMessage<T>(
    callback: (event: T) => void,
    message: Record<string, unknown>,
  ): Promise<Unsubscribe>;
}
export interface HomeAssistant {
  states: Record<string, HassEntity>;
  connection: HassConnection;
  callWS<T>(message: Record<string, unknown>): Promise<T>;
  language?: string;
  locale?: { language?: string; time_zone?: "local" | "server" };
  themes?: { darkMode?: boolean };
  config: {
    latitude: number;
    longitude: number;
    time_zone: string;
    unit_system: { temperature: string; [key: string]: string };
    location_name?: string;
  };
}

export const SENSOR_FIELDS = [
  "temperature_entity",
  "feels_like_entity",
  "humidity_entity",
  "pressure_entity",
  "uv_entity",
  "wind_speed_entity",
  "wind_gust_entity",
  "wind_direction_entity",
  "rain_today_entity",
  "rain_total_entity",
] as const;
export type SensorField = (typeof SENSOR_FIELDS)[number];
export interface CardConfig extends Partial<Record<SensorField, string>> {
  type: "custom:ha-amazing-weather-card";
  entity: string;
  name?: string;
  show_header?: boolean;
  language?: "auto" | "fi" | "en";
  theme?: "auto" | "dark" | "light";
  animated?: boolean;
  wall_mode?: boolean;
  return_after?: number;
  history_hours?: number;
  stale_after?: number;
  latitude?: number;
  longitude?: number;
  temperature_unit?: "auto" | "°C" | "°F";
  default_range?: 24 | 7 | 10;
  grid_options?: Record<string, unknown>;
  [key: string]: unknown;
}
export type Range = 24 | 7 | 10;
export type Language = "fi" | "en";
export type ForecastType = "hourly" | "daily";
export interface RawForecast {
  datetime: string;
  temperature?: number;
  templow?: number;
  precipitation?: number;
  precipitation_probability?: number;
  condition?: string;
  wind_speed?: number;
  wind_gust_speed?: number;
  wind_bearing?: number | string;
  uv_index?: number;
  [key: string]: unknown;
}
export interface ForecastEvent {
  type?: ForecastType;
  forecast: RawForecast[] | null;
}
export interface ForecastSnapshot {
  hourly: RawForecast[];
  daily: RawForecast[];
  updated: Partial<Record<ForecastType, number>>;
  errors: Partial<Record<ForecastType, boolean>>;
  loading: boolean;
}
export interface WeatherPoint {
  time: number;
  end: number;
  temperature: number | null;
  low: number | null;
  rain: number | null;
  probability: number | null;
  wind: number | null;
  gust: number | null;
  direction: number | null;
  condition: string | null;
  kind: "measured" | "forecast";
  daily?: boolean;
}
export interface HistoryEntry {
  time: number;
  value: number | null;
  rawValue?: string;
  attributes: Record<string, unknown>;
}
export type History = Record<string, HistoryEntry[]>;
export interface CompactHistoryEntry {
  s: string;
  a?: Record<string, unknown>;
  lu?: number;
  lc?: number;
}
export type HistoryResponse = Record<string, CompactHistoryEntry[]>;
export interface Reading {
  value: number | null;
  entity?: HassEntity;
  source: "station" | "weather";
  stale: boolean;
  unavailable: boolean;
}
export interface CurrentWeather {
  temperature: Reading;
  feelsLike: Reading;
  humidity: Reading;
  pressure: Reading;
  uv: Reading;
  wind: Reading;
  gust: Reading;
  direction: Reading;
  rainToday: Reading;
  condition: string | null;
}

declare global {
  interface Window {
    customCards?: Array<Record<string, unknown>>;
    loadCardHelpers?: () => Promise<{
      createCardElement(config: Record<string, unknown>): HTMLElement;
    }>;
  }
  const __VERSION__: string;
}
