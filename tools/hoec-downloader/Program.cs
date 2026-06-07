using HoecDownloader.Models;
using HoecDownloader.Services;
using HoecDownloader.Writers;

bool heroesOnly = args.Contains("--heroes-only");
bool monstersOnly = args.Contains("--monsters-only");
bool summonsOnly = args.Contains("--summons-only");
bool artefactsOnly = args.Contains("--artefacts-only");

bool downloadAll = !heroesOnly && !monstersOnly && !summonsOnly && !artefactsOnly;
bool downloadHeroes = downloadAll || heroesOnly;
bool downloadMonsters = downloadAll || monstersOnly;
bool downloadSummons = downloadAll || summonsOnly;
bool downloadArtefacts = downloadAll || artefactsOnly;

string outputDir = GetArgValue(args, "--output-dir") ?? Path.Combine(FindRepoRoot(), "docs");
Directory.CreateDirectory(outputDir);

using var client = new HoecClient();

if (downloadHeroes)
{
    Console.WriteLine("Downloading heroes...");
    List<HeroDetail> heroes = await DownloadHeroesAsync(client);
    string path = Path.Combine(outputDir, "heroes.md");
    await File.WriteAllTextAsync(path, MarkdownWriters.WriteHeroes(heroes));
    Console.WriteLine($"Wrote {heroes.Count} heroes to {path}");
}

if (downloadMonsters)
{
    Console.WriteLine("Downloading monsters...");
    List<MonsterDetail> monsters = await DownloadMonstersAsync(client);
    string path = Path.Combine(outputDir, "monsters.md");
    await File.WriteAllTextAsync(path, MarkdownWriters.WriteMonsters(monsters));
    Console.WriteLine($"Wrote {monsters.Count} monsters to {path}");
}

if (downloadSummons)
{
    Console.WriteLine("Downloading summons...");
    List<SummonDetail> summons = await DownloadSummonsAsync(client);
    string path = Path.Combine(outputDir, "summons.md");
    await File.WriteAllTextAsync(path, MarkdownWriters.WriteSummons(summons));
    Console.WriteLine($"Wrote {summons.Count} summons to {path}");
}

if (downloadArtefacts)
{
    Console.WriteLine("Downloading artefacts...");
    List<ArtefactSummary>? artefacts = await client.GetApiAsync<List<ArtefactSummary>>("/api/artefacts");
    if (artefacts is null || artefacts.Count == 0)
    {
        throw new InvalidOperationException("No artefacts returned from /api/artefacts.");
    }

    string path = Path.Combine(outputDir, "artefacts.md");
    await File.WriteAllTextAsync(path, MarkdownWriters.WriteArtefacts(artefacts));
    Console.WriteLine($"Wrote {artefacts.Count} artefacts to {path}");
}

return 0;

static async Task<List<HeroDetail>> DownloadHeroesAsync(HoecClient client)
{
    List<HeroSummary>? summaries = await client.GetApiAsync<List<HeroSummary>>("/api/heroes");
    if (summaries is null || summaries.Count == 0)
    {
        throw new InvalidOperationException("No heroes returned from /api/heroes.");
    }

    var heroes = new List<HeroDetail>();
    foreach (HeroSummary summary in summaries.OrderBy(s => s.Slug, StringComparer.OrdinalIgnoreCase))
    {
        HeroDetail? detail = await client.GetRscEntityAsync<HeroDetail>($"/heroes/{summary.Slug}", "hero");
        if (detail is null)
        {
            throw new InvalidOperationException($"Failed to deserialize hero '{summary.Slug}'.");
        }

        heroes.Add(detail);
        Console.WriteLine($"  hero: {detail.Name}");
        await client.DelayBetweenRequestsAsync();
    }

    return heroes;
}

static async Task<List<MonsterDetail>> DownloadMonstersAsync(HoecClient client)
{
    IReadOnlyList<string> slugs = await client.DiscoverSlugsFromListPageAsync("/monsters", "monsters");
    if (slugs.Count == 0)
    {
        throw new InvalidOperationException("No monster slugs discovered from /monsters.");
    }

    var monsters = new List<MonsterDetail>();
    foreach (string slug in slugs)
    {
        MonsterDetail? detail = await client.GetRscEntityAsync<MonsterDetail>($"/monsters/{slug}", "monster");
        if (detail is null)
        {
            throw new InvalidOperationException($"Failed to deserialize monster '{slug}'.");
        }

        monsters.Add(detail);
        Console.WriteLine($"  monster: {detail.Name}");
        await client.DelayBetweenRequestsAsync();
    }

    return monsters;
}

static async Task<List<SummonDetail>> DownloadSummonsAsync(HoecClient client)
{
    IReadOnlyList<string> slugs = await client.DiscoverSlugsFromListPageAsync("/summons", "summons");
    if (slugs.Count == 0)
    {
        throw new InvalidOperationException("No summon slugs discovered from /summons.");
    }

    var summons = new List<SummonDetail>();
    foreach (string slug in slugs)
    {
        SummonDetail? detail = await client.GetRscEntityAsync<SummonDetail>($"/summons/{slug}", "summon");
        if (detail is null)
        {
            throw new InvalidOperationException($"Failed to deserialize summon '{slug}'.");
        }

        summons.Add(detail);
        Console.WriteLine($"  summon: {detail.Name}");
        await client.DelayBetweenRequestsAsync();
    }

    return summons;
}

static string? GetArgValue(string[] args, string name)
{
    for (int i = 0; i < args.Length - 1; i++)
    {
        if (string.Equals(args[i], name, StringComparison.OrdinalIgnoreCase))
        {
            return args[i + 1];
        }
    }

    return null;
}

static string FindRepoRoot()
{
    string? dir = AppContext.BaseDirectory;
    while (dir is not null)
    {
        if (Directory.Exists(Path.Combine(dir, ".git")) ||
            File.Exists(Path.Combine(dir, "JudgementOdds.sln")) ||
            File.Exists(Path.Combine(dir, "JudgementOdds.slnx")))
        {
            return dir;
        }

        dir = Directory.GetParent(dir)?.FullName;
    }

    return Directory.GetCurrentDirectory();
}
