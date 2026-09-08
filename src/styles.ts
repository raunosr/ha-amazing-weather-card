import { css } from "lit";

export const iconStyles = css`
  .icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    vertical-align: middle;
  }
  .moon-disk {
    width: 100%;
    height: 100%;
    display: block;
  }
  .weather-symbol {
    display: inline-block;
    position: relative;
    width: 34px;
    height: 34px;
    color: var(--aw-muted);
    vertical-align: middle;
  }
  .weather-symbol svg {
    width: 100%;
    height: 100%;
    display: block;
  }
  .weather-symbol .cloud-shape {
    position: absolute;
    inset: 5% 0 0;
  }
  .weather-symbol .celestial {
    position: absolute;
    right: 0;
    top: 0;
    width: 53%;
    height: 53%;
  }
  .weather-symbol .solar {
    color: var(--aw-sun);
  }
  .weather-symbol.clear .celestial {
    width: 88%;
    height: 88%;
    right: 6%;
    top: 6%;
  }
  .weather-symbol.partly .cloud-shape {
    inset: 25% 15% 0 0;
  }
  .weather-symbol.precipitating .cloud-shape {
    inset: -7% 0 22%;
  }
  .weather-symbol .precipitation,
  .weather-symbol .lightning {
    position: absolute;
    inset: 0;
  }
  .weather-symbol.unknown {
    opacity: 0.6;
  }
`;

