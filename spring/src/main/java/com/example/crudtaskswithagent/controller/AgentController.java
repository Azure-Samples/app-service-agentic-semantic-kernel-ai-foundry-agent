package com.example.crudtaskswithagent.controller;

import com.example.crudtaskswithagent.service.SemanticKernelAgentService;
import org.springframework.context.ApplicationContext;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.concurrent.ConcurrentHashMap;

/**
 * REST API controller for AI agent interactions.
 * This provides endpoints for Semantic Kernel agents.
 * Each browser session gets its own SemanticKernelAgentService instance with its own ChatHistoryAgentThread
 */
@RestController
@RequestMapping("/api/agents")
public class AgentController {
    
    private final ApplicationContext applicationContext;
    private final ConcurrentHashMap<String, SemanticKernelAgentService> sessionServices = new ConcurrentHashMap<>();
    
    public AgentController(ApplicationContext applicationContext) {
        this.applicationContext = applicationContext;
    }
    
    @PostMapping("/semantic-kernel/chat")
    public Mono<String> chatWithSemanticKernel(
            @RequestParam(value = "message") String message,
            @RequestParam(value = "sessionId") String sessionId) {
        
        SemanticKernelAgentService service = sessionServices.computeIfAbsent(sessionId, 
            key -> applicationContext.getBean(SemanticKernelAgentService.class));
        
        return service.processMessage(message);
    }
}
