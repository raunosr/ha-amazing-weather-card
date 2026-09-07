import { decodeHistory } from "./data";
import type {
  ForecastEvent,
  ForecastSnapshot,
  ForecastType,
  HassConnection,
  History,
  HistoryResponse,
  HomeAssistant,
  Unsubscribe,
} from "./types";

const emptyForecast = (): ForecastSnapshot => ({
  hourly: [],
  daily: [],
  updated: {},
  errors: {},
  loading: true,
});
interface SharedForecast {
  snapshot: ForecastSnapshot;
  listeners: Set<(s: ForecastSnapshot) => void>;
  releases: Unsubscribe[];
  timers: Set<ReturnType<typeof setTimeout>>;
  stopped: boolean;
}
const forecasts = new WeakMap<HassConnection, Map<string, SharedForecast>>();

export function subscribeForecasts(
  hass: HomeAssistant,
  entity: string,
  features: number,
  listener: (s: ForecastSnapshot) => void,
): Unsubscribe {
  let cache = forecasts.get(hass.connection);
  if (!cache) {
    cache = new Map();
    forecasts.set(hass.connection, cache);
  }
  const key = entity + ":" + features;
  let shared = cache.get(key);
  if (!shared) {
    shared = {
      snapshot: emptyForecast(),
      listeners: new Set(),
      releases: [],
      timers: new Set(),
      stopped: false,
    };
    cache.set(key, shared);
    const item = shared;
    const kinds: ForecastType[] = [];
    if (features & 2) kinds.push("hourly");
    if (features & 1) kinds.push("daily");
    const pending = new Set(kinds);
    const notify = () => {
      if (item.stopped) return;
      item.snapshot = { ...item.snapshot, loading: pending.size > 0 };
      for (const fn of item.listeners) fn(item.snapshot);
    };
    if (!kinds.length) item.snapshot.loading = false;
    const connect = (kind: ForecastType, attempt = 0) => {
      if (item.stopped) return;
      hass.connection
        .subscribeMessage<ForecastEvent>(
          (event) => {
            if (item.stopped) return;
            pending.delete(kind);
            item.snapshot = {
              ...item.snapshot,
              [kind]: Array.isArray(event.forecast) ? event.forecast : [],
              updated: { ...item.snapshot.updated, [kind]: Date.now() },
              errors: { ...item.snapshot.errors, [kind]: false },
            };
            notify();
          },
          {
            type: "weather/subscribe_forecast",
            forecast_type: kind,
            entity_id: entity,
          },
        )
        .then((unsubscribe) => {
          if (item.stopped) void Promise.resolve(unsubscribe()).catch(() => {});
          else item.releases.push(unsubscribe);
        })
        .catch(() => {
          if (item.stopped) return;
          pending.delete(kind);
          item.snapshot = {
            ...item.snapshot,
            errors: { ...item.snapshot.errors, [kind]: true },
          };
          notify();
          const timer = setTimeout(
            () => {
              item.timers.delete(timer);
              connect(kind, attempt + 1);
            },
            Math.min(300000, 60000 * 2 ** Math.min(attempt, 3)),
          );
          item.timers.add(timer);
        });
    };
    kinds.forEach((kind) => connect(kind));
  }
  shared.listeners.add(listener);
  listener(shared.snapshot);
  const item = shared;
  return () => {
    item.listeners.delete(listener);
    if (item.listeners.size) return;
    item.stopped = true;
    cache!.delete(key);
    for (const timer of item.timers) clearTimeout(timer);
    item.timers.clear();
    for (const release of item.releases)
      void Promise.resolve(release()).catch(() => {});
    item.releases = [];
  };
}

export async function loadHistory(
  hass: HomeAssistant,
  entities: string[],
  start: number,
  end: number,
): Promise<History> {
  if (!entities.length) return {};
  const raw = await hass.callWS<HistoryResponse>({
    type: "history/history_during_period",
    start_time: new Date(start).toISOString(),
    end_time: new Date(end).toISOString(),
    entity_ids: entities,
    minimal_response: true,
    no_attributes: false,
    significant_changes_only: false,
  });
  return decodeHistory(raw);
}
