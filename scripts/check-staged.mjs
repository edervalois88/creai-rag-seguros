import { execFileSync } from "node:child_process";

const staged = execFileSync(
  "git",
  ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"],
  { encoding: "utf8" },
);
const files = staged.split("\0").filter(Boolean);
const forbidden = files.filter((file) =>
  /(^|\/)(?:\.env(?!\.example$)|\.vercel\/)|\.(?:pem|p12|key|jsonl|png|webm|log)$/.test(
    file,
  ),
);
const changes = execFileSync(
  "git",
  ["diff", "--cached", "--unified=0", "--diff-filter=ACMR"],
  { encoding: "utf8" },
);
const secrets =
  /^\+(?:[^\n]*)(?:-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{28,}|github_pat_[A-Za-z0-9_]{40,}|sk-[A-Za-z0-9_-]{30,})/m;
if (forbidden.length || secrets.test(changes)) {
  process.stderr.write(
    `Review staged secrets or QA artifacts. ${forbidden.join(", ")}\n`,
  );
  process.exitCode = 1;
}
