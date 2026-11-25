import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = "src";
const violations = [];
for (const file of readdirSync(root, {
  recursive: true,
  withFileTypes: true,
})) {
  if (!file.isFile() || !/\.tsx?$/.test(file.name)) continue;
  const path = join(file.parentPath, file.name).replaceAll("\\", "/");
  const content = readFileSync(path, "utf8");
  const feature = path.match(/^src\/features\/([^/]+)\//)?.[1];
  if (file.name.endsWith(".tsx") && content.trimEnd().split("\n").length > 200)
    violations.push(`${path}: component exceeds 200 lines`);
  if (/export\s+(?:default|\*)|\b(?:useMemo|useCallback)\b/.test(content))
    violations.push(`${path}: use named exports and avoid manual memoization`);
  for (const [, imported] of content.matchAll(
    /(?:from\s+|import\s+)["']([^"']+)["']/g,
  )) {
    const target = imported.match(/^@\/features\/([^/]+)/)?.[1];
    if (
      imported.startsWith(".") ||
      (feature && target && feature !== target) ||
      (path.includes("/shared/") && target)
    ) {
      violations.push(`${path}: disallowed import ${imported}`);
    }
  }
}
if (violations.length) {
  process.stderr.write(`${violations.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("Architecture checks passed.\n");
}
