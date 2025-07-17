package com.example.crudtaskswithagent.controller;

import com.example.crudtaskswithagent.model.TaskItem;
import com.example.crudtaskswithagent.repository.TaskRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

/**
 * REST API controller for TaskItem CRUD operations.
 */
@RestController
@RequestMapping("/api/tasks")
public class TaskController {
    
    private final TaskRepository taskRepository;
    
    public TaskController(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }
    
    @GetMapping
    public Flux<TaskItem> getAllTasks() {
        return taskRepository.findAllOrderById();
    }
    
    @GetMapping("/{id}")
    public Mono<TaskItem> getTaskById(@PathVariable Long id) {
        return taskRepository.findById(id);
    }
    
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<TaskItem> createTask(@RequestParam String title) {
        return taskRepository.save(new TaskItem(title));
    }
    
    @PutMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> updateTask(
            @PathVariable Long id,
            @RequestBody TaskItem item) {
        return taskRepository.findById(id)
                .flatMap(task -> {
                    task.setTitle(item.getTitle());
                    task.setComplete(item.isComplete());
                    return taskRepository.save(task);
                })
                .then();
    }
    
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> deleteTask(@PathVariable Long id) {
        return taskRepository.deleteById(id);
    }
}
