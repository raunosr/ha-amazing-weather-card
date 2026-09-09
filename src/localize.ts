import type {
  CardConfig,
  HomeAssistant,
  Language,
  WeatherPoint,
} from "./types";
import { dayKey, formatDay, formatTime, HOUR } from "./time";

const en = {
  title: "Weather at home",
  now: "Now",
  station: "Your weather station",
  provider: "Weather service",
  forecast: "Forecast",
  measured: "Measured",
  feels: "Feels like",
  todayMeasured: "Measured today",
  lowHigh: "low – high",
  rainToday: "Rain today",
  rainForecast: "Rain forecast",
  pressure: "Pressure",
  humidity: "Humidity",
  uv: "UV index",
  low: "low",
  moderate: "moderate",
  high: "high",
  veryHigh: "very high",
  extreme: "extreme",
  rise: "Sunrise",
  set: "Sunset",
  next24: "Next 24 hours",
  days: "days",
  expand: "Expand",
  close: "Close",
  temperature: "Temperature",
  rain: "Rain",
  wind: "Wind",
  gusts: "Gusts",
  direction: "arrow = from",
  dayWind: "Wind forecast",
  directionVariable: "Variable direction",
  scrollHours: "Browse hours · tap for details",
  scrollDays: "Browse days · tap for details",
  earlier: "Show earlier weather",
  later: "Show later weather",
  rose: "Wind rose",
  roseHeading: "Wind at home",
  roseNote:
    "Sector length is the share of recorded time. Colour shows wind speed. The marker shows the latest direction the wind came from.",
  roseMissing:
    "Select wind speed and direction sensors to show measured wind history.",
  coverage: "Recorded coverage",
  calm: "Calm",
  astronomy: "Sun and moon",
  illuminated: "illuminated",
  above: "The moon is above the horizon.",
  below: "The moon is below the horizon.",
  astroNote:
    "Calculated for the configured location and local date. Clouds affect visibility.",
  noEvent: "No event today",
  unavailable: "Unavailable",
  loading: "Loading forecast…",
  noForecast: "No forecast available.",
  historyError:
    "History could not be loaded. Current readings and the forecast remain available.",
  forecastError: "Forecast could not be loaded.",
  notSupported: "This weather entity does not provide this forecast range.",
  missingEntity: "Weather entity not found",
  noHourly: "No hourly forecast available. Try the day view.",
  noDaily: "No daily forecast available.",
  missingSensor: "Some selected station readings are unavailable.",
  stale:
    "The weather station has not updated recently. Check the update times in its details.",
  lastReading: "Last reading",
  updated: "Updated",
  noValue: "No data",
  stationDetails: "Measurement details",
  source: "Source",
  measuredPeriod: "Available measurements",
  partialRain: "Available forecast periods",
  rainMissing: "Rainfall data unavailable",
  forecastLength: "Available forecast",
  tomorrow: "Tomorrow",
  hour: "h",
  dry: "Dry weather in the forecast for the next few hours.",
  rainExpected: "Rain in the forecast",
  snowExpected: "Snow in the forecast",
  changing: "See the forecast for the next change in weather.",
  modelHint: "Forecast becomes less certain further ahead.",
  missingLow: "Daily low not supplied",
  conditionEstimate: "weather service estimate",
  unitMissing: "Missing or unsupported unit",
  stationHistoryOnly:
    "Measurements require station sensors and recorder history.",
  noRoseHistory: "No usable wind history available.",
  name: "Card name",
  weatherEntity: "Forecast weather entity",
  stationSensors: "Weather station sensors (optional)",
  appearance: "Appearance and behaviour",
  location: "Location (optional override)",
  language: "Language",
  theme: "Theme",
  animated: "Animate the main weather icon",
  wallMode: "Wall display: return automatically",
  returnAfter: "Return after inactivity (seconds)",
  historyHours: "History to load (hours)",
  staleAfter: "Mark readings old after (minutes; 0 disables)",
  tempUnit: "Temperature unit",
  latitude: "Latitude",
  longitude: "Longitude",
  defaultRange: "Initial forecast range",
  auto: "Automatic",
  dark: "Dark",
  light: "Light",
  sensorsHelp:
    "Leave a sensor empty to use the weather service where available. A selected unavailable sensor is never silently replaced.",
  rainTotalHelp:
    "Optional cumulative rain counter for hourly rainfall. Otherwise the daily rain sensor is used, with midnight resets handled.",
  locationHelp:
    "Leave both empty to use Home Assistant's location. Astronomy and dates use the Home Assistant time zone.",
  temperature_entity: "Outdoor temperature",
  feels_like_entity: "Feels-like temperature",
  humidity_entity: "Humidity",
  pressure_entity: "Pressure",
  uv_entity: "UV index",
  wind_speed_entity: "Wind speed",
  wind_gust_entity: "Wind gust",
  wind_direction_entity: "Wind direction",
  rain_today_entity: "Rain today (daily counter)",
  rain_total_entity: "Lifetime rain (increasing counter)",
};
type Key = keyof typeof en;
const fi: Record<Key, string> = {
  title: "Kotipihan sää",
  now: "Nyt",
  station: "Oma sääasema",
  provider: "Sääpalvelu",
  forecast: "Ennuste",
  measured: "Mitattu",
  feels: "Tuntuu kuin",
  todayMeasured: "Mitattu tänään",
  lowHigh: "alin – ylin",
  rainToday: "Satanut tänään",
  rainForecast: "Sade-ennuste",
  pressure: "Ilmanpaine",
  humidity: "Kosteus",
  uv: "UV-indeksi",
  low: "matala",
  moderate: "kohtalainen",
  high: "korkea",
  veryHigh: "erittäin korkea",
  extreme: "äärimmäinen",
  rise: "Nousu",
  set: "Lasku",
  next24: "Seuraavat 24 h",
  days: "pv",
  expand: "Suurenna",
  close: "Sulje",
  temperature: "Lämpötila",
  rain: "Sade",
  wind: "Tuuli",
  gusts: "Puuskat",
  direction: "nuoli = mistä tuulee",
  dayWind: "Tuuliennuste",
  directionVariable: "Suunta vaihtelee",
  scrollHours: "Selaa tunteja · napauta tarkemmat tiedot",
  scrollDays: "Selaa päiviä · napauta tarkemmat tiedot",
  earlier: "Näytä aiempaa säätä",
  later: "Näytä myöhempää säätä",
  rose: "Tuuliruusu",
  roseHeading: "Tuuli omalla pihalla",
  roseNote:
    "Sektorin pituus kertoo osuuden mittausajasta. Väri kertoo tuulen nopeuden. Merkki näyttää viimeisimmän tuulen tulosuunnan.",
  roseMissing:
    "Valitse tuulen nopeuden ja suunnan anturit, jotta mittaushistoria näkyy.",
  coverage: "Havaintoja",
  calm: "Tyyntä",
  astronomy: "Aurinko ja kuu",
  illuminated: "valaistu",
  above: "Kuu on horisontin yläpuolella.",
  below: "Kuu on horisontin alapuolella.",
  astroNote:
    "Laskettu valitulle sijainnille ja paikalliselle päivälle. Pilvisyys vaikuttaa näkyvyyteen.",
  noEvent: "Ei tapahtumaa tänään",
  unavailable: "Ei saatavilla",
  loading: "Ennustetta ladataan…",
  noForecast: "Ennustetta ei saatavilla.",
  historyError:
    "Historiaa ei voitu ladata. Nykyiset mittaukset ja ennuste näkyvät edelleen.",
  forecastError: "Ennustetta ei voitu ladata.",
  notSupported: "Sääpalvelulta ei ole saatavilla tätä ennustejaksoa.",
  missingEntity: "Sääentiteettiä ei löydy",
  noHourly: "Tuntiennustetta ei saatavilla. Kokeile päivänäkymää.",
  noDaily: "Päiväennustetta ei saatavilla.",
  missingSensor: "Osa valituista sääaseman mittauksista ei ole saatavilla.",
  stale: "Sääaseman päivitys on viivästynyt. Tarkista päivitysajat tiedoista.",
  lastReading: "Viimeisin mittaus",
  updated: "Päivitetty",
  noValue: "Ei tietoa",
  stationDetails: "Mittausten tiedot",
  source: "Lähde",
  measuredPeriod: "Saatavilla olevat havainnot",
  partialRain: "Saatavilla olevat ennustejaksot",
  rainMissing: "Sademäärää ei saatavilla",
  forecastLength: "Ennustetta saatavilla",
  tomorrow: "Huomenna",
  hour: "h",
  dry: "Ennusteessa poutaa seuraaville tunneille.",
  rainExpected: "Sadetta ennusteessa",
  snowExpected: "Lumisadetta ennusteessa",
  changing: "Seuraava sään muutos näkyy ennusteessa.",
  modelHint: "Kauempana ennuste on suuntaa antava.",
  missingLow: "Alinta lämpötilaa ei ole annettu",
  conditionEstimate: "sääpalvelun arvio",
  unitMissing: "Yksikkö puuttuu tai sitä ei tueta",
  stationHistoryOnly:
    "Mittaukset tarvitsevat sääaseman anturit ja tallennetun historian.",
  noRoseHistory: "Käyttökelpoista tuulihistoriaa ei saatavilla.",
  name: "Kortin nimi",
  weatherEntity: "Ennusteen sääentiteetti",
  stationSensors: "Sääaseman anturit (valinnaiset)",
  appearance: "Ulkoasu ja toiminta",
  location: "Sijainti (valinnainen ohitus)",
  language: "Kieli",
  theme: "Teema",
  animated: "Animoi oikean yläkulman sääikoni",
  wallMode: "Seinänäyttö: palauta automaattisesti",
  returnAfter: "Palautus tauon jälkeen (sekuntia)",
  historyHours: "Ladattava historia (tuntia)",
  staleAfter: "Merkitse vanhaksi (minuuttia; 0 poistaa käytöstä)",
  tempUnit: "Lämpötilayksikkö",
  latitude: "Leveysaste",
  longitude: "Pituusaste",
  defaultRange: "Aloitusnäkymä",
  auto: "Automaattinen",
  dark: "Tumma",
  light: "Vaalea",
  sensorsHelp:
    "Tyhjä anturivalinta käyttää sääpalvelun tietoa, jos sitä on saatavilla. Valittua anturia ei korvata toisella lähteellä yhteyskatkossa.",
  rainTotalHelp:
    "Valinnainen kasvava sadekertymä tuntisateelle. Muuten käytetään päivän sademittaria ja huomioidaan sen nollaus keskiyöllä.",
  locationHelp:
    "Jätä molemmat tyhjiksi käyttääksesi Home Assistantin sijaintia. Ajat esitetään Home Assistantin aikavyöhykkeessä.",
  temperature_entity: "Ulkolämpötila",
  feels_like_entity: "Tuntuu kuin",
  humidity_entity: "Ilmankosteus",
  pressure_entity: "Ilmanpaine",
  uv_entity: "UV-indeksi",
  wind_speed_entity: "Tuulen nopeus",
  wind_gust_entity: "Tuulenpuuska",
  wind_direction_entity: "Tuulen suunta",
  rain_today_entity: "Satanut tänään (päiväkertymä)",
  rain_total_entity: "Sateen kokonaiskertymä (kasvava mittari)",
};

