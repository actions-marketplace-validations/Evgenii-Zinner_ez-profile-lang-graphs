# ez-profile-lang-graphs

[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-ea4aaa?style=for-the-badge&logo=github-sponsors&logoColor=white)](https://github.com/sponsors/Evgenii-Zinner)

A reusable GitHub Action that groups your GitHub repository languages into **5 descriptive engineering domains** (`Web`, `Mobile`, `Systems`, `Backend`, `Data & Ops`) and generates animated SVG charts straight in your profile repository—**$0 hosting, zero expiring Cloudflare/Vercel infrastructure**.

<table>
  <tr>
    <td align="center">
      <b>Radial Sunburst</b> (<code>sunburst</code>)<br/>
      <img src="./assets/sunburst.svg" alt="Radial Sunburst" width="440" />
    </td>
    <td align="center">
      <b>Radar / Spider</b> (<code>radar</code> / <code>spider</code>)<br/>
      <img src="./assets/radar.svg" alt="Radar Chart" width="440" />
    </td>
  </tr>
  <tr>
    <td align="center">
      <b>Packed Bubbles</b> (<code>bubbles</code>)<br/>
      <img src="./assets/bubbles.svg" alt="Packed Bubbles" width="440" />
    </td>
    <td align="center">
      <b>Treemap</b> (<code>treemap</code>)<br/>
      <img src="./assets/treemap.svg" alt="Treemap" width="440" />
    </td>
  </tr>
</table>

## Quick Start

1. Create `.github/workflows/update-langs.yml` in your profile repo (`<username>/<username>`):

```yaml
name: Update Top Languages

on:
  schedule:
    - cron: "0 6 * * 1"
  workflow_dispatch:

permissions:
  contents: write

jobs:
  update-langs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate top-langs.svg
        uses: Evgenii-Zinner/ez-profile-lang-graphs@v1
        with:
          username: ${{ github.repository_owner }}
          token: ${{ secrets.GITHUB_TOKEN }}
          layout: sunburst
          theme: dark
          hide_border: true
          domains: Web, Backend, Data & Ops
          legend: languages
          output: top-langs.svg

      - name: Commit updated SVG if changed
        run: |
          if ! git diff --quiet top-langs.svg; then
            git config user.name "github-actions[bot]"
            git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
            git add top-langs.svg
            git commit -m "chore: update top-langs.svg"
            git push
          fi
```

2. Run the workflow once from the **Actions** tab (or trigger via `gh workflow run update-langs.yml`), then embed the generated SVG in your `README.md`:

```markdown
![Top Languages](./top-langs.svg)
```

<details>
<summary>Auto-switching dark & light themes in README</summary>

Generate both `top-langs-dark.svg` (`theme: dark`) and `top-langs-light.svg` (`theme: light`) in your workflow, then use `<picture>`:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./top-langs-dark.svg" />
  <source media="(prefers-color-scheme: light)" srcset="./top-langs-light.svg" />
  <img alt="Top Languages" src="./top-langs-dark.svg" />
</picture>
```

</details>

## Action Inputs

| Input | Description | Default |
| :--- | :--- | :--- |
| `username` | GitHub username to analyze | Repository owner (`github.repository_owner`) |
| `token` | GitHub token for GraphQL API | `${{ secrets.GITHUB_TOKEN }}` (via env) |
| `layout` | `sunburst`, `radar` (or `spider`), `bubbles`, `treemap` | `sunburst` |
| `theme` | `dark` or `light` | `dark` |
| `hide_border` | Hide outer card border (`true` / `false`) | `true` |
| `include_private` | Include private repositories (`true` / `false`) | `false` |
| `domains` | Comma-separated domains to include: `Web`, `Mobile`, `Systems`, `Backend`, `Data & Ops`, `Other` | All 5 canonical domains; `Other` excluded |
| `legend` | Legend entries: `languages` or `domains` | `languages` |
| `output` | Output SVG file path | `top-langs.svg` |

## Domains

Languages returned by GitHub's GraphQL API (non-fork, non-archived repositories you own) are mapped into 5 engineering domains (with fallback to `Other`):

* **Web:** TypeScript, TSX, JavaScript, JSX, HTML, CSS, SCSS, Sass, Less, Astro, Vue, Svelte, MDX, WebAssembly
* **Mobile:** Dart, Swift, Kotlin, Objective-C, Objective-C++
* **Systems:** Rust, C, C++, Zig, Assembly, CMake, Makefile, GLSL, HLSL, WGSL, ShaderLab, CUDA
* **Backend:** Go, Java, Scala, C#, F#, Ruby, PHP, Elixir, Erlang, SQL, PLpgSQL, Haskell, Clojure
* **Data & Ops:** Python, Jupyter Notebook, R, Julia, Shell, PowerShell, Dockerfile, HCL, Nix, YAML, TOML, JSON, Markdown

## Including Private Repositories

The built-in `GITHUB_TOKEN` only sees public repositories. To include private repositories in your aggregated byte stats:

1. Create a fine-grained [Personal Access Token](https://github.com/settings/tokens?type=beta) with read-only access to all repositories (**Metadata: Read-only**).
2. Save it in your profile repository secrets as `GH_STATS_TOKEN`.
3. Update your workflow step to pass `token: ${{ secrets.GH_STATS_TOKEN || secrets.GITHUB_TOKEN }}` and `include_private: true`.

## Local Development (Bun + Biome)

```bash
bun install
bun run build       # bundles dist/action.mjs for Node 24
bun run check       # runs Biome lint & format check
bun run typecheck   # runs TypeScript check
```

## License

[MIT](LICENSE)
