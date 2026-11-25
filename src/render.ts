import { type HierarchyNode, pack as d3Pack, treemap as d3Treemap, hierarchy } from "d3-hierarchy";
import { arc as d3Arc } from "d3-shape";
import {
  DOMAINS,
  type DomainName,
  type RawLanguageStat,
  type TreeNode,
  computeDomainScores,
} from "./taxonomy.js";

export type ThemeName = "dark" | "light";
export type LayoutName = "radar" | "bubbles" | "sunburst" | "treemap";
export type LegendName = "languages" | "domains";

export interface RenderOptions {
  theme?: ThemeName;
  hideBorder?: boolean;
  layout?: LayoutName;
  legend?: LegendName;
  domains?: readonly DomainName[];
}

interface ThemePalette {
  bg: string;
  border: string;
  title: string;
  text: string;
  muted: string;
  stroke: string;
  track: string;
  accent: string;
}

const THEMES: Record<ThemeName, ThemePalette> = {
  dark: {
    bg: "#0d1117",
    border: "#30363d",
    title: "#e6edf3",
    text: "#c9d1d9",
    muted: "#8b949e",
    stroke: "#0d1117",
    track: "#21262d",
    accent: "#58a6ff",
  },
  light: {
    bg: "#ffffff",
    border: "#d0d7de",
    title: "#1f2328",
    text: "#24292f",
    muted: "#656d76",
    stroke: "#ffffff",
    track: "#eaeef2",
    accent: "#0969da",
  },
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getDomainSubtext(domainNode: HierarchyNode<TreeNode>): string {
  const langs = domainNode
    .leaves()
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    .slice(0, 4)
    .map((l) => l.data.name);
  const text = langs.join(" · ");
  return text.length > 34 ? `${text.slice(0, 33)}…` : text;
}

function contrastTextColor(hex: string): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return "#ffffff";
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#0d1117" : "#ffffff";
}

