package com.example.crudtaskswithagent.repository;

import com.example.crudtaskswithagent.model.TaskItem;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

@Repository
public interface TaskRepository extends R2dbcRepository<TaskItem, Long> {
    
    @Query("SELECT * FROM tasks ORDER BY id")
    Flux<TaskItem> findAllOrderById();
}
