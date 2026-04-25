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
const expectedPages = [
  "pages/home/index",
  "pages/setup/index",
  "pages/meals/index",
  "pages/settings/index"
];

for (const page of expectedPages) {
  if (!app.pages?.includes(page)) {
    throw new Error(`app.json must include page: ${page}`);
  }

  for (const extension of ["json", "ts", "wxml", "wxss"]) {
    assertFile(`${page}.${extension}`);
  }
}

assertFile("app.ts");
assertFile("app.wxss");
assertFile("sitemap.json");
assertFile("utils/request.ts");
readJson("project.config.json");

console.log("Mini Program structure is valid.");
