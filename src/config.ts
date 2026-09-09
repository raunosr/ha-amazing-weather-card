import { SENSOR_FIELDS, type CardConfig } from "./types";

export const DEFAULTS = {
  language: "auto",
  theme: "auto",
  animated: true,
  wall_mode: false,
  return_after: 60,
  history_hours: 24,
  stale_after: 15,
  temperature_unit: "auto",
  default_range: 24,
} as const;

export function validateConfig(input: unknown): CardConfig {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Card configuration must be an object.");
  const raw = input as Record<string, unknown>;
  if (
    typeof raw.entity !== "string" ||
    !/^weather\.[a-z0-9_]+$/.test(raw.entity)
  )
    throw new Error("Select a weather entity (weather.*).");
  for (const field of SENSOR_FIELDS) {
    if (
      raw[field] !== undefined &&
      (typeof raw[field] !== "string" ||
        !/^sensor\.[a-z0-9_]+$/.test(raw[field] as string))
    )
      throw new Error(`${field} must be a sensor entity ID.`);
  }
  for (const [key, values] of Object.entries({
    language: ["auto", "fi", "en"],
    theme: ["auto", "dark", "light"],
    temperature_unit: ["auto", "°C", "°F"],
    default_range: [24, 7, 10],
  })) {
    if (raw[key] !== undefined && !(values as unknown[]).includes(raw[key]))
      throw new Error(`Invalid ${key}.`);
  }
  for (const [key, min, max] of [
    ["return_after", 15, 600],
    ["history_hours", 0, 72],
    ["stale_after", 0, 1440],
    ["latitude", -90, 90],
    ["longitude", -180, 180],
  ] as const) {
    const value = raw[key];
    if (
      value !== undefined &&
      (typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < min ||
        value > max)
    )
      throw new Error(`${key} must be between ${min} and ${max}.`);
  }
  for (const key of ["wall_mode", "animated"])
    if (raw[key] !== undefined && typeof raw[key] !== "boolean")
      throw new Error(`${key} must be a boolean.`);
  if ((raw.latitude === undefined) !== (raw.longitude === undefined))
    throw new Error(
      "Set both latitude and longitude, or omit both to use your Home Assistant location.",
    );
  if (raw.name !== undefined && typeof raw.name !== "string")
    throw new Error("name must be text.");
  return {
    ...DEFAULTS,
    ...raw,
    type: "custom:ha-amazing-weather-card",
  } as CardConfig;
}

export function historyEntities(config: CardConfig): string[] {
  if (!config.history_hours) return [];
  return [
    ...new Set(
      [
        config.temperature_entity,
        config.pressure_entity,
        config.wind_speed_entity,
        config.wind_direction_entity,
        config.wind_gust_entity,
        config.rain_total_entity || config.rain_today_entity,
      ].filter((id): id is string => !!id),
    ),
  ];
}
