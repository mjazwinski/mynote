// Fails if components use raw colours instead of theme tokens (constitution Principle III).
// Raw Tailwind palette classes (bg-blue-500, text-gray-700, ...) and hex/rgb/hsl literals are
// rejected in src/**/*.tsx. Token classes like bg-surface or text-fg are allowed.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../src", import.meta.url));
const PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black";
const RULES = [
  {
    name: "raw Tailwind palette colour",
    regex: new RegExp(
      `\\b(?:bg|text|border|ring|outline|fill|stroke|from|via|to|divide|placeholder|decoration|shadow|accent|caret)-(?:${PALETTE})(?:-\\d{2,3})?\\b`,
      "g",
    ),
  },
  { name: "hex colour literal", regex: /#[0-9a-fA-F]{3,8}\b(?![\w-])/g },
  { name: "rgb/hsl colour literal", regex: /\b(?:rgba?|hsla?)\s*\(/g },
];

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (path.endsWith(".tsx")) yield path;
  }
}

const problems = [];
for (const file of walk(root)) {
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => {
      for (const rule of RULES) {
        for (const match of line.matchAll(rule.regex)) {
          problems.push(`${relative(process.cwd(), file)}:${i + 1}  ${rule.name}: ${match[0]}`);
        }
      }
    });
}

if (problems.length > 0) {
  console.error(`Theme token check failed (${problems.length}):\n${problems.join("\n")}`);
  process.exit(1);
}
console.log("Theme token check passed: no raw colours in src/**/*.tsx");
