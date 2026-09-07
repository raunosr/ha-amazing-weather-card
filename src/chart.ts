import { LitElement, css, html, svg, nothing, type PropertyValues } from "lit";
import { repeat } from "lit/directives/repeat.js";
import type { Language, WeatherPoint } from "./types";
import { icon, weatherIcon } from "./icons";
import { iconStyles } from "./styles";
import {
  conditionText,
  directionText,
  numberText,
  translator,
} from "./localize";
import { dayKey, formatDay, formatTime, HOUR, localDayStart } from "./time";
import SunCalc from "suncalc";

interface Geometry {
  width: number;
  height: number;
  step: number;
  top: number;
  bottom: number;
  rainTop: number;
  rainBottom: number;
  windTop: number;
  min: number;
  max: number;
  rainMax: number;
  home: number;
  x: (time: number) => number;
  y: (value: number) => number;
  ry: (value: number) => number;
}

export class AmazingWeatherChart extends LitElement {
  static properties = {
    points: { attribute: false },
    daily: { type: Boolean },
    now: { type: Number },
    language: { type: String },
    zone: { type: String },
    unit: { type: String },
    location: { attribute: false },
    _width: { state: true },
    _selected: { state: true },
    _left: { state: true },
  };
  points: WeatherPoint[] = [];
  daily = false;
  now = Date.now();
  language: Language = "en";
  zone = "UTC";
  unit = "°C";
  location?: { lat: number; lon: number };
  private _width = 600;
  private _selected: WeatherPoint | null = null;
  private _left = 0;
  private _resize?: ResizeObserver;
  private _followNow = true;
  private _geometry?: Geometry;
  private _drag?: { id: number; x: number; scroll: number; moved: boolean };
  private _ignoreClick = false;
  static styles = [
    iconStyles,
    css`
      :host {
        display: block;
        color: var(--aw-text);
        font-family: inherit;
        min-width: 0;
      }
      * {
        box-sizing: border-box;
      }
      [hidden] {
        display: none !important;
      }
      button {
        font: inherit;
        color: inherit;
        cursor: pointer;
        border: 0;
        background: none;
        -webkit-tap-highlight-color: transparent;
      }
      button:focus-visible {
        outline: 3px solid var(--aw-temp);
        outline-offset: -3px;
      }
      button:disabled {
        opacity: 0.35;
        cursor: default;
      }
      .frame {
        position: relative;
      }
      .scroll {
        position: relative;
        width: 100%;
        overflow-x: auto;
        overflow-y: hidden;
        scrollbar-width: thin;
        scrollbar-color: var(--aw-line) transparent;
        touch-action: pan-x pan-y;
        overscroll-behavior-x: contain;
        user-select: none;
        cursor: grab;
      }
      .scroll:active {
        cursor: grabbing;
      }
      .canvas {
        position: relative;
        isolation: isolate;
      }
      .chart {
        display: block;
        width: 100%;
        overflow: visible;
      }
      .chart text {
        fill: var(--aw-muted);
        font:
          12px system-ui,
          sans-serif;
      }
      .chart .time {
        fill: var(--aw-text);
        font-size: 12px;
        font-weight: 500;
      }
      .chart .value {
        fill: var(--aw-text);
        font-size: 13px;
      }
      .chart .rain-value {
        fill: var(--aw-rain);
        font-size: 11px;
      }
      .symbols,
      .winds,
      .targets {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }
      .symbol {
        position: absolute;
        top: 34px;
        transform: translateX(-50%);
        width: 34px;
        height: 34px;
      }
      .wind {
        position: absolute;
        transform: translateX(-50%);
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 4px;
        width: 48px;
        font-size: 13px;
        font-variant-numeric: tabular-nums;
      }
      .wind .icon {
        width: 12px;
        height: 12px;
        color: var(--aw-wind);
      }
      .targets {
        z-index: 2;
      }
      .point {
        position: absolute;
        top: 0;
        bottom: 0;
        transform: translateX(-50%);
        pointer-events: auto;
        border-radius: 4px;
        cursor: crosshair;
        padding: 0;
      }
      .point[aria-pressed="true"] {
        background: color-mix(in srgb, var(--aw-temp) 6%, transparent);
      }
      .axes {
        position: absolute;
        inset: 0;
        z-index: 3;
        pointer-events: none;
      }
      .caption {
        position: absolute;
        left: 0;
        max-width: 100%;
        font-size: 11px;
        line-height: 18px;
        color: var(--aw-muted);
        background: var(--aw-bg);
        padding-right: 7px;
      }
      .tick {
        position: absolute;
        left: 0;
        width: 28px;
        font-size: 11px;
        line-height: 14px;
        color: var(--aw-muted);
        background: var(--aw-bg);
      }
      .tooltip {
        position: absolute;
        top: 108px;
        z-index: 4;
        width: 190px;
        border-radius: 10px;
        padding: 10px 12px;
        border: 1px solid var(--aw-line);
        background: var(--aw-fill);
        color: var(--aw-text);
        box-shadow: 0 6px 24px #0002;
        font-size: 12px;
        pointer-events: none;
        overflow-wrap: anywhere;
      }
      .tooltip strong {
        display: block;
        margin-bottom: 5px;
        font-weight: 500;
      }
      .tooltip span {
        display: block;
        color: var(--aw-muted);
        line-height: 1.6;
      }
      .navigation {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 5px;
        min-height: 44px;
        margin: 5px 0 8px;
      }
      .navigation button {
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 44px;
        min-height: 44px;
        border-radius: 8px;
        padding: 8px;
      }
      .navigation span {
        font-size: 11px;
        text-align: center;
        color: var(--aw-muted);
      }
      @media (prefers-reduced-motion: reduce) {
        * {
          scroll-behavior: auto !important;
        }
      }
    `,
  ];

