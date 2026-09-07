import { context } from "esbuild";
import { readFile } from "node:fs/promises";
const { version } = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const ctx = await context({
  entryPoints: { index: "src/index.ts", demo: "demo/demo.ts" },
  outdir: ".cache",
  bundle: true,
  format: "esm",
  target: "es2022",
  sourcemap: true,
  define: { __VERSION__: JSON.stringify(version) },
});
await ctx.watch();
const server = await ctx.serve({
  host: "127.0.0.1",
  port: 5278,
  servedir: ".",
  fallback: "demo/index.html",
});
console.log(`Local demo: http://${server.hosts[0]}:${server.port}/demo/`);
