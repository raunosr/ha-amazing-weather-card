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
  mdiWeatherLightning,
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
  const snow = condition.includes("snow"),
    rain = condition.includes("rain") || condition === "pouring",
    hail = condition === "hail",
    precipitation = snow || rain || hail;
  const shape =
    condition.includes("lightning") && !rain
      ? mdiWeatherLightning
      : condition === "fog"
        ? mdiWeatherFog
        : condition.includes("wind")
          ? mdiWeatherWindy
          : mdiCloudOutline;
  return html`<span
    class="weather-symbol ${clear ? "clear" : ""} ${partly ? "partly" : ""} ${precipitation ? "precipitating" : ""} ${condition.includes("wind") ? "windy" : ""}"
    aria-hidden="true"
  >
    ${clear || partly ? html`<span class="celestial ${isNight ? "lunar" : "solar"}">${isNight ? moon(phase.fraction, phase.phase) : svg`<svg viewBox="0 0 24 24"><path fill="currentColor" d=${mdiWeatherSunny}></path></svg>`}</span>` : ""}
    ${!clear ? html`<span class="cloud-shape">${svg`<svg viewBox="0 0 24 24"><path fill="currentColor" d=${shape}></path></svg>`}</span>` : ""}
    ${
      precipitation
        ? svg`<svg class="precipitation" viewBox="0 0 64 64" fill="none" stroke="var(--aw-rain)" stroke-width="3" stroke-linecap="round">
      ${[0, 1, 2].map(
        (
          i,
        ) => svg`<g class="falling ${snow && (!rain || i === 1) ? "snowflake" : ""}" style="--fall-delay:${i * -0.55}s">
        ${snow && (!rain || i === 1) ? svg`<path d="M${23 + i * 10} 44v8m-3.5-6 7 4m-7 0 7-4"></path>` : hail ? svg`<circle cx=${23 + i * 10} cy="48" r="1.5" fill="var(--aw-rain)"></circle>` : svg`<path d="M${25 + i * 10} 44l-3 7"></path>`}
      </g>`,
      )}
    </svg>`
        : ""
    }
    ${condition === "lightning-rainy" ? svg`<svg class="lightning" viewBox="0 0 64 64"><path d="M33 26l-9 13h7l-4 10 14-16h-8l5-7z" fill="var(--aw-sun)"></path></svg>` : ""}
  </span>`;
}
