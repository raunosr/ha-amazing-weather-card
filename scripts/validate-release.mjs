import { readFile } from "node:fs/promises";
const { version } = JSON.parse(await readFile("package.json", "utf8"));
if (
  !/^\d+\.\d+\.\d+$/.test(process.env.RELEASE_VERSION || "") ||
  process.env.RELEASE_VERSION !== version
) {
  throw new Error(
    "The requested version must match the stable version in package.json.",
  );
}
const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
if (lock.version !== version || lock.packages[""].version !== version)
  throw new Error("Update the lockfile version first.");
const changelog = await readFile("CHANGELOG.md", "utf8");
if (!changelog.includes(`## ${version} `))
  throw new Error("Add this version to CHANGELOG.md first.");
console.log(`Validated release ${version}`);
