import { AmazingWeatherCard } from "./card";
import { AmazingWeatherChart } from "./chart";
import type { HomeAssistant } from "./types";

if (!customElements.get("amazing-weather-chart"))
  customElements.define("amazing-weather-chart", AmazingWeatherChart);
if (!customElements.get("ha-amazing-weather-card"))
  customElements.define("ha-amazing-weather-card", AmazingWeatherCard);
window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === "ha-amazing-weather-card"))
  window.customCards.push({
    type: "ha-amazing-weather-card",
    name: "Amazing Weather Card",
    preview: true,
    description:
      "Your weather station, history and forecast in one clear card.",
    documentationURL: "https://github.com/raunosr/ha-amazing-weather-card",
    getEntitySuggestion: (_hass: HomeAssistant, entityId: string) =>
      entityId.startsWith("weather.")
        ? {
            config: {
              type: "custom:ha-amazing-weather-card",
              entity: entityId,
            },
          }
        : null,
  });
console.info(`Amazing Weather Card ${__VERSION__}`);
