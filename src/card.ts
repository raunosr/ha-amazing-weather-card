import { LitElement, html, svg, nothing, type PropertyValues } from "lit";
import { cardStyles, iconStyles } from "./styles";
import { icon, moon, weatherIcon } from "./icons";
import { astronomy, moonPhaseName } from "./astronomy";
import { historyEntities, validateConfig } from "./config";
import { loadHistory, subscribeForecasts } from "./controllers";
import {
  currentWeather,
  displayTemperatureUnit,
  forecastRain,
  measuredPoints,
  normalizeForecast,
  pressureTrend,
  rainInInterval,
  reportedAt,
  stationFreshness,
  todayExtrema,
  windRose,
} from "./data";
import {
  conditionText,
  directionText,
  languageOf,
  numberText,
  translator,
  weatherSummary,
} from "./localize";
import {
  dayKey,
  formatDay,
  formatTime,
  HOUR,
  localDayStart,
  MINUTE,
  validZone,
} from "./time";
import {
  SENSOR_FIELDS,
  type CardConfig,
  type ForecastSnapshot,
  type History,
  type HomeAssistant,
  type Range,
  type Reading,
  type Unsubscribe,
} from "./types";
import type { AmazingWeatherChart } from "./chart";
import { CardTheme } from "./theme";
import { CardGridLayout } from "./grid-layout";

type DialogKind = "chart" | "wind" | "astro" | "station" | null;
export class AmazingWeatherCard extends LitElement {
  static properties = {
    layout: { type: String, reflect: true },
    _config: { state: true },
    _forecast: { state: true },
    _history: { state: true },
    _historyError: { state: true },
    _range: { state: true },
    _now: { state: true },
    _dialog: { state: true },
    _chartAway: { state: true },
  };
  static styles = [iconStyles, cardStyles];
  layout?: string;
  private _gridLayout = new CardGridLayout(this);
  private _config?: CardConfig;
  private _hass?: HomeAssistant;
  private _forecast: ForecastSnapshot = {
    hourly: [],
    daily: [],
    updated: {},
    errors: {},
    loading: true,
  };
  private _history: History = {};
  private _historyError = false;
  private _range: Range = 24;
  private _now = Date.now();
  private _dialog: DialogKind = null;
  private _chartAway = false;
  private _unsubscribe?: Unsubscribe;
  private _connection?: HomeAssistant["connection"];
  private _dataKey = "";
  private _generation = 0;
  private _historyPending = false;
  private _historyLoadedAt = 0;
  private _clock?: ReturnType<typeof setInterval>;
  private _poll?: ReturnType<typeof setInterval>;
  private _resetTimer?: ReturnType<typeof setTimeout>;
  private _dialogTrigger?: HTMLElement;
  private _theme = new CardTheme(this, () => ({
    config: this._config,
    hass: this._hass,
  }));

