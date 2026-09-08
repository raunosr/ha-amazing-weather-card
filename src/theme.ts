import type { ReactiveController, ReactiveControllerHost } from "lit";
import type { CardConfig, HomeAssistant } from "./types";

type ThemeHost = ReactiveControllerHost &
  HTMLElement & { renderRoot: HTMLElement | DocumentFragment };

// Computed browser colors include alpha. Canvas handles modern CSS color spaces
// as well as rgb(), without guessing how a theme spells its colors.
let context: CanvasRenderingContext2D | null | undefined;
function color(value: string): { luminance: number; alpha: number } | null {
  if (!value || !CSS.supports("color", value)) return null;
  if (context === undefined)
    context = document
      .createElement("canvas")
      .getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.canvas.width = 1;
  context.canvas.height = 1;
  context.fillStyle = value;
  context.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0, a = 0] = context.getImageData(0, 0, 1, 1).data;
  const linear = [r, g, b]
    .map((v) => v / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return {
    luminance: linear[0]! * 0.2126 + linear[1]! * 0.7152 + linear[2]! * 0.0722,
    alpha: a / 255,
  };
}

export class CardTheme implements ReactiveController {
  private observer?: MutationObserver;
  private frame?: number;
  private media?: MediaQueryList;
  constructor(
    private host: ThemeHost,
    private options: () => { config?: CardConfig; hass?: HomeAssistant },
  ) {
    host.addController(this);
  }
  hostConnected() {
    this.observer = new MutationObserver(this.schedule);
    // View themes can live on a shadow host. Watch only ancestry attributes;
    // sensor and chart updates inside the card must not trigger theme work.
    let element: Element | null = this.host;
    while (element) {
      this.observer.observe(element, {
        attributes: true,
        attributeFilter: ["style", "class"],
      });
      const root = element.getRootNode();
      element =
        element.parentElement ||
        (root instanceof ShadowRoot ? root.host : null);
    }
    this.media = matchMedia("(prefers-color-scheme: dark)");
    this.media.addEventListener("change", this.schedule);
    this.schedule();
  }
  hostDisconnected() {
    this.observer?.disconnect();
    this.observer = undefined;
    this.media?.removeEventListener("change", this.schedule);
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
  }
  hostUpdated() {
    this.apply();
  }
  private schedule = () => {
    if (this.frame !== undefined || !this.host.isConnected) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = undefined;
      this.apply();
    });
  };
  private apply() {
    const { config, hass } = this.options();
    if (!config || !hass) return;
    const mode = config.theme || "auto";
    if (this.host.getAttribute("data-force-theme") !== mode)
      this.host.setAttribute("data-force-theme", mode);
    let dark = mode === "dark";
    if (mode === "auto") {
      const surface = this.host.renderRoot.querySelector("ha-card");
      if (!surface) return;
      const styles = getComputedStyle(surface),
        background = color(styles.backgroundColor),
        text = color(styles.color);
      // The user's profile flag can disagree with a view/card theme. Use the
      // actual surface first; translucent/gradient cards rely on their text.
      dark =
        background &&
        background.alpha > 0.95 &&
        styles.backgroundImage === "none"
          ? background.luminance < 0.18
          : text && text.alpha > 0.5
            ? text.luminance > 0.45
            : !!(hass.themes?.darkMode ?? this.media?.matches);
    }
    this.host.toggleAttribute("data-dark", dark);
  }
}
