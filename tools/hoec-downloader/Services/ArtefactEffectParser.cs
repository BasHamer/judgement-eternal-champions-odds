using System.Text.RegularExpressions;
using HoecDownloader.Models;

namespace HoecDownloader.Services;

public static partial class ArtefactEffectParser
{
    public static ArtefactSimEffects Parse(string description)
    {
        if (string.IsNullOrWhiteSpace(description))
        {
            return new ArtefactSimEffects();
        }

        string text = description.Replace('\n', ' ');

        return new ArtefactSimEffects(
            MelBonus: MatchStatBonus(text, "MEL"),
            MagBonus: MatchStatBonus(text, "MAG"),
            RngBonus: MatchStatBonus(text, "RNG"),
            AgiBonus: MatchStatBonus(text, "AGI"),
            ResBonus: MatchStatBonus(text, "RES"),
            ArmourPiercing: MatchArmourPiercing(text),
            DamageBonus: MatchDamageBonus(text),
            ExtraDice: MatchExtraDice(text));
    }

    private static int MatchStatBonus(string text, string stat)
    {
        foreach (Match candidate in StatBonusRegex().Matches(text))
        {
            if (string.Equals(candidate.Groups["stat"].Value, stat, StringComparison.OrdinalIgnoreCase))
            {
                return int.Parse(candidate.Groups["value"].Value);
            }
        }

        return 0;
    }

    private static int MatchArmourPiercing(string text)
    {
        Match match = ArmourPiercingRegex().Match(text);
        return match.Success ? int.Parse(match.Groups["value"].Value) : 0;
    }

    private static int MatchDamageBonus(string text)
    {
        Match match = DamageBonusRegex().Match(text);
        return match.Success ? int.Parse(match.Groups["value"].Value) : 0;
    }

    private static int MatchExtraDice(string text)
    {
        Match match = ExtraDiceRegex().Match(text);
        return match.Success ? int.Parse(match.Groups["value"].Value) : 0;
    }

    [GeneratedRegex(@"\+(?<value>\d+)\s+(?<stat>MEL|MAG|RNG|AGI|RES)\b", RegexOptions.IgnoreCase)]
    private static partial Regex StatBonusRegex();

    [GeneratedRegex(@"Armou?r\s+Piercing\s*\(\s*(?<value>\d+)\s*\)", RegexOptions.IgnoreCase)]
    private static partial Regex ArmourPiercingRegex();

    [GeneratedRegex(@"\+(?<value>\d+)\s+damage\b", RegexOptions.IgnoreCase)]
    private static partial Regex DamageBonusRegex();

    [GeneratedRegex(@"\+(?<value>\d+)\s+attack\s+dice?\b", RegexOptions.IgnoreCase)]
    private static partial Regex ExtraDiceRegex();
}
