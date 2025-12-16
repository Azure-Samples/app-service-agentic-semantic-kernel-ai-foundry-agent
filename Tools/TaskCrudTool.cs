using CRUDTasksWithAgent.Models;
using CRUDTasksWithAgent.Services;
using Microsoft.EntityFrameworkCore;
using System.Text;
using System.ComponentModel;

namespace CRUDTasksWithAgent.Tools
{
    public class TaskCrudTool
    {
        private readonly TaskService _taskService;

        public TaskCrudTool(TaskService taskService)
        {
            _taskService = taskService;
        }

        /// <summary>
        /// Creates a new task with a title and completion status.
        /// </summary>
        /// <param name="title">Title of the task</param>
        /// <param name="isComplete">Whether the task is complete</param>
        [Description("Creates a new task with a title and completion status.")]
        public async Task<string> CreateTaskAsync(
            [Description("Title of the task")] string title,
            [Description("Whether the task is complete")] bool isComplete = false)
        {
            var task = new TaskItem
            {
                Title = title,
                IsComplete = isComplete
            };
            await _taskService.AddTaskAsync(title);
            // Optionally set completion status if needed
            if (isComplete)
            {
                var created = (await _taskService.GetAllTasksAsync()).LastOrDefault();
                if (created != null)
                {
                    created.IsComplete = true;
                    await _taskService.UpdateTaskAsync(created);
                }
            }
            return $"Task created: {title}";
        }

        /// <summary>
        /// Reads all tasks, or a single task if an id is provided.
        /// </summary>
        /// <param name="id">Id of the task to read (optional)</param>
        [Description("Reads all tasks, or a single task if an id is provided.")]
        public async Task<List<TaskItem>> ReadTasksAsync(
            [Description("Id of the task to read (optional)")] string? id = null)
        {
            if (!string.IsNullOrWhiteSpace(id) && int.TryParse(id, out int taskId))
            {
                var task = await _taskService.GetTaskByIdAsync(taskId);
                if (task == null) return new List<TaskItem>();
                return new List<TaskItem> { task };
            }
            return await _taskService.GetAllTasksAsync();
        }

        /// <summary>
        /// Updates the specified task fields by id.
        /// </summary>
        /// <param name="id">Id of the task to update</param>
        /// <param name="title">New title (optional)</param>
        /// <param name="isComplete">New completion status (optional)</param>
        [Description("Updates the specified task fields by id.")]
        public async Task<string> UpdateTaskAsync(
            [Description("Id of the task to update")] string id,
            [Description("New title (optional)")] string? title = null,
            [Description("New completion status (optional)")] bool? isComplete = null)
        {
            if (!int.TryParse(id, out int taskId))
                return "Invalid task id.";
            var task = await _taskService.GetTaskByIdAsync(taskId);
            if (task == null) return $"Task with Id {taskId} not found.";
            if (!string.IsNullOrWhiteSpace(title)) task.Title = title;
            if (isComplete.HasValue) task.IsComplete = isComplete.Value;
            await _taskService.UpdateTaskAsync(task);
            return $"Task {task.Id} updated.";
        }

        /// <summary>
        /// Deletes a task by id.
        /// </summary>
        /// <param name="id">Id of the task to delete</param>
        [Description("Deletes a task by id.")]
        public async Task<string> DeleteTaskAsync(
            [Description("Id of the task to delete")] string id)
        {
            if (!int.TryParse(id, out int taskId))
                return "Invalid task id.";
            var task = await _taskService.GetTaskByIdAsync(taskId);
            if (task == null) return $"Task with Id {taskId} not found.";
            await _taskService.DeleteTaskAsync(task);
            return $"Task {taskId} deleted.";
        }

        private static string FormatTask(TaskItem t) =>
            $"Id: {t.Id}\nTitle: {t.Title}\nComplete: {(t.IsComplete ? "Yes" : "No")}";
    }
}