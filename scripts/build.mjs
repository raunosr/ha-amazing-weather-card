import { build } from "esbuild";
import { readFile, mkdir } from "node:fs/promises";
const { version } = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const notices = await Promise.all(
  [
    "../LICENSE",
    "../licenses/Lit.txt",
    "../licenses/SunCalc.txt",
    "../licenses/Pictogrammers.txt",
    "../licenses/Apache-2.0.txt",
  ].map(async (path) =>
    (await readFile(new URL(path, import.meta.url), "utf8")).replace(
      /\r\n/g,
      "\n",
    ),
  ),
);
await mkdir(new URL("../dist", import.meta.url), { recursive: true });
await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/ha-amazing-weather-card.js",
  bundle: true,
  format: "esm",
  target: "es2022",
  minify: true,
  sourcemap: false,
  legalComments: "inline",
  define: { __VERSION__: JSON.stringify(version) },
  banner: {
    js: `/*! Amazing Weather Card v${version} | github.com/raunosr/ha-amazing-weather-card\n\nProject and bundled dependency licenses:\n\n${notices.join("\n\n")}\n*/`,
  },
});
