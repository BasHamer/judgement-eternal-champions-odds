using System.Text;
using UglyToad.PdfPig;
using UglyToad.PdfPig.Content;

const string DefaultPdfFileName = "JEC-RuleBook-2.6_reduced.pdf";

string repoRoot = FindRepoRoot();
string pdfPath = args.Length > 0
    ? Path.GetFullPath(args[0])
    : Path.Combine(repoRoot, "raw", DefaultPdfFileName);

if (!File.Exists(pdfPath))
{
    Console.Error.WriteLine($"PDF not found: {pdfPath}");
    return 1;
}

string outputPath = Path.Combine(repoRoot, "docs", "rules-full.md");
Directory.CreateDirectory(Path.GetDirectoryName(outputPath)!);

using PdfDocument document = PdfDocument.Open(pdfPath);
var sb = new StringBuilder();

sb.AppendLine("---");
sb.AppendLine($"source: {Path.GetFileName(pdfPath)}");
sb.AppendLine($"extracted_at: {DateTime.UtcNow:O}");
sb.AppendLine($"page_count: {document.NumberOfPages}");
sb.AppendLine($"pdf_version: {document.Version}");
sb.AppendLine("---");
sb.AppendLine();
sb.AppendLine("# Judgement Rulebook (Full Text Extraction)");
sb.AppendLine();

for (int pageNumber = 1; pageNumber <= document.NumberOfPages; pageNumber++)
{
    Page page = document.GetPage(pageNumber);
    sb.AppendLine($"## Page {pageNumber}");
    sb.AppendLine();

    foreach (string line in ExtractLines(page))
    {
        if (!string.IsNullOrWhiteSpace(line))
        {
            sb.AppendLine(line);
        }
    }

    sb.AppendLine();
}

File.WriteAllText(outputPath, sb.ToString(), Encoding.UTF8);
Console.WriteLine($"Extracted {document.NumberOfPages} pages to {outputPath}");
return 0;

static IEnumerable<string> ExtractLines(Page page)
{
    const double lineTolerance = 3.0;
    var words = page.GetWords().OrderByDescending(w => w.BoundingBox.Top).ThenBy(w => w.BoundingBox.Left).ToList();

    if (words.Count == 0)
    {
        yield break;
    }

    var currentLine = new List<Word> { words[0] };
    double currentTop = words[0].BoundingBox.Top;

    for (int i = 1; i < words.Count; i++)
    {
        Word word = words[i];
        if (Math.Abs(word.BoundingBox.Top - currentTop) <= lineTolerance)
        {
            currentLine.Add(word);
        }
        else
        {
            yield return string.Join(" ", currentLine.OrderBy(w => w.BoundingBox.Left).Select(w => w.Text));
            currentLine = [word];
            currentTop = word.BoundingBox.Top;
        }
    }

    yield return string.Join(" ", currentLine.OrderBy(w => w.BoundingBox.Left).Select(w => w.Text));
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
