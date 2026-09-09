import { test, expect } from "@playwright/test";
import type { AmazingWeatherCard } from "../../src/card";
import type { CardConfig, HomeAssistant } from "../../src/types";

test("loads the standalone release bundle and its editor without remote runtime assets", async ({
  page,
}) => {
  const errors: string[] = [],
    external: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1:5278/"))
      external.push(request.url());
  });
  await page.route("**/.cache/index.js", (route) =>
    route.fulfill({
      path: "dist/ha-amazing-weather-card.js",
      contentType: "text/javascript",
    }),
  );
  await page.goto("/demo/");
  const card = page.locator("ha-amazing-weather-card");
  await expect(card.locator(".temperature")).toContainText("14,5");
  await card.locator(".body .ranges button").last().click();
  await expect(card.locator("amazing-weather-chart .time")).toHaveCount(10);
  await page.getByRole("button", { name: "Card editor", exact: true }).click();
  await expect(
    page
      .locator("ha-amazing-weather-card-editor")
      .getByLabel("Kortin nimi", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test("shows weather-only sources and polar no-event astronomy at narrow width", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-06-21T12:00:00Z") });
  await page.setViewportSize({ width: 344, height: 1500 });
  await page.goto("/demo/");
  const card = page.locator("ha-amazing-weather-card");
  await expect(card.locator(".temperature")).toBeVisible();
  await page.evaluate(() => {
    const demo = window as unknown as { demoCard: AmazingWeatherCard };
    demo.demoCard.setConfig({
      entity: "weather.home",
      language: "en",
      theme: "dark",
      latitude: 69.65,
      longitude: 18.96,
    });
  });
  await expect(card.locator(".live")).toContainText("Weather service");
  await expect(card.locator(".day-extrema strong")).toContainText("—");
  await expect(card.locator(".astronomy-strip>span").first()).toContainText(
    "—",
  );
  const overflow = await card.evaluate(
    (el) =>
      el.shadowRoot!.querySelector("ha-card")!.scrollWidth > el.clientWidth,
  );
  expect(overflow).toBe(false);
  await card.locator("button.astronomy-strip").click();
  await expect(card.locator(".astro-times")).toContainText("No event today");
});

test("passes the full configuration through the Home Assistant form branch", async ({
  page,
}) => {
  await page.addInitScript(() =>
    customElements.define("ha-form", class extends HTMLElement {}),
  );
  await page.goto("/demo/");
  await page.getByRole("button", { name: "Card editor", exact: true }).click();
  const form = page.locator("ha-amazing-weather-card-editor ha-form");
  await expect(form).toBeAttached();
  const result = await form.evaluate((el) => {
    const f = el as HTMLElement & {
      data: CardConfig;
      schema: { name: string }[];
      hass: HomeAssistant;
    };
    const editor = el.getRootNode() as ShadowRoot;
    const host = editor.host as HTMLElement & { setConfig(c: unknown): void };
    host.setConfig({ ...f.data, grid_options: { columns: 9 } });
    return {
      entity: f.data.entity,
      schema: f.schema.map((item) => item.name),
      connected: !!f.hass.connection,
    };
  });
  expect(result).toMatchObject({ entity: "weather.home", connected: true });
  expect(result.schema).toContain("station");
  expect(result.schema).toContain("show_header");
  await expect
    .poll(() =>
      form.evaluate(
        (el) => (el as HTMLElement & { data: CardConfig }).data.grid_options,
      ),
    )
    .toEqual({ columns: 9 });
  const config = await form.evaluate((el) => {
    const f = el as HTMLElement & { data: CardConfig };
    let emitted: unknown;
    (el.getRootNode() as ShadowRoot).host.addEventListener(
      "config-changed",
      (event) => (emitted = (event as CustomEvent).detail.config),
      { once: true },
    );
    f.dispatchEvent(
      new CustomEvent("value-changed", {
        detail: {
          value: {
            ...f.data,
            name: "Form test",
            show_header: false,
            rain_today_entity: "",
          },
        },
        bubbles: true,
        composed: true,
      }),
    );
    return emitted;
  });
  expect(config).toMatchObject({
    name: "Form test",
    show_header: false,
    grid_options: { columns: 9 },
  });
  expect(config).not.toHaveProperty("rain_today_entity");
});
