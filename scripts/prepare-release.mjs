import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const { version } = JSON.parse(await readFile("package.json", "utf8"));
const changelog = await readFile("CHANGELOG.md", "utf8");
const section = changelog
  .split("\n## ")
  .find((section) => section.startsWith(`${version} `));
if (!section) throw new Error("Changelog entry missing.");
const notes = `${section.slice(section.indexOf("\n") + 1).trim()}\n\nInstall through HACS as a custom **Dashboard** repository: https://github.com/raunosr/ha-amazing-weather-card\n\n[English instructions](https://github.com/raunosr/ha-amazing-weather-card#install-with-hacs) · [Asennus suomeksi](https://github.com/raunosr/ha-amazing-weather-card/blob/main/docs/ASENNUS.md)\n\nThe JavaScript asset is self-contained. Download SHA256SUMS to verify it.\n`;
await mkdir(".cache", { recursive: true });
await writeFile(".cache/release-notes.md", notes);
const digest = createHash("sha256")
  .update(await readFile("dist/ha-amazing-weather-card.js"))
  .digest("hex");
await writeFile(".cache/SHA256SUMS", `${digest}  ha-amazing-weather-card.js\n`);
