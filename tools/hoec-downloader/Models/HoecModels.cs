using System.Text.Json;
using System.Text.Json.Serialization;

namespace HoecDownloader.Models;

public sealed record WeaponProfile(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("reach")] int Reach,
    [property: JsonPropertyName("cost")] string Cost,
    [property: JsonPropertyName("glance")] int Glance,
    [property: JsonPropertyName("solid")] int Solid,
    [property: JsonPropertyName("crit")] int Crit);

public sealed record HeroSummary(
    [property: JsonPropertyName("slug")] string Slug,
    [property: JsonPropertyName("name")] string Name);

public sealed record HeroDetail(
    [property: JsonPropertyName("slug")] string Slug,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("stats_mov")] int? StatsMov,
    [property: JsonPropertyName("stats_agi")] int? StatsAgi,
    [property: JsonPropertyName("stats_mel")] int? StatsMel,
    [property: JsonPropertyName("stats_mag")] int? StatsMag,
    [property: JsonPropertyName("stats_rng")] int? StatsRng,
    [property: JsonPropertyName("stats_res")] int? StatsRes,
    [property: JsonPropertyName("health_base")] int HealthBase,
    [property: JsonPropertyName("health_lvl2")] int HealthLvl2,
    [property: JsonPropertyName("health_lvl3")] int HealthLvl3,
    [property: JsonPropertyName("test_realm")] bool TestRealm,
    [property: JsonPropertyName("weapons")] List<WeaponProfile>? Weapons);

public sealed record MonsterDetail(
    [property: JsonPropertyName("slug")] string Slug,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("stats_mov")] JsonElement StatsMov,
    [property: JsonPropertyName("stats_agi")] int? StatsAgi,
    [property: JsonPropertyName("stats_mel")] int? StatsMel,
    [property: JsonPropertyName("stats_mag")] int? StatsMag,
    [property: JsonPropertyName("stats_rng")] int? StatsRng,
    [property: JsonPropertyName("stats_res")] int? StatsRes,
    [property: JsonPropertyName("health")] int Health,
    [property: JsonPropertyName("bounty")] string? Bounty,
    [property: JsonPropertyName("tier")] int? Tier,
    [property: JsonPropertyName("monster_races")] RaceRef? MonsterRaces,
    [property: JsonPropertyName("weapons")] List<WeaponProfile>? Weapons);

public sealed record SummonDetail(
    [property: JsonPropertyName("slug")] string Slug,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("stats_mov")] int? StatsMov,
    [property: JsonPropertyName("stats_agi")] int? StatsAgi,
    [property: JsonPropertyName("stats_mel")] int? StatsMel,
    [property: JsonPropertyName("stats_mag")] int? StatsMag,
    [property: JsonPropertyName("stats_rng")] int? StatsRng,
    [property: JsonPropertyName("stats_res")] int? StatsRes,
    [property: JsonPropertyName("health")] int Health,
    [property: JsonPropertyName("summon_cost")] string? SummonCost,
    [property: JsonPropertyName("monster_races")] RaceRef? MonsterRaces,
    [property: JsonPropertyName("weapons")] List<WeaponProfile>? Weapons);

public sealed record RaceRef(
    [property: JsonPropertyName("name")] string Name);
