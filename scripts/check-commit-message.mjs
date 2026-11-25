import { readFileSync } from "node:fs";

const message = readFileSync(process.argv[2], "utf8").trim();
if (
  !/^(feat|fix|refactor|perf|test|chore|docs|ci|build)\([a-z0-9-]+\)!?: .+/.test(
    message,
  )
) {
  process.stderr.write(
    "Use a scoped Conventional Commit, e.g. feat(chat): show trace.\n",
  );
  process.exitCode = 1;
}
