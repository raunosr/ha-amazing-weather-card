import { describe, it, expect, vi } from "vitest";
import { loadHistory, subscribeForecasts } from "../src/controllers";
import { createFixture } from "../demo/fixture";
import { HOUR } from "../src/time";
import type { ForecastSnapshot, Unsubscribe } from "../src/types";

describe("forecast subscription lifecycle", () => {
  it("retries a failed subscription and cancels retry timers after removal", async () => {
    vi.useFakeTimers();
    try {
      const fixture = createFixture("normal"),
        original = fixture.hass.connection.subscribeMessage.bind(
          fixture.hass.connection,
        ),
        snapshots: ForecastSnapshot[] = [];
      const subscribe = vi
        .spyOn(fixture.hass.connection, "subscribeMessage")
        .mockRejectedValueOnce(new Error("offline"))
        .mockImplementation(original);
      const stop = subscribeForecasts(fixture.hass, "weather.home", 2, (s) =>
        snapshots.push(s),
      );
      await vi.advanceTimersByTimeAsync(0);
      expect(snapshots.at(-1)?.errors.hourly).toBe(true);
      await vi.advanceTimersByTimeAsync(60000);
      expect(subscribe).toHaveBeenCalledTimes(2);
      expect(snapshots.at(-1)?.hourly.length).toBe(48);
      expect(snapshots.at(-1)?.errors.hourly).toBe(false);
      stop();
      const failing = createFixture("forecast-error"),
        spy = vi.spyOn(failing.hass.connection, "subscribeMessage"),
        release = subscribeForecasts(failing.hass, "weather.home", 2, () => {});
      await vi.advanceTimersByTimeAsync(0);
      release();
      await vi.advanceTimersByTimeAsync(600000);
      expect(spy).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });
  it("shares subscriptions between cards and releases them after the last consumer", async () => {
    const fixture = createFixture(),
      a: ForecastSnapshot[] = [],
      b: ForecastSnapshot[] = [];
    const stopA = subscribeForecasts(fixture.hass, "weather.home", 3, (s) =>
        a.push(s),
      ),
      stopB = subscribeForecasts(fixture.hass, "weather.home", 3, (s) =>
        b.push(s),
      );
    await Promise.resolve();
    await Promise.resolve();
    expect(fixture.subscriptions).toBe(2);
    expect(fixture.active).toBe(2);
    expect(a.at(-1)?.hourly.length).toBe(48);
    expect(b.at(-1)?.daily.length).toBe(10);
    stopA();
    expect(fixture.active).toBe(2);
    stopB();
    expect(fixture.active).toBe(0);
  });
  it("cleans up subscriptions that resolve after disconnection", async () => {
    const fixture = createFixture(),
      release = vi.fn();
    let resolve: (stop: Unsubscribe) => void = () => {};
    fixture.hass.connection.subscribeMessage = () =>
      new Promise<Unsubscribe>((r) => (resolve = r));
    const stop = subscribeForecasts(fixture.hass, "weather.home", 2, () => {});
    stop();
    resolve(release);
    await Promise.resolve();
    expect(release).toHaveBeenCalledOnce();
  });
  it("handles subscription failures without unhandled rejections or invented data", async () => {
    const fixture = createFixture("forecast-error"),
      snapshots: ForecastSnapshot[] = [];
    const stop = subscribeForecasts(fixture.hass, "weather.home", 3, (s) =>
      snapshots.push(s),
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(snapshots.at(-1)?.errors.hourly).toBe(true);
    expect(snapshots.at(-1)?.loading).toBe(false);
    expect(snapshots.at(-1)?.hourly).toEqual([]);
    stop();
  });
  it("does not ask for unsupported forecast types", async () => {
    const fixture = createFixture(),
      stop = subscribeForecasts(fixture.hass, "weather.home", 1, () => {});
    await Promise.resolve();
    expect(fixture.subscriptions).toBe(1);
    stop();
  });
});
describe("history requests", () => {
  it("requests only selected entity IDs and preserves attributes for unit conversion", async () => {
    const fixture = createFixture(),
      call = vi.spyOn(fixture.hass, "callWS"),
      now = Date.now();
    await loadHistory(fixture.hass, ["sensor.wind_speed"], now - HOUR, now);
    expect(call).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "history/history_during_period",
        entity_ids: ["sensor.wind_speed"],
        minimal_response: true,
        no_attributes: false,
        significant_changes_only: false,
      }),
    );
  });
  it("does not query all HA history when no sensors are configured", async () => {
    const fixture = createFixture();
    expect(await loadHistory(fixture.hass, [], 0, Date.now())).toEqual({});
    expect(fixture.historyCalls).toBe(0);
  });
});
