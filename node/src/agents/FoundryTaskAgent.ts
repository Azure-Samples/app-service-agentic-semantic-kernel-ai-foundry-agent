import { 
    AgentsClient
} from '@azure/ai-agents';
import { DefaultAzureCredential } from '@azure/identity';
import { TaskService } from '../services/TaskService';
import { ChatMessage } from '../types';

/**
 * Represents an agent that interfaces with Azure AI Foundry to process user messages in a conversational thread.
 *
 * The `FoundryTaskAgent` class is responsible for:
 * - Initializing a connection to Azure AI Foundry using environment variables for configuration.
 * - Managing an agent session and conversation thread for each instance.
 * - Sending user messages to the agent and retrieving assistant responses.
 * - Handling errors and configuration issues gracefully.
 * - Providing a cleanup method for session management (no-op for Azure AI Foundry).
 *
 * @remarks
 * This class requires the following environment variables to be set:
 * - `AZURE_AI_FOUNDRY_PROJECT_ENDPOINT`: The endpoint URL for the Azure AI Foundry project.
 * - `AZURE_AI_FOUNDRY_AGENT_ID`: The identifier of the agent to use.
 */
export class FoundryTaskAgent {
    private taskService: TaskService;
    private client: AgentsClient | null = null;
    private agentId: string | null = null;
    private threadId: string | null = null;

    /**
     * This constructor sets up the agent by:
     * - Creating an AgentsClient using Azure credentials.
     * - Fetching the agent from Azure AI Foundry and creating a new thread for the session.
     */
    constructor(taskService: TaskService) {
        this.taskService = taskService;
        
        // Initialize the agent directly in constructor
        const endpoint = process.env.AZURE_AI_FOUNDRY_PROJECT_ENDPOINT;
        const agentId = process.env.AZURE_AI_FOUNDRY_AGENT_ID;

        if (!endpoint || !agentId) {
            console.warn('Azure AI Foundry configuration missing. Set AZURE_AI_FOUNDRY_PROJECT_ENDPOINT and AZURE_AI_FOUNDRY_AGENT_ID');
            return;
        }

        try {
            // Create the client using Azure credentials
            this.client = new AgentsClient(endpoint, new DefaultAzureCredential());
            
            // Get the agent from Azure AI Foundry, then create thread
            this.client.getAgent(agentId).then((agent) => {
                this.agentId = agent.id;
                
                // Create a new thread for this session
                return this.client!.threads.create();
            }).then((thread) => {
                this.threadId = thread.id;
                console.log(`Foundry agent initialized with ID: ${this.agentId}, Thread: ${this.threadId}`);
            }).catch((error) => {
                console.error('Error initializing Foundry agent or creating thread:', error);
            });
            
        } catch (error) {
            console.error('Error initializing Foundry agent:', error);
        }
    }

    /**
     * Processes a user message by sending it to the Azure AI Foundry agent and returns the assistant's response.
     *
     * This method performs the following steps:
     * 1. Adds the user's message to the conversation thread.
     * 2. Initiates and polls a run with the agent to process the message.
     * 3. Retrieves and returns the latest assistant response from the thread.
     *
     * @param message - The user's message to be processed by the agent.
     * @returns A promise that resolves to a `ChatMessage` object containing the assistant's response.
     */
    async processMessage(message: string): Promise<ChatMessage> {
        if (!this.client || !this.threadId || !this.agentId) {
            return {
                role: 'assistant',
                content: 'Azure AI Foundry agent is not properly configured. Please check your environment variables.'
            };
        }

        try {
            // Add the user message to the thread
            await this.client.messages.create(this.threadId, "user", message);

            // Create and poll a run - the agent will automatically handle any function calls
            const run = await this.client.runs.createAndPoll(
                this.threadId, 
                this.agentId, 
                {
                    pollingOptions: {
                        intervalInMs: 2000,
                    },
                }
            );

            if (run.status === 'completed') {
                // Get the latest messages from the thread
                const messages = this.client.messages.list(this.threadId);
                
                // Find the latest assistant message
                for await (const threadMessage of messages) {
                    if (threadMessage.role === 'assistant') {
                        // Extract text content from the message
                        const textContent = threadMessage.content
                            .filter((c: any) => c.type === 'text')
                            .map((c: any) => c.text?.value || '')
                            .join('\n');

                        if (textContent) {
                            // Return the assistant's response
                            return {
                                role: 'assistant',
                                content: textContent
                            };
                        }
                        break; // Only get the latest assistant message
                    }
                }
            } else {
                console.log(`Run completed with status: ${run.status}`);
                return {
                    role: 'assistant',
                    content: `Sorry, I encountered an issue processing your request. Status: ${run.status}`
                };
            }

        } catch (error) {
            console.error('Error processing message with Foundry agent:', error);
            return {
                role: 'assistant',
                content: 'Sorry, I encountered an error processing your request.'
            };
        }

        return {
            role: 'assistant',
            content: 'I received your message but couldn\'t generate a response.'
        };
    }

    async cleanup(): Promise<void> {
        // Azure AI Foundry agents are managed in the portal
        // No cleanup needed for the client or thread
        console.log('Foundry agent cleanup completed');
    }
}
