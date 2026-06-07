using System.Text.Json;
using HoecDownloader.Models;

namespace HoecDownloader.Services;

public static class HeroAbilityParser
{
    public static bool TryGetDualWield(HeroDetail hero, out string? label)
    {
        label = null;

        foreach (string name in EnumerateInnateAbilityNames(hero.InnateAbilities))
        {
            if (IsDualWieldName(name))
            {
                label = name;
                return true;
            }
        }

        foreach (string name in EnumerateHeroInnateAbilityNames(hero.HeroesInnateAbilities))
        {
            if (IsDualWieldName(name))
            {
                label = name;
                return true;
            }
        }

        return false;
    }

    private static bool IsDualWieldName(string name) =>
        name.Contains("Dual Wield", StringComparison.OrdinalIgnoreCase);

    private static IEnumerable<string> EnumerateInnateAbilityNames(JsonElement? innateAbilities)
    {
        if (innateAbilities is not JsonElement root || root.ValueKind != JsonValueKind.Object)
        {
            yield break;
        }

        if (root.TryGetProperty("common", out JsonElement common) && common.ValueKind == JsonValueKind.Array)
        {
            foreach (string? name in ReadAbilityNames(common))
            {
                if (name is not null) yield return name;
            }
        }

        if (root.TryGetProperty("unique", out JsonElement unique) && unique.ValueKind == JsonValueKind.Object)
        {
            foreach (JsonProperty level in unique.EnumerateObject())
            {
                if (level.Value.ValueKind != JsonValueKind.Array)
                {
                    continue;
                }

                foreach (string? name in ReadAbilityNames(level.Value))
                {
                    if (name is not null) yield return name;
                }
            }
        }
    }

    private static IEnumerable<string> EnumerateHeroInnateAbilityNames(JsonElement? heroesInnateAbilities)
    {
        if (heroesInnateAbilities is not JsonElement array || array.ValueKind != JsonValueKind.Array)
        {
            yield break;
        }

        foreach (JsonElement entry in array.EnumerateArray())
        {
            if (!entry.TryGetProperty("innate_abilities", out JsonElement ability)
                || ability.ValueKind != JsonValueKind.Object)
            {
                continue;
            }

            if (ability.TryGetProperty("name", out JsonElement name)
                && name.ValueKind == JsonValueKind.String)
            {
                yield return name.GetString() ?? string.Empty;
            }
        }
    }

    private static IEnumerable<string?> ReadAbilityNames(JsonElement array)
    {
        foreach (JsonElement entry in array.EnumerateArray())
        {
            if (entry.TryGetProperty("name", out JsonElement name)
                && name.ValueKind == JsonValueKind.String)
            {
                yield return name.GetString();
            }
        }
    }
}