  setConfig(input: unknown) {
    const config = validateConfig(input),
      first = !this._config;
    this._config = config;
    if (first) this._range = config.default_range || 24;
    this.stopData();
    this._history = {};
    this._forecast = {
      hourly: [],
      daily: [],
      updated: {},
      errors: {},
      loading: true,
    };
    this._historyLoadedAt = 0;
    this.syncData();
    this.requestUpdate();
  }
  set hass(value: HomeAssistant) {
    const old = this._hass;
    this._hass = value;
    const ids = [
      this._config?.entity,
      ...SENSOR_FIELDS.map((k) => this._config?.[k]),
    ].filter((id): id is string => !!id);
    if (
      !old ||
      ids.some((id) => old.states[id] !== value.states[id]) ||
      old.config !== value.config ||
      old.themes !== value.themes ||
      old.locale !== value.locale ||
      old.language !== value.language
    )
      this.requestUpdate("hass", old);
    this.syncData();
  }
  get hass() {
    return this._hass!;
  }
  static async getConfigElement() {
    await import("./editor");
    return document.createElement("ha-amazing-weather-card-editor");
  }
  static getStubConfig(hass?: HomeAssistant) {
    return {
      entity:
        Object.keys(hass?.states || {}).find((id) =>
          id.startsWith("weather."),
        ) || "weather.home",
    };
  }
  getCardSize() {
    return Math.ceil((this.offsetHeight || 850) / 50);
  }
  getGridOptions() {
    return this._gridLayout.options;
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("visibilitychange", this.visibilityChanged);
    this.startClock();
    this.syncData();
  }
  disconnectedCallback() {
    document.removeEventListener("visibilitychange", this.visibilityChanged);
    clearInterval(this._clock);
    this._clock = undefined;
    clearTimeout(this._resetTimer);
    this.stopData();
    super.disconnectedCallback();
  }
  private visibilityChanged = () => {
    clearTimeout(this._resetTimer);
    if (!document.hidden) {
      this._now = Date.now();
      this.startClock();
      void this.refreshHistory();
      this.scheduleReturn();
    } else {
      clearInterval(this._clock);
      this._clock = undefined;
    }
  };
  private startClock() {
    if (this._clock || document.hidden) return;
    this._clock = setInterval(() => {
      this._now = Date.now();
    }, MINUTE);
  }
  private stopData() {
    this._generation++;
    this._dataKey = "";
    this._connection = undefined;
    this._historyPending = false;
    clearInterval(this._poll);
    if (this._unsubscribe)
      void Promise.resolve(this._unsubscribe()).catch(() => {});
    this._unsubscribe = undefined;
  }
  private syncData() {
    if (!this.isConnected || !this._config || !this._hass) return;
    const h = this._hass,
      c = this._config,
      features = Number(h.states[c.entity]?.attributes.supported_features) || 0;
    const key = JSON.stringify([
      c.entity,
      features,
      historyEntities(c),
      c.history_hours,
    ]);
    if (key === this._dataKey && h.connection === this._connection) return;
    this.stopData();
    this._connection = h.connection;
    this._dataKey = key;
    this._history = {};
    this._historyLoadedAt = 0;
    const generation = this._generation;
    this._unsubscribe = subscribeForecasts(
      h,
      c.entity,
      features,
      (snapshot) => {
        if (generation === this._generation) {
          this._forecast = snapshot;
          if (!snapshot.loading && this._range === 10 && this.daily.length < 10)
            this._range = this.daily.length ? 7 : 24;
          if (
            !snapshot.loading &&
            !(features & 2) &&
            features & 1 &&
            this._range === 24
          )
            this._range = 7;
        }
      },
    );
    void this.refreshHistory(true);
    this._poll = setInterval(() => {
      if (!document.hidden) void this.refreshHistory();
    }, 5 * MINUTE);
  }
  private async refreshHistory(force = false) {
    if (
      !this._hass ||
      !this._config ||
      !this.isConnected ||
      this._historyPending ||
      (!force && Date.now() - this._historyLoadedAt < 5 * MINUTE)
    )
      return;
    const ids = historyEntities(this._config);
    if (!ids.length) {
      this._history = {};
      this._historyError = false;
      return;
    }
    const now = Date.now(),
      zone = validZone(this._hass.config.time_zone),
      start = Math.min(
        now - (this._config.history_hours || 24) * HOUR,
        localDayStart(now, zone),
      );
    this._historyPending = true;
    const generation = this._generation;
    try {
      const history = await loadHistory(this._hass, ids, start, now);
      if (generation === this._generation) {
        this._history = history;
        this._historyError = false;
        this._historyLoadedAt = now;
      }
    } catch {
      if (generation === this._generation) this._historyError = true;
    } finally {
      if (generation === this._generation) this._historyPending = false;
    }
  }
  private get language() {
    return languageOf(this._config!, this._hass);
  }
  private get zone() {
    return validZone(this._hass?.config.time_zone);
  }
  private get t() {
    return translator(this.language);
  }
  private n(value: number | null, digits = 1) {
    return numberText(value, this.language, digits);
  }
  private time(time: number) {
    return Number.isFinite(time)
      ? formatTime(time, this.language, this.zone)
      : "—";
  }
  private get hourly() {
    return normalizeForecast(
      this._forecast.hourly,
      this._hass?.states[this._config!.entity],
      displayTemperatureUnit(this._config!, this._hass!),
      false,
      this.zone,
    );
  }
  private get daily() {
    return normalizeForecast(
      this._forecast.daily,
      this._hass?.states[this._config!.entity],
      displayTemperatureUnit(this._config!, this._hass!),
      true,
      this.zone,
    ).filter((p) => dayKey(p.time, this.zone) >= dayKey(this._now, this.zone));
  }
  private get chartPoints() {
    return this._range === 24
      ? [
          ...measuredPoints(
            this._history,
            this._hass!,
            this._config!,
            this._now,
            this.zone,
          ),
          ...this.hourly.filter(
            (p) => p.time > this._now && p.time <= this._now + 24 * HOUR,
          ),
        ]
      : this.daily.slice(0, this._range);
  }
  private charts() {
    return [
      ...this.renderRoot.querySelectorAll<AmazingWeatherChart>(
        "amazing-weather-chart",
      ),
    ];
  }
  private scheduleReturn() {
    clearTimeout(this._resetTimer);
    if (
      !this._config?.wall_mode ||
      this._dialog ||
      document.hidden ||
      !this.isConnected ||
      (this._range === 24 && !this._chartAway)
    )
      return;
    this._resetTimer = setTimeout(
      () => void this.returnNow(),
      (this._config.return_after || 60) * 1000,
    );
  }
  private async returnNow() {
    clearTimeout(this._resetTimer);
    this._range = 24;
    await this.updateComplete;
    this.charts().forEach((chart) => chart.scrollToNow());
    this._chartAway = false;
  }
  private setRange(range: Range) {
    this._range = range;
    this._chartAway = range !== 24;
    this.scheduleReturn();
  }
  private chartMoved(event: CustomEvent<{ away: boolean }>) {
    if (event.target === this.charts()[0]) this._chartAway = event.detail.away;
    this.scheduleReturn();
  }
  private openDialog(kind: DialogKind, event?: Event) {
    this._dialogTrigger = event?.currentTarget as HTMLElement;
    clearTimeout(this._resetTimer);
    this._dialog = kind;
  }
  private closeDialog() {
    this.renderRoot.querySelector("dialog")?.close();
  }
  private dialogClosed() {
    this._dialog = null;
    this._dialogTrigger?.focus();
    this.scheduleReturn();
  }
  protected updated(_changed: PropertyValues) {
    if (!this._config || !this._hass) return;
    this.toggleAttribute("data-animated", !!this._config.animated);
    const dialog = this.renderRoot.querySelector("dialog");
    if (this._dialog && dialog && !dialog.open) dialog.showModal();
  }
  private uvDescription(value: number | null) {
    return value === null
      ? ""
      : this.t(
          value < 3
            ? "low"
            : value < 6
              ? "moderate"
              : value < 8
                ? "high"
                : value < 11
                  ? "veryHigh"
                  : "extreme",
        );
  }
  private ranges() {
    const daily = this.daily.length;
    return html`<div class="ranges" aria-label=${this.t("forecast")}>
      <button
        type="button"
        aria-pressed=${this._range === 24}
        @click=${() => this.setRange(24)}
      >
        24 h</button
      ><button
        type="button"
        aria-pressed=${this._range === 7}
        ?disabled=${!daily}
        @click=${() => this.setRange(7)}
      >
        ${daily ? Math.min(7, daily) : 7} ${this.t("days")}</button
      ><button
        type="button"
        aria-pressed=${this._range === 10}
        ?disabled=${daily < 10}
        aria-label=${daily < 10 ? this.t("notSupported") : "10 " + this.t("days")}
        @click=${() => this.setRange(10)}
      >
        10 ${this.t("days")}
      </button>
    </div>`;
  }
  private chart(large = false) {
    const points = this.chartPoints,
      unit = displayTemperatureUnit(this._config!, this._hass!),
      a = astronomy(this._now, this._config!, this._hass!);
    return points.length
      ? html`<amazing-weather-chart
            .stretch=${this.layout === "grid" && !large}
            .points=${points}
            .daily=${this._range !== 24}
            .now=${this._now}
            .current=${currentWeather(this._hass!, this._config!, this._now).temperature}
            .language=${this.language}
            .zone=${this.zone}
            .unit=${unit}
            .location=${a ? { lat: a.lat, lon: a.lon } : undefined}
            @view-changed=${this.chartMoved}
            @chart-interaction=${this.scheduleReturn}
          >${!large ? this.roseButton("navigation") : nothing}</amazing-weather-chart
          >${large && this._range !== 24 ? html`<p class="dialog-note">${this.t("modelHint")}</p>` : nothing}`
      : html`<p class="empty">
          ${this._forecast.loading ? this.t("loading") : this.t(this._range === 24 ? "noHourly" : "noDaily")}
        </p>${!large ? this.roseButton() : nothing}`;
  }

