using System.Text;
using HoecDownloader.Models;

namespace HoecDownloader.Writers;

public static class MarkdownWriters
{
    public static string WriteHeroes(IReadOnlyList<HeroDetail> heroes)
    {
        var sb = new StringBuilder();
        WriteFrontmatter(sb, "https://www.hallofeternalchampions.com/api/heroes", heroes.Count, "hero_count");
        sb.AppendLine("# Heroes");
        sb.AppendLine();

        foreach (HeroDetail hero in heroes.OrderBy(h => h.Name, StringComparer.OrdinalIgnoreCase))
        {
            sb.AppendLine($"## {hero.Name} ({hero.Slug})");
            sb.AppendLine();
            sb.AppendLine($"test_realm: {hero.TestRealm.ToString().ToLowerInvariant()}");
            sb.AppendLine();
            WriteStatsTable(sb, FormatInt(hero.StatsMov), FormatInt(hero.StatsAgi), FormatInt(hero.StatsMel),
                FormatInt(hero.StatsMag), FormatInt(hero.StatsRng), FormatInt(hero.StatsRes));
            sb.AppendLine();
            sb.AppendLine("| Health | Value |");
            sb.AppendLine("|--------|-------|");
            sb.AppendLine($"| Base | {hero.HealthBase} |");
            sb.AppendLine($"| Lvl2 | {hero.HealthLvl2} |");
            sb.AppendLine($"| Lvl3 | {hero.HealthLvl3} |");
            sb.AppendLine();
            WriteWeaponsTable(sb, hero.Weapons);
            sb.AppendLine();
        }

        return sb.ToString();
    }

    public static string WriteMonsters(IReadOnlyList<MonsterDetail> monsters)
    {
        var sb = new StringBuilder();
        WriteFrontmatter(sb, "https://www.hallofeternalchampions.com/monsters", monsters.Count, "monster_count");
        sb.AppendLine("# Monsters");
        sb.AppendLine();

        foreach (MonsterDetail monster in monsters.OrderBy(m => m.Name, StringComparer.OrdinalIgnoreCase))
        {
            sb.AppendLine($"## {monster.Name} ({monster.Slug})");
            sb.AppendLine();
            WriteStatsTable(sb, FormatMov(monster.StatsMov), FormatInt(monster.StatsAgi), FormatInt(monster.StatsMel),
                FormatInt(monster.StatsMag), FormatInt(monster.StatsRng), FormatInt(monster.StatsRes));
            sb.AppendLine();
            sb.AppendLine("| Field | Value |");
            sb.AppendLine("|-------|-------|");
            sb.AppendLine($"| Health | {monster.Health} |");
            sb.AppendLine($"| Bounty | {monster.Bounty ?? "—"} |");
            sb.AppendLine($"| Tier | {monster.Tier?.ToString() ?? "—"} |");
            sb.AppendLine($"| Race | {monster.MonsterRaces?.Name ?? "—"} |");
            sb.AppendLine();
            WriteWeaponsTable(sb, monster.Weapons);
            sb.AppendLine();
        }

        return sb.ToString();
    }

    public static string WriteSummons(IReadOnlyList<SummonDetail> summons)
    {
        var sb = new StringBuilder();
        WriteFrontmatter(sb, "https://www.hallofeternalchampions.com/summons", summons.Count, "summon_count");
        sb.AppendLine("# Summons");
        sb.AppendLine();

        foreach (SummonDetail summon in summons.OrderBy(s => s.Name, StringComparer.OrdinalIgnoreCase))
        {
            sb.AppendLine($"## {summon.Name} ({summon.Slug})");
            sb.AppendLine();
            WriteStatsTable(sb, FormatInt(summon.StatsMov), FormatInt(summon.StatsAgi), FormatInt(summon.StatsMel),
                FormatInt(summon.StatsMag), FormatInt(summon.StatsRng), FormatInt(summon.StatsRes));
            sb.AppendLine();
            sb.AppendLine("| Field | Value |");
            sb.AppendLine("|-------|-------|");
            sb.AppendLine($"| Health | {summon.Health} |");
            sb.AppendLine($"| Summon Cost | {summon.SummonCost ?? "—"} |");
            sb.AppendLine($"| Race | {summon.MonsterRaces?.Name ?? "—"} |");
            sb.AppendLine();
            WriteWeaponsTable(sb, summon.Weapons);
            sb.AppendLine();
        }

        return sb.ToString();
    }

    private static void WriteFrontmatter(StringBuilder sb, string source, int count, string countKey)
    {
        sb.AppendLine("---");
        sb.AppendLine($"source: {source}");
        sb.AppendLine($"generated_at: {DateTime.UtcNow:O}");
        sb.AppendLine($"{countKey}: {count}");
        sb.AppendLine("---");
        sb.AppendLine();
    }

    private static void WriteStatsTable(
        StringBuilder sb,
        string mov,
        string agi,
        string mel,
        string mag,
        string rng,
        string res)
    {
        sb.AppendLine("| Stat | Value |");
        sb.AppendLine("|------|-------|");
        sb.AppendLine($"| MOV | {mov} |");
        sb.AppendLine($"| AGI | {agi} |");
        sb.AppendLine($"| MEL | {mel} |");
        sb.AppendLine($"| MAG | {mag} |");
        sb.AppendLine($"| RNG | {rng} |");
        sb.AppendLine($"| RES | {res} |");
    }

    private static void WriteWeaponsTable(StringBuilder sb, List<WeaponProfile>? weapons)
    {
        sb.AppendLine("### Weapons");
        sb.AppendLine();
        sb.AppendLine("| Name | Type | Reach | Cost | Crit | Solid | Glance |");
        sb.AppendLine("|------|------|-------|------|------|-------|--------|");

        if (weapons is null || weapons.Count == 0)
        {
            sb.AppendLine("| — | — | — | — | — | — | — |");
            return;
        }

        foreach (WeaponProfile weapon in weapons)
        {
            sb.AppendLine(
                $"| {weapon.Name} | {weapon.Type} | {weapon.Reach} | {weapon.Cost} | {weapon.Crit} | {weapon.Solid} | {weapon.Glance} |");
        }
    }

    private static string FormatInt(int? value) => value?.ToString() ?? "—";

    private static string FormatMov(System.Text.Json.JsonElement mov) =>
        mov.ValueKind switch
        {
            System.Text.Json.JsonValueKind.Number => mov.GetInt32().ToString(),
            System.Text.Json.JsonValueKind.String => mov.GetString() ?? "—",
            _ => "—"
        };
}
