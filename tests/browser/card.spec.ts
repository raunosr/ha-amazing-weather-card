import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-09-07T18:00:00Z") });
  await page.goto("/demo/");
  await expect(
    page.locator("ha-amazing-weather-card .temperature"),
  ).toContainText("14,5");
  await expect(
    page.locator("amazing-weather-chart").first().locator(".point").first(),
  ).toBeAttached();
});

test("swipes the timeline with native touch input without selecting a point", async ({
  page,
}) => {
  await page.setViewportSize({ width: 384, height: 1500 });
  const chart = page.locator("amazing-weather-chart").first(),
    scroll = chart.locator(".scroll");
  await scroll.scrollIntoViewIfNeeded();
  const initial = await scroll.evaluate((el) => el.scrollLeft),
    box = (await scroll.boundingBox())!;
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 1,
  });
  const x = box.x + box.width * 0.8,
    y = box.y + box.height * 0.5;
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  for (let i = 1; i <= 5; i++)
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x - i * 35, y }],
    });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(() => scroll.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(initial + 80);
  await expect(chart.locator(".tooltip")).toHaveCount(0);
  await session.detach();
});

test("renders all periods without outer overflow in both themes and at phone widths", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await mkdir("docs/screenshots", { recursive: true });
  const card = page.locator("ha-amazing-weather-card");
  for (const width of [780, 384, 344]) {
    await page.setViewportSize({ width, height: 1500 });
    for (const theme of ["dark", "light"]) {
      await page.selectOption("#theme", theme);
      for (const range of ["24 h", "7 pv", "10 pv"]) {
        await card
          .locator(".body .ranges")
          .getByRole("button", { name: range, exact: true })
          .click();
        const overflow = await card.evaluate((el) => {
          const r = el.getBoundingClientRect();
          return [...el.shadowRoot!.querySelectorAll("ha-card *")]
            .filter((node) => {
              const b = node.getBoundingClientRect();
              return (
                b.width &&
                b.height &&
                (b.left < r.left - 1 || b.right > r.right + 1)
              );
            })
            .map((node) => node.className);
        });
        expect(overflow).toEqual([]);
        if (range !== "24 h")
          expect(
            await card
              .locator("amazing-weather-chart")
              .first()
              .locator(".time")
              .count(),
          ).toBe(range === "7 pv" ? 7 : 10);
        if (width === 384 && theme === "dark")
          await card.screenshot({
            path: `docs/screenshots/mobile-${range === "24 h" ? "24h" : range === "7 pv" ? "7d" : "10d"}.png`,
            animations: "disabled",
          });
      }
      await card
        .locator(".body .ranges")
        .getByRole("button", { name: "24 h", exact: true })
        .click();
      if (width === 780 && theme === "dark")
        await card.screenshot({
          path: "docs/screenshots/desktop.png",
          animations: "disabled",
        });
      if (width === 384 && theme === "light")
        await card.screenshot({
          path: "docs/screenshots/light.png",
          animations: "disabled",
        });
    }
  }
  expect(errors).toEqual([]);
});

test("scrolls, selects data, returns to now and opens accessible dialogs", async ({
  page,
}) => {
  const card = page.locator("ha-amazing-weather-card"),
    chart = card.locator("amazing-weather-chart").first(),
    scroll = chart.locator(".scroll");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const initial = await scroll.evaluate((el) => el.scrollLeft);
  await chart.getByRole("button", { name: "Näytä myöhempää säätä" }).click();
  expect(await scroll.evaluate((el) => el.scrollLeft)).toBeGreaterThan(initial);
  await chart.locator(".point:visible").nth(2).click();
  await expect(chart.locator(".tooltip")).toBeVisible();
  await page.clock.fastForward(90000);
  expect(await scroll.evaluate((el) => el.scrollLeft)).toBeGreaterThan(initial);
  await card.locator(".body .now-button").click();
  await expect
    .poll(() =>
      chart.evaluate((el) => (el as HTMLElement & { away: boolean }).away),
    )
    .toBe(false);
  await card.getByRole("button", { name: "Tuuliruusu 24 h" }).click();
  await expect(card.locator("dialog")).toBeVisible();
  expect(await card.locator(".rose-grid li").count()).toBe(8);
  await page.keyboard.press("Escape");
  await card.locator("button.astronomy-strip").click();
  await expect(card.locator(".astro-moon")).toBeVisible();
  await page.keyboard.press("Escape");
  await card.locator(".body .icon-button").click();
  expect(await card.locator("amazing-weather-chart").count()).toBe(2);
  await page.keyboard.press("Escape");
  await card.locator(".live").click();
  await expect(card.locator(".detail-table")).toBeVisible();
  await page.keyboard.press("Escape");
});