  private roseButton(slot = "") {
    return html`<button type="button" class="rose-button" slot=${slot}
      aria-haspopup="dialog" @click=${(e: Event) => this.openDialog("wind", e)}
      >${icon("compass")}${this.t("rose")} <small>24 h</small>${icon("right")}</button>`;
  }

  protected render() {
    if (!this._config || !this._hass) return nothing;
    const h = this._hass,
      c = this._config,
      t = this.t,
      weather = h.states[c.entity];
    if (!weather)
      return html`<ha-card
        ><p class="error" role="alert">
          ${t("missingEntity")}: ${c.entity}
        </p></ha-card
      >`;
    const current = currentWeather(h, c, this._now),
      unit = displayTemperatureUnit(c, h),
      a = astronomy(this._now, c, h),
      rain = forecastRain(this.hourly, this._now),
      extrema = todayExtrema(this._history, h, c, this._now, this.zone),
      trend = pressureTrend(this._history, h, c, this._now);
    const stationReadings = Object.values(current).filter(
      (v): v is Reading =>
        typeof v === "object" &&
        v !== null &&
        "source" in v &&
        v.source === "station",
    );
    const station = stationFreshness(stationReadings, this._now, c.stale_after),
      stale = station.stale,
      missing = stationReadings.some((r) => r.value === null);
    const latest = current.temperature,
      source = latest.source === "station" ? t("station") : t("provider");
    const rainToday = c.rain_today_entity
      ? current.rainToday.value
      : c.rain_total_entity
        ? rainInInterval(
            this._history[c.rain_total_entity] || [],
            localDayStart(this._now, this.zone),
            this._now,
            h.states[c.rain_total_entity]?.attributes.unit_of_measurement,
            false,
            this.zone,
          )
        : null;
    const updated = Math.max(0, ...Object.values(this._forecast.updated));
    const name = c.name || t("title");
    return html`<ha-card
        @pointerdown=${() => clearTimeout(this._resetTimer)}
        @pointerup=${this.scheduleReturn}
        @keydown=${this.scheduleReturn}
      >
        <header class="header">
          <span class="brand">${icon("home")}<span>${name}</span></span
          ><span class="clock"
            >${formatDay(this._now, this.language, this.zone)} ·
            ${this.time(this._now)}</span
          >
        </header>
        <section class="hero" aria-label=${t("now")}>
          <div class="weather-now">
            <div class="current-readings">
          <button
            type="button"
            class="live ${latest.stale || latest.unavailable ? "old" : ""}"
            @click=${(e: Event) => this.openDialog("station", e)}
          >
            ${latest.stale ? t("lastReading") : t("now")} ·
            ${source}${icon("info")}
          </button>
              <div class="temperature">
                ${this.n(latest.value)}°<small>${unit.replace("°", "")}</small>
              </div>
              ${current.feelsLike.value !== null ? html`<p class="feels">${t("feels")} ${this.n(current.feelsLike.value)}°${current.feelsLike.source !== latest.source ? html` · ${t("provider").toLowerCase()}` : nothing}</p>` : nothing}
              <p class="current-wind">
                ${current.direction.value !== null && current.wind.value !== null && current.wind.value >= 0.3 ? html`<span class="wind-arrow" style="transform:rotate(${current.direction.value}deg)">${icon("arrow")}</span>` : nothing}<strong
                  >${this.n(current.wind.value)} m/s</strong
                ><span
                  >${current.direction.value !== null ? directionText(current.direction.value, this.language) : ""}</span
                >${current.wind.source !== latest.source ? html`<small>${t("provider").toLowerCase()}</small>` : nothing}
              </p>
            </div>
            <div class="condition">
              ${
                a
                  ? html`<button
                type="button" class="astronomy-strip"
                aria-label=${t("astronomy") + ": " + t("rise") + " " + this.time(a.sunrise) + ", " + t("set") + " " + this.time(a.sunset) + ", " + moonPhaseName(a.phase, this.language) + ", " + this.n(a.fraction * 100, 0) + " % " + t("illuminated")}
                @click=${(e: Event) => this.openDialog("astro", e)}
              >
                <span class="sun-times">
                  <span title=${t("rise") + (Number.isFinite(a.sunrise) ? "" : ": " + t("noEvent"))}>${icon("rise")}${this.time(a.sunrise)}</span>
                  <span title=${t("set") + (Number.isFinite(a.sunset) ? "" : ": " + t("noEvent"))}>${icon("set")}${this.time(a.sunset)}</span>
                </span>
                <span class="moon-phase"><span class="mini-moon">${moon(a.fraction, a.phase)}</span>${this.n(a.fraction * 100, 0)} %</span>
              </button>`
                  : nothing
              }
              ${weatherIcon(current.condition, this._now, a ? { lat: a.lat, lon: a.lon } : undefined)}<span
                >${conditionText(current.condition, this.language)}</span
              ><small>${t("conditionEstimate")}</small>
            </div>
          </div>
          <p class="summary">
            ${weatherSummary(this.hourly, this._now, this.zone, this.language)}
          </p>
          ${missing ? html`<p class="status" role="status">${t("missingSensor")}</p>` : stale ? html`<p class="status" role="status">${t("stale")}</p>` : nothing}
        </section>
        <div class="day-stats">
          <button
            type="button"
            class="day-extrema"
            @click=${(e: Event) => this.openDialog("station", e)}
          >
            <span>${t("todayMeasured")}</span
            ><strong
              >${extrema ? this.n(extrema.low) + "° – " + this.n(extrema.high) + "°" : "—"}</strong
            ><small>${t("lowHigh")}</small>
          </button>
          <div class="rain-rows">
            <span>${t("rainToday")}</span
            ><strong>${this.n(rainToday)} <small>mm</small></strong
            ><span
              >${t("rainForecast")}
              ${rain.hours ? this.n(rain.hours, 0) + " h" : ""}${rain.start !== null ? html`<br /><small>${this.time(rain.start)} → ${rain.end !== null ? this.time(rain.end) : "—"}</small>` : nothing}</span
            ><strong>${this.n(rain.amount)} <small>mm</small></strong>
          </div>
        </div>
        <div class="sensors" aria-label=${t("stationDetails")}>
          <button
            type="button"
            class="sensor"
            @click=${(e: Event) => this.openDialog("station", e)}
          >
            <span
              >${t("pressure")}
              ${trend !== null ? (trend < -0.1 ? "↘" : trend > 0.1 ? "↗" : "→") : ""}</span
            ><strong
              >${this.n(current.pressure.value, 0)} <small>hPa</small></strong
            >
          </button>
          <button
            type="button"
            class="sensor"
            @click=${(e: Event) => this.openDialog("station", e)}
          >
            <span>${t("humidity")}</span
            ><strong
              >${this.n(current.humidity.value, 0)} <small>%</small></strong
            >
          </button>
          <button
            type="button"
            class="sensor"
            @click=${(e: Event) => this.openDialog("station", e)}
          >
            <span>${t("uv")}</span
            ><strong
              >${this.n(current.uv.value, 0)}
              <small
                >${current.uv.value !== null ? "· " + this.uvDescription(current.uv.value) : ""}</small
              ></strong
            >
          </button>
        </div>
        <section class="body" aria-label=${t("forecast")}>
          <div class="toolbar">
            ${this.ranges()}
            <div class="toolbar-actions">
              <button
                type="button"
                class="now-button"
                ?disabled=${this._range === 24 && !this._chartAway}
                @click=${this.returnNow}
              >
                ${t("now")}</button
              ><button
                type="button"
                class="icon-button"
                aria-label=${t("expand")}
                @click=${(e: Event) => this.openDialog("chart", e)}
              >
                ${icon("expand")}<span class="expand-label"
                  >${t("expand")}</span
                >
              </button>
            </div>
          </div>
          <div class="period">
            <span
              >${this._range === 24 ? t("next24") : this.daily.length ? formatDay(this.daily[0]!.time, this.language, this.zone) + " – " + formatDay(this.daily[Math.min(this.daily.length, this._range) - 1]!.time, this.language, this.zone) : t("forecast")}</span
            >${this._range === 24 ? html`<div class="legend"><span>${t("measured")}</span><span class="forecast">${t("forecast")}</span></div>` : nothing}
          </div>
          ${this.chart()}
          ${this._historyError ? html`<p class="status">${t("historyError")}</p>` : nothing}${Object.values(this._forecast.errors).some(Boolean) ? html`<p class="status">${t("forecastError")}</p>` : nothing}
        </section>
        <footer class="footer">
          <span>${source} · ${this.time(latest.source === "station" ? (station.updated ?? NaN) : reportedAt(latest.entity))}</span
          ><span>${t("forecast")} · ${updated ? this.time(updated) : "—"}</span
          >${typeof weather.attributes.attribution === "string" ? html`<span class="attribution">${weather.attributes.attribution}</span>` : nothing}
        </footer>
      </ha-card>
      <dialog
        aria-labelledby="dialog-title"
        @close=${this.dialogClosed}
        @click=${(e: MouseEvent) => {
          const d = e.currentTarget as HTMLDialogElement;
          if (e.target === d) {
            const b = d.getBoundingClientRect();
            if (
              e.clientX < b.left ||
              e.clientX > b.right ||
              e.clientY < b.top ||
              e.clientY > b.bottom
            )
              d.close();
          }
        }}
      >
        <div class="dialog-head">
          <h2 id="dialog-title">
            ${this._dialog === "wind" ? t("roseHeading") : this._dialog === "astro" ? t("astronomy") : this._dialog === "station" ? t("stationDetails") : t("forecast")}
          </h2>
          <button
            type="button"
            class="icon-button"
            aria-label=${t("close")}
            @click=${this.closeDialog}
          >
            ${icon("close")}
          </button>
        </div>
        ${
          this._dialog === "chart"
            ? html`<div class="toolbar">
                ${this.ranges()}<button
                  type="button"
                  class="now-button"
                  @click=${this.returnNow}
                >
                  ${t("now")}
                </button>
              </div>
              ${this.chart(true)}`
            : this._dialog === "wind"
              ? this.renderWind()
              : this._dialog === "astro"
                ? this.renderAstronomy()
                : this._dialog === "station"
                  ? this.renderStation()
                  : nothing
        }
      </dialog>`;
  }

