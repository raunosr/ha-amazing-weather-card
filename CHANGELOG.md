# Changelog

## 0.2.1 — 2026-09-08

- Fix automatic mode overriding card-mod theme CSS. Let the native Home Assistant card render its background, text, borders, shadows and backdrop effects so glass themes remain transparent.
- Remove the card's own hero tint in automatic mode; retain it in the optional dark and light palettes.
- Add a regression check that injects a glass theme alongside Lit's adopted stylesheets, matching how card-mod applies themes in Home Assistant.

## 0.2.0 — 2026-09-08

- Fix automatic theme contrast when the dashboard theme differs from the HA profile mode, including translucent and gradient themes and live theme changes.
- Replace the bright hero glow with a subtle transparent tint.
- Combine temperature and rainfall in one plot, with a right-hand rain scale and a reserved axis gutter. Day views keep temperature ranges and rain bars side by side within each day.
- Move sunrise, sunset and moon illumination above the weather icon; combine wind-rose access with chart navigation and tighten vertical spacing.
- Animate rain, snow and hail separately from the cloud; make cloud, sun and moon motion easier to see while respecting reduced motion.
- Keep forecast icons still and distinguish cloud and precipitation colours.
- Add theme, astronomy-layout and animation browser checks plus an icon selector in the local demo.
- Document HACS's shared dashboard-card category icon; repository logos cannot override it.

## 0.1.0 — 2026-09-08

Initial public release.

- Combined weather station readings, recorded history and provider forecasts in one Home Assistant dashboard card.
- Touch-scrollable hourly and daily charts with temperature, rain, weather icons and numeric wind directions/speeds.
- Daily measured low/high, rainfall totals, pressure trend, humidity and UV index.
- Expandable chart, measured wind rose, source details and location-aware astronomy with moon phase.
- Finnish and English, HA-aware light/dark themes, visual editor, reduced motion and optional wall-display return.
- HACS custom-repository packaging, single bundled module and release checksums.
- Automated data/browser tests and a fixture demo. Live Home Assistant installation and provider-specific field validation remain unverified.
