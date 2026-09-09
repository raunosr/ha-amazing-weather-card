# Data and design decisions

## A single card, distinct sources

The overview answers three questions: what is it like now, what has been measured today, and what will happen next? It shows current readings once, then puts detailed source information, astronomy and the wind rose behind explicit buttons.

Sunrise, sunset and moon illumination share a compact button above the weather symbol. It opens the full astronomy panel. The wind-rose button shares the chart navigation row, avoiding a separate full-width section. Range buttons show the available number of days without repeating that count below the chart. Sections layouts have a measured minimum height that accommodates long names, translated text and missing-data notices. Extra grid rows enlarge the plot while labels retain their size. Auto height and Masonry remain content-driven.

Automatic colours follow the rendered HA card surface, rather than trusting the profile's dark-mode flag: a view theme can differ from that flag. Transparent and gradient cards use the theme's text colour to select contrasting weather accents. Forced light/dark modes retain fixed card palettes. Ancestor theme changes across shadow roots are observed and those observers are removed when the card disconnects.

In automatic mode the native `ha-card` owns its background, text, border, shadow and backdrop styles. The weather card does not redeclare these properties or add a hero tint: Lit's adopted stylesheets otherwise override card-mod's injected theme rules at equal specificity, hiding glass layers behind an opaque background. Browser coverage includes injected theme CSS as well as CSS-variable themes. The standalone demo has a fallback surface only when `ha-card` is not defined.

The weather condition icon is a **weather service estimate**. A local temperature sensor does not reveal cloud coverage. Station temperature/history and provider forecasts can disagree; a gap between the solid and dashed lines is therefore intentional. We never shift the forecast to make the two lines meet.

Data is read from the existing HA state machine, `weather/subscribe_forecast` and `history/history_during_period`. Connections are shared per weather entity and forecast feature set, released when the last card disconnects, and subscription failures retry after 1, 2, 4 and then 5 minutes. HA's connection object handles ordinary websocket resubscription; replacing that object triggers fresh subscriptions. No service calls change your HA configuration or sensor values.

## Timeline

- The hourly view opens two hours before Now when loaded history permits it. Earlier observations remain accessible by swiping towards the past. A clock label marks each available forecast timestamp or hourly observation. A small dot at Now shows the latest fresh temperature, with its station/provider source in the accessible label. Missing or old readings have no current dot.
- Measurements use the last known recorded state at each hourly timestamp, including explicit unavailable-state gaps. These are snapshots, **not hourly averages**. A station which stops updating without marking itself unavailable cannot be distinguished from a stable value in recorder history.
- Forecast timestamps and native provider periods are preserved. Sparse or multi-hour forecasts are not filled with invented hourly samples.
- Day views use one column per provider day, with the supplied maximum/minimum, total precipitation and wind. Missing daily minima stay missing. Wind is the provider's daily value, not an independently calculated daily average or maximum.
- A day icon uses local daytime for its sun/moon choice; hourly icons use their actual timestamp. Small moon icons use the phase calculated for that date.
- The line's vertical scale covers the whole loaded timeline. Swiping therefore does not silently rescale temperatures. Numeric details are available on each point.

The navigation is native horizontal scrolling with touch, trackpad, mouse dragging and arrow buttons. It has no slider. The explicit Now button always remains available when away. Automatic return is opt-in because a surprise jump interrupts someone reading the weather. An open dialog suspends the return timer.

## Rainfall

Rain bars share the temperature plot and use a separate right-hand scale. They show **accumulated precipitation for the indicated period**, never instantaneous intensity. The rain axis says `mm / h`, `mm / period`, or `mm / day` according to the provider's interval. Tap a point to see its period length. A zero is dry; a dash is unknown. In day views the temperature range and rain bar are offset within the same day column so their values remain readable.

The bar fill represents an amount, not continuous rainfall. HA's met.no integration maps light rain, rain and rain showers to `rainy`; heavy rain and heavy showers map to `pouring`. Its forecast has precipitation totals and probabilities, but no separate drizzle/continuous-rain amounts to stack. The card therefore does not infer or invent such a breakdown. See the [met.no condition and forecast mappings](https://github.com/home-assistant/core/blob/dev/homeassistant/components/met/const.py). A probability in the point details is a chance of precipitation, not a share of the bar's amount.

