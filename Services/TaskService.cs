using CRUDTasksWithAgent.Models;
using Microsoft.EntityFrameworkCore;

namespace CRUDTasksWithAgent.Services
{
    // TaskService is used by:
    // 1. The CRUD Home.razor component for UI task management.
    // 2. The mapped API endpoints in Program.cs for backend task operations.
    // 3. The Microsoft Agent Framework tool in TaskCrudTool.cs for agent-based task management.

    public class TaskService
    {
        private readonly TasksDbContext _db;

        public TaskService(TasksDbContext db)
        {
            _db = db;
        }

        public async Task<List<TaskItem>> GetAllTasksAsync() => await _db.Tasks.OrderBy(t => t.Id).ToListAsync();

        public async Task<TaskItem?> GetTaskByIdAsync(int id) => await _db.Tasks.FindAsync(id);

        public async Task<TaskItem> AddTaskAsync(string title)
        {
            var task = new TaskItem { Title = title };
            await _db.Tasks.AddAsync(task);
            await _db.SaveChangesAsync();
            return task;
        }

        public async Task DeleteTaskAsync(TaskItem task)
        {
            _db.Tasks.Remove(task);
            await _db.SaveChangesAsync();
        }

        public async Task UpdateTaskAsync(TaskItem task)
        {
            _db.Tasks.Update(task);
            await _db.SaveChangesAsync();
        }

        public async Task SetTaskCompletionAsync(TaskItem task, bool isComplete)
        {
            task.IsComplete = isComplete;
            _db.Tasks.Update(task);
            await _db.SaveChangesAsync();
        }
    }
}
