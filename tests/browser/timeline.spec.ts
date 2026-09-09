import { test, expect } from "@playwright/test";
import type { AmazingWeatherCard } from "../../src/card";
import type { CardConfig } from "../../src/types";

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-09-07T18:23:00Z") });
  await page.goto("/demo/");
  await expect(
    page.locator("ha-amazing-weather-card .temperature"),
  ).toContainText("14,5");
});

test("opens two hours before now, with a current temperature dot, and returns there after browsing", async ({
  page,
}) => {
  const chart = page.locator("amazing-weather-chart").first();
  const position = () =>
    chart.evaluate((el) => {
      const root = el.shadowRoot!,
        scroll = root.querySelector(".scroll")!;
      return (
        Number(root.querySelector(".now-dot")!.getAttribute("cx")) -
        scroll.scrollLeft
      );
    });
  await expect(chart.locator(".now-dot")).toHaveCount(1);
  await expect.poll(position).toBeCloseTo(128, 0); // 2 × 48 px + left axis gutter
  await chart.getByRole("button", { name: "Näytä myöhempää säätä" }).click();
  await page.clock.runFor(700);
  await page.locator(".body .now-button").click();
  await page.clock.runFor(700);
  await expect.poll(position).toBeCloseTo(128, 0);
  // Old or missing readings must not be presented as a fresh current dot.
  await page.evaluate(() => {
    const { demoCard, demoConfig } = window as unknown as {
      demoCard: AmazingWeatherCard;
      demoConfig: CardConfig;
    };
    demoCard.setConfig({ ...demoConfig, temperature_entity: "sensor.missing" });
  });
  await expect(chart.locator(".now-dot")).toHaveCount(0);
});

test("sunrise and sunset align exactly with night shading and the sunset moon matches the header", async ({
  page,
}) => {
  const chart = page.locator("amazing-weather-chart").first();
  await expect(chart.locator(".solar-event").first()).toBeAttached();
  const alignment = await chart.evaluate((el) => {
    const root = el.shadowRoot!;
    const bands = [...root.querySelectorAll(".night-band")].map((b) => ({
      start: Number(b.getAttribute("x")),
      end: Number(b.getAttribute("x")) + Number(b.getAttribute("width")),
    }));
    return [...root.querySelectorAll(".solar-boundary")].every((line) => {
      const x = Number(line.getAttribute("x1"));
      return bands.some(
        (b) =>
          Math.abs(
            (line.getAttribute("data-kind") === "rise" ? b.end : b.start) - x,
          ) < 0.01,
      );
    });
  });
  expect(alignment).toBe(true);
  const phase = await page
    .locator(".astronomy-strip .moon-disk polygon")
    .getAttribute("points");
  expect(
    await chart.locator(".event-moon polygon").first().getAttribute("points"),
  ).toBe(phase);
  await page
    .locator(".body .ranges")
    .getByRole("button", { name: "7 pv", exact: true })
    .click();
  await expect(chart.locator(".solar-event")).toHaveCount(0);
  await expect(chart.locator(".now-dot")).toHaveCount(0);
});

test("rain values stay beside their labels in a wide card", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1500, height: 1400 });
  await page.locator("#card").evaluate((el) => {
    el.style.maxWidth = "none";
    el.style.width = "1300px";
  });
  const gap = await page.locator(".rain-rows").evaluate((el) => {
    const label = el.children[0]!.getBoundingClientRect(),
      value = el.children[1]!.getBoundingClientRect();
    return value.left - label.right;
  });
  expect(gap).toBeGreaterThan(0);
  expect(gap).toBeLessThan(40);
});
