import type { ReactiveController, ReactiveControllerHost } from "lit";
import type { AmazingWeatherChart } from "./chart";

type GridHost = ReactiveControllerHost &
  HTMLElement & {
    renderRoot: HTMLElement | DocumentFragment;
    layout?: string;
  };

/** Measure intrinsic content, never the stretched card height, to avoid a
 * growing minimum when HA's row slider is moved back and forth. */
export class CardGridLayout implements ReactiveController {
  private rows = 14;
  private observer?: ResizeObserver;
  private observed = new Set<Element>();
  private frame?: number;

  constructor(private host: GridHost) {
    host.addController(this);
  }
  get options() {
    return {
      columns: 12,
      min_columns: 6,
      rows: this.rows,
      min_rows: this.rows,
      // HA's picker otherwise defaults to max_rows=8, below our minimum.
      // Its touch range is still eight rows; the card editor also provides
      // direct row controls without depending on private HA components.
      max_rows: Math.max(100, this.rows),
    };
  }
  hostConnected() {
    this.schedule();
  }
  hostDisconnected() {
    this.observer?.disconnect();
    this.observer = undefined;
    this.observed.clear();
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
  }
  hostUpdated() {
    if (this.host.layout !== "grid") {
      this.hostDisconnected();
      this.host.style.removeProperty("--aw-min-height");
      return;
    }
    const shell = this.host.renderRoot.querySelector("ha-card");
    if (!shell) return;
    this.observer ||= new ResizeObserver(this.schedule);
    const targets = new Set<Element>([
      shell,
      ...shell.children,
      ...shell.querySelectorAll(".body > *"),
    ]);
    for (const old of this.observed)
      if (!targets.has(old)) this.observer.unobserve(old);
    for (const target of targets)
      if (!this.observed.has(target)) this.observer.observe(target);
    this.observed = targets;
    this.schedule();
  }
  private schedule = () => {
    if (this.frame !== undefined || !this.host.isConnected) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = undefined;
      this.measure();
    });
  };
  private measure() {
    if (this.host.layout !== "grid" || !this.host.offsetWidth) return;
    const shell = this.host.renderRoot.querySelector("ha-card");
    if (!shell) return;
    const px = (value: string) => Number.parseFloat(value) || 0;
    const edges = (el: Element) => {
      const s = getComputedStyle(el);
      return (
        px(s.paddingTop) +
        px(s.paddingBottom) +
        px(s.borderTopWidth) +
        px(s.borderBottomWidth)
      );
    };
    const outer = (el: Element) => {
      const s = getComputedStyle(el);
      return (
        el.getBoundingClientRect().height + px(s.marginTop) + px(s.marginBottom)
      );
    };
    let minimum = edges(shell);
    for (const child of shell.children) {
      if (!child.classList.contains("body")) {
        minimum += outer(child);
        continue;
      }
      minimum += edges(child);
      for (const item of child.children) {
        minimum +=
          item.localName === "amazing-weather-chart"
            ? (item as AmazingWeatherChart).getMinimumHeight()
            : outer(item);
      }
    }
    minimum = Math.ceil(minimum);
    const value = `${minimum}px`;
    if (this.host.style.getPropertyValue("--aw-min-height") !== value)
      this.host.style.setProperty("--aw-min-height", value);
    const style = getComputedStyle(this.host);
    const rowHeight = px(style.getPropertyValue("--row-height")) || 56;
    const gapValue = style.getPropertyValue("--row-gap");
    const gap = gapValue.trim() ? px(gapValue) : 8;
    const rows = Math.max(1, Math.ceil((minimum + gap) / (rowHeight + gap)));
    if (rows === this.rows) return;
    this.rows = rows;
    // hui-section re-reads getGridOptions on this existing HA event.
    this.host.dispatchEvent(
      new CustomEvent("card-updated", { bubbles: true, composed: true }),
    );
  }
}
