using CRUDTasksWithAgent.Components;
using CRUDTasksWithAgent.Models;
using CRUDTasksWithAgent.Tools;
using CRUDTasksWithAgent.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();

builder.Services.AddDbContext<TasksDbContext>(options =>
    options.UseInMemoryDatabase("TasksDb"));

// Register TaskService and TaskCrudTool as scoped services
builder.Services.AddScoped<TaskService>();
builder.Services.AddScoped<TaskCrudTool>();

// Register Agent Framework provider (for AgentFrameworkAgent.razor)
builder.Services.AddScoped<IAgentFrameworkProvider, AgentFrameworkProvider>();

// Register Foundry agent provider (for FoundryAgent.razor)
builder.Services.AddScoped<IFoundryAgentProvider, FoundryAgentProvider>();

// Register OpenAPI for external agents
builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    app.UseHsts();
}

app.UseHttpsRedirection();

app.UseAntiforgery();

app.MapStaticAssets();
app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

// API endpoints for TaskItem
app.MapOpenApi();

app.MapGet("/api/tasks", async (TaskService taskService) =>
{
    return Results.Ok(await taskService.GetAllTasksAsync());
})
.WithDescription("Gets all tasks.")
.WithName("GetAllTasks");

app.MapGet("/api/tasks/{id}", async (int id, TaskService taskService) =>
{
    var task = await taskService.GetTaskByIdAsync(id);
    return task is not null ? Results.Ok(task) : Results.NotFound();
})
.WithDescription("Gets a task by its ID.")
.WithName("GetTaskById");

app.MapPost("/api/tasks", async (string title, TaskService taskService) =>
{
    var created = await taskService.AddTaskAsync(title);
    return Results.Created($"/api/tasks/{created.Id}", created);
})
.WithDescription("Creates a new task with the specified title.")
.WithName("CreateTask");

app.MapPut("/api/tasks/{id}", async (int id, TaskItem item, TaskService taskService) =>
{
    var task = await taskService.GetTaskByIdAsync(id);
    if (task is null) return Results.NotFound();
    task.Title = item.Title;
    task.IsComplete = item.IsComplete;
    await taskService.UpdateTaskAsync(task);
    return Results.NoContent();
})
.WithDescription("Updates an existing task by ID.")
.WithName("UpdateTask");

app.MapDelete("/api/tasks/{id}", async (int id, TaskService taskService) =>
{
    var task = await taskService.GetTaskByIdAsync(id);
    if (task is null) return Results.NotFound();
    await taskService.DeleteTaskAsync(task);
    return Results.NoContent();
})
.WithDescription("Deletes a task by its ID.")
.WithName("DeleteTask");

app.Run();
