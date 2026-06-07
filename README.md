# Judgement Eternal Champions Odds

Odds calculator and combat simulator data pipeline for [Judgement: Eternal Champions](https://www.hallofeternalchampions.com/).

## Setup

1. Clone this repository
2. Run `scripts/setup-cursor-commands.ps1` to link Cursor commands to agent SOPs
3. Place the rulebook PDF at `raw/JEC-RuleBook-2.6_reduced.pdf` (gitignored, not in repo)

## Generate Data

```bash
# Extract full rulebook text
dotnet run --project tools/pdf-extractor

# Distill combat rules for the simulator (Cursor agent task)
# /rules-min-context.sop

# Download hero, monster, and summon stats from HoEC
dotnet run --project tools/hoec-downloader
```

Outputs land in `docs/`:

- `rules-full.md` — full rulebook text extraction
- `rules-min-context.md` — LLM-optimized combat rules subset
- `heroes.md`, `monsters.md`, `summons.md` — collection stats and weapon profiles

## Site

```bash
cd site
npm install
npm run dev
```

Live: https://bashamer.github.io/judgement-eternal-champions-odds/

## Project Layout

- `tools/` — C# batch console apps
- `docs/` — generated machine-readable data
- `site/` — Vue + Vuetify static website (GitHub Pages)
- `agent-sops/` — vendored AI agent workflows

See [AGENTS.md](AGENTS.md) for agent context and [CODEASSIST.md](CODEASSIST.md) for coding constraints.
