# CODEASSIST.md — Project Constraints for Code Assist SOP

## Workflow

- Use `/code-assist.sop` for all coding tasks in this repository
- Follow TDD where practical; at minimum validate builds after changes

## Project Structure

- .NET 8 console apps live under `tools/`
- Generated docs live under `docs/`
- Static site will live under `site/` (placeholder)
- `raw/` is gitignored — never reference committed paths under `raw/`

## Build Commands

```bash
dotnet build JudgementOdds.slnx
dotnet run --project tools/pdf-extractor
dotnet run --project tools/hoec-downloader
```

## Code Conventions

- Match existing C# style in each project
- Use `System.Text.Json` with `[JsonPropertyName]` for snake_case API fields
- Resolve repo root by walking up from assembly location to find `.git` or solution root
- Write machine-readable markdown with YAML frontmatter for generated docs
- Keep console apps focused — no over-abstraction

## Testing

- Run `dotnet build` after changes
- Run the relevant tool and verify output files in `docs/`

## Do Not

- Commit secrets, `.env`, or files under `raw/`
- Add unnecessary dependencies
- Parse ability descriptions in hoec-downloader (stats and weapons only)
