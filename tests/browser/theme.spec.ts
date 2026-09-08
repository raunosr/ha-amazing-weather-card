import { test, expect, type Page } from "@playwright/test";
import type { AmazingWeatherCard } from "../../src/card";
import type { CardConfig } from "../../src/types";

// Exercise HA's real shadow-host background/color contract, not an unknown tag.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    customElements.define(
      "ha-card",
      class extends HTMLElement {
        constructor() {
          super();
          this.attachShadow({ mode: "open" }).innerHTML =
            `<style>:host{display:block;background:var(--ha-card-background,var(--card-background-color,white));color:var(--primary-text-color);backdrop-filter:var(--ha-card-backdrop-filter,none)}</style><slot></slot>`;
        }
      },
    ),
  );
  await page.clock.install({ time: new Date("2026-09-07T18:00:00Z") });
  await page.goto("/demo/");
  await expect(
    page.locator("ha-amazing-weather-card .temperature"),
  ).toContainText("14,5");
});

async function configure(
  page: Page,
  background: string,
  text: string,
  globalDark: boolean,
  theme: CardConfig["theme"] = "auto",
) {
  await page.evaluate(
    ({ background, text, globalDark, theme }) => {
      const demo = window as unknown as {
        demoCard: AmazingWeatherCard;
        demoConfig: CardConfig;
      };
      const parent = document.getElementById("card")!;
      parent.style.setProperty("--ha-card-background", background);
      parent.style.setProperty("--card-background-color", background);
      parent.style.setProperty("--primary-text-color", text);
      parent.style.setProperty("--secondary-text-color", text);
      demo.demoCard.setConfig({ ...demo.demoConfig, theme });
      demo.demoCard.hass = {
        ...demo.demoCard.hass,
        themes: { darkMode: globalDark },
      };
    },
    { background, text, globalDark, theme },
  );
}

async function palette(page: Page) {
  return page.locator("ha-amazing-weather-card").evaluate((el) => {
    const root = el.shadowRoot!,
      card = getComputedStyle(root.querySelector("ha-card")!),
      live = getComputedStyle(root.querySelector(".live")!);
    return {
      background: card.backgroundColor,
      text: card.color,
      accent: live.color,
      hero: getComputedStyle(root.querySelector(".hero")!).backgroundImage,
    };
  });
}

function contrast(a: string, b: string) {
  const luminance = (value: string) =>
    value
      .match(/[\d.]+/g)!
      .slice(0, 3)
      .map(Number)
      .map((v) => v / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i]!, 0);
  const values = [luminance(a), luminance(b)].sort((a, b) => a - b);
  return (values[1]! + 0.05) / (values[0]! + 0.05);
}

test("auto keeps accents readable on a dark dashboard while the HA profile is light", async ({
  page,
}) => {
  await configure(page, "#202020", "#e6e6e6", false);
  await page.locator("ha-amazing-weather-card").screenshot({
    path: ".cache/theme-dashboard-dark.png",
    animations: "disabled",
  });
  await expect
    .poll(async () => {
      const p = await palette(page);
      return contrast(p.accent, p.background);
    })
    .toBeGreaterThanOrEqual(4.5);
});

test("auto keeps accents readable on a light dashboard while the HA profile is dark", async ({
  page,
}) => {
  await configure(page, "#f7fafc", "#183044", true);
  await expect
    .poll(async () => {
      const p = await palette(page);
      return contrast(p.accent, p.background);
    })
    .toBeGreaterThanOrEqual(4.5);
});

test("explicit themes stay readable regardless of dashboard theme and profile mode", async ({
  page,
}) => {
  for (const theme of ["dark", "light"] as const) {
    await configure(
      page,
      theme === "dark" ? "#ffffff" : "#202020",
      theme === "dark" ? "#111111" : "#eeeeee",
      theme !== "dark",
      theme,
    );
    await expect
      .poll(async () => {
        const p = await palette(page);
        return Math.min(
          contrast(p.accent, p.background),
          contrast(p.text, p.background),
        );
      })
      .toBeGreaterThanOrEqual(4.5);
  }
});

