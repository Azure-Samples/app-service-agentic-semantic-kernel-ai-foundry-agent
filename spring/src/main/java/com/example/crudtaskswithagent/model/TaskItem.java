package com.example.crudtaskswithagent.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

@Table("tasks")
public class TaskItem {
    
    @Id
    private Long id;
    private String title;
    private boolean isComplete;
    
    public TaskItem() {}
    
    public TaskItem(String title) {
        this.title = title;
        this.isComplete = false;
    }
    
    public TaskItem(String title, boolean isComplete) {
        this.title = title;
        this.isComplete = isComplete;
    }
    
    // Getters and setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getTitle() {
        return title;
    }
    
    public void setTitle(String title) {
        this.title = title;
    }
    
    public boolean isComplete() {
        return isComplete;
    }
    
    public void setComplete(boolean complete) {
        isComplete = complete;
    }
    
    @Override
    public String toString() {
        return "TaskItem{" +
                "id=" + id +
                ", title='" + title + '\'' +
                ", isComplete=" + isComplete +
                '}';
    }
}
