# Data and design decisions

## A single card, distinct sources

The overview answers three questions: what is it like now, what has been measured today, and what will happen next? It shows current readings once, then puts detailed source information, astronomy and the wind rose behind explicit buttons.

The weather condition icon is a **weather service estimate**. A local temperature sensor does not reveal cloud coverage. Station temperature/history and provider forecasts can disagree; a gap between the solid and dashed lines is therefore intentional. We never shift the forecast to make the two lines meet.

Data is read from the existing HA state machine, `weather/subscribe_forecast` and `history/history_during_period`. Connections are shared per weather entity and forecast feature set, released when the last card disconnects, and subscription failures retry after 1, 2, 4 and then 5 minutes. HA's connection object handles ordinary websocket resubscription; replacing that object triggers fresh subscriptions. No service calls change your HA configuration or sensor values.

## Timeline

- The hourly view starts at Now. Earlier observations remain accessible by swiping towards the past. A clock label marks each available forecast timestamp or hourly observation.
- Measurements use the last known recorded state at each hourly timestamp, including explicit unavailable-state gaps. These are snapshots, **not hourly averages**. A station which stops updating without marking itself unavailable cannot be distinguished from a stable value in recorder history.
- Forecast timestamps and native provider periods are preserved. Sparse or multi-hour forecasts are not filled with invented hourly samples.
- Day views use one column per provider day, with the supplied maximum/minimum, total precipitation and wind. Missing daily minima stay missing. Wind is the provider's daily value, not an independently calculated daily average or maximum.
- A day icon uses local daytime for its sun/moon choice; hourly icons use their actual timestamp. Small moon icons use the phase calculated for that date.
- The line's vertical scale covers the whole loaded timeline. Swiping therefore does not silently rescale temperatures. Numeric details are available on each point.

The navigation is native horizontal scrolling with touch, trackpad, mouse dragging and arrow buttons. It has no slider. The explicit Now button always remains available when away. Automatic return is opt-in because a surprise jump interrupts someone reading the weather. An open dialog suspends the return timer.

## Rainfall

Rain bars show **accumulated precipitation for the indicated period**, never instantaneous intensity. The lane says `mm / h`, `mm / period`, or `mm / day` according to the provider's interval. Tap a point to see its period length. A zero is dry; a dash is unknown.

Recorded hourly rain is the change in a counter over a completed hour. A lifetime counter can reset and begin accumulating again. A daily counter may reset across local midnight; an unexplained decrease within the same local day makes that interval unknown. Any explicit unavailable state in an interval also makes its rain unknown. Missing resets or gaps between recorder samples cannot be reconstructed.

The summary rain forecast sums **complete provider periods** starting at the next available forecast timestamp, up to 24 hours from that start. Its start/end times and covered hours are displayed. It does not prorate a partly elapsed interval or manufacture rainfall between sparse samples. Any missing amount or discontinuity makes the total unknown. “Rain today” always refers to measurements and is separate from this forecast sum.

## Wind rose

The rose partitions the last 24 hours using all speed and direction state changes. Each valid segment contributes its **duration** to one of eight direction sectors and three speed ranges (below 3, 3–6, at least 6 m/s). This prevents frequently updating directions from being overrepresented. Calm means below 0.3 m/s and is shown separately. Percentages are shares of the usable recorded time; coverage is displayed explicitly.

Directions mean where the wind **comes from**, in the meteorological convention. The current direction is a marker on the rim, and the same convention is used for the small arrows alongside wind numbers.

## Astronomy

SunCalc runs locally using the HA location or a card override. The moon phase and illuminated fraction depend on the moment and are effectively global. Moon altitude and sunrise/sunset depend on location. The moon drawing shows phase, not a camera-accurate rotation of the lunar disk for each observer. Missing polar sunrise/sunset is kept as a missing event. Astronomical visibility does not account for clouds or local obstructions.

## Accessibility and performance

Controls have text or accessible names, visible focus states and keyboard operation. Dialogs use native focus handling and Escape to close. Motion respects `prefers-reduced-motion`. Source distinctions use text and solid/dashed strokes in addition to colour. Offscreen point controls leave the tab order; arrow controls move the visible window.

Lit safely renders user text without injecting HTML. There are no CDN scripts, external fonts, analytics or stored credentials. The PNG project icon is a repository/documentation asset, not a runtime download. The graph uses SVG rather than a charting dependency. History requests are scoped to selected entity IDs. The clock updates once a minute; hidden cards pause clock updates and history polling work.

## Compatibility and validation

The HA interface contract is deliberately small and covered by fixture-backed tests. Tests exercise unit conversion, missing values, daily rain resets, DST, time-weighted wind history, subscription cleanup/retry, mobile layouts, scrolling, dialogs, wall mode and the visual editor. A local browser smoke test also loads the production release bundle.

These checks do not replace installing in real Home Assistant. This first release has not yet been verified on a live instance. Forecast period meanings and available attributes vary by integration. Reports should identify HA version, weather provider, card version, browser and a sanitized configuration.

## References

- [Home Assistant custom card API](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/)
- [Home Assistant weather entity fields](https://www.home-assistant.io/integrations/weather/)
- [Home Assistant frontend weather subscription implementation](https://github.com/home-assistant/frontend/blob/dev/src/data/weather.ts)
- [Home Assistant frontend history implementation](https://github.com/home-assistant/frontend/blob/dev/src/data/history.ts)
- [HACS dashboard repository requirements](https://www.hacs.xyz/docs/publish/plugin/)
- [SunCalc 1.9](https://github.com/mourner/suncalc/tree/v1.9.0)
- [Finnish Meteorological Institute: wind direction](https://www.ilmatieteenlaitos.fi/tuulet)