export const cardStyles = css`
  :host {
    display: block;
    container-type: inline-size;
    font-family: var(--paper-font-body1_-_font-family, system-ui, sans-serif);
    font-size: 14px;
    line-height: 1.45;
    --aw-bg: var(--ha-card-background, var(--card-background-color, #f7fafc));
    --aw-text: var(--primary-text-color, #183044);
    --aw-muted: var(--secondary-text-color, #53697c);
    --aw-line: var(--divider-color, #d6e2ec);
    --aw-fill: #e9f0f6;
    --aw-sky: rgb(120 177 203 / 15%);
    --aw-temp: #087869;
    --aw-rain: #2376b8;
    --aw-wind: #896119;
    --aw-sun: #a76c09;
    --aw-moon: #9c751e;
    --aw-moon-shade: #dce5ed;
    --aw-purple: #7362b0;
    --aw-night: #d2deeb;
    color: var(--aw-text);
  }
  :host([data-dark]) {
    --aw-fill: #1d3047;
    --aw-sky: rgb(110 169 203 / 12%);
    --aw-temp: #9fe5cf;
    --aw-rain: #86c4ff;
    --aw-wind: #e8c28a;
    --aw-sun: #f4cf81;
    --aw-moon: #ffe3a2;
    --aw-moon-shade: #314358;
    --aw-purple: #b5a7e8;
    --aw-night: #07121f;
  }
  :host([data-force-theme="dark"]) {
    --aw-bg: #111e30;
    --aw-text: #eef5fc;
    --aw-muted: #b1c3d7;
    --aw-line: #2c4057;
  }
  :host([data-force-theme="light"]) {
    --aw-bg: #f7fafc;
    --aw-text: #183044;
    --aw-muted: #53697c;
    --aw-line: #d6e2ec;
  }
  * {
    box-sizing: border-box;
  }
  [hidden] {
    display: none !important;
  }
  ha-card {
    display: block;
    overflow: hidden;
  }
  /* In auto mode HA owns the surface. Re-declaring its CSS properties here
     overrides card-mod theme rules because Lit's adopted sheets come last. */
  :host([data-force-theme="dark"]) ha-card,
  :host([data-force-theme="light"]) ha-card,
  ha-card:not(:defined) {
    border-radius: var(--ha-card-border-radius, 24px);
    background: var(--aw-bg);
    color: var(--aw-text);
    border: var(--ha-card-border-width, 1px) solid
      var(--ha-card-border-color, var(--aw-line));
    box-shadow: var(--ha-card-box-shadow, none);
    backdrop-filter: var(--ha-card-backdrop-filter, none);
  }
  button {
    font: inherit;
    color: inherit;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    border: 0;
    background: none;
  }
  button:focus-visible {
    outline: 3px solid var(--aw-temp);
    outline-offset: 2px;
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 20px 0;
  }
  .brand {
    font-size: 15px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  .brand span {
    overflow-wrap: anywhere;
  }
  .brand .icon {
    color: var(--aw-temp);
    width: 17px;
  }
  .clock {
    font-size: 11px;
    color: var(--aw-muted);
    text-align: right;
    flex-shrink: 0;
  }
  .hero {
    padding: 6px 20px 12px;
  }
  :host([data-force-theme="dark"]) .hero,
  :host([data-force-theme="light"]) .hero {
    background: radial-gradient(
      ellipse at 90% 22%,
      var(--aw-sky),
      transparent 65%
    );
  }
  .live {
    padding: 0;
    min-height: 44px;
    text-align: left;
    font-size: 11px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--aw-temp);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .live:before {
    content: "";
    display: inline-block;
    flex-shrink: 0;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }
  .live.old {
    color: var(--aw-wind);
  }
  .live .icon {
    width: 13px;
    height: 13px;
    opacity: 0.7;
  }
  .weather-now {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: flex-start;
    margin-top: 0;
  }
  .current-readings {
    min-width: 0;
  }
  .temperature {
    font-size: 68px;
    line-height: 1.1;
    font-weight: 400;
    letter-spacing: -4px;
    font-variant-numeric: tabular-nums;
  }
  .temperature small {
    font-size: 22px;
    letter-spacing: 0;
    vertical-align: top;
    display: inline-block;
    margin: 11px 0 0 4px;
    color: var(--aw-muted);
  }
  .feels,
  .current-wind {
    font-size: 12px;
    color: var(--aw-muted);
    margin: 5px 0 0;
  }
  .current-wind {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .current-wind strong {
    font-weight: 500;
    color: var(--aw-text);
  }
  .wind-arrow {
    display: inline-flex;
    color: var(--aw-wind);
  }
  .wind-arrow .icon {
    width: 14px;
    height: 14px;
  }
  .condition {
    display: flex;
    align-items: flex-end;
    flex-direction: column;
    gap: 4px;
    font-size: 13px;
    text-align: right;
    flex-shrink: 0;
    max-width: 150px;
  }
  .condition .weather-symbol {
    width: 72px;
    height: 64px;
    margin-bottom: 2px;
  }
  .condition small {
    font-size: 11px;
    color: var(--aw-muted);
  }
  .summary {
    font-size: 19px;
    line-height: 1.4;
    font-weight: 500;
    margin: 10px 0 0;
    max-width: 580px;
  }
  .status {
    font-size: 12px;
    line-height: 1.5;
    color: var(--aw-wind);
    margin: 9px 0 0;
  }
  .day-stats {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.2fr);
    gap: 16px;
    padding: 9px 20px;
    border-top: 1px solid var(--aw-line);
  }
  .day-extrema {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 0;
    text-align: left;
    gap: 3px;
  }
  .day-extrema span,
  .day-extrema small {
    font-size: 11px;
    color: var(--aw-muted);
  }
  .day-extrema strong {
    font-size: 19px;
    font-weight: 500;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .rain-rows {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 6px 8px;
    align-items: baseline;
    font-size: 12px;
    color: var(--aw-muted);
  }
  .rain-rows strong {
    font-size: 16px;
    white-space: nowrap;
    color: var(--aw-text);
    font-weight: 500;
  }
  .rain-rows small {
    font-size: 11px;
    font-weight: 400;
    color: var(--aw-muted);
  }
  .sensors {
    display: grid;
    grid-template-columns: 1.2fr 1fr 1fr;
    gap: 10px;
    border-top: 1px solid var(--aw-line);
    padding: 0 20px;
    border-bottom: 1px solid var(--aw-line);
  }
  .sensor {
    min-height: 44px;
    text-align: left;
    padding: 4px 0;
  }
  .sensor span {
    display: block;
    font-size: 11px;
    color: var(--aw-muted);
  }
  .sensor strong {
    font-size: 13px;
    font-weight: 400;
  }
  .sensor small {
    font-size: 11px;
    color: var(--aw-muted);
  }
  .astronomy-strip {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: center;
    padding: 2px 0;
    gap: 3px;
    color: var(--aw-muted);
    font-size: 11px;
    min-height: 44px;
    border-radius: 6px;
  }
  .sun-times,
  .sun-times > span,
  .moon-phase {
    display: flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
  }
  .sun-times {
    gap: 10px;
  }
  .astronomy-strip .icon {
    color: var(--aw-sun);
    width: 16px;
    height: 16px;
  }
  .astronomy-strip .mini-moon {
    width: 15px;
    height: 15px;
  }
  .body {
    padding: 9px 20px 0;
  }
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 5px;
    margin-bottom: 8px;
  }
  .ranges,
  .toolbar-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .ranges button {
    min-height: 44px;
    padding: 8px 12px;
    border: 1px solid transparent;
    border-radius: 9px;
    white-space: nowrap;
    font-size: 13px;
    color: var(--aw-muted);
  }
  .ranges button[aria-pressed="true"] {
    color: var(--aw-text);
    border-color: var(--aw-temp);
    background: color-mix(in srgb, var(--aw-temp) 12%, transparent);
  }
  .icon-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 44px;
    min-width: 44px;
    padding: 7px 10px;
    border: 1px solid var(--aw-line);
    border-radius: 9px;
    font-size: 12px;
  }
  .now-button {
    min-width: 44px;
    min-height: 44px;
    font-size: 12px;
    color: var(--aw-temp);
    padding: 6px;
  }
  .period {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 12px;
    margin-bottom: 8px;
  }
  .legend {
    display: flex;
    gap: 12px;
    color: var(--aw-muted);
    font-size: 11px;
  }
  .legend span {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .legend span:before {
    content: "";
    display: inline-block;
    width: 17px;
    border-top: 2px solid var(--aw-muted);
  }
  .legend .forecast:before {
    border-top-style: dashed;
  }
  .empty {
    font-size: 13px;
    color: var(--aw-muted);
    padding: 20px 0 28px;
    line-height: 1.6;
  }
  .rose-button {
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 8px 0;
    font-size: 12px;
    text-align: left;
  }
  .rose-button small {
    font-size: 11px;
    color: var(--aw-muted);
  }
  .footer {
    border-top: 1px solid var(--aw-line);
    padding: 8px 20px;
    color: var(--aw-muted);
    font-size: 11px;
    display: flex;
    gap: 5px 14px;
    justify-content: space-between;
    flex-wrap: wrap;
  }
  .attribution {
    width: 100%;
    font-size: 11px;
    line-height: 1.4;
    color: var(--aw-muted);
    overflow-wrap: anywhere;
  }
  dialog {
    background: var(--aw-bg);
    color: var(--aw-text);
    border: 1px solid var(--aw-line);
    border-radius: 22px;
    max-width: 980px;
    width: calc(100% - 28px);
    max-height: calc(100dvh - 28px);
    overflow: auto;
    padding: 22px;
    box-shadow: 0 20px 70px #0005;
  }
  dialog::backdrop {
    background: #06121dcc;
    backdrop-filter: blur(5px);
  }
  .dialog-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 15px;
  }
  .dialog-head h2 {
    font-size: 20px;
    font-weight: 500;
    margin: 0;
  }
  .dialog-note {
    font-size: 13px;
    color: var(--aw-muted);
    line-height: 1.6;
    margin: 12px 0;
  }
  .detail-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  .detail-table th,
  .detail-table td {
    padding: 9px 6px;
    text-align: left;
    vertical-align: top;
    border-bottom: 1px solid var(--aw-line);
  }
  .detail-table th {
    font-weight: 500;
  }
  .detail-table td small {
    display: block;
    color: var(--aw-muted);
    font-size: 11px;
  }
  .detail-table .old {
    color: var(--aw-wind);
  }
  .astro-panel {
    display: grid;
    grid-template-columns: 100px 1fr;
    gap: 22px;
    align-items: center;
  }
  .astro-panel h3 {
    font-size: 20px;
    font-weight: 500;
    margin: 0 0 8px;
  }
  .astro-panel p {
    font-size: 13px;
    margin: 6px 0;
    color: var(--aw-muted);
  }
  .astro-moon {
    width: 100px;
    height: 100px;
  }
  .astro-times {
    display: flex;
    gap: 18px;
    flex-wrap: wrap;
    font-size: 13px;
    margin: 18px 0;
  }
  .rose-figure {
    display: block;
    width: 260px;
    max-width: 100%;
    margin: 10px auto;
  }
  .rose-figure text {
    fill: var(--aw-muted);
    font:
      12px system-ui,
      sans-serif;
  }
  .rose-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
    font-size: 12px;
    color: var(--aw-muted);
  }
  .rose-legend span {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
    background: var(--aw-temp);
  }
  .dot.medium {
    background: var(--aw-purple);
  }
  .dot.fast {
    background: var(--aw-wind);
  }
  .rose-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 5px 22px;
    padding: 0;
    list-style: none;
    font-size: 12px;
  }
  .rose-grid li {
    display: flex;
    justify-content: space-between;
    border-bottom: 1px solid var(--aw-line);
    padding: 6px 0;
    gap: 8px;
  }
  .error {
    padding: 20px;
    font-size: 14px;
    overflow-wrap: anywhere;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
  :host([data-animated]) .condition .cloud-shape {
    animation: aw-drift 4s ease-in-out infinite alternate;
  }
  :host([data-animated]) .condition .solar {
    animation: aw-sun 28s linear infinite;
  }
  :host([data-animated]) .condition .lunar {
    animation: aw-moon 5s ease-in-out infinite alternate;
  }
  :host([data-animated]) .condition .falling {
    animation: aw-fall 1.8s linear infinite;
    animation-delay: var(--fall-delay);
  }
  :host([data-animated]) .condition .snowflake {
    animation-duration: 3s;
  }
  @keyframes aw-drift {
    from {
      transform: translate(-2px, 0);
    }
    to {
      transform: translate(3px, -1px);
    }
  }
  @keyframes aw-sun {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  @keyframes aw-fall {
    0% { transform: translate(1px, -3px); opacity: 0; }
    20%, 70% { opacity: 1; }
    100% { transform: translate(-2px, 7px); opacity: 0; }
  }
  @keyframes aw-moon {
    from { transform: translateY(0); }
    to { transform: translateY(-2px); }
  }
  @container (max-width:480px) {
    .header {
      padding: 12px 16px 0;
    }
    .hero {
      padding: 4px 16px 10px;
    }
    .brand {
      font-size: 14px;
    }
    .clock {
      font-size: 11px;
    }
    .temperature {
      font-size: clamp(42px, 14cqw, 60px);
      letter-spacing: -3px;
    }
    .temperature small {
      font-size: 20px;
    }
    .condition .weather-symbol {
      width: 60px;
      height: 54px;
    }
    .condition {
      max-width: 140px;
      font-size: 12px;
    }
    .summary {
      font-size: 17px;
    }
    .day-stats {
      padding: 8px 16px;
      gap: 14px;
    }
    .day-extrema strong {
      font-size: 17px;
    }
    .rain-rows {
      font-size: 11px;
      gap: 5px;
    }
    .rain-rows strong {
      font-size: 15px;
    }
    .sensors {
      padding: 0 16px;
      gap: 6px;
    }
    .sensor strong {
      font-size: 12px;
    }
    .body {
      padding: 8px 16px 0;
    }
    .ranges {
      gap: 2px;
    }
    .ranges button {
      padding: 8px 9px;
      font-size: 12px;
    }
    .toolbar-actions {
      gap: 2px;
    }
    .expand-label {
      display: none;
    }
    .footer {
      padding: 8px 16px;
    }
    dialog {
      padding: 15px;
    }
    .dialog-head h2 {
      font-size: 18px;
    }
    .astro-panel {
      grid-template-columns: 76px 1fr;
      gap: 12px;
    }
    .astro-moon {
      width: 76px;
      height: 76px;
    }
    .astro-panel h3 {
      font-size: 17px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    * {
      animation: none !important;
      scroll-behavior: auto !important;
    }
  }
`;