export function languageOf(config: CardConfig, hass?: HomeAssistant): Language {
  return config.language === "fi" || config.language === "en"
    ? config.language
    : (hass?.locale?.language || hass?.language || "en").startsWith("fi")
      ? "fi"
      : "en";
}
export function translator(language: Language): (key: Key) => string {
  return (key) => (language === "fi" ? fi : en)[key];
}
export function numberText(
  value: number | null,
  language: Language,
  digits = 1,
): string {
  return value === null || !Number.isFinite(value)
    ? "—"
    : new Intl.NumberFormat(language === "fi" ? "fi-FI" : "en-GB", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(value);
}
export function directionText(
  degrees: number | null,
  language: Language,
): string {
  if (degrees === null) return "—";
  const index = Math.round(degrees / 45) % 8;
  return (
    language === "fi"
      ? [
          "pohjoisesta",
          "koillisesta",
          "idästä",
          "kaakosta",
          "etelästä",
          "lounaasta",
          "lännestä",
          "luoteesta",
        ]
      : [
          "from north",
          "from northeast",
          "from east",
          "from southeast",
          "from south",
          "from southwest",
          "from west",
          "from northwest",
        ]
  )[index]!;
}
const conditions: Record<string, [string, string]> = {
  sunny: ["Aurinkoista", "Sunny"],
  clear: ["Selkeää", "Clear"],
  "clear-night": ["Selkeää", "Clear"],
  cloudy: ["Pilvistä", "Cloudy"],
  partlycloudy: ["Puolipilvistä", "Partly cloudy"],
  rainy: ["Sadetta", "Rain"],
  pouring: ["Voimakasta sadetta", "Heavy rain"],
  snowy: ["Lumisadetta", "Snow"],
  "snowy-rainy": ["Räntäsadetta", "Sleet"],
  fog: ["Sumua", "Fog"],
  hail: ["Raekuuroja", "Hail"],
  lightning: ["Ukkosta", "Thunder"],
  "lightning-rainy": ["Ukkossadetta", "Thunderstorms"],
  windy: ["Tuulista", "Windy"],
  "windy-variant": ["Pilvistä ja tuulista", "Cloudy and windy"],
  exceptional: ["Poikkeava sää", "Exceptional weather"],
};
export function conditionText(
  value: string | null,
  language: Language,
): string {
  return value && conditions[value]
    ? conditions[value]![language === "fi" ? 0 : 1]
    : translator(language)("noValue");
}
export function weatherSummary(
  points: WeatherPoint[],
  now: number,
  zone: string,
  language: Language,
): string {
  const t = translator(language),
    future = points.filter((p) => p.end > now && p.time < now + 24 * HOUR);
  if (!future.length) return t("noForecast");
  const wet = future.find((p) => p.rain !== null && p.rain >= 0.1);
  if (wet) {
    const when =
      dayKey(wet.time, zone) === dayKey(now, zone)
        ? ""
        : formatDay(wet.time, language, zone) + " ";
    return (
      (wet.condition?.includes("snow")
        ? t("snowExpected")
        : t("rainExpected")) +
      " " +
      when +
      (language === "fi" ? "klo " : "at ") +
      formatTime(wet.time, language, zone) +
      "–" +
      (dayKey(wet.end, zone) !== dayKey(wet.time, zone)
        ? formatDay(wet.end, language, zone) + " "
        : "") +
      formatTime(wet.end, language, zone) +
      "."
    );
  }
  if (
    future.slice(0, 3).length === 3 &&
    future.slice(0, 3).every((p) => p.rain === 0)
  )
    return t("dry");
  return t("changing");
}
