import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fetchUserLanguages } from "./github.js";
import {
  type LayoutName,
  type LegendName,
  type ThemeName,
  renderLanguageChartSvg,
} from "./render.js";
import {
  DOMAINS,
  type DomainName,
  type IncludedDomain,
  buildLanguageHierarchy,
  filterLanguagesByDomains,
} from "./taxonomy.js";

function getInput(name: string, fallback = ""): string {
  const key = `INPUT_${name.toUpperCase()}`;
  return (process.env[key] ?? "").trim() || fallback;
}

function parseLayout(raw: string): LayoutName {
  const val = raw.toLowerCase();
  if (val === "radar" || val === "spider") return "radar";
  if (val === "bubbles") return "bubbles";
  if (val === "treemap") return "treemap";
  return "sunburst";
}

function parseTheme(raw: string): ThemeName {
  return raw.toLowerCase() === "light" ? "light" : "dark";
}

function parseDomains(raw: string): IncludedDomain[] {
  if (!raw.trim()) return [...DOMAINS];

  const byName = new Map<string, IncludedDomain>([
    ...DOMAINS.map((domain) => [domain.toLowerCase(), domain] as const),
    ["other", "Other"],
  ]);
  const parsed = raw
    .split(/[,;\n]/)
    .map((value) => byName.get(value.trim().toLowerCase()))
    .filter((value): value is IncludedDomain => Boolean(value));

  return parsed.length > 0 ? [...new Set(parsed)] : [...DOMAINS];
}

function parseLegend(raw: string): LegendName {
  return raw.toLowerCase() === "domains" ? "domains" : "languages";
}

async function main(): Promise<void> {
  const username = getInput(
    "username",
    process.env.GITHUB_USERNAME?.trim() || process.env.GITHUB_REPOSITORY_OWNER?.trim() || "",
  );
  const token = getInput("token", process.env.GITHUB_TOKEN?.trim() || "");
  const layout = parseLayout(getInput("layout", "sunburst"));
  const theme = parseTheme(getInput("theme", "dark"));
  const hideBorder = getInput("hide_border", "true").toLowerCase() !== "false";
  const includePrivate = getInput("include_private", "false").toLowerCase() === "true";
  const includedDomains = parseDomains(getInput("domains", ""));
  const legend = parseLegend(getInput("legend", "languages"));
  const output = getInput("output", "top-langs.svg");

  if (!username) {
    throw new Error("Missing GitHub username (set `username` input or GITHUB_REPOSITORY_OWNER).");
  }
  if (!token) {
    throw new Error("Missing GitHub token (set `token` input or GITHUB_TOKEN env var).");
  }

  const stats = await fetchUserLanguages(username, token, includePrivate);
  const filteredStats = filterLanguagesByDomains(stats, includedDomains);
  const tree = buildLanguageHierarchy(filteredStats, includedDomains);
  const canonicalDomains = includedDomains.filter(
    (domain): domain is DomainName => domain !== "Other",
  );
  const svg = renderLanguageChartSvg(tree, filteredStats, {
    theme,
    hideBorder,
    layout,
    legend,
    domains: canonicalDomains,
  });

  const outPath = resolve(output);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, svg, "utf8");

  console.log(
    `Generated ${outPath} (username=${username}, layout=${layout}, theme=${theme}, include_private=${includePrivate}, domains=${includedDomains.join(",")}, legend=${legend}, languages=${filteredStats.length})`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exit(1);
});
