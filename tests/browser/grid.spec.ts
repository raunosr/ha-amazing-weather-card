import { test, expect, type Page } from "@playwright/test";
import type { AmazingWeatherCard } from "../../src/card";
import type { CardConfig } from "../../src/types";

async function mountGrid(page: Page) {
  await page.goto("/demo/");
  await expect(
    page.locator("ha-amazing-weather-card .temperature"),
  ).toContainText("14,5");
  await page.evaluate(() => {
    const demo = window as unknown as { demoCard: AmazingWeatherCard };
    const card = demo.demoCard;
    // Mirror HA's Sections sizing, including the hui-card wrapper and the
    // card-updated event used to re-read a custom card's minimum size.
    const parent = document.getElementById("card")!;
    const cell = document.createElement("div");
    cell.id = "grid-cell";
    const wrapper = document.createElement("hui-card");
    wrapper.style.cssText = "display:block;height:100%";
    parent.append(cell);
    cell.append(wrapper);
    wrapper.append(card);
    Object.assign(card, { layout: "grid" });
    parent.style.setProperty("--row-height", "56px");
    parent.style.setProperty("--row-gap", "8px");
    const apply = () => {
      const options = card.getGridOptions() as {
        rows?: number;
        min_rows?: number;
      };
      const requested = cell.dataset.rows;
      const rows =
        requested === "auto"
          ? "auto"
          : Math.max(
              Number(requested) || options.rows || 1,
              options.min_rows || 1,
            );
      cell.style.height = rows === "auto" ? "auto" : `${rows * 64 - 8}px`;
    };
    card.addEventListener("card-updated", apply);
    Object.assign(window, { applyGrid: apply });
    apply();
  });
}

async function rows(page: Page, value: number | "auto") {
  await page.evaluate((value) => {
    document.getElementById("grid-cell")!.dataset.rows = String(value);
    (window as unknown as { applyGrid: () => void }).applyGrid();
  }, value);
}

async function fit(page: Page) {
  return page.locator("ha-amazing-weather-card").evaluate((el) => {
    const shell = el.shadowRoot!.querySelector("ha-card")!;
    const cell = document.getElementById("grid-cell")!;
    return {
      delta: Math.abs(
        shell.getBoundingClientRect().bottom -
          cell.getBoundingClientRect().bottom,
      ),
      overflow: shell.scrollHeight - shell.clientHeight,
    };
  });
}

test("fills Sections rows and gives extra height to the plot without scaling labels", async ({
  page,
}) => {
  await mountGrid(page);
  const card = page.locator("ha-amazing-weather-card");
  const bounds = await card.evaluate((el) =>
    (el as AmazingWeatherCard).getGridOptions(),
  );
  // HA's row picker falls back to eight unless max_rows is supplied.
  expect(bounds.max_rows ?? 8).toBeGreaterThan(bounds.min_rows);
  expect(
    await card.evaluate((el) => (el as AmazingWeatherCard).getGridOptions()),
  ).toMatchObject({ rows: expect.any(Number), min_rows: expect.any(Number) });
  await expect.poll(async () => (await fit(page)).delta).toBeLessThan(2);
  const svg = card.locator(".body .chart");
  const before = (await svg.boundingBox())!.height;
  const font = await card
    .locator(".temperature")
    .evaluate((el) => getComputedStyle(el).fontSize);
  await rows(page, 22);
  await expect.poll(async () => (await fit(page)).delta).toBeLessThan(2);
  await expect
    .poll(async () => (await svg.boundingBox())!.height)
    .toBeGreaterThan(before + 200);
  expect(
    await card
      .locator(".temperature")
      .evaluate((el) => getComputedStyle(el).fontSize),
  ).toBe(font);
  const expandedHeight = (await svg.boundingBox())!.height;
  await page.getByRole("button", { name: "Card editor", exact: true }).click();
  const toggle = page
    .locator("ha-amazing-weather-card-editor")
    .getByLabel("Näytä otsikko", { exact: true });
  await toggle.uncheck();
  await expect(card.locator(".header")).toHaveCount(0);
  await expect.poll(async () => (await fit(page)).delta).toBeLessThan(2);
  await expect
    .poll(async () => (await svg.boundingBox())!.height)
    .toBeGreaterThan(expandedHeight + 25);
  await toggle.check();
  await expect(card.locator(".header")).toBeVisible();
  // Shrink again: the previous SVG height must not become a new minimum.
  await rows(page, 1);
  await expect
    .poll(async () => (await svg.boundingBox())!.height)
    .toBeLessThan(before + 2);
  await expect.poll(async () => (await fit(page)).overflow).toBeLessThan(2);
});

