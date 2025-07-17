package com.example.crudtaskswithagent.plugin;

import com.example.crudtaskswithagent.model.TaskItem;
import com.example.crudtaskswithagent.repository.TaskRepository;
import com.microsoft.semantickernel.semanticfunctions.annotations.DefineKernelFunction;
import com.microsoft.semantickernel.semanticfunctions.annotations.KernelFunctionParameter;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.util.stream.Collectors;

/**
 * Semantic Kernel plugin for task CRUD operations.
 */
@Component
public class TaskCrudPlugin {
    
    private final TaskRepository taskRepository;
    
    public TaskCrudPlugin(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }
    
    /**
     * Creates a new task with a title and completion status.
     */
    @DefineKernelFunction(
        name = "CreateTask",
        description = "Creates a new task with a title and completion status.",
        returnType = "java.lang.String"
    )
    public Mono<String> createTask(
            @KernelFunctionParameter(name = "title", description = "Title of the task") 
            String title,
            @KernelFunctionParameter(name = "isComplete", description = "Whether the task is complete (true/false)") 
            String isComplete) {
        
        Boolean isCompleteBoolean = false;
        if (isComplete != null && !isComplete.trim().isEmpty()) {
            isCompleteBoolean = Boolean.parseBoolean(isComplete.trim());
        }
        
        return taskRepository.save(new TaskItem(title, isCompleteBoolean))
                .map(task -> "Task created: " + task.getTitle())
                .onErrorResume(e -> Mono.just("Error creating task: " + e.getMessage()));
    }
    
    /**
     * Reads all tasks.
     */
    @DefineKernelFunction(
        name = "ReadAllTasks",
        description = "Reads and returns all tasks in the system.",
        returnType = "java.lang.String"
    )
    public Mono<String> readAllTasks() {
        return taskRepository.findAllOrderById()
                .map(this::formatTask)
                .collect(Collectors.joining("\n\n"))
                .map(result -> result != null && !result.isEmpty() ? result : "No tasks found")
                .onErrorResume(e -> Mono.just("Error reading tasks: " + e.getMessage()));
    }
    
    /**
     * Reads a single task by id.
     */
    @DefineKernelFunction(
        name = "ReadTaskById",
        description = "Reads a single task by its id.",
        returnType = "java.lang.String"
    )
    public Mono<String> readTaskById(
            @KernelFunctionParameter(name = "id", description = "Id of the task to read") 
            String id) {
        
        if (id == null || id.trim().isEmpty()) {
            return Mono.just("Task id is required");
        }
        
        try {
            Long taskId = Long.parseLong(id);
            return taskRepository.findById(taskId)
                    .map(task -> task != null ? formatTask(task) : "Task not found")
                    .onErrorResume(e -> Mono.just("Error reading task: " + e.getMessage()));
        } catch (NumberFormatException e) {
            return Mono.just("Invalid task id");
        }
    }
    
    /**
     * Reads all tasks, or a single task if an id is provided.
     * @deprecated Use ReadAllTasks or ReadTaskById instead for better clarity.
     */
    @DefineKernelFunction(
        name = "ReadTasks",
        description = "Reads all tasks.",
        returnType = "java.lang.String"
    )
    public Mono<String> readTasks() {
        
        return taskRepository.findAllOrderById()
                .map(this::formatTask)
                .collect(Collectors.joining("\n\n"))
                .map(result -> result != null && !result.isEmpty() ? result : "No tasks found")
                .onErrorResume(e -> Mono.just("Error reading tasks: " + e.getMessage()));
    }
    
    /**
     * Updates the specified task fields by id.
     */
    @DefineKernelFunction(
        name = "UpdateTask",
        description = "Updates the specified task fields by id.",
        returnType = "java.lang.String"
    )
    public Mono<String> updateTask(
            @KernelFunctionParameter(name = "id", description = "Id of the task to update") 
            String id,
            @KernelFunctionParameter(name = "title", description = "New title (optional)") 
            String title,
            @KernelFunctionParameter(name = "isComplete", description = "New completion status (true/false)") 
            String isComplete) {
        
        if (id == null || id.trim().isEmpty()) {
            return Mono.just("Task id is required");
        }
        
        try {
            Long taskId = Long.parseLong(id);
            return taskRepository.findById(taskId)
                    .flatMap(task -> {
                        if (task == null) {
                            return Mono.just("Task with Id " + taskId + " not found");
                        }
                        
                        if (title != null && !title.trim().isEmpty()) {
                            task.setTitle(title);
                        }
                        if (isComplete != null && !isComplete.trim().isEmpty()) {
                            task.setComplete(Boolean.parseBoolean(isComplete.trim()));
                        }
                        
                        return taskRepository.save(task)
                                .map(updatedTask -> "Task " + updatedTask.getId() + " updated");
                    })
                    .onErrorResume(e -> Mono.just("Error updating task: " + e.getMessage()));
        } catch (NumberFormatException e) {
            return Mono.just("Invalid task id");
        }
    }
    
    /**
     * Deletes a task by id.
     */
    @DefineKernelFunction(
        name = "DeleteTask",
        description = "Deletes a task by id.",
        returnType = "java.lang.String"
    )
    public Mono<String> deleteTask(
            @KernelFunctionParameter(name = "id", description = "Id of the task to delete") 
            String id) {
        
        if (id == null || id.trim().isEmpty()) {
            return Mono.just("Task id is required");
        }
        
        try {
            Long taskId = Long.parseLong(id);
            return taskRepository.findById(taskId)
                    .flatMap(task -> {
                        if (task == null) {
                            return Mono.just("Task with Id " + taskId + " not found");
                        }
                        
                        return taskRepository.delete(task)
                                .then(Mono.just("Task " + taskId + " deleted"));
                    })
                    .onErrorResume(e -> Mono.just("Error deleting task: " + e.getMessage()));
        } catch (NumberFormatException e) {
            return Mono.just("Invalid task id");
        }
    }
    
    private String formatTask(TaskItem task) {
        return String.format("Id: %d\nTitle: %s\nComplete: %s", 
                task.getId(), 
                task.getTitle(), 
                task.isComplete() ? "Yes" : "No");
    }
}
