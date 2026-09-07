import { html, svg } from "lit";
import {
  mdiArrowUp,
  mdiChevronLeft,
  mdiChevronRight,
  mdiClose,
  mdiCloudOutline,
  mdiCompassOutline,
  mdiFullscreen,
  mdiHomeOutline,
  mdiInformationOutline,
  mdiWeatherFog,
  mdiWeatherHail,
  mdiWeatherLightning,
  mdiWeatherRainy,
  mdiWeatherSnowy,
  mdiWeatherSnowyRainy,
  mdiWeatherSunny,
  mdiWeatherSunsetDown,
  mdiWeatherSunsetUp,
  mdiWeatherWindy,
  mdiHelpCircleOutline,
} from "@mdi/js";
import SunCalc from "suncalc";
import { moonPolygon } from "./astronomy";

const paths = {
  arrow: mdiArrowUp,
  left: mdiChevronLeft,
  right: mdiChevronRight,
  close: mdiClose,
  compass: mdiCompassOutline,
  expand: mdiFullscreen,
  home: mdiHomeOutline,
  info: mdiInformationOutline,
  rise: mdiWeatherSunsetUp,
  set: mdiWeatherSunsetDown,
};
export function icon(name: keyof typeof paths) {
  return svg`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d=${paths[name]}></path></svg>`;
}
export function moon(fraction: number, phase: number, label?: string) {
  return svg`<svg class="moon-disk" viewBox="0 0 44 44" role=${label ? "img" : "presentation"} aria-label=${label || ""}><circle cx="22" cy="22" r="19" fill="var(--aw-moon-shade)"></circle><polygon points=${moonPolygon(phase, fraction)} fill="var(--aw-moon)"></polygon></svg>`;
}

export function weatherIcon(
  condition: string | null,
  time: number,
  location?: { lat: number; lon: number },
) {
  if (!condition)
    return html`<span class="weather-symbol unknown"
      >${svg`<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d=${mdiHelpCircleOutline}></path></svg>`}</span
    >`;
  const isNight =
    condition === "clear-night" ||
    (!!location &&
      SunCalc.getPosition(new Date(time), location.lat, location.lon).altitude <
        0);
  const phase = SunCalc.getMoonIllumination(new Date(time));
  const clear =
    condition === "sunny" ||
    condition === "clear-night" ||
    condition === "clear";
  const partly = condition === "partlycloudy";
  const shape = condition.includes("snowy-rainy")
    ? mdiWeatherSnowyRainy
    : condition.includes("snow")
      ? mdiWeatherSnowy
      : condition.includes("lightning")
        ? mdiWeatherLightning
        : condition === "hail"
          ? mdiWeatherHail
          : condition === "fog"
            ? mdiWeatherFog
            : condition.includes("wind")
              ? mdiWeatherWindy
              : condition === "rainy" || condition === "pouring"
                ? mdiWeatherRainy
                : mdiCloudOutline;
  return html`<span
    class="weather-symbol ${clear ? "clear" : ""} ${partly ? "partly" : ""} ${condition.includes("rain") || condition === "pouring" ? "wet" : ""}"
    aria-hidden="true"
  >
    ${clear || partly ? html`<span class="celestial ${isNight ? "lunar" : "solar"}">${isNight ? moon(phase.fraction, phase.phase) : svg`<svg viewBox="0 0 24 24"><path fill="currentColor" d=${mdiWeatherSunny}></path></svg>`}</span>` : ""}
    ${!clear ? html`<span class="cloud-shape">${svg`<svg viewBox="0 0 24 24"><path fill="currentColor" d=${shape}></path></svg>`}</span>` : ""}
  </span>`;
}
