import os
from typing import Optional
from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient
from ..services import TaskService
from ..models import ChatMessage, Role


class FoundryTaskAgent:
    """
    Agent that interfaces with Azure AI Foundry to process user messages.
    
    This agent:
    - Initializes connection to Azure AI Foundry using environment variables
    - Manages agent session and conversation thread
    - Sends user messages to agent and retrieves responses
    - Handles errors and configuration issues gracefully
    
    Environment variables required:
    - AZURE_AI_FOUNDRY_PROJECT_ENDPOINT: The endpoint URL for the Azure AI Foundry project
    - AZURE_AI_FOUNDRY_AGENT_ID: The identifier of the agent to use
    """
    
    def __init__(self, task_service: TaskService):
        self.task_service = task_service
        self.project_client = None
        self.agent_id = None
        self.thread_id = None
        
        # Initialize the agent
        endpoint = os.getenv("AZURE_AI_FOUNDRY_PROJECT_ENDPOINT")
        agent_id = os.getenv("AZURE_AI_FOUNDRY_AGENT_ID")
        
        if not endpoint or not agent_id:
            print("Azure AI Foundry configuration missing. Set AZURE_AI_FOUNDRY_PROJECT_ENDPOINT and AZURE_AI_FOUNDRY_AGENT_ID")
            return
        
        try:
            # Create the project client using Azure credentials
            self.project_client = AIProjectClient(
                endpoint=endpoint,
                credential=DefaultAzureCredential()
            )
            self.agent_id = agent_id
            
            # Create a thread for this session
            thread = self.project_client.agents.threads.create()
            self.thread_id = thread.id
            print(f"Created thread: {self.thread_id}")
            print("Azure AI Foundry Task Agent initialized successfully")
            
        except ImportError as e:
            print(f"Azure AI Projects SDK not available. Install azure-ai-projects package: {e}")
        except Exception as e:
            print(f"Failed to initialize Azure AI Foundry agent: {e}")
    
    async def process_message(self, message: str) -> ChatMessage:
        """
        Process a user message and return the assistant's response.
        
        Args:
            message: The user's message
            
        Returns:
            ChatMessage object containing the assistant's response
        """
        if not self.project_client or not self.agent_id or not self.thread_id:
            return ChatMessage(
                role=Role.ASSISTANT,
                content="Azure AI Foundry agent is not properly configured. Please check your settings."
            )
        
        try:
            # Create the message in the thread
            message_obj = self.project_client.agents.messages.create(
                thread_id=self.thread_id,
                role="user",
                content=message
            )
            print(f"Created message, ID: {message_obj.id}")
            
            # Create and process the run
            run = self.project_client.agents.runs.create_and_process(
                thread_id=self.thread_id,
                agent_id=self.agent_id
            )
            print(f"Run finished with status: {run.status}")
            
            if run.status == "failed":
                print(f"Run failed: {run.last_error}")
                return ChatMessage(
                    role=Role.ASSISTANT,
                    content="I encountered an error processing your request. Please try again."
                )
            
            if run.status == "completed":
                # Fetch the latest messages from the thread
                messages = self.project_client.agents.messages.list(thread_id=self.thread_id)
                
                # Find the latest assistant message
                for msg in messages:
                    if msg.role == "assistant":
                        # Extract text content from the message
                        content = ""
                        if hasattr(msg, 'content') and msg.content:
                            for content_item in msg.content:
                                if hasattr(content_item, 'text') and hasattr(content_item.text, 'value'):
                                    content += content_item.text.value
                                elif hasattr(content_item, 'value'):
                                    content += str(content_item.value)
                        
                        return ChatMessage(
                            role=Role.ASSISTANT,
                            content=content if content else "I received your message but couldn't generate a response."
                        )
                
                return ChatMessage(
                    role=Role.ASSISTANT,
                    content="I processed your request but couldn't find a response."
                )
            else:
                return ChatMessage(
                    role=Role.ASSISTANT,
                    content=f"I encountered an issue processing your request. Status: {run.status}"
                )
                
        except Exception as e:
            print(f"Error processing message with Azure AI Foundry: {e}")
            import traceback
            traceback.print_exc()
            return ChatMessage(
                role=Role.ASSISTANT,
                content="I apologize, but I encountered an error processing your request."
            )
    
    async def cleanup(self):
        """Cleanup method for session management (no-op for Azure AI Foundry)."""
        # Azure AI Foundry handles cleanup automatically
        pass
