import { createFixture, demoConfig, type Scenario } from "./fixture";
import type { AmazingWeatherCard } from "../src/card";
import type { AmazingWeatherEditor } from "../src/editor";
import type { CardConfig } from "../src/types";

await customElements.whenDefined("ha-amazing-weather-card");
const card = document.createElement(
  "ha-amazing-weather-card",
) as AmazingWeatherCard;
let fixture = createFixture(),
  config = { ...demoConfig };
const select = (id: string) => document.getElementById(id) as HTMLSelectElement;
function update() {
  fixture = createFixture(select("scenario").value as Scenario);
  const condition = select("condition").value;
  if (condition !== "sample")
    fixture.hass.states[demoConfig.entity]!.state = condition;
  config = {
    ...demoConfig,
    theme: select("theme").value as CardConfig["theme"],
    language: select("language").value as CardConfig["language"],
    wall_mode: select("display").value === "wall",
  };
  card.setConfig(config);
  card.hass = fixture.hass;
  Object.assign(window, {
    demoFixture: fixture,
    demoCard: card,
    demoConfig: config,
  });
}
update();
document.getElementById("card")!.append(card);
for (const id of ["scenario", "condition", "theme", "language", "display"])
  select(id).addEventListener("change", update);
document.getElementById("edit")!.addEventListener("click", async () => {
  const container = document.getElementById("editor")!;
  container.classList.toggle("open");
  if (!container.classList.contains("open")) return;
  const editor = (await (
    card.constructor as typeof AmazingWeatherCard
  ).getConfigElement()) as AmazingWeatherEditor;
  editor.hass = fixture.hass;
  editor.setConfig(config);
  editor.addEventListener("config-changed", (event) => {
    config = (event as CustomEvent<{ config: CardConfig }>).detail.config;
    try {
      card.setConfig(config);
      card.hass = fixture.hass;
    } catch (error) {
      console.warn(error);
    }
  });
  container.replaceChildren(editor);
});