test("follows view theme changes through shadow hosts and after reconnection", async ({
  page,
}) => {
  await configure(page, "#202020", "#e6e6e6", false);
  const card = page.locator("ha-amazing-weather-card");
  await expect(card).toHaveAttribute("data-dark", "");
  await page.evaluate(() => {
    const parent = document.getElementById("card")!,
      card = parent.querySelector("ha-amazing-weather-card")!;
    parent.attachShadow({ mode: "open" }).append(card);
    parent.style.setProperty("--ha-card-background", "#f7fafc");
    parent.style.setProperty("--primary-text-color", "#183044");
  });
  await expect(card).not.toHaveAttribute("data-dark");
  await page.evaluate(() => {
    const parent = document.getElementById("card")!;
    parent.style.setProperty("--ha-card-background", "#202020");
    parent.style.setProperty("--primary-text-color", "#e6e6e6");
  });
  await expect(card).toHaveAttribute("data-dark", "");
});

test("translucent and gradient themes use the view text and preserve its glass surface", async ({
  page,
}) => {
  const card = page.locator("ha-amazing-weather-card");
  for (const background of [
    "rgba(20,30,45,.25)",
    "linear-gradient(#17283a80, #20263080)",
  ]) {
    await configure(page, background, "#e6e6e6", false);
    await page.evaluate(() =>
      document
        .getElementById("card")!
        .style.setProperty("--ha-card-backdrop-filter", "blur(16px)"),
    );
    await expect(card).toHaveAttribute("data-dark", "");
    expect(
      await card
        .locator("ha-card")
        .evaluate((el) => getComputedStyle(el).backdropFilter),
    ).toBe("blur(16px)");
  }
  await configure(page, "rgba(250,250,255,.3)", "#183044", true);
  await expect(card).not.toHaveAttribute("data-dark");
});

test("auto lets card-mod style the native surface and glass layer", async ({
  page,
}) => {
  await configure(page, "rgba(30,30,30,.9)", "#e6e6e6", false);
  const card = page.locator("ha-amazing-weather-card");
  await card.evaluate((el) => {
    // card-mod inserts a normal style element alongside Lit's adopted sheets.
    // The theme deliberately replaces its opaque CSS variable with a glass layer.
    const style = document.createElement("style");
    style.textContent = `ha-card {
      background: transparent;
      color: rgb(221 238 255);
      backdrop-filter: none;
      border: 2px solid rgb(100 120 140 / .3);
      border-radius: 19px;
      box-shadow: 0 2px 8px rgb(0 0 0 / .2);
    }
    ha-card::before {
      content: "";
      position: absolute;
      inset: 0;
      background: rgb(28 29 33 / .18);
      backdrop-filter: blur(10px) saturate(1.2);
      z-index: -1;
      border-radius: inherit;
      pointer-events: none;
    }`;
    el.shadowRoot!.append(style);
  });
  await expect
    .poll(() =>
      card.locator("ha-card").evaluate((el) => {
        const s = getComputedStyle(el);
        return {
          background: s.backgroundColor,
          text: s.color,
          radius: s.borderRadius,
          border: s.borderWidth,
          shadow: s.boxShadow,
        };
      }),
    )
    .toEqual({
      background: "rgba(0, 0, 0, 0)",
      text: "rgb(221, 238, 255)",
      radius: "19px",
      border: "2px",
      shadow: "rgba(0, 0, 0, 0.2) 0px 2px 8px 0px",
    });
  expect(
    await card
      .locator("ha-card")
      .evaluate((el) => getComputedStyle(el, "::before").backdropFilter),
  ).toBe("blur(10px) saturate(1.2)");
  await expect(card).toHaveAttribute("data-dark", "");
  expect((await palette(page)).hero).toBe("none");
  // Explicit palettes remain an opt-in even when card-mod is installed.
  await configure(page, "rgba(30,30,30,.9)", "#e6e6e6", false, "light");
  await expect
    .poll(async () => (await palette(page)).background)
    .toBe("rgb(247, 250, 252)");
  await configure(page, "rgba(30,30,30,.9)", "#e6e6e6", false);
  await expect
    .poll(async () => (await palette(page)).background)
    .toBe("rgba(0, 0, 0, 0)");
});