test("handles unavailable data, genuine zeros and fewer forecast days", async ({
  page,
}) => {
  const card = page.locator("ha-amazing-weather-card");
  await page.selectOption("#scenario", "offline");
  await expect(card.locator(".temperature")).toContainText("—");
  await expect(card.locator(".status").first()).toContainText(
    "ei ole saatavilla",
  );
  await page.selectOption("#scenario", "zero");
  await expect(card.locator(".temperature")).toContainText("0,0");
  await expect(card.locator(".current-wind")).toContainText("0,0 m/s");
  await page.selectOption("#scenario", "missing-rain");
  await expect(card.locator(".rain-rows strong").first()).toContainText("—");
  await page.selectOption("#scenario", "seven-days");
  await expect(card.locator(".body .ranges button").last()).toBeDisabled();
  await page.selectOption("#scenario", "daily-only");
  await expect(card.locator(".body .ranges button").nth(1)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.selectOption("#scenario", "imperial");
  await expect(card.locator(".temperature")).toContainText("58,1");
  await page.selectOption("#scenario", "history-error");
  await expect(card.locator(".status")).toContainText(
    "Historiaa ei voitu ladata",
  );
  await page.selectOption("#scenario", "forecast-error");
  await expect(card.locator(".status")).toContainText(
    "Ennustetta ei voitu ladata",
  );
});

test("edits the configuration, preserves unknown options and escapes user text", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Card editor", exact: true }).click();
  const editor = page.locator("ha-amazing-weather-card-editor");
  await editor
    .getByLabel("Kortin nimi", { exact: true })
    .fill("<img src=x onerror=alert(1)>");
  await editor
    .getByLabel("Kortin nimi", { exact: true })
    .dispatchEvent("change");
  const card = page.locator("ha-amazing-weather-card");
  await expect(card.locator(".brand")).toContainText(
    "<img src=x onerror=alert(1)>",
  );
  expect(await card.locator(".brand img").count()).toBe(0);
  const headerToggle = editor.getByLabel("Näytä otsikko", { exact: true });
  await expect(headerToggle).toBeChecked();
  await headerToggle.uncheck();
  await expect(card.locator(".header")).toHaveCount(0);
  await headerToggle.check();
  await expect(card.locator(".brand")).toContainText(
    "<img src=x onerror=alert(1)>",
  );
  await page.evaluate(() => {
    const card = window as unknown as {
      demoCard: { setConfig(c: unknown): void };
      demoConfig: Record<string, unknown>;
    };
    card.demoCard.setConfig({
      ...card.demoConfig,
      name: "Safe",
      grid_options: { columns: 12 },
    });
  });
  await expect(card.locator(".brand")).toContainText("Safe");
});

test("unsubscribes when removed and works again when reconnected", async ({
  page,
}) => {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { demoFixture: { active: number } }).demoFixture
            .active,
      ),
    )
    .toBe(2);
  await page.evaluate(() =>
    document.querySelector("ha-amazing-weather-card")!.remove(),
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { demoFixture: { active: number } }).demoFixture
            .active,
      ),
    )
    .toBe(0);
  await page.evaluate(() =>
    document
      .getElementById("card")!
      .append((window as unknown as { demoCard: HTMLElement }).demoCard),
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { demoFixture: { active: number } }).demoFixture
            .active,
      ),
    )
    .toBe(2);
  const before = await page
    .locator("ha-amazing-weather-card .clock")
    .textContent();
  await page.clock.fastForward(120000);
  expect(
    await page.locator("ha-amazing-weather-card .clock").textContent(),
  ).not.toBe(before);
});

test("wall mode returns after inactivity and respects an open detail dialog", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.selectOption("#display", "wall");
  const card = page.locator("ha-amazing-weather-card");
  await card
    .locator(".body .ranges")
    .getByRole("button", { name: "7 pv", exact: true })
    .click();
  await page.clock.fastForward(61000);
  await expect(card.locator(".body .ranges button").first()).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await card
    .locator(".body .ranges")
    .getByRole("button", { name: "7 pv", exact: true })
    .click();
  await card.locator(".body .icon-button").click();
  await page.clock.fastForward(90000);
  await expect(card.locator(".body .ranges button").nth(1)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("rain shares the temperature plot and keeps its own right axis and period units", async ({
  page,
}) => {
  const chart = page.locator("amazing-weather-chart").first();
  await expect(chart.locator(".caption.rain-axis")).toContainText("mm / h");
  const layout = await chart.evaluate((el) => {
    const root = el.shadowRoot!,
      line = (
        root.querySelector('[data-series="forecast"]') as SVGGraphicsElement
      ).getBBox();
    const bars = [
      ...root.querySelectorAll<SVGGraphicsElement>(".rain-bar"),
    ].map((el) => el.getBBox());
    const axis = root.querySelector(".tick.rain-axis")!.getBoundingClientRect();
    const scroll = root.querySelector(".scroll")!.getBoundingClientRect();
    return {
      overlap: bars.some(
        (b) => b.y < line.y + line.height && b.y + b.height > line.y,
      ),
      axisLeft: axis.left,
      plotRight: scroll.right,
    };
  });
  expect(layout.overlap).toBe(true);
  expect(layout.axisLeft).toBeGreaterThanOrEqual(layout.plotRight - 1);
  await page
    .locator(".body .ranges")
    .getByRole("button", { name: "7 pv", exact: true })
    .click();
  await expect(chart.locator(".caption.rain-axis")).toContainText("mm / vrk");
  await page
    .locator(".body .ranges")
    .getByRole("button", { name: "24 h", exact: true })
    .click();
  await chart.evaluate((el) => {
    const c = el as HTMLElement & { points: { time: number; end: number }[] };
    c.points = c.points.map((p) => ({ ...p, end: p.time + 6 * 3600000 }));
  });
  await expect(chart.locator(".caption.rain-axis")).toContainText("mm / jakso");
});
