// Copies the built plugin into a vault. The target directory comes from
// deploy.config.json (git-ignored), e.g.:
//   { "pluginDir": "/path/to/vault/.obsidian/plugins/pandoc-export-buttons" }
import { copyFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import path from "path";

let target = process.env.OBSIDIAN_PLUGIN_DIR;
if (!target && existsSync("deploy.config.json")) {
  target = JSON.parse(readFileSync("deploy.config.json", "utf8")).pluginDir;
}
if (!target) {
  console.error(
    "deploy: set OBSIDIAN_PLUGIN_DIR or create deploy.config.json with { \"pluginDir\": \"…\" }"
  );
  process.exit(1);
}

const FILES = ["main.js", "manifest.json", "styles.css"];
for (const f of FILES) {
  if (!existsSync(f)) {
    console.error(`deploy: missing ${f} — run the build first`);
    process.exit(1);
  }
}

mkdirSync(target, { recursive: true });
for (const f of FILES) copyFileSync(f, path.join(target, f));
console.log(`deployed ${FILES.join(", ")} → ${target}`);