function renderEmptySvg(theme: ThemePalette, hideBorder: boolean): string {
  const stroke = hideBorder ? "none" : theme.border;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="540" height="240" viewBox="0 0 540 240">
  <rect x="0.5" y="0.5" width="539" height="239" rx="10" fill="${theme.bg}" stroke="${stroke}"/>
  <text x="270" y="124" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="13" fill="${theme.muted}">No language data found.</text>
</svg>`;
}

function renderDomainLegend(
  domains: HierarchyNode<TreeNode>[],
  totalBytes: number,
  theme: ThemePalette,
  height: number,
): string {
  const topDomains = domains.slice(0, 5);
  const legendStartY = Math.max(32, Math.round((height - topDomains.length * 38) / 2) + 18);

  return topDomains
    .map((d, i) => {
      const y = legendStartY + i * 38;
      const pct = (((d.value ?? 0) / totalBytes) * 100).toFixed(1);
      const delay = (0.15 + i * 0.09).toFixed(2);
      const sub = getDomainSubtext(d);
      return `<g transform="translate(274, ${y})"><g class="row" style="animation-delay:${delay}s">
      <rect width="10" height="10" rx="3" y="-9" fill="${d.data.color ?? "#6e7681"}"/>
      <text x="18" y="0" font-size="12.5" font-weight="600" fill="${theme.text}">${escapeXml(d.data.name)}</text>
      <text x="242" y="0" text-anchor="end" font-size="12.5" font-weight="600" fill="${theme.title}">${pct}%</text>
      <text x="18" y="14" font-size="10.5" fill="${theme.muted}">${escapeXml(sub)}</text>
    </g></g>`;
    })
    .join("\n  ");
}

function renderLanguageLegend(
  languages: Array<{ name: string; bytes: number; color: string }>,
  totalBytes: number,
  theme: ThemePalette,
  height: number,
): string {
  const topLanguages = languages.slice(0, 6);
  const legendStartY = Math.max(32, Math.round((height - topLanguages.length * 38) / 2) + 18);

  return topLanguages
    .map((language, i) => {
      const y = legendStartY + i * 38;
      const pct = ((language.bytes / totalBytes) * 100).toFixed(1);
      const delay = (0.15 + i * 0.09).toFixed(2);
      return `<g transform="translate(274, ${y})"><g class="row" style="animation-delay:${delay}s">
      <rect width="10" height="10" rx="3" y="-9" fill="${language.color || "#6e7681"}"/>
      <text x="18" y="0" font-size="12.5" font-weight="600" fill="${theme.text}">${escapeXml(language.name)}</text>
      <text x="242" y="0" text-anchor="end" font-size="12.5" font-weight="600" fill="${theme.title}">${pct}%</text>
    </g></g>`;
    })
    .join("\n  ");
}

function renderRadarSvg(
  rawStats: RawLanguageStat[],
  theme: ThemePalette,
  hideBorder: boolean,
  legend: LegendName = "languages",
  domains: readonly DomainName[] = DOMAINS,
): string {
  const totalBytes = rawStats.reduce((sum, s) => sum + Math.max(0, s.bytes), 0);
  if (totalBytes === 0) {
    return renderEmptySvg(theme, hideBorder);
  }

  const width = 540;
  const height = 240;
  const cx = 160;
  const cy = 126;
  const R = 72;
  const stroke = hideBorder ? "none" : theme.border;
  const scores = computeDomainScores(rawStats, domains);

  const axisAngles = scores.map((_, i) => -Math.PI / 2 + (i * 2 * Math.PI) / 5);

  const webRings = [0.25, 0.5, 0.75, 1.0]
    .map((scale) => {
      const pts = axisAngles
        .map(
          (a) => `${(Math.cos(a) * R * scale).toFixed(1)},${(Math.sin(a) * R * scale).toFixed(1)}`,
        )
        .join(" ");
      return `<polygon points="${pts}" fill="none" stroke="${theme.border}" stroke-width="0.9"/>`;
    })
    .join("\n    ");

  const spokes = axisAngles
    .map((a) => {
      const x2 = (Math.cos(a) * R).toFixed(1);
      const y2 = (Math.sin(a) * R).toFixed(1);
      return `<line x1="0" y1="0" x2="${x2}" y2="${y2}" stroke="${theme.border}" stroke-opacity="0.6" stroke-width="0.9"/>`;
    })
    .join("\n    ");

  const axisLabels = scores
    .map((s, i) => {
      const a = axisAngles[i];
      let x = 0;
      let y = 0;
      let anchor = "middle";

      if (i === 0) {
        x = 0;
        y = -(R + 12);
        anchor = "middle";
      } else if (i === 1) {
        x = Math.cos(a) * R + 8;
        y = Math.sin(a) * R + 3;
        anchor = "start";
      } else if (i === 2) {
        x = Math.cos(a) * R + 8;
        y = Math.sin(a) * R + 12;
        anchor = "start";
      } else if (i === 3) {
        x = Math.cos(a) * R - 8;
        y = Math.sin(a) * R + 12;
        anchor = "end";
      } else {
        x = Math.cos(a) * R - 8;
        y = Math.sin(a) * R + 3;
        anchor = "end";
      }

      return `<text class="axis-label" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" font-size="11" font-weight="600" fill="${theme.text}">${escapeXml(s.domain)}</text>`;
    })
    .join("\n    ");

  const vertices = scores.map((s, i) => {
    const a = axisAngles[i];
    const r = (s.score > 0 ? Math.max(s.score, 0.12) : 0.06) * R;
    return {
      x: Math.cos(a) * r,
      y: Math.sin(a) * r,
      stat: s,
    };
  });

  const polyPoints = vertices.map((v) => `${v.x.toFixed(1)},${v.y.toFixed(1)}`).join(" ");

  const dots = vertices
    .map((v, i) => {
      const pct = (v.stat.share * 100).toFixed(1);
      const delay = (0.28 + i * 0.06).toFixed(2);
      return `<circle class="dot" style="animation-delay:${delay}s" cx="${v.x.toFixed(1)}" cy="${v.y.toFixed(1)}" r="4" fill="${v.stat.color}" stroke="${theme.bg}" stroke-width="1.5"><title>${escapeXml(v.stat.domain)}: ${pct}%</title></circle>`;
    })
    .join("\n    ");

  const legendEntries =
    legend === "domains"
      ? [...scores]
          .filter((score) => score.bytes > 0)
          .sort((a, b) => b.bytes - a.bytes)
          .slice(0, 6)
          .map((score) => ({
            name: score.domain,
            bytes: score.bytes,
            color: score.color,
          }))
      : [...rawStats]
          .filter((stat) => stat.bytes > 0)
          .sort((a, b) => b.bytes - a.bytes)
          .slice(0, 6)
          .map((stat) => ({
            name: stat.name,
            bytes: stat.bytes,
            color: stat.color || "#6e7681",
          }));

  const startY = Math.round((height - (legendEntries.length - 1) * 28) / 2) + 4;
  const langRows = legendEntries
    .map((entry, i) => {
      const y = startY + i * 28;
      const pct = ((entry.bytes / totalBytes) * 100).toFixed(1);
      const delay = (0.14 + i * 0.07).toFixed(2);
      return `<g transform="translate(304, ${y})"><g class="row" style="animation-delay:${delay}s">
      <circle cx="5" cy="-4" r="4.5" fill="${entry.color}"/>
      <text x="17" y="0" font-size="12" font-weight="600" fill="${theme.text}">${escapeXml(entry.name)}</text>
      <text x="212" y="0" text-anchor="end" font-size="12" font-weight="600" fill="${theme.title}">${pct}%</text>
    </g></g>`;
    })
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    text { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }
    @keyframes fadein {
      from { opacity: 0; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes radarpop {
      from { opacity: 0; transform: scale(0.15); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes dotpop {
      from { opacity: 0; transform: scale(0.2); }
      to { opacity: 1; transform: scale(1); }
    }
    .row { opacity: 0; animation: fadein 0.45s ease forwards; }
    .axis-label { opacity: 0; animation: fadein 0.5s ease 0.1s forwards; }
    .radar-poly { opacity: 0; transform-origin: 0px 0px; animation: radarpop 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.12s forwards; }
    .dot { opacity: 0; transform-box: fill-box; transform-origin: center; animation: dotpop 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
  </style>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="10" fill="${theme.bg}" stroke="${stroke}"/>
  <g transform="translate(${cx}, ${cy})">
    ${webRings}
    ${spokes}
    <polygon class="radar-poly" points="${polyPoints}" fill="${theme.accent}" fill-opacity="0.26" stroke="${theme.accent}" stroke-width="2" stroke-linejoin="round"/>
    ${dots}
    ${axisLabels}
  </g>
  ${langRows}
</svg>`;
}

function renderBubblesSvg(
  rootData: TreeNode,
  rawStats: RawLanguageStat[],
  theme: ThemePalette,
  hideBorder: boolean,
  legend: LegendName,
): string {
  const width = 540;
  const height = 240;
  const stroke = hideBorder ? "none" : theme.border;

  const root = hierarchy<TreeNode>(rootData)
    .sum((d) => d.value ?? 0)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  const totalBytes = root.value ?? 0;
  if (totalBytes === 0) {
    return renderEmptySvg(theme, hideBorder);
  }

  const packed = d3Pack<TreeNode>().size([212, 212]).padding(4)(root);

  const domainCircles = (packed.children ?? [])
    .map((d, i) => {
      const color = d.data.color ?? "#6e7681";
      const pct = (((d.value ?? 0) / totalBytes) * 100).toFixed(1);
      const delay = (0.08 + i * 0.06).toFixed(2);
      return `<circle class="bubble" style="animation-delay:${delay}s" cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="${d.r.toFixed(1)}" fill="${color}" fill-opacity="0.13" stroke="${color}" stroke-opacity="0.48" stroke-width="1.2"><title>${escapeXml(d.data.name)}: ${pct}%</title></circle>`;
    })
    .join("\n    ");

  const leafBubbles = packed
    .leaves()
    .map((d, i) => {
      if (d.r < 1.5) return "";
      const color = d.data.color ?? "#6e7681";
      const pct = (((d.value ?? 0) / totalBytes) * 100).toFixed(1);
      const delay = (0.16 + Math.min(i * 0.03, 0.35)).toFixed(2);
      const fg = contrastTextColor(color);
      const showName = d.r >= 17;
      const showPct = d.r >= 26;
      const fontSize = d.r >= 34 ? 11 : 9.5;
      const maxChars = Math.max(3, Math.floor((d.r * 1.65) / (fontSize * 0.6)));
      const label =
        d.data.name.length > maxChars ? `${d.data.name.slice(0, maxChars - 1)}…` : d.data.name;
      const nameY = showPct ? -3 : 3.5;

      return `<g transform="translate(${d.x.toFixed(1)}, ${d.y.toFixed(1)})"><g class="bubble" style="animation-delay:${delay}s">
      <title>${escapeXml(d.data.name)}: ${pct}%</title>
      <circle cx="0" cy="0" r="${d.r.toFixed(1)}" fill="${color}" fill-opacity="0.92"/>
      ${showName ? `<text x="0" y="${nameY}" text-anchor="middle" font-size="${fontSize}" font-weight="700" fill="${fg}">${escapeXml(label)}</text>` : ""}
      ${showPct ? `<text x="0" y="10" text-anchor="middle" font-size="9" font-weight="600" fill="${fg}" fill-opacity="0.84">${pct}%</text>` : ""}
    </g></g>`;
    })
    .join("\n    ");

  const legendMarkup =
    legend === "languages"
      ? renderLanguageLegend(
          [...rawStats]
            .filter((stat) => stat.bytes > 0)
            .sort((a, b) => b.bytes - a.bytes)
            .map((stat) => ({
              name: stat.name,
              bytes: stat.bytes,
              color: stat.color || "#6e7681",
            })),
          totalBytes,
          theme,
          height,
        )
      : renderDomainLegend(packed.children ?? [], totalBytes, theme, height);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    text { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }
    @keyframes fadein {
      from { opacity: 0; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes bubblepop {
      from { opacity: 0; transform: scale(0.5); }
      to { opacity: 1; transform: scale(1); }
    }
    .row { opacity: 0; animation: fadein 0.5s ease forwards; }
    .bubble { opacity: 0; transform-box: fill-box; transform-origin: center; animation: bubblepop 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
  </style>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="10" fill="${theme.bg}" stroke="${stroke}"/>
  <g transform="translate(24, 14)">
    ${domainCircles}
    ${leafBubbles}
  </g>
  ${legendMarkup}
</svg>`;
}

function renderTreemapSvg(rootData: TreeNode, theme: ThemePalette, hideBorder: boolean): string {
  const width = 540;
  const height = 240;
  const padX = 18;
  const padY = 18;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const stroke = hideBorder ? "none" : theme.border;

  const rawRoot = hierarchy<TreeNode>(rootData);
  const totalRawBytes = rawRoot
    .leaves()
    .reduce((sum, leaf) => sum + Math.max(0, leaf.data.value ?? 0), 0);
  if (totalRawBytes === 0) {
    return renderEmptySvg(theme, hideBorder);
  }

  const root = rawRoot
    .sum((d) => (!d.children && d.value && d.value > 0 ? d.value ** 0.72 : 0))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  const laidOut = d3Treemap<TreeNode>()
    .size([innerW, innerH])
    .paddingLeft(4)
    .paddingRight(4)
    .paddingBottom(4)
    .paddingInner(3)
    .paddingTop((d) => (d.depth === 1 ? (d.y1 - d.y0 >= 36 ? 19 : 4) : 0))
    .round(true)(root);

  const domainBoxes = (laidOut.children ?? [])
    .map((d, i) => {
      const w = d.x1 - d.x0;
      const h = d.y1 - d.y0;
      if (w < 12 || h < 18) return "";
      const domainRawBytes = d
        .leaves()
        .reduce((sum, leaf) => sum + Math.max(0, leaf.data.value ?? 0), 0);
      const pct = ((domainRawBytes / totalRawBytes) * 100).toFixed(1);
      const delay = (0.08 + i * 0.06).toFixed(2);
      const showHeader = h >= 36 && w >= 42;
      let headerLabel = "";
      if (showHeader) {
        if (w >= 104) {
          headerLabel = `${d.data.name} ${pct}%`;
        } else {
          const maxChars = Math.max(3, Math.floor((w - 20) / 6.2));
          headerLabel =
            d.data.name.length > maxChars ? `${d.data.name.slice(0, maxChars - 1)}…` : d.data.name;
        }
      }
      const dotColor = d.data.color ?? "#6e7681";
      return `<g class="tile" style="animation-delay:${delay}s">
      <rect x="${d.x0}" y="${d.y0}" width="${w}" height="${h}" rx="6" fill="${theme.track}" stroke="${theme.border}" stroke-width="0.8"/>
      ${showHeader ? `<circle cx="${d.x0 + 9}" cy="${d.y0 + 10}" r="3" fill="${dotColor}"/><text x="${d.x0 + 16}" y="${d.y0 + 13.5}" font-size="10.5" font-weight="700" fill="${theme.muted}">${escapeXml(headerLabel)}</text>` : ""}
    </g>`;
    })
    .join("\n    ");

  const leafBoxes = laidOut
    .leaves()
    .map((d, i) => {
      const w = d.x1 - d.x0;
      const h = d.y1 - d.y0;
      if (w < 2 || h < 2) return "";
      const color = d.data.color ?? "#6e7681";
      const pct = (((d.data.value ?? 0) / totalRawBytes) * 100).toFixed(1);
      const delay = (0.14 + Math.min(i * 0.03, 0.35)).toFixed(2);
      const fg = contrastTextColor(color);
      const showName = w >= 32 && h >= 18;
      const showPct = w >= 38 && h >= 30;
      const fontSize = w >= 72 ? 11 : 9.5;
      const maxChars = Math.max(2, Math.floor((w - 8) / (fontSize * 0.56)));
      const name =
        d.data.name.length > maxChars ? `${d.data.name.slice(0, maxChars - 1)}…` : d.data.name;
      const nameY = d.y0 + (fontSize === 11 ? 15 : 13);

      return `<g class="tile" style="animation-delay:${delay}s">
      <title>${escapeXml(d.data.name)}: ${pct}%</title>
      <rect x="${d.x0}" y="${d.y0}" width="${w}" height="${h}" rx="4" fill="${color}" fill-opacity="0.92"/>
      ${showName ? `<text x="${d.x0 + 5}" y="${nameY}" font-size="${fontSize}" font-weight="700" fill="${fg}">${escapeXml(name)}</text>` : ""}
      ${showPct ? `<text x="${d.x0 + 5}" y="${d.y0 + 27}" font-size="10" font-weight="600" fill="${fg}" fill-opacity="0.82">${pct}%</text>` : ""}
    </g>`;
    })
    .join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    text { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }
    @keyframes tilepop {
      from { opacity: 0; transform: scale(0.94); }
      to { opacity: 1; transform: scale(1); }
    }
    .tile { opacity: 0; transform-box: fill-box; transform-origin: center; animation: tilepop 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
  </style>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="10" fill="${theme.bg}" stroke="${stroke}"/>
  <g transform="translate(${padX}, ${padY})">
    ${domainBoxes}
    ${leafBoxes}
  </g>
</svg>`;
}

/**
 * Renders an animated SVG of GitHub language stats across 5 descriptive domains.
 */
export function renderLanguageChartSvg(
  rootData: TreeNode,
  rawStats: RawLanguageStat[],
  options: RenderOptions = {},
): string {
  const theme = THEMES[options.theme ?? "dark"] ?? THEMES.dark;
  const hideBorder = options.hideBorder ?? false;
  const layout = options.layout ?? "sunburst";
  const legend = options.legend ?? "languages";
  const domains = options.domains ?? DOMAINS;

  if (layout === "radar") {
    return renderRadarSvg(rawStats, theme, hideBorder, legend, domains);
  }
  if (layout === "bubbles") {
    return renderBubblesSvg(rootData, rawStats, theme, hideBorder, legend);
  }
  if (layout === "treemap") {
    return renderTreemapSvg(rootData, theme, hideBorder);
  }

  const root = hierarchy<TreeNode>(rootData).sum((d) => d.value ?? 0);

  const totalBytes = root.value ?? 0;
  if (totalBytes === 0) {
    return renderEmptySvg(theme, hideBorder);
  }

  const domainOrder: readonly string[] = [...DOMAINS, "Other"];
  const domainMap = new Map((root.children ?? []).map((node) => [node.data.name, node]));
  const activeDomains = domainOrder
    .map((name) => domainMap.get(name))
    .filter((node): node is HierarchyNode<TreeNode> => Boolean(node && (node.value ?? 0) > 0));

  if (activeDomains.length === 0) {
    return renderEmptySvg(theme, hideBorder);
  }

  const maxDomainPower = Math.max(
    ...activeDomains.map((d) => ((d.value ?? 0) / totalBytes) ** 0.35),
  );

  const allLeaves = activeDomains.flatMap((d) =>
    (d.children ?? []).filter((leaf) => (leaf.value ?? 0) > 0),
  );
  const maxLangPower =
    allLeaves.length > 0
      ? Math.max(...allLeaves.map((l) => ((l.value ?? 0) / totalBytes) ** 0.35))
      : 0;

  const width = 540;
  const height = 240;
  const cx = 136;
  const cy = 120;
  const rHub = 20;
  const stroke = hideBorder ? "none" : theme.border;

  const sectorSpan = (2 * Math.PI) / activeDomains.length;
  const domainGap = activeDomains.length > 1 ? 0.045 : 0;

  interface ArcDatum {
    startAngle: number;
    endAngle: number;
    innerRadius: number;
    outerRadius: number;
  }
  const arcGen = d3Arc<ArcDatum>().cornerRadius(3);

  const guideCircles = [54, 82, 110]
    .map(
      (r) =>
        `<circle cx="0" cy="0" r="${r}" fill="none" stroke="${theme.border}" stroke-opacity="0.4" stroke-dasharray="2 3" stroke-width="0.9"/>`,
    )
    .join("\n    ");

  const dividerLines =
    activeDomains.length > 1
      ? activeDomains
          .map((_, idx) => {
            const a = idx * sectorSpan;
            const x1 = (Math.sin(a) * rHub).toFixed(1);
            const y1 = (-Math.cos(a) * rHub).toFixed(1);
            const x2 = (Math.sin(a) * 110).toFixed(1);
            const y2 = (-Math.cos(a) * 110).toFixed(1);
            return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${theme.border}" stroke-opacity="0.45" stroke-width="0.9"/>`;
          })
          .join("\n    ")
      : "";

  const domainPaths: string[] = [];
  const petalPaths: string[] = [];

  for (let domainIdx = 0; domainIdx < activeDomains.length; domainIdx++) {
    const d = activeDomains[domainIdx];
    const startAngle = domainIdx * sectorSpan + domainGap / 2;
    const endAngle = (domainIdx + 1) * sectorSpan - domainGap / 2;
    const domainColor = d.data.color ?? "#6e7681";
    const domainValue = d.value ?? 0;
    const domainShare = domainValue / totalBytes;
    const domainNorm = maxDomainPower > 0 ? domainShare ** 0.35 / maxDomainPower : 0;
    const rDomain = 34 + domainNorm * 18;

    const domainArc = arcGen({
      startAngle,
      endAngle,
      innerRadius: rHub,
      outerRadius: rDomain,
    });
    if (domainArc) {
      const pct = (domainShare * 100).toFixed(1);
      const delay = (0.08 + domainIdx * 0.06).toFixed(2);
      domainPaths.push(
        `<path class="arc" style="animation-delay:${delay}s" d="${domainArc}" fill="${domainColor}" fill-opacity="0.9" stroke="${theme.stroke}" stroke-width="1.2"><title>${escapeXml(d.data.name)}: ${pct}%</title></path>`,
      );
    }

    const sortedLeaves = (d.children ?? [])
      .filter((leaf) => (leaf.value ?? 0) > 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    interface SubItem {
      name: string;
      color: string;
      value: number;
    }

    const subItems: SubItem[] =
      sortedLeaves.length > 6
        ? [
            ...sortedLeaves.slice(0, 5).map((leaf) => ({
              name: leaf.data.name,
              color: leaf.data.color ?? domainColor,
              value: leaf.value ?? 0,
            })),
            {
              name: "Other",
              color: domainColor,
              value: sortedLeaves.slice(5).reduce((sum, leaf) => sum + (leaf.value ?? 0), 0),
            },
          ]
        : sortedLeaves.map((leaf) => ({
            name: leaf.data.name,
            color: leaf.data.color ?? domainColor,
            value: leaf.value ?? 0,
          }));

    if (subItems.length === 0) continue;

    const subSpan = (endAngle - startAngle) / subItems.length;
    const langGap = subItems.length > 1 ? Math.min(0.018, subSpan * 0.14) : 0;

    for (let langIdx = 0; langIdx < subItems.length; langIdx++) {
      const item = subItems[langIdx];
      const lStart = startAngle + langIdx * subSpan + langGap / 2;
      const lEnd = startAngle + (langIdx + 1) * subSpan - langGap / 2;
      const rLangInner = rDomain + 2;
      const langShare = item.value / totalBytes;
      const langNorm = Math.min(1, maxLangPower > 0 ? langShare ** 0.35 / maxLangPower : 0);
      const rLangOuter = rLangInner + 8 + langNorm * 48;

      const petalArc = arcGen({
        startAngle: lStart,
        endAngle: lEnd,
        innerRadius: rLangInner,
        outerRadius: rLangOuter,
      });
      if (petalArc) {
        const pct = (langShare * 100).toFixed(1);
        const delay = (0.22 + domainIdx * 0.06 + langIdx * 0.03).toFixed(2);
        petalPaths.push(
          `<path class="petal" style="animation-delay:${delay}s" d="${petalArc}" fill="${item.color}" fill-opacity="0.95" stroke="${theme.stroke}" stroke-width="1.1"><title>${escapeXml(item.name)}: ${pct}%</title></path>`,
        );
      }
    }
  }

  const sortedLegendDomains = [...activeDomains].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const legendMarkup =
    legend === "languages"
      ? renderLanguageLegend(
          [...rawStats]
            .filter((stat) => stat.bytes > 0)
            .sort((a, b) => b.bytes - a.bytes)
            .map((stat) => ({
              name: stat.name,
              bytes: stat.bytes,
              color: stat.color || "#6e7681",
            })),
          totalBytes,
          theme,
          height,
        )
      : renderDomainLegend(sortedLegendDomains, totalBytes, theme, height);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    text { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }
    @keyframes fadein {
      from { opacity: 0; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes arcpop {
      from { opacity: 0; transform: scale(0.25); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes petalpop {
      from { opacity: 0; transform: scale(0.45); }
      to { opacity: 1; transform: scale(1); }
    }
    .row { opacity: 0; animation: fadein 0.5s ease forwards; }
    .arc { opacity: 0; transform-origin: 0px 0px; animation: arcpop 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
    .petal { opacity: 0; transform-origin: 0px 0px; animation: petalpop 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
  </style>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="10" fill="${theme.bg}" stroke="${stroke}"/>
  <g transform="translate(${cx}, ${cy})">
    ${guideCircles}
    ${dividerLines}
    ${domainPaths.join("\n    ")}
    ${petalPaths.join("\n    ")}
  </g>
  ${legendMarkup}
</svg>`;
}