  private renderStation() {
    const current = currentWeather(this._hass!, this._config!, this._now),
      t = this.t,
      unit = displayTemperatureUnit(this._config!, this._hass!);
    const rows: [string, Reading, string][] = [
      [t("temperature"), current.temperature, unit],
      [t("feels"), current.feelsLike, unit],
      [t("wind"), current.wind, "m/s"],
      [t("gusts"), current.gust, "m/s"],
      [t("direction"), current.direction, "°"],
      [t("humidity"), current.humidity, "%"],
      [t("pressure"), current.pressure, "hPa"],
      [t("uv"), current.uv, ""],
      [t("rainToday"), current.rainToday, "mm"],
    ];
    const trend = pressureTrend(
      this._history,
      this._hass!,
      this._config!,
      this._now,
    );
    return html`<table class="detail-table">
        <thead>
          <tr>
            <th>${t("measured")}</th>
            <th>${t("now")}</th>
            <th>${t("source")} / ${t("updated")}</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(
            ([label, reading, unit]) =>
              html`<tr>
                <td>${label}</td>
                <td class=${reading.stale ? "old" : ""}>
                  ${this.n(reading.value)}
                  ${unit}${reading.unavailable ? html`<small>${t("unavailable")}</small>` : reading.value === null ? html`<small>${t("noValue")}</small>` : nothing}
                </td>
                <td>
                  ${reading.entity ? (reading.source === "station" ? t("station") : t("provider")) : "—"}<small
                    >${this.time(reportedAt(reading.entity))}</small
                  >
                </td>
              </tr>`,
          )}
        </tbody>
      </table>
      ${trend !== null ? html`<p class="dialog-note">${t("pressure")}: ${trend > 0 ? "+" : ""}${this.n(trend)} hPa / 3 h</p>` : nothing}
      <p class="dialog-note">${t("stationHistoryOnly")}</p>`;
  }
  private renderAstronomy() {
    const a = astronomy(this._now, this._config!, this._hass!);
    if (!a) return nothing;
    const t = this.t;
    return html`<div class="astro-panel">
        <div class="astro-moon">
          ${moon(a.fraction, a.phase, moonPhaseName(a.phase, this.language))}
        </div>
        <div>
          <h3>${moonPhaseName(a.phase, this.language)}</h3>
          <p>${this.n(a.fraction * 100, 1)} % ${t("illuminated")}</p>
          <p>${t(a.moonAltitude > 0 ? "above" : "below")}</p>
        </div>
      </div>
      <div class="astro-times">
        <span
          >${t("rise")}
          ${Number.isFinite(a.sunrise) ? this.time(a.sunrise) : t("noEvent")}</span
        ><span
          >${t("set")}
          ${Number.isFinite(a.sunset) ? this.time(a.sunset) : t("noEvent")}</span
        >
      </div>
      <p class="dialog-note">
        ${formatDay(this._now, this.language, this.zone)} ·
        ${this.time(this._now)} · ${this.zone}<br />${this.n(a.lat, 3)},
        ${this.n(a.lon, 3)}
      </p>
      <p class="dialog-note">${t("astroNote")}</p>`;
  }
  private renderWind() {
    const c = this._config!,
      h = this._hass!,
      t = this.t,
      data = windRose(this._history, h, c, this._now),
      current = currentWeather(h, c, this._now);
    if (!c.wind_speed_entity || !c.wind_direction_entity)
      return html`<p class="dialog-note">${t("roseMissing")}</p>`;
    if (!data.coveredHours)
      return html`<p class="dialog-note">${t("noRoseHistory")}</p>`;
    const center = 130,
      radius = 88,
      max = Math.max(
        20,
        Math.ceil(
          Math.max(...data.bins.map((b) => b.reduce((a, v) => a + v, 0))) / 10,
        ) * 10,
      ),
      xy = (angle: number, r: number) => [
        center + Math.sin((angle * Math.PI) / 180) * r,
        center - Math.cos((angle * Math.PI) / 180) * r,
      ];
    const sector = (angle: number, inner: number, outer: number) =>
      `M${xy(angle - 17, inner)}L${xy(angle - 17, outer)}A${outer} ${outer} 0 0 1 ${xy(angle + 17, outer)}L${xy(angle + 17, inner)}A${inner} ${inner} 0 0 0 ${xy(angle - 17, inner)}Z`;
    return html`<p class="dialog-note">${t("roseNote")}</p>
      <svg
        class="rose-figure"
        viewBox="0 0 260 260"
        role="img"
        aria-label=${t("rose")}
      >
        <title>${t("rose")} · 24 h</title>
        ${[radius / 2, radius].map((r) => svg`<circle cx=${center} cy=${center} r=${r} fill="none" stroke="var(--aw-line)"></circle>`)}${data.bins.map(
          (bin, i) => {
            let total = 0;
            return bin.map((value, j) => {
              const inner = 3 + (total / max) * (radius - 3);
              total += value;
              const outer = 3 + (total / max) * (radius - 3);
              return value
                ? svg`<path d=${sector(i * 45, inner, outer)} fill=${["var(--aw-temp)", "var(--aw-purple)", "var(--aw-wind)"][j]!} opacity=".86"></path>`
                : nothing;
            });
          },
        )}${[0, 90, 180, 270].map((angle, i) => {
          const point = xy(angle, radius + 17);
          return svg`<text x=${point[0]!} y=${point[1]! + 4} text-anchor="middle">${(this.language === "fi" ? ["P", "I", "E", "L"] : ["N", "E", "S", "W"])[i]}</text>`;
        })}
        <text x="135" y=${center - radius / 2 - 4}>
          ${this.n(max / 2, 0)} %
        </text>
        <text x="135" y=${center - radius - 4}>${this.n(max, 0)} %</text>
        ${current.direction.value !== null && current.wind.value !== null && current.wind.value >= 0.3 ? svg`<circle cx=${xy(current.direction.value, radius + 3)[0]!} cy=${xy(current.direction.value, radius + 3)[1]!} r="5" fill="var(--aw-text)" stroke="var(--aw-bg)" stroke-width="2"></circle>` : nothing}
      </svg>
      <p class="dialog-note">
        ${t(current.wind.stale ? "lastReading" : "now")}:
        ${this.n(current.wind.value)} m/s
        ${directionText(current.direction.value, this.language)} · ${t("gusts")}
        ${this.n(current.gust.value)} m/s
      </p>
      <div class="rose-legend">
        <span><i class="dot"></i>0–3 m/s</span
        ><span><i class="dot medium"></i>3–6 m/s</span
        ><span><i class="dot fast"></i>≥ 6 m/s</span>
      </div>
      <p class="dialog-note">
        ${t("coverage")}: ${this.n(data.coveredHours)} / 24 h · ${t("calm")}
        ${this.n(data.calm, 0)} %
      </p>
      <ul class="rose-grid">
        ${data.bins.map(
          (bin, i) =>
            html`<li>
              <span>${directionText(i * 45, this.language)}</span
              ><strong
                >${this.n(
                  bin.reduce((a, b) => a + b, 0),
                  0,
                )}
                %</strong
              >
            </li>`,
        )}
      </ul>`;
  }
}
