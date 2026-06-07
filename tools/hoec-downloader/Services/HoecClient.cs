using System.Text.Json;
using System.Text.RegularExpressions;

namespace HoecDownloader.Services;

public sealed class HoecClient : IDisposable
{
    private const string BaseUrl = "https://www.hallofeternalchampions.com";
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly HttpClient _http;

    public HoecClient()
    {
        _http = new HttpClient { BaseAddress = new Uri(BaseUrl) };
        _http.DefaultRequestHeaders.UserAgent.ParseAdd("JudgementOdds-HoecDownloader/1.0");
    }

    public async Task<T?> GetApiAsync<T>(string path, CancellationToken cancellationToken = default)
    {
        await using Stream stream = await _http.GetStreamAsync(path, cancellationToken);
        return await JsonSerializer.DeserializeAsync<T>(stream, JsonOptions, cancellationToken);
    }

    public async Task<T?> GetRscEntityAsync<T>(string path, string rootKey, CancellationToken cancellationToken = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, path);
        request.Headers.Add("RSC", "1");

        HttpResponseMessage response = await _http.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        string payload = await response.Content.ReadAsStringAsync(cancellationToken);
        string json = ExtractJsonObject(payload, rootKey);
        return JsonSerializer.Deserialize<T>(json, JsonOptions);
    }

    public async Task<IReadOnlyList<string>> DiscoverSlugsFromListPageAsync(
        string listPath,
        string entitySegment,
        CancellationToken cancellationToken = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, listPath);
        request.Headers.Add("RSC", "1");

        HttpResponseMessage response = await _http.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        string payload = await response.Content.ReadAsStringAsync(cancellationToken);
        var pattern = new Regex($"/{entitySegment}/([a-z0-9-]+)", RegexOptions.IgnoreCase);

        return pattern.Matches(payload)
            .Select(match => match.Groups[1].Value)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(slug => slug, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    public static string ExtractJsonObject(string payload, string rootKey)
    {
        string marker = $"\"{rootKey}\":{{";
        int start = payload.IndexOf(marker, StringComparison.Ordinal);
        if (start < 0)
        {
            throw new InvalidOperationException($"Could not find '{rootKey}' object in RSC payload.");
        }

        int objectStart = start + marker.Length - 1;
        int depth = 0;
        for (int i = objectStart; i < payload.Length; i++)
        {
            char c = payload[i];
            if (c == '{')
            {
                depth++;
            }
            else if (c == '}' && --depth == 0)
            {
                return payload[objectStart..(i + 1)];
            }
        }

        throw new InvalidOperationException($"Unterminated '{rootKey}' object in RSC payload.");
    }

    public Task DelayBetweenRequestsAsync(CancellationToken cancellationToken = default) =>
        Task.Delay(300, cancellationToken);

    public void Dispose() => _http.Dispose();
}
