package com.example.crudtaskswithagent.service;

import com.azure.ai.openai.OpenAIAsyncClient;
import com.azure.ai.openai.OpenAIClientBuilder;
import com.azure.identity.DefaultAzureCredentialBuilder;
import com.example.crudtaskswithagent.plugin.TaskCrudPlugin;
import com.microsoft.semantickernel.Kernel;
import com.microsoft.semantickernel.agents.chatcompletion.ChatCompletionAgent;
import com.microsoft.semantickernel.agents.chatcompletion.ChatHistoryAgentThread;
import com.microsoft.semantickernel.aiservices.openai.chatcompletion.OpenAIChatCompletion;
import com.microsoft.semantickernel.functionchoice.FunctionChoiceBehavior;
import com.microsoft.semantickernel.orchestration.InvocationContext;
import com.microsoft.semantickernel.plugin.KernelPlugin;
import com.microsoft.semantickernel.plugin.KernelPluginFactory;
import com.microsoft.semantickernel.services.chatcompletion.AuthorRole;
import com.microsoft.semantickernel.services.chatcompletion.ChatMessageContent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

/**
 * Service that provides Azure OpenAI-based semantic kernel functionality using ChatCompletionAgent.
 * This service creates a ChatCompletionAgent with automatic function calling capabilities
 * and manages a single thread per instance (suitable for session-based usage).
 * 
 * Based on the Microsoft Semantic Kernel documentation example:
 * https://learn.microsoft.com/en-us/semantic-kernel/frameworks/agent/examples/example-chat-agent?pivots=programming-language-java
 */
@Service
@Scope("prototype") // Create new instance per request
public class SemanticKernelAgentService {
    
    private static final Logger logger = LoggerFactory.getLogger(SemanticKernelAgentService.class);
    
    private final ChatCompletionAgent agent;
    private ChatHistoryAgentThread thread;
    
    public SemanticKernelAgentService(
            @Value("${azure.openai.endpoint:}") String endpoint,
            @Value("${azure.openai.deployment:}") String deployment,
            TaskCrudPlugin taskCrudPlugin) {
        
        ChatCompletionAgent configuredAgent = null;
        
        if (endpoint != null && !endpoint.trim().isEmpty() && 
            deployment != null && !deployment.trim().isEmpty()) {
            try {
                // Create OpenAI client
                OpenAIAsyncClient openAIClient = new OpenAIClientBuilder()
                        .endpoint(endpoint)
                        .credential(new DefaultAzureCredentialBuilder().build())
                        .buildAsyncClient();
                
                // Create chat completion service
                OpenAIChatCompletion chatCompletion = OpenAIChatCompletion.builder()
                        .withOpenAIAsyncClient(openAIClient)
                        .withModelId(deployment)
                        .build();
                
                // Create kernel plugin from the task plugin
                KernelPlugin kernelPlugin = KernelPluginFactory.createFromObject(taskCrudPlugin, "TaskPlugin");
                
                // Create kernel with TaskCrudPlugin and chat completion service
                Kernel kernel = Kernel.builder()
                        .withAIService(OpenAIChatCompletion.class, chatCompletion)
                        .withPlugin(kernelPlugin)
                        .build();
                
                // Use automatic function calling
                InvocationContext invocationContext = InvocationContext.builder()
                    .withFunctionChoiceBehavior(FunctionChoiceBehavior.auto(true))
                    .build();

                // Create ChatCompletionAgent
                configuredAgent = ChatCompletionAgent.builder()
                        .withKernel(kernel)
                        .withName("TaskAgent")
                        .withInvocationContext(invocationContext)
                        .withInstructions(
                            "You are an agent that manages tasks using CRUD operations. " +
                            "Use the TaskCrudPlugin functions to create, read, update, and delete tasks. " +
                            "Always call the appropriate plugin function for any task management request. " +
                            "Don't try to handle any requests that are not related to task management."
                        )
                        .build();
                
            } catch (Exception e) {
                logger.error("Error initializing SemanticKernelAgentService: {}", e.getMessage(), e);
            }
        }
        
        this.agent = configuredAgent;
        
        // Initialize thread for this instance
        this.thread = ChatHistoryAgentThread.builder().build();
    }
    
    /**
     * Processes a user message using the ChatCompletionAgent with automatic function calling.
     * Uses the instance thread for conversation continuity.
     */
    public Mono<String> processMessage(String userMessage) {
        if (thread == null) {
            return Mono.just("Error: Thread is not initialized");
        }
        
        try {
            
            // Create chat message content for the user message
            ChatMessageContent<?> userMessageContent = new ChatMessageContent<>(
                    AuthorRole.USER,
                    userMessage
            );
            
            // Use the agent to process the message with automatic function calling
            return agent.invokeAsync(userMessageContent, thread)
                    .<String>map(responses -> {
                        
                        if (responses != null && !responses.isEmpty()) {
                            // Process all responses and concatenate them
                            StringBuilder combinedResult = new StringBuilder();
                            
                            for (int i = 0; i < responses.size(); i++) {
                                var response = responses.get(i);
                                
                                // Update thread with the last response thread (as per Microsoft docs)
                                if (i == responses.size() - 1) {
                                    var responseThread = response.getThread();
                                    if (responseThread instanceof ChatHistoryAgentThread) {
                                        this.thread = (ChatHistoryAgentThread) responseThread;
                                    }
                                }
                                
                                // Get response content
                                ChatMessageContent<?> content = response.getMessage();
                                String responseContent = content != null ? content.getContent() : "";
                                
                                if (!responseContent.isEmpty()) {
                                    if (combinedResult.length() > 0) {
                                        combinedResult.append("\n\n"); // Separate multiple responses
                                    }
                                    combinedResult.append(responseContent);
                                }
                            }
                            
                            String result = combinedResult.toString();
                            if (result.isEmpty()) {
                                result = "No content returned from agent.";
                            }
                            return result;
                        } else {
                            return "I'm sorry, I couldn't process your request. Please try again.";
                        }
                    })
                    .onErrorResume(throwable -> {
                        logger.error("Error in processMessage: {}", throwable.getMessage(), throwable);
                        return Mono.just("Error processing message: " + throwable.getMessage());
                    });
        } catch (Exception e) {
            logger.error("Error setting up message processing: {}", e.getMessage(), e);
            return Mono.just("Error processing message: " + e.getMessage());
        }
    }
}
