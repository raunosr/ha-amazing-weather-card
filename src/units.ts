export function numeric(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function temperature(
  value: unknown,
  from: unknown,
  to: string,
): number | null {
  const n = numeric(value);
  if (n === null || (from !== "°C" && from !== "°F" && from !== "K"))
    return null;
  const c = from === "°F" ? (n - 32) / 1.8 : from === "K" ? n - 273.15 : n;
  return to === "°F" ? c * 1.8 + 32 : c;
}

export function windSpeed(value: unknown, unit: unknown): number | null {
  const n = numeric(value);
  const factor: Record<string, number> = {
    "m/s": 1,
    "km/h": 1 / 3.6,
    kph: 1 / 3.6,
    mph: 0.44704,
    kn: 0.514444,
    knots: 0.514444,
    kt: 0.514444,
    "ft/s": 0.3048,
  };
  const f = factor[String(unit)];
  return n !== null && n >= 0 && f !== undefined ? n * f : null;
}

export function precipitation(value: unknown, unit: unknown): number | null {
  const n = numeric(value),
    factors: Record<string, number> = {
      mm: 1,
      cm: 10,
      m: 1000,
      in: 25.4,
      inch: 25.4,
    };
  const factor = factors[String(unit)];
  return n !== null && n >= 0 && factor !== undefined ? n * factor : null;
}

export function pressure(value: unknown, unit: unknown): number | null {
  const n = numeric(value),
    factors: Record<string, number> = {
      hPa: 1,
      mbar: 1,
      Pa: 0.01,
      kPa: 10,
      inHg: 33.8638866667,
      mmHg: 1.33322387415,
      psi: 68.9475729,
    };
  const factor = factors[String(unit)];
  return n !== null && factor !== undefined ? n * factor : null;
}

export function bearing(value: unknown): number | null {
  const n = numeric(value);
  if (n !== null) return ((n % 360) + 360) % 360;
  const names = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  const index =
    typeof value === "string" ? names.indexOf(value.toUpperCase().trim()) : -1;
  return index >= 0 ? index * 22.5 : null;
}

export function circularMean(
  values: Array<{ direction: number | null; weight: number }>,
): number | null {
  const valid = values.filter(
    (v) => v.direction !== null && Number.isFinite(v.weight) && v.weight > 0,
  );
  if (!valid.length) return null;
  const x = valid.reduce(
    (sum, v) => sum + Math.sin((v.direction! * Math.PI) / 180) * v.weight,
    0,
  );
  const y = valid.reduce(
    (sum, v) => sum + Math.cos((v.direction! * Math.PI) / 180) * v.weight,
    0,
  );
  if (Math.hypot(x, y) < valid.reduce((s, v) => s + v.weight, 0) * 0.05)
    return null;
  return ((Math.atan2(x, y) * 180) / Math.PI + 360) % 360;
}
