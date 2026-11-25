export interface RawLanguageStat {
  name: string;
  bytes: number;
  color: string;
}

export interface TreeNode {
  name: string;
  color?: string;
  value?: number;
  children?: TreeNode[];
}

export const DOMAINS = ["Web", "Mobile", "Systems", "Backend", "Data & Ops"] as const;
export type DomainName = (typeof DOMAINS)[number];

export const DOMAIN_COLORS: Record<DomainName | "Other", string> = {
  Web: "#3178c6",
  Mobile: "#00b4ab",
  Systems: "#f74c00",
  Backend: "#a371f7",
  "Data & Ops": "#3fb950",
  Other: "#6e7681",
};

export interface DomainScore {
  domain: DomainName;
  color: string;
  bytes: number;
  share: number;
  score: number;
}

export type IncludedDomain = DomainName | "Other";

const LANGUAGE_DOMAIN: Record<string, DomainName> = {
  // Web
  TypeScript: "Web",
  TSX: "Web",
  JavaScript: "Web",
  JSX: "Web",
  CoffeeScript: "Web",
  HTML: "Web",
  CSS: "Web",
  SCSS: "Web",
  Sass: "Web",
  Less: "Web",
  Astro: "Web",
  Vue: "Web",
  Svelte: "Web",
  MDX: "Web",
  WebAssembly: "Web",

  // Mobile
  Dart: "Mobile",
  Swift: "Mobile",
  Kotlin: "Mobile",
  "Objective-C": "Mobile",
  "Objective-C++": "Mobile",

  // Systems
  Rust: "Systems",
  C: "Systems",
  "C++": "Systems",
  Zig: "Systems",
  Assembly: "Systems",
  CMake: "Systems",
  Makefile: "Systems",
  GLSL: "Systems",
  HLSL: "Systems",
  WGSL: "Systems",
  ShaderLab: "Systems",
  CUDA: "Systems",

  // Backend
  Go: "Backend",
  Java: "Backend",
  Scala: "Backend",
  "C#": "Backend",
  "F#": "Backend",
  Ruby: "Backend",
  PHP: "Backend",
  Elixir: "Backend",
  Erlang: "Backend",
  SQL: "Backend",
  PLpgSQL: "Backend",
  Haskell: "Backend",
  Clojure: "Backend",

  // Data & Ops
  Python: "Data & Ops",
  "Jupyter Notebook": "Data & Ops",
  R: "Data & Ops",
  Julia: "Data & Ops",
  Shell: "Data & Ops",
  PowerShell: "Data & Ops",
  Dockerfile: "Data & Ops",
  HCL: "Data & Ops",
  Nix: "Data & Ops",
  YAML: "Data & Ops",
  TOML: "Data & Ops",
  JSON: "Data & Ops",
  JSONC: "Data & Ops",
  JSON5: "Data & Ops",
  Markdown: "Data & Ops",
};

/**
 * Builds a 2-level hierarchy:
 *   Root ("Languages") -> Domain (Web / Mobile / Systems / Backend / Data & Ops / Other) -> Raw Language.
 */
export function filterLanguagesByDomains(
  stats: RawLanguageStat[],
  includedDomains: readonly IncludedDomain[] = DOMAINS,
): RawLanguageStat[] {
  const included = new Set<IncludedDomain>(includedDomains);
  return stats.filter((stat) => {
    if (stat.bytes <= 0) return false;
    const domain = LANGUAGE_DOMAIN[stat.name] ?? "Other";
    return included.has(domain);
  });
}

export function buildLanguageHierarchy(
  stats: RawLanguageStat[],
  includedDomains: readonly IncludedDomain[] = DOMAINS,
): TreeNode {
  const domains = new Map<string, RawLanguageStat[]>();
  const included = new Set<IncludedDomain>(includedDomains);

  for (const stat of stats) {
    if (stat.bytes <= 0) continue;
    const domainName = LANGUAGE_DOMAIN[stat.name] ?? "Other";
    if (!included.has(domainName)) continue;

    let items = domains.get(domainName);
    if (!items) {
      items = [];
      domains.set(domainName, items);
    }
    items.push(stat);
  }

  const domainChildren: TreeNode[] = [];
  for (const [domainName, items] of domains) {
    const domainColor = DOMAIN_COLORS[domainName as DomainName | "Other"] ?? DOMAIN_COLORS.Other;

    domainChildren.push({
      name: domainName,
      color: domainColor,
      children: items.map((item) => ({
        name: item.name,
        color: item.color || domainColor,
        value: item.bytes,
      })),
    });
  }

  return {
    name: "Languages",
    children: domainChildren,
  };
}

/**
 * Computes exact byte shares and power-scaled (share^0.35 normalized) scores
 * across the 5 canonical engineering domains for radar visualization.
 */
export function computeDomainScores(
  stats: RawLanguageStat[],
  includedDomains: readonly DomainName[] = DOMAINS,
): DomainScore[] {
  const domainBytes = new Map<DomainName, number>();
  for (const domain of includedDomains) {
    domainBytes.set(domain, 0);
  }

  let totalBytes = 0;
  for (const stat of stats) {
    if (stat.bytes <= 0) continue;
    totalBytes += stat.bytes;
    const domain = LANGUAGE_DOMAIN[stat.name];
    if (domain) {
      domainBytes.set(domain, (domainBytes.get(domain) ?? 0) + stat.bytes);
    }
  }

  const rawEntries = includedDomains.map((domain) => {
    const bytes = domainBytes.get(domain) ?? 0;
    const share = totalBytes > 0 ? bytes / totalBytes : 0;
    const raw = share > 0 ? share ** 0.35 : 0;
    return { domain, bytes, share, raw };
  });

  const maxRaw = rawEntries.reduce((max, entry) => Math.max(max, entry.raw), 0);

  return rawEntries.map((entry) => ({
    domain: entry.domain,
    color: DOMAIN_COLORS[entry.domain],
    bytes: entry.bytes,
    share: entry.share,
    score: maxRaw > 0 ? entry.raw / maxRaw : 0,
  }));
}
