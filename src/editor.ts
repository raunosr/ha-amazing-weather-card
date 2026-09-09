import { LitElement, css, html, nothing } from "lit";
import { DEFAULTS } from "./config";
import { languageOf, translator } from "./localize";
import { SENSOR_FIELDS, type CardConfig, type HomeAssistant } from "./types";

export class AmazingWeatherEditor extends LitElement {
  static properties = { hass: { attribute: false }, _config: { state: true } };
  hass?: HomeAssistant;
  private _config: Partial<CardConfig> = {};
  static styles = css`
    :host {
      display: block;
      color: var(--primary-text-color);
      font-family: inherit;
    }
    .help {
      font-size: 13px;
      color: var(--secondary-text-color);
      line-height: 1.5;
    }
    label {
      display: grid;
      gap: 5px;
      font-size: 13px;
      margin: 12px 0;
    }
    select,
    input {
      font: inherit;
      min-height: 44px;
      border: 1px solid var(--divider-color, #aaa);
      border-radius: 7px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #111);
      padding: 9px;
      max-width: 100%;
      width: 100%;
      box-sizing: border-box;
    }
    input[type="checkbox"] {
      width: 22px;
      min-height: 22px;
      margin: 0;
    }
    .check {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 44px;
    }
    fieldset {
      border: 1px solid var(--divider-color, #aaa);
      border-radius: 9px;
      padding: 5px 14px 12px;
      margin: 18px 0;
    }
    legend {
      padding: 0 6px;
      font-size: 14px;
    }
    button:focus-visible,
    input:focus-visible,
    select:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
  `;
  setConfig(config: Partial<CardConfig>) {
    this._config = { ...config };
  }
  private get t() {
    return translator(languageOf(this._config as CardConfig, this.hass));
  }
  private label = (schema: { name: string }) => {
    const map: Record<string, string> = {
      entity: this.t("weatherEntity"),
      name: this.t("name"),
      show_header: this.t("showHeader"),
      language: this.t("language"),
      theme: this.t("theme"),
      animated: this.t("animated"),
      wall_mode: this.t("wallMode"),
      return_after: this.t("returnAfter"),
      history_hours: this.t("historyHours"),
      stale_after: this.t("staleAfter"),
      temperature_unit: this.t("tempUnit"),
      latitude: this.t("latitude"),
      longitude: this.t("longitude"),
      default_range: this.t("defaultRange"),
    };
    return (
      map[schema.name] ||
      (SENSOR_FIELDS.includes(schema.name as (typeof SENSOR_FIELDS)[number])
        ? this.t(schema.name as (typeof SENSOR_FIELDS)[number])
        : schema.name)
    );
  };
  private helper = (schema: { name: string }) =>
    schema.name === "show_header"
      ? this.t("headerHelp")
      : schema.name === "rain_total_entity"
        ? this.t("rainTotalHelp")
        : schema.name === "latitude"
          ? this.t("locationHelp")
          : undefined;
  private changed(value: Record<string, unknown>) {
    const config = {
      ...this._config,
      ...value,
      type: "custom:ha-amazing-weather-card",
    };
    for (const [key, v] of Object.entries(config))
      if (v === "" || v === undefined || v === null)
        delete (config as Record<string, unknown>)[key];
    this._config = config as Partial<CardConfig>;
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config },
        bubbles: true,
        composed: true,
      }),
    );
  }
  private schema() {
    return [
      {
        name: "entity",
        required: true,
        selector: { entity: { domain: "weather" } },
      },
      { name: "name", selector: { text: {} } },
      { name: "show_header", selector: { boolean: {} } },
      {
        type: "expandable",
        name: "station",
        title: this.t("stationSensors"),
        flatten: true,
        schema: SENSOR_FIELDS.map((name) => ({
          name,
          selector: { entity: { domain: "sensor" } },
        })),
      },
      {
        type: "expandable",
        name: "appearance",
        title: this.t("appearance"),
        flatten: true,
        schema: [
          {
            name: "language",
            selector: {
              select: {
                options: [
                  { value: "auto", label: this.t("auto") },
                  { value: "fi", label: "Suomi" },
                  { value: "en", label: "English" },
                ],
              },
            },
          },
          {
            name: "theme",
            selector: {
              select: {
                options: ["auto", "dark", "light"].map((value) => ({
                  value,
                  label: this.t(value as "auto" | "dark" | "light"),
                })),
              },
            },
          },
          {
            name: "temperature_unit",
            selector: {
              select: {
                options: [
                  { value: "auto", label: this.t("auto") },
                  { value: "°C", label: "°C" },
                  { value: "°F", label: "°F" },
                ],
              },
            },
          },
          { name: "animated", selector: { boolean: {} } },
          { name: "wall_mode", selector: { boolean: {} } },
          {
            name: "return_after",
            selector: {
              number: {
                min: 15,
                max: 600,
                step: 1,
                mode: "box",
                unit_of_measurement: "s",
              },
            },
          },
          {
            name: "history_hours",
            selector: {
              number: {
                min: 0,
                max: 72,
                step: 1,
                mode: "box",
                unit_of_measurement: "h",
              },
            },
          },
          {
            name: "stale_after",
            selector: {
              number: {
                min: 0,
                max: 1440,
                step: 1,
                mode: "box",
                unit_of_measurement: "min",
              },
            },
          },
        ],
      },
      {
        type: "expandable",
        name: "location",
        title: this.t("location"),
        flatten: true,
        schema: [
          {
            name: "latitude",
            selector: {
              number: { min: -90, max: 90, step: 0.00001, mode: "box" },
            },
          },
          {
            name: "longitude",
            selector: {
              number: { min: -180, max: 180, step: 0.00001, mode: "box" },
            },
          },
        ],
      },
    ];
  }
  private field(
    name: string,
    kind = "text",
    choices?: Array<{ value: string; label: string }>,
  ) {
    const value =
      (this._config as Record<string, unknown>)[name] ??
      (DEFAULTS as Record<string, unknown>)[name] ??
      "";
    return kind === "checkbox"
      ? html`<label class="check"
          ><input
            type="checkbox"
            .checked=${!!value}
            @change=${(e: Event) => this.changed({ [name]: (e.target as HTMLInputElement).checked })}
          />${this.label({ name })}</label
        >`
      : html`<label
          >${this.label({ name })}${
            choices
              ? html`<select
                  .value=${String(value)}
                  @change=${(e: Event) => this.changed({ [name]: (e.target as HTMLSelectElement).value })}
                >
                  ${choices.map((option) => html`<option value=${option.value}>${option.label}</option>`)}
                </select>`
              : html`<input
                  type=${kind}
                  .value=${String(value)}
                  step="any"
                  @change=${(e: Event) => {
                    const v = (e.target as HTMLInputElement).value;
                    this.changed({
                      [name]: kind === "number" && v !== "" ? Number(v) : v,
                    });
                  }}
                />`
          }</label
        >`;
  }
  private entityField(name: string, domain: string) {
    const entries = Object.values(this.hass?.states || {}).filter((entity) =>
      entity.entity_id.startsWith(domain + "."),
    );
    const configured = (this._config as Record<string, unknown>)[name];
    if (
      typeof configured === "string" &&
      !entries.some((e) => e.entity_id === configured)
    )
      return this.field(name);
    return this.field(name, "text", [
      { value: "", label: "—" },
      ...entries.map((entity) => ({
        value: entity.entity_id,
        label:
          String(entity.attributes.friendly_name || entity.entity_id) +
          " · " +
          entity.entity_id,
      })),
    ]);
  }
  protected render() {
    if (!this.hass) return nothing;
    const t = this.t;
    // ha-form is preferred when loaded by HA. Native controls keep the editor
    // usable on versions that lazy-load it, without importing private HA files.
    if (customElements.get("ha-form"))
      return html`<ha-form
          .hass=${this.hass}
          .data=${{ ...DEFAULTS, ...this._config }}
          .schema=${this.schema()}
          .computeLabel=${this.label}
          .computeHelper=${this.helper}
          @value-changed=${(
            event: CustomEvent<{ value: Record<string, unknown> }>,
          ) => {
            event.stopPropagation();
            this.changed(event.detail.value);
          }}
        ></ha-form>
        <p class="help">${t("sensorsHelp")}</p>`;
    return html`${this.entityField("entity", "weather")}${this.field("name")}
      ${this.field("show_header", "checkbox")}
      <p class="help">${t("headerHelp")}</p>
      <fieldset>
        <legend>${t("stationSensors")}</legend>
        <p class="help">${t("sensorsHelp")}</p>
        ${SENSOR_FIELDS.map((name) => this.entityField(name, "sensor"))}
        <p class="help">${t("rainTotalHelp")}</p>
      </fieldset>
      <fieldset>
        <legend>${t("appearance")}</legend>
        ${this.field("language", "text", [
          { value: "auto", label: t("auto") },
          { value: "fi", label: "Suomi" },
          { value: "en", label: "English" },
        ])}${this.field(
          "theme",
          "text",
          ["auto", "dark", "light"].map((value) => ({
            value,
            label: t(value as "auto" | "dark" | "light"),
          })),
        )}${this.field("temperature_unit", "text", [
          { value: "auto", label: t("auto") },
          { value: "°C", label: "°C" },
          { value: "°F", label: "°F" },
        ])}${this.field("animated", "checkbox")}${this.field("wall_mode", "checkbox")}${this.field("return_after", "number")}${this.field("history_hours", "number")}${this.field("stale_after", "number")}
      </fieldset>
      <fieldset>
        <legend>${t("location")}</legend>
        <p class="help">${t("locationHelp")}</p>
        ${this.field("latitude", "number")}${this.field("longitude", "number")}
      </fieldset>`;
  }
}
if (!customElements.get("ha-amazing-weather-card-editor"))
  customElements.define("ha-amazing-weather-card-editor", AmazingWeatherEditor);
