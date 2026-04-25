import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function readJson(relativePath) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }

  return JSON.parse(readFileSync(fullPath, "utf8"));
}

function assertFile(relativePath) {
  if (!existsSync(join(root, relativePath))) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
}

const app = readJson("app.json");
const generatedMarker = "Generated from TypeScript";
const expectedPages = [
  "pages/home/index",
  "pages/setup/index",
  "pages/weather/index",
  "pages/assistant/index",
  "pages/meals/index",
  "pages/water/index",
  "pages/todos/index",
  "pages/anniversaries/index",
  "pages/parcels/index",
  "pages/expenses/index",
  "pages/settings/index"
];

for (const page of expectedPages) {
  if (!app.pages?.includes(page)) {
    throw new Error(`app.json must include page: ${page}`);
  }

  for (const extension of ["json", "ts", "js", "wxml", "wxss"]) {
    assertFile(`${page}.${extension}`);
  }

  const jsContent = readFileSync(join(root, `${page}.js`), "utf8");
  if (!jsContent.includes(generatedMarker)) {
    throw new Error(`${page}.js must be generated from its TypeScript source`);
  }
}

assertFile("app.ts");
assertFile("app.js");
if (!readFileSync(join(root, "app.js"), "utf8").includes(generatedMarker)) {
  throw new Error("app.js must be generated from app.ts");
}
assertFile("app.wxss");
assertFile("sitemap.json");
assertFile("utils/request.ts");
assertFile("utils/request.js");
if (!readFileSync(join(root, "utils/request.js"), "utf8").includes(generatedMarker)) {
  throw new Error("utils/request.js must be generated from utils/request.ts");
}
readJson("project.config.json");

console.log("Mini Program structure is valid.");