test("keeps astronomy above the weather icon, with one accessible entry point at tablet and phone widths", async ({
  page,
}) => {
  const card = page.locator("ha-amazing-weather-card");
  await page.evaluate(() => {
    const demo = window as unknown as {
      demoCard: AmazingWeatherCard;
      demoConfig: CardConfig;
    };
    const hass = demo.demoCard.hass,
      id = demo.demoConfig.temperature_entity!;
    demo.demoCard.hass = {
      ...hass,
      states: { ...hass.states, [id]: { ...hass.states[id]!, state: "-30.5" } },
    };
  });
  for (const width of [344, 424, 780]) {
    await page.setViewportSize({ width, height: 1200 });
    await expect(card.locator(".astronomy-strip")).toHaveCount(1);
    const sky = (await card.locator(".astronomy-strip").boundingBox())!;
    const symbol = (await card
      .locator(".condition > .weather-symbol")
      .boundingBox())!;
    expect(sky.height).toBeGreaterThanOrEqual(44);
    expect(sky.y + sky.height).toBeLessThanOrEqual(symbol.y);
    const temp = await card.locator(".temperature").evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return range.getBoundingClientRect().right;
    });
    expect(temp).toBeLessThan(symbol.x);
    expect((await card.boundingBox())!.height).toBeLessThan(920);
  }
  await card.locator(".astronomy-strip").click();
  await expect(card.locator(".astro-times")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(card.locator(".astronomy-strip")).toBeFocused();
});

test("animates precipitation independently, keeps timeline icons still and respects reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const card = page.locator("ha-amazing-weather-card");
  const setWeather = async (condition: string, animated = true) =>
    page.evaluate(
      ({ condition, animated }) => {
        const demo = window as unknown as {
          demoCard: AmazingWeatherCard;
          demoConfig: CardConfig;
        };
        const hass = demo.demoCard.hass;
        demo.demoCard.setConfig({ ...demo.demoConfig, animated });
        demo.demoCard.hass = {
          ...hass,
          states: {
            ...hass.states,
            [demo.demoConfig.entity]: {
              ...hass.states[demo.demoConfig.entity]!,
              state: condition,
            },
          },
        };
      },
      { condition, animated },
    );
  for (const condition of [
    "rainy",
    "pouring",
    "snowy",
    "snowy-rainy",
    "hail",
    "lightning-rainy",
  ]) {
    await setWeather(condition);
    await expect(card.locator(".condition .falling")).toHaveCount(3);
    expect(
      await card
        .locator(".condition .falling")
        .first()
        .evaluate((el) => getComputedStyle(el).animationName),
    ).toBe("aw-fall");
  }
  await setWeather("rainy");
  await card.screenshot({
    path: ".cache/rain-preview.png",
    animations: "disabled",
  });
  const before = await card
    .locator(".condition .falling")
    .first()
    .evaluate((el) => getComputedStyle(el).transform);
  await page.clock.runFor(600);
  expect(
    await card
      .locator(".condition .falling")
      .first()
      .evaluate((el) => getComputedStyle(el).transform),
  ).not.toBe(before);
  expect(
    await card
      .locator("amazing-weather-chart")
      .evaluate((el) => el.shadowRoot!.getAnimations().length),
  ).toBe(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await card.evaluate((el) => el.shadowRoot!.getAnimations().length),
  ).toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await setWeather("rainy", false);
  expect(
    await card.evaluate((el) => el.shadowRoot!.getAnimations().length),
  ).toBe(0);
  await setWeather("clear-night");
  expect(
    await card
      .locator(".condition .lunar")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("aw-moon");
  await page.clock.setSystemTime(new Date("2026-09-07T09:00:00Z"));
  await page.clock.runFor(60000);
  await setWeather("sunny");
  expect(
    await card
      .locator(".condition .solar")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("aw-sun");
});