test("editor row controls resize taller Sections cards and preserve width", async ({
  page,
}) => {
  await mountGrid(page);
  await page.getByRole("button", { name: "Card editor", exact: true }).click();
  const editor = page.locator("ha-amazing-weather-card-editor");
  await editor.evaluate((el) => {
    const e = el as HTMLElement & { setConfig(c: unknown): void };
    const demo = window as unknown as {
      demoConfig: CardConfig;
      applyGrid(): void;
    };
    e.setConfig({ ...demo.demoConfig, grid_options: { columns: 9, rows: 14 } });
    e.addEventListener("config-changed", (event) => {
      const config = (event as CustomEvent<{ config: CardConfig }>).detail
        .config;
      const cell = document.getElementById("grid-cell")!;
      cell.dataset.rows = String(config.grid_options?.rows);
      cell.dataset.columns = String(config.grid_options?.columns);
      demo.applyGrid();
    });
  });
  await editor.getByText("Ruudukkokorkeus", { exact: true }).click();
  const count = editor.getByLabel("Ruudukkorivien määrä", { exact: true });
  await count.fill("18");
  await count.press("Tab");
  const cell = page.locator("#grid-cell");
  await expect(cell).toHaveAttribute("data-rows", "18");
  await expect(cell).toHaveAttribute("data-columns", "9");
  await expect.poll(async () => (await cell.boundingBox())!.height).toBe(1144);
  await expect.poll(async () => (await fit(page)).delta).toBeLessThan(2);
  await editor
    .getByRole("button", { name: "Vähennä rivejä", exact: true })
    .click();
  await expect(count).toHaveValue("17");
  await expect.poll(async () => (await cell.boundingBox())!.height).toBe(1080);
  await editor
    .getByRole("button", { name: "Lisää rivejä", exact: true })
    .click();
  await expect(count).toHaveValue("18");
  await editor.getByLabel("Automaattinen korkeus", { exact: true }).check();
  await expect(cell).toHaveAttribute("data-rows", "auto");
  await expect(count).toHaveCount(0);
  await expect
    .poll(async () => (await cell.boundingBox())!.height)
    .toBeLessThan(1144);
  await expect.poll(async () => (await fit(page)).overflow).toBeLessThan(2);
});

test("minimum rows accommodate narrow widths and warnings while auto height and dialogs remain usable", async ({
  page,
}) => {
  await mountGrid(page);
  const card = page.locator("ha-amazing-weather-card");
  await rows(page, 1);
  await page.evaluate(() => {
    const demo = window as unknown as {
      demoCard: AmazingWeatherCard;
      demoConfig: CardConfig;
    };
    demo.demoCard.setConfig({
      ...demo.demoConfig,
      name: "A weather station with a longer name that wraps onto several lines",
      temperature_entity: "sensor.missing",
      grid_options: { rows: 1 },
    });
  });
  for (const width of [780, 384, 344]) {
    await page.setViewportSize({ width, height: 1800 });
    for (const label of ["24 h", "7 pv", "10 pv"]) {
      await card
        .locator(".body .ranges")
        .getByRole("button", { name: label, exact: true })
        .click();
      await expect.poll(async () => (await fit(page)).delta).toBeLessThan(2);
      await expect.poll(async () => (await fit(page)).overflow).toBeLessThan(2);
    }
  }
  await rows(page, "auto");
  await expect.poll(async () => (await fit(page)).overflow).toBeLessThan(2);
  await card
    .locator(".body .toolbar")
    .getByRole("button", { name: "Suurenna" })
    .click();
  await expect(card.locator("dialog")).toBeVisible();
  expect(
    await card
      .locator("dialog .chart")
      .evaluate((el) => el.getBoundingClientRect().height),
  ).toBeLessThan(400);
  await page.keyboard.press("Escape");
  await expect(card.locator("dialog")).not.toBeVisible();
});
