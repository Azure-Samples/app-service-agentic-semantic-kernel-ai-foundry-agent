import { AzureChatOpenAI } from '@langchain/openai';
import { DefaultAzureCredential, getBearerTokenProvider } from '@azure/identity';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { MemorySaver } from '@langchain/langgraph';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { TaskService } from '../services/TaskService';
import { ChatMessage } from '../types';

export class LangGraphTaskAgent {
    private taskService: TaskService;
    private llm: AzureChatOpenAI | null = null;
    private agent: any = null;
    private memory: MemorySaver;
    private sessionIds: Map<string, string> = new Map();

    /**
     * This contructor sets up the agent by:
     * - Configures the Azure OpenAI client using environment variables
     * - Create the pre-built ReAct agent a set of CRUD tools for task management.
     * - Setting up memory management
     */
    constructor(taskService: TaskService) {
        this.taskService = taskService;
        this.memory = new MemorySaver();
        try {
            const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
            const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

            if (!endpoint || !deploymentName) {
                console.warn('Azure OpenAI configuration missing for LangGraph agent');
                return;
            }
            // Initialize Azure OpenAI client
            const credential = new DefaultAzureCredential();
            const azureADTokenProvider = getBearerTokenProvider(credential, "https://cognitiveservices.azure.com/.default");
            
            this.llm = new AzureChatOpenAI({
                azureOpenAIEndpoint: endpoint,
                azureOpenAIApiDeploymentName: deploymentName,
                azureADTokenProvider: azureADTokenProvider,
                azureOpenAIApiVersion: "2024-10-21"
            });
            // Define tools directly in the array
            const tools = [
                tool(
                    async ({ title, isComplete = false }) => {
                        const task = await this.taskService.addTask(title, isComplete);
                        return `Task created successfully: "${task.title}" (ID: ${task.id})`;
                    },
                    {
                        name: 'createTask',
                        description: 'Create a new task',
                        schema: z.object({
                            title: z.string(),
                            isComplete: z.boolean().optional()
                        }) as any
                    }
                ),
                tool(
                    async () => {
                        const tasks = await this.taskService.getAllTasks();
                        if (tasks.length === 0) {
                            return 'No tasks found.';
                        }
                        return `Found ${tasks.length} tasks:\n` + 
                               tasks.map(t => `- ${t.id}: ${t.title} (${t.isComplete ? 'Complete' : 'Incomplete'})`).join('\n');
                    },
                    {
                        name: 'getTasks',
                        description: 'Get all tasks',
                        schema: z.object({}) as any
                    }
                ),
                tool(
                    async ({ id }) => {
                        const task = await this.taskService.getTaskById(id);
                        if (!task) {
                            return `Task with ID ${id} not found.`;
                        }
                        return `Task ${task.id}: "${task.title}" - Status: ${task.isComplete ? 'Complete' : 'Incomplete'}`;
                    },
                    {
                        name: 'getTask',
                        description: 'Get a specific task by ID',
                        schema: z.object({
                            id: z.number()
                        }) as any
                    }
                ),
                tool(
                    async ({ id, title, isComplete }) => {
                        const updated = await this.taskService.updateTask(id, title, isComplete);
                        if (!updated) {
                            return `Task with ID ${id} not found.`;
                        }
                        return `Task ${id} updated successfully.`;
                    },
                    {
                        name: 'updateTask',
                        description: 'Update an existing task',
                        schema: z.object({
                            id: z.number(),
                            title: z.string().optional(),
                            isComplete: z.boolean().optional()
                        }) as any
                    }
                ),
                tool(
                    async ({ id }) => {
                        const deleted = await this.taskService.deleteTask(id);
                        if (!deleted) {
                            return `Task with ID ${id} not found.`;
                        }
                        return `Task ${id} deleted successfully.`;
                    },
                    {
                        name: 'deleteTask',
                        description: 'Delete a task',
                        schema: z.object({
                            id: z.number()
                        }) as any
                    }
                )
            ];

            // Create the ReAct agent with memory
            this.agent = createReactAgent({
                llm: this.llm,
                tools,
                checkpointSaver: this.memory,
                stateModifier: `You are an AI assistant that manages tasks using CRUD operations.
                
You have access to tools for creating, reading, updating, and deleting tasks.
Always use the appropriate tool for any task management request.
Be helpful and provide clear responses about the actions you take.

If you need more information to complete a request, ask the user for it.`
            });
        } catch (error) {
            console.error('Error initializing LangGraph agent:', error);
        }
    }

    private getSessionId(userSessionId?: string): string {
        // Use provided session ID or generate a default one
        if (userSessionId) {
            return userSessionId;
        }
        // For demo purposes, using a default session
        // In a real app, this would come from the browser session
        return 'default-session';
    }

    /**
     * Processes a user message by invoking the LangGraph agent and returns the assistant's response.
     *
     * @param message - The user's input message to be processed.
     * @param sessionId - (Optional) The session identifier to maintain conversation context.
     * @returns A promise that resolves to a `ChatMessage` object containing the assistant's reply.
     */
    async processMessage(message: string, sessionId?: string): Promise<ChatMessage> {
        if (!this.agent) {
            return {
                role: 'assistant',
                content: 'LangGraph agent is not properly configured. Please check your Azure OpenAI settings.'
            };
        }

        try {
            const currentSessionId = this.getSessionId(sessionId);
            // Invoke the agent with memory
            const result = await this.agent.invoke(
                { 
                    messages: [
                        { role: 'user', content: message }
                    ]
                },
                { 
                    configurable: { 
                        thread_id: currentSessionId 
                    } 
                }
            );

            // Extract the last message from the agent's response
            const lastMessage = result.messages[result.messages.length - 1];
            return {
                role: 'assistant',
                content: lastMessage.content
            };

        } catch (error) {
            console.error('Error processing message with LangGraph agent:', error);
            return {
                role: 'assistant',
                content: 'Sorry, I encountered an error processing your request.'
            };
        }
    }
}
