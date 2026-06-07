# AGENTS.md — Judgement Eternal Champions Odds

## Project Overview

This repository builds an odds calculator for [Judgement: Eternal Champions](https://www.hallofeternalchampions.com/). It combines:

- **Batch C# console apps** under `tools/` for downloading and parsing game data
- **Generated markdown docs** under `docs/` consumed by agents and the future simulator
- **Static website** under `site/` (Vue + Vuetify, deployed to GitHub Pages)

## Directory Layout

| Path | Purpose |
|------|---------|
| `tools/pdf-extractor` | Extract rulebook text from local PDF into `docs/rules-full.md` |
| `tools/hoec-downloader` | Download hero, monster, and summon stats from HoEC into `docs/*.md` |
| `docs/` | Machine-readable generated data (rules, heroes, monsters, summons) |
| `site/` | Vue + Vuetify static site (GitHub Pages) |
| `agent-sops/` | Vendored Agent SOPs; `.cursor/commands` junction points here |
| `raw/` | Local-only source PDFs (**gitignored**) |

## Coding Workflow

Use `/code-assist.sop` in Cursor for all coding tasks. See [CODEASSIST.md](CODEASSIST.md) for project-specific constraints.

## Site Development

```bash
cd site
npm install
npm run dev
npm run build
```

Live site: https://bashamer.github.io/judgement-eternal-champions-odds/

Pushes to `main` deploy automatically via [`.github/workflows/pages.yml`](.github/workflows/pages.yml).

## Build and Run

```bash
# Extract rules from PDF (requires raw/JEC-RuleBook-2.6_reduced.pdf locally)
dotnet run --project tools/pdf-extractor

# Distill rules for simulator (agent task)
# Run /rules-min-context.sop in Cursor after pdf-extractor

# Download HoEC collection data
dotnet run --project tools/hoec-downloader
```

## Data Refresh Workflow

1. Place updated rulebook PDF in `raw/`
2. Run `pdf-extractor` → `docs/rules-full.md`
3. Run `/rules-min-context.sop` → `docs/rules-min-context.md`
4. Run `hoec-downloader` → `docs/heroes.md`, `docs/monsters.md`, `docs/summons.md`

## Conventions

- Target .NET 8 for all console apps
- Console apps resolve repo root and write outputs to `docs/`
- Exit non-zero on failure; log progress to stdout
- Do not commit files under `raw/` or `.agents/scratchpad/`
