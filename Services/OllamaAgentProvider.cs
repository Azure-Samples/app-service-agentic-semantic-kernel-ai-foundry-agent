using System.Net.Http.Json;
using System.Text.RegularExpressions;
using CRUDTasksWithAgent.Tools;

namespace CRUDTasksWithAgent.Services;

public class ChatMessageDisplay
{
    public string Content { get; set; } = string.Empty;
    public bool IsUser { get; set; }
}

public interface IOllamaAgentProvider
{
    Task<string> GetResponseAsync(string userMessage, CancellationToken cancellationToken = default);
}

public class OllamaAgentProvider : IOllamaAgentProvider
{
    private readonly HttpClient _httpClient;
    private readonly string _model;
    private readonly TaskCrudTool _taskCrudTool;

    private static readonly Regex CreatePattern = new(@"create\s+(?:a\s+)?task\s+(?:titled?\s+)?['""]?(.+?)['""]?\s*$", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex ReadPattern = new(@"show\s+(?:all\s+)?tasks|list\s+tasks|get\s+(?:all\s+)?tasks|what\s+tasks|tasks\s+list", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex CompletePattern = new(@"mark\s+(?:task\s+)?(?:#?(\d+)|['""]?(.+?)['""]?)\s+(?:as\s+)?(?:complete[ds]?|done)\s*$", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex DeletePattern = new(@"delete\s+(?:task\s+)?(?:#?(\d+)|['""]?(.+?)['""]?)\s*$", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public OllamaAgentProvider(HttpClient httpClient, IConfiguration config, TaskCrudTool taskCrudTool)
    {
        _httpClient = httpClient;
        _model = config["Ollama:Model"] ?? "llama3";
        _taskCrudTool = taskCrudTool;
    }

    public async Task<string> GetResponseAsync(string userMessage, CancellationToken cancellationToken = default)
    {
        var toolResult = await TryHandleTaskIntentAsync(userMessage, cancellationToken);
        if (toolResult != null)
        {
            return await GetNaturalResponseAsync(userMessage, toolResult, cancellationToken);
        }
        return await GetRawOllamaResponseAsync(userMessage, cancellationToken);
    }

    private async Task<string?> TryHandleTaskIntentAsync(string userMessage, CancellationToken cancellationToken)
    {
        var msg = userMessage.Trim();

        var createMatch = CreatePattern.Match(msg);
        if (createMatch.Success)
        {
            var title = createMatch.Groups[1].Value.Trim().TrimEnd('.', ' ', ',', '\'', '"');
            if (!string.IsNullOrWhiteSpace(title))
            {
                var isComplete = msg.Contains("complete", StringComparison.OrdinalIgnoreCase) || msg.Contains("done", StringComparison.OrdinalIgnoreCase);
                var result = await _taskCrudTool.CreateTaskAsync(title, isComplete);
                return result;
            }
        }

        if (ReadPattern.IsMatch(msg))
        {
            var tasks = await _taskCrudTool.ReadTasksAsync();
            if (tasks.Count == 0) return "There are no tasks.";
            var lines = tasks.Select(t => $"- #{t.Id}: {t.Title} [{(t.IsComplete ? "Done" : "Pending")}]");
            return "Tasks:\n" + string.Join("\n", lines);
        }

        var completeMatch = CompletePattern.Match(msg);
        if (completeMatch.Success)
        {
            var idStr = completeMatch.Groups[1].Success ? completeMatch.Groups[1].Value : completeMatch.Groups[2].Value;
            if (int.TryParse(idStr, out var id))
            {
                var result = await _taskCrudTool.UpdateTaskAsync(id.ToString(), isComplete: true);
                return result;
            }
            var title = completeMatch.Groups[2].Value.Trim();
            if (!string.IsNullOrWhiteSpace(title))
            {
                var all = await _taskCrudTool.ReadTasksAsync();
                var match = all.FirstOrDefault(t => t.Title.Contains(title, StringComparison.OrdinalIgnoreCase));
                if (match != null) return await _taskCrudTool.UpdateTaskAsync(match.Id.ToString(), isComplete: true);
                return $"No task matching '{title}' found.";
            }
        }

        var deleteMatch = DeletePattern.Match(msg);
        if (deleteMatch.Success)
        {
            var idStr = deleteMatch.Groups[1].Success ? deleteMatch.Groups[1].Value : deleteMatch.Groups[2].Value;
            if (int.TryParse(idStr, out var id))
            {
                return await _taskCrudTool.DeleteTaskAsync(id.ToString());
            }
            var title = deleteMatch.Groups[2].Value.Trim();
            if (!string.IsNullOrWhiteSpace(title))
            {
                var all = await _taskCrudTool.ReadTasksAsync();
                var match = all.FirstOrDefault(t => t.Title.Contains(title, StringComparison.OrdinalIgnoreCase));
                if (match != null) return await _taskCrudTool.DeleteTaskAsync(match.Id.ToString());
                return $"No task matching '{title}' found.";
            }
        }

        return null;
    }

    private async Task<string> GetNaturalResponseAsync(string userMessage, string toolResult, CancellationToken cancellationToken)
    {
        var request = new
        {
            model = _model,
            messages = new object[]
            {
                new { role = "system", content = "You are a helpful assistant. The user asked to manage tasks. A tool has already executed and returned a result. Write exactly ONE short natural sentence for the user including the result. Do not say you cannot do it. Do not say you are an AI. Do not refuse." },
                new { role = "user", content = userMessage },
                new { role = "system", content = $"Tool execution result: {toolResult}" }
            },
            stream = false,
            options = new { temperature = 0.2 }
        };

        var response = await SendOllamaRequestAsync(request, cancellationToken);
        if (string.IsNullOrWhiteSpace(response))
        {
            return toolResult;
        }
        return response;
    }

    private async Task<string> GetRawOllamaResponseAsync(string userMessage, CancellationToken cancellationToken)
    {
        var request = new
        {
            model = _model,
            messages = new[]
            {
                new { role = "user", content = userMessage }
            },
            stream = false
        };

        return await SendOllamaRequestAsync(request, cancellationToken);
    }

    private async Task<string> SendOllamaRequestAsync(object request, CancellationToken cancellationToken)
    {
        HttpResponseMessage apiResponse;
        try
        {
            apiResponse = await _httpClient.PostAsJsonAsync("/api/chat", request, cancellationToken);
        }
        catch (HttpRequestException ex)
        {
            throw new InvalidOperationException($"Cannot reach Ollama at {_httpClient.BaseAddress}. Ensure Ollama is running (e.g. `ollama serve`).", ex);
        }

        if (!apiResponse.IsSuccessStatusCode)
        {
            var body = await apiResponse.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException($"Ollama /api/chat failed ({(int)apiResponse.StatusCode} {apiResponse.StatusCode}): {body}. Ensure model '{_model}' is pulled (`ollama pull {_model}`).");
        }

        var result = await apiResponse.Content.ReadFromJsonAsync<OllamaChatResponse>(cancellationToken: cancellationToken);
        if (result == null || string.IsNullOrWhiteSpace(result.Message?.Content))
        {
            var raw = await apiResponse.Content.ReadAsStringAsync(cancellationToken);
            Console.WriteLine($"[OllamaAgentProvider] Empty response deserialized. Raw body: {raw}");
            return string.Empty;
        }
        return result.Message.Content;
    }

    private record OllamaChatResponse(OllamaMessage Message, bool Done);
    private record OllamaMessage(string Role, string Content);
}