  private get scroller() {
    return this.renderRoot.querySelector<HTMLDivElement>(".scroll");
  }
  get away() {
    return this.daily
      ? this._left > 2
      : Math.abs(this._left - (this._geometry?.home || 0)) > 3;
  }
  connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated) this.observeSize();
  }
  disconnectedCallback() {
    this._resize?.disconnect();
    this._resize = undefined;
    super.disconnectedCallback();
  }
  protected firstUpdated() {
    this.observeSize();
  }
  private observeSize() {
    this._resize?.disconnect();
    this._resize = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width && Math.abs(width - this._width) > 0.5) this._width = width;
    });
    this._resize.observe(this);
  }
  protected updated(changed: PropertyValues) {
    if (changed.has("points") && this._selected) {
      const selected = this._selected;
      this._selected =
        this.points.find(
          (point) =>
            point.time === selected.time && point.kind === selected.kind,
        ) || null;
    }
    if (changed.has("daily")) {
      this._followNow = true;
      this._selected = null;
    }
    if (
      this._followNow &&
      (changed.has("points") ||
        changed.has("daily") ||
        changed.has("_width") ||
        changed.has("now"))
    ) {
      const left = this._geometry?.home || 0;
      if (this.scroller) this.scroller.scrollLeft = left;
      this._left = this.scroller?.scrollLeft || 0;
    }
  }
  scrollToNow(animate = true) {
    this._selected = null;
    this._followNow = true;
    this.scroller?.scrollTo({
      left: this._geometry?.home || 0,
      behavior:
        animate && !matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "smooth"
          : "instant",
    });
  }
  private scrollChanged() {
    this._left = this.scroller?.scrollLeft || 0;
    this._selected = null;
    this._followNow = !this.away;
    this.dispatchEvent(
      new CustomEvent("view-changed", {
        bubbles: true,
        composed: true,
        detail: { away: this.away },
      }),
    );
  }
  private pan(sign: number) {
    this._selected = null;
    this.scroller?.scrollBy({
      left: sign * this._width * 0.8,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }
  private pointerDown(event: PointerEvent) {
    this.dispatchEvent(
      new CustomEvent("chart-interaction", { bubbles: true, composed: true }),
    );
    if (event.pointerType === "mouse" && event.button === 0)
      this._drag = {
        id: event.pointerId,
        x: event.clientX,
        scroll: this.scroller?.scrollLeft || 0,
        moved: false,
      };
  }
  private pointerMove(event: PointerEvent) {
    const d = this._drag;
    if (!d || event.pointerId !== d.id) return;
    const dx = event.clientX - d.x;
    if (Math.abs(dx) > 7) {
      if (!d.moved) this.scroller?.setPointerCapture(event.pointerId);
      d.moved = true;
      if (this.scroller) this.scroller.scrollLeft = d.scroll - dx;
    }
  }
  private pointerUp() {
    this._ignoreClick = !!this._drag?.moved;
    this._drag = undefined;
  }
  private select(point: WeatherPoint, event: MouseEvent) {
    if (this._ignoreClick && event.detail !== 0) {
      this._ignoreClick = false;
      return;
    }
    this._selected = this._selected === point ? null : point;
    this.dispatchEvent(
      new CustomEvent("chart-interaction", { bubbles: true, composed: true }),
    );
  }
  private describe(p: WeatherPoint) {
    const t = translator(this.language),
      n = (v: number | null) => numberText(v, this.language);
    return `${formatDay(p.time, this.language, this.zone)} ${this.daily ? "" : formatTime(p.time, this.language, this.zone)}, ${t(p.kind)}, ${n(p.temperature)} ${this.unit}${this.daily ? ", " + t("lowHigh") + " " + n(p.low) + " – " + n(p.temperature) : ""}, ${t("rain")} ${n(p.rain)} mm, ${t("wind")} ${n(p.wind)} m/s ${directionText(p.direction, this.language)}`;
  }

  private geometry(): Geometry {
    const daily = this.daily,
      count = Math.max(1, this.points.length),
      start = daily
        ? 0
        : Math.floor(
            Math.min(this.now, ...this.points.map((p) => p.time)) / HOUR,
          ) * HOUR,
      end = daily
        ? count
        : Math.max(this.now + HOUR, ...this.points.map((p) => p.time));
    const width = daily
        ? Math.max(this._width, count * 64 + 32)
        : Math.max(this._width, ((end - start) / HOUR) * 48 + 64),
      step = daily ? (width - 32) / count : 48;
    const x = daily
      ? (time: number) =>
          16 +
          (Math.max(
            0,
            this.points.findIndex((p) => p.time === time),
          ) +
            0.5) *
            step
      : (time: number) => 32 + ((time - start) / HOUR) * step;
    const values = this.points
        .flatMap((p) => [p.temperature, p.low])
        .filter((v): v is number => v !== null),
      min = values.length ? Math.floor(Math.min(...values)) - 1 : 0,
      max = values.length ? Math.ceil(Math.max(...values)) + 1 : 1;
    const top = daily ? 116 : 98,
      bottom = daily ? 204 : 188,
      rainTop = bottom + 49,
      rainBottom = rainTop + 46,
      windTop = rainBottom + 37;
    const rainMax = Math.max(
      daily ? 2 : 1,
      Math.ceil(Math.max(0, ...this.points.map((p) => p.rain ?? 0)) * 2) / 2,
    );
    return {
      width,
      height: windTop + 30,
      step,
      top,
      bottom,
      rainTop,
      rainBottom,
      windTop,
      min,
      max,
      rainMax,
      home: daily ? 0 : Math.max(0, x(this.now) - 32),
      x,
      y: (v) => bottom - ((v - min) / (max - min)) * (bottom - top),
      ry: (v) => rainBottom - (v / rainMax) * (rainBottom - rainTop),
    };
  }
  private line(points: WeatherPoint[], g: Geometry) {
    let active = false;
    return points
      .map((p) => {
        if (p.temperature === null) {
          active = false;
          return "";
        }
        const command = active ? "L" : "M";
        active = true;
        return `${command}${g.x(p.time).toFixed(2)},${g.y(p.temperature).toFixed(2)}`;
      })
      .join(" ");
  }
  private dayLabel(time: number) {
    const t = translator(this.language);
    return dayKey(time, this.zone) === dayKey(this.now, this.zone)
      ? t("now") === "Nyt"
        ? "Tänään"
        : "Today"
      : new Intl.DateTimeFormat(this.language === "fi" ? "fi-FI" : "en-GB", {
          timeZone: this.zone,
          weekday: "short",
        }).format(time);
  }
  protected render() {
    if (!this.points.length) return nothing;
    const g = this.geometry();
    this._geometry = g;
    const t = translator(this.language),
      n = (value: number | null, digits = 1) =>
        numberText(value, this.language, digits),
      hasTemperature = this.points.some((p) => p.temperature !== null),
      hourlyRain = this.points
        .filter((p) => p.kind === "forecast")
        .every((p) => p.end - p.time <= HOUR + 1000);
    const selected = this._selected,
      temperatureTicks = [...new Set([g.min + 1, g.max - 1])];
    return html`<div class="frame">
        <div
          class="scroll"
          @scroll=${this.scrollChanged}
          @pointerdown=${this.pointerDown}
          @pointermove=${this.pointerMove}
          @pointerup=${this.pointerUp}
          @pointercancel=${() => {
            this._drag = undefined;
          }}
          @wheel=${(e: WheelEvent) => {
            if (e.shiftKey) {
              e.preventDefault();
              if (this.scroller) this.scroller.scrollLeft += e.deltaY;
            }
          }}
        >
          <div class="canvas" style="width:${g.width}px">
            <svg
              class="chart"
              viewBox="0 0 ${g.width} ${g.height}"
              style="height:${g.height}px"
              role="img"
              aria-label="${t("temperature")}, ${t("rain")}, ${t("wind")}"
            >
              <title>
                ${this.daily ? t("forecast") : t("measured") + " / " + t("forecast")}
              </title>
              ${!this.daily && this.location ? this.points.map((p) => (SunCalc.getPosition(new Date(p.time), this.location!.lat, this.location!.lon).altitude < 0 ? svg`<rect x=${g.x(p.time)} y=${g.top - 5} width=${Math.max(1, Math.min(g.width - g.x(p.time), (g.step * (p.end - p.time)) / HOUR))} height=${g.rainBottom - g.top + 5} fill="var(--aw-night)" opacity=".4"></rect>` : nothing)) : nothing}
              ${hasTemperature ? temperatureTicks.map((value) => svg`<line x1="0" x2=${g.width} y1=${g.y(value)} y2=${g.y(value)} stroke="var(--aw-line)" opacity=".6"></line>`) : nothing}
              ${[g.rainTop, g.rainBottom].map((y) => svg`<line x1="0" x2=${g.width} y1=${y} y2=${y} stroke="var(--aw-line)" opacity=".6"></line>`)}
              ${this.points.map((p) => {
                const x = g.x(p.time);
                return svg`
              <text class="time" x=${x} y="16" text-anchor="middle">${this.daily ? this.dayLabel(p.time) : formatTime(p.time, this.language, this.zone)}</text>
              ${this.daily || new Intl.DateTimeFormat("en-GB", { timeZone: this.zone, hour: "2-digit", hour12: false }).format(p.time) === "00" ? svg`<text x=${x} y="31" text-anchor="middle" style="font-size:11px">${new Intl.DateTimeFormat(this.language === "fi" ? "fi-FI" : "en-GB", { timeZone: this.zone, day: "numeric", month: "numeric" }).format(p.time)}</text>` : nothing}
              ${this.daily && p.temperature !== null ? svg`${p.low !== null ? svg`<line x1=${x} x2=${x} y1=${g.y(p.temperature)} y2=${g.y(p.low)} stroke="var(--aw-temp)" stroke-width="7" stroke-linecap="round"></line>` : svg`<circle cx=${x} cy=${g.y(p.temperature)} r="3.5" fill="var(--aw-temp)"></circle>`}<text class="value" x=${x} y=${g.y(p.temperature) - 11} text-anchor="middle">${n(p.temperature, 0)}°</text><text x=${x} y=${p.low !== null ? g.y(p.low) + 19 : g.bottom + 19} text-anchor="middle">${p.low !== null ? n(p.low, 0) + "°" : "—"}</text>` : nothing}
              ${p.rain === null ? svg`<text x=${x} y=${g.rainBottom - 5} text-anchor="middle">—</text>` : p.rain > 0 ? svg`<rect x=${x - 8} y=${g.ry(p.rain)} width="16" height=${g.rainBottom - g.ry(p.rain)} rx="3" fill="var(--aw-rain)" opacity=".75"></rect><text class="rain-value" x=${x} y=${g.ry(p.rain) - 7} text-anchor="middle">${n(p.rain)}</text>` : this.daily ? svg`<text x=${x} y=${g.rainBottom - 5} text-anchor="middle">0</text>` : svg`<circle cx=${x} cy=${g.rainBottom} r="1.3" fill="var(--aw-muted)" opacity=".5"></circle>`}
            `;
              })}
              ${
                !this.daily
                  ? (["measured", "forecast"] as const).map(
                      (kind) =>
                        svg`<path data-series=${kind} d=${this.line(
                          this.points.filter((p) => p.kind === kind),
                          g,
                        )} fill="none" stroke="var(--aw-temp)" stroke-width="2.5" stroke-linejoin="round" stroke-dasharray=${kind === "forecast" ? "5 4" : "none"}></path>`,
                    )
                  : nothing
              }
              ${!this.daily ? svg`<line x1=${g.x(this.now)} x2=${g.x(this.now)} y1=${g.top - 8} y2=${g.windTop - 12} stroke="var(--aw-temp)" opacity=".55"></line>` : nothing}
            </svg>
            <div class="symbols" aria-hidden="true">
              ${this.points.map((p) => html`<span class="symbol" style="left:${g.x(p.time)}px">${p.condition ? weatherIcon(p.condition, this.daily ? localDayStart(p.time, this.zone) + 12 * HOUR : p.time, this.location) : nothing}</span>`)}
            </div>
            <div class="winds" aria-hidden="true">
              ${this.points.map((p) => html`<span class="wind" style="left:${g.x(p.time)}px;top:${g.windTop}px">${n(p.wind)}${p.direction !== null && p.wind !== null && p.wind >= 0.3 ? html`<span style="display:inline-flex;transform:rotate(${p.direction}deg)">${icon("arrow")}</span>` : nothing}</span>`)}
            </div>
            <div class="targets">
              ${repeat(
                this.points,
                (p) => p.time + "-" + p.kind,
                (p) =>
                  html`<button
                type="button"
                class="point"
                style="left:${g.x(p.time)}px;width:${Math.min(g.step, 64)}px"
                ?hidden=${g.x(p.time) < this._left + 8 || g.x(p.time) > this._left + this._width - 8}
                aria-label=${this.describe(p)}
                aria-pressed=${selected === p}
                @click=${(e: MouseEvent) => this.select(p, e)}
              ></button>`,
              )}
            </div>
          </div>
        </div>
        <div class="axes" aria-hidden="true">
          <span class="caption" style="top:76px"
            >${t("temperature")} ·
            ${this.daily ? t("lowHigh") + " " : ""}${this.unit}</span
          >
          <span class="caption" style="top:${g.rainTop - 36}px"
            >${t("rain")} · mm /
            ${this.daily ? (this.language === "fi" ? "vrk" : "day") : hourlyRain ? "h" : this.language === "fi" ? "jakso" : "period"}</span
          >
          <span class="caption" style="top:${g.windTop - 23}px"
            >${t(this.daily ? "dayWind" : "wind")} · m/s ·
            ${t("direction")}</span
          >
          ${!this.daily && hasTemperature ? temperatureTicks.map((value) => html`<span class="tick" style="top:${g.y(value) - 7}px">${n(value, 0)}°</span>`) : nothing}
          ${!this.daily ? html`<span class="tick" style="top:${g.rainTop - 7}px">${n(g.rainMax)}</span><span class="tick" style="top:${g.rainBottom - 7}px">0</span>` : nothing}
        </div>
        ${selected ? html`<div class="tooltip" role="status" style="left:${Math.max(5, Math.min(this._width - 195, g.x(selected.time) - this._left - 95))}px"><strong>${formatDay(selected.time, this.language, this.zone)} ${this.daily ? "" : formatTime(selected.time, this.language, this.zone)}</strong><span>${t(selected.kind)} · ${n(selected.temperature)} ${this.unit}</span>${this.daily ? html`<span>${t("lowHigh")} ${n(selected.low)} – ${n(selected.temperature)}°</span>` : nothing}${selected.condition ? html`<span>${conditionText(selected.condition, this.language)}</span>` : nothing}<span>${selected.rain === null ? t("rainMissing") : t("rain") + " " + n(selected.rain) + " mm"}${!this.daily ? " / " + n((selected.end - selected.time) / HOUR, 0) + " h" : ""}</span>${selected.probability !== null ? html`<span>${n(selected.probability, 0)} %</span>` : nothing}<span>${t("wind")} ${n(selected.wind)} m/s ${directionText(selected.direction, this.language)}</span>${selected.gust !== null ? html`<span>${t("gusts")} ${n(selected.gust)} m/s</span>` : nothing}</div>` : nothing}
      </div>
      <div class="navigation">
        <button
          type="button"
          aria-label=${t("earlier")}
          ?disabled=${this._left <= 1}
          @click=${() => this.pan(-1)}
        >
          ${icon("left")}</button
        ><span>${t(this.daily ? "scrollDays" : "scrollHours")}</span
        ><button
          type="button"
          aria-label=${t("later")}
          ?disabled=${this._left + this._width >= g.width - 1}
          @click=${() => this.pan(1)}
        >
          ${icon("right")}
        </button>
      </div>`;
  }
}