Recorded hourly rain is the change in a counter over a completed hour. A lifetime counter can reset and begin accumulating again. A daily counter may reset across local midnight; an unexplained decrease within the same local day makes that interval unknown. Any explicit unavailable state in an interval also makes its rain unknown. Missing resets or gaps between recorder samples cannot be reconstructed.

The summary rain forecast sums **complete provider periods** starting at the next available forecast timestamp, up to 24 hours from that start. Its start/end times and covered hours are displayed. It does not prorate a partly elapsed interval or manufacture rainfall between sparse samples. Any missing amount or discontinuity makes the total unknown. “Rain today” always refers to measurements and is separate from this forecast sum.

## Wind rose

The rose partitions the last 24 hours using all speed and direction state changes. Each valid segment contributes its **duration** to one of eight direction sectors and three speed ranges (below 3, 3–6, at least 6 m/s). This prevents frequently updating directions from being overrepresented. Calm means below 0.3 m/s and is shown separately. Percentages are shares of the usable recorded time; coverage is displayed explicitly.

Directions mean where the wind **comes from**, in the meteorological convention. The current direction is a marker on the rim, and the same convention is used for the small arrows alongside wind numbers.

## Astronomy

SunCalc runs locally using the HA location or a card override. The moon phase and illuminated fraction depend on the moment and are effectively global. Moon altitude and sunrise/sunset depend on location. The moon drawing shows phase, not a camera-accurate rotation of the lunar disk for each observer. Missing polar sunrise/sunset is kept as a missing event. Astronomical visibility does not account for clouds or local obstructions.

Hourly night bands begin and end at calculated sunset/sunrise, not rounded hourly samples. The marker's dotted guide uses the same timestamp as the shading boundary. Sunset includes the current moon phase from the header. Daily charts omit these markers to avoid crowding. When events are unusually close, the second time label is omitted visually but remains in its accessible name.

## Freshness

The default tolerance is 15 minutes, with the warning appearing only after that interval. The station-wide banner and footer use the newest report among available configured station readings. A UV or rainfall value that stays constant therefore does not flag the entire station as delayed. The weather provider's refresh time never counts as a station update. Age is compared to the current clock, not to a future forecast timestamp.

Each reading still retains its own source, timestamp and age in measurement details. The card prefers `last_reported` when provided and falls back to `last_updated`. Change-only sensors can appear old even when healthy; conversely, a fresh sensor cannot prove that every other sensor works. This is an update-delay heuristic, not device health monitoring. `stale_after: 0` disables age indicators.

## Accessibility and performance

Controls have text or accessible names, visible focus states and keyboard operation. Dialogs use native focus handling and Escape to close. Motion respects `prefers-reduced-motion`. Source distinctions use text and solid/dashed strokes in addition to colour. Offscreen point controls leave the tab order; arrow controls move the visible window.

Only the main weather icon moves: cloud drift, rotating sun, floating moon and separate falling rain/snow/hail. Forecast symbols remain still. Setting `animated: false` or the device's reduced-motion preference disables every weather animation.

Lit safely renders user text without injecting HTML. There are no CDN scripts, external fonts, analytics or stored credentials. The PNG project icon is a repository/documentation asset, not a runtime download. The graph uses SVG rather than a charting dependency. History requests are scoped to selected entity IDs. The clock updates once a minute; hidden cards pause clock updates and history polling work.

## Compatibility and validation

The HA interface contract is deliberately small and covered by fixture-backed tests. Tests exercise unit conversion, missing values, daily rain resets, DST, time-weighted wind history, subscription cleanup/retry, mobile layouts, scrolling, dialogs, wall mode and the visual editor. A local browser smoke test also loads the production release bundle.

These checks do not replace testing with the intended Home Assistant installation. Forecast period meanings and available attributes vary by integration. Reports should identify HA version, weather provider, card version, browser and a sanitized configuration.

## References

- [Home Assistant custom card API](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/)
- [Home Assistant weather entity fields](https://www.home-assistant.io/integrations/weather/)
- [Home Assistant frontend weather subscription implementation](https://github.com/home-assistant/frontend/blob/dev/src/data/weather.ts)
- [Home Assistant frontend history implementation](https://github.com/home-assistant/frontend/blob/dev/src/data/history.ts)
- [HACS dashboard repository requirements](https://www.hacs.xyz/docs/publish/plugin/)
- [SunCalc 1.9](https://github.com/mourner/suncalc/tree/v1.9.0)
- [Finnish Meteorological Institute: wind direction](https://www.ilmatieteenlaitos.fi/tuulet)
