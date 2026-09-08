# Configuration

Use the visual card editor or YAML. The editor supports Home Assistant's entity selectors when `ha-form` is available, and includes a standalone form fallback.

## Required

| Option   | Value                                                         |
| -------- | ------------------------------------------------------------- |
| `type`   | `custom:ha-amazing-weather-card`                              |
| `entity` | A `weather.*` entity providing hourly and/or daily forecasts. |

## Weather station sensors

Every sensor option is optional and accepts a `sensor.*` entity ID. Omit unused options rather than supplying empty strings.

| Option                  | Expected measurement                                                           | When omitted                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `temperature_entity`    | Outdoor temperature (°C, °F or K)                                              | Weather entity temperature.                                                                     |
| `feels_like_entity`     | Apparent temperature (°C, °F or K)                                             | Weather entity apparent temperature, if supplied.                                               |
| `humidity_entity`       | Relative humidity, 0–100 %                                                     | Weather entity humidity.                                                                        |
| `pressure_entity`       | Pressure (hPa, mbar, Pa, kPa, inHg, mmHg or psi)                               | Weather entity pressure.                                                                        |
| `uv_entity`             | UV index, nonnegative number                                                   | Weather entity UV index, if supplied.                                                           |
| `wind_speed_entity`     | Wind speed (m/s, km/h, mph, kn, kt, knots or ft/s)                             | Weather entity wind speed.                                                                      |
| `wind_gust_entity`      | Wind gust (same units as speed)                                                | Weather entity wind gust, if supplied.                                                          |
| `wind_direction_entity` | Degrees clockwise from north, or an English compass point such as N, SW or NNW | Weather entity wind bearing.                                                                    |
| `rain_today_entity`     | Daily accumulated precipitation (mm, cm, m or in), resetting at local midnight | No direct daily rain reading. A configured lifetime counter can provide a recorded daily total. |
| `rain_total_entity`     | Increasing precipitation counter (mm, cm, m or in)                             | Hourly rain uses changes in `rain_today_entity` if available.                                   |

A selected entity always retains its identity as the source. If it disappears or reports `unknown`/`unavailable`, the card displays `—`. It does not silently substitute the weather entity's value. Unsupported units also produce `—`.

Wind values are displayed in **m/s**, precipitation in **mm**, pressure in **hPa**. Temperature follows Home Assistant's unit setting unless overridden. Use the measurement details to inspect the source and update time. Wind arrows point **towards the source direction**, not the direction the air is travelling.

## Appearance and behaviour

| Option             | Default                     | Values / meaning                                                                                                                                  |
| ------------------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`             | Localized “Weather at home” | Plain text heading.                                                                                                                               |
| `language`         | `auto`                      | `auto`, `fi`, `en`. Auto follows the user's HA language, with English fallback.                                                                   |
| `theme`            | `auto`                      | `auto`, `dark`, `light`. Auto follows the actual dashboard surface/text, including translucent themes; explicit modes use the card's own palette. |
| `temperature_unit` | `auto`                      | `auto`, `°C`, `°F`.                                                                                                                               |
| `animated`         | `true`                      | Gentle movement of the main weather icon; disabled by the device's reduced-motion preference.                                                     |
| `default_range`    | `24`                        | `24`, `7` or `10`. These mean hours, days and days respectively.                                                                                  |
| `history_hours`    | `24`                        | `0`–`72`. `0` disables recorder requests and measured history.                                                                                    |
| `stale_after`      | `60`                        | Minutes, `0`–`1440`. `0` disables old-reading indicators.                                                                                         |
| `wall_mode`        | `false`                     | Return to Now after inactivity.                                                                                                                   |
| `return_after`     | `60`                        | Seconds of inactivity, `15`–`600`; used only in wall mode.                                                                                        |
| `latitude`         | HA latitude                 | Optional override, −90 to 90. Set together with longitude.                                                                                        |
| `longitude`        | HA longitude                | Optional override, −180 to 180. Set together with latitude.                                                                                       |

Astronomy and calendar labels use **Home Assistant's configured time zone**, including daylight-saving changes. Location overrides affect the astronomy calculation, not the location used by the weather integration. Configure a matching weather entity yourself for a different place.

For wall tablets:

```yaml
type: custom:ha-amazing-weather-card
entity: weather.home
wall_mode: true
return_after: 60
animated: true
```

## Recorder requirements

Only the selected temperature, pressure, wind speed/direction/gust and rain counter entities are queried. The card requests at most 72 hours; its default is 24 hours, extended back to local midnight when needed for today's extrema. It refreshes history every five minutes while visible.

The wind rose needs both wind speed and direction history. Calm measurements are counted without a direction. It displays the number of usable recorded hours out of the most recent 24 hours, which can be less than 24 when history is missing, disabled, excluded or shorter than the requested window.

Today's low/high is calculated from **available recorded temperature values**, including a new current value since the last history refresh. It is not an independently calibrated instrument minimum/maximum. An unavailable portion of history can mean the true daily extreme was missed.

The stale indicator uses `last_reported` when supplied, otherwise `last_updated`. A sensor that only publishes changes may legitimately have an old timestamp; adjust `stale_after` for your station.

## Dashboard layouts

The card supports Masonry and Sections dashboards and reports its content height. Give it enough vertical space; a typical phone layout is approximately 1,050 pixels tall. Horizontal scrolling stays inside the chart. At least 320 pixels of card width is recommended. Expanding the chart opens a native, keyboard-accessible dialog.

Home Assistant's layout properties such as `grid_options` remain intact when editing the card. The card itself does not write entity states or modify automations.
