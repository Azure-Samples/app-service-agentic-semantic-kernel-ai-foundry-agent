import os
import uuid
from typing import Optional, Dict, Any
from langchain_openai import AzureChatOpenAI
from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import InMemorySaver
from langchain_core.tools import tool
from pydantic import BaseModel, Field
from ..services import TaskService
from ..models import ChatMessage, Role


class CreateTaskInput(BaseModel):
    title: str = Field(description="The title of the task")
    isComplete: bool = Field(default=False, description="Whether the task is complete")


class GetTaskInput(BaseModel):
    id: int = Field(description="The ID of the task to retrieve")


class UpdateTaskInput(BaseModel):
    id: int = Field(description="The ID of the task to update")
    title: Optional[str] = Field(default=None, description="The new title for the task")
    isComplete: Optional[bool] = Field(default=None, description="The new completion status")


class DeleteTaskInput(BaseModel):
    id: int = Field(description="The ID of the task to delete")


class LangGraphTaskAgent:
    """
    LangGraph-based agent for task management chat.
    
    This agent sets up:
    - Azure OpenAI client using environment variables
    - Pre-built ReAct agent with CRUD tools for task management
    - Memory management for conversation state
    """
    
    def __init__(self, task_service: TaskService):
        self.task_service = task_service
        self.llm = None
        self.agent = None
        self.memory = InMemorySaver()
        self.session_ids: Dict[str, str] = {}
        
        try:
            endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
            deployment_name = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")
            
            if not endpoint or not deployment_name:
                print("Azure OpenAI configuration missing for LangGraph agent")
                return
            
            # Initialize Azure OpenAI client
            credential = DefaultAzureCredential()
            azure_ad_token_provider = get_bearer_token_provider(
                credential, "https://cognitiveservices.azure.com/.default"
            )
            
            self.llm = AzureChatOpenAI(
                azure_endpoint=endpoint,
                azure_deployment=deployment_name,
                azure_ad_token_provider=azure_ad_token_provider,
                api_version="2024-10-21"
            )
            
            # Define tools
            tools = [
                self._create_task_tool(),
                self._get_tasks_tool(),
                self._get_task_tool(),
                self._update_task_tool(),
                self._delete_task_tool()
            ]
            
            # Create the agent
            self.agent = create_react_agent(self.llm, tools, checkpointer=self.memory)
            print("LangGraph Task Agent initialized successfully")
            
        except Exception as e:
            print(f"Failed to initialize LangGraph agent: {e}")
    
    def _create_task_tool(self):
        @tool("createTask", args_schema=CreateTaskInput)
        async def create_task(title: str, isComplete: bool = False) -> str:
            """Create a new task"""
            task = await self.task_service.add_task(title, isComplete)
            return f'Task created successfully: "{task.title}" (ID: {task.id})'
        
        return create_task
    
    def _get_tasks_tool(self):
        @tool("getTasks")
        async def get_tasks() -> str:
            """Get all tasks"""
            tasks = await self.task_service.get_all_tasks()
            if not tasks:
                return 'No tasks found.'
            
            task_list = '\n'.join([
                f'- {t.id}: {t.title} ({"Complete" if t.isComplete else "Incomplete"})'
                for t in tasks
            ])
            return f'Found {len(tasks)} tasks:\n{task_list}'
        
        return get_tasks
    
    def _get_task_tool(self):
        @tool("getTask", args_schema=GetTaskInput)
        async def get_task(id: int) -> str:
            """Get a specific task by ID"""
            task = await self.task_service.get_task_by_id(id)
            if not task:
                return f'Task with ID {id} not found.'
            
            status = "Complete" if task.isComplete else "Incomplete"
            return f'Task {task.id}: "{task.title}" - Status: {status}'
        
        return get_task
    
    def _update_task_tool(self):
        @tool("updateTask", args_schema=UpdateTaskInput)
        async def update_task(id: int, title: Optional[str] = None, isComplete: Optional[bool] = None) -> str:
            """Update a task by ID"""
            updated = await self.task_service.update_task(id, title, isComplete)
            if not updated:
                return f'Task with ID {id} not found.'
            return f'Task {id} updated successfully.'
        
        return update_task
    
    def _delete_task_tool(self):
        @tool("deleteTask", args_schema=DeleteTaskInput)
        async def delete_task(id: int) -> str:
            """Delete a task by ID"""
            deleted = await self.task_service.delete_task(id)
            if not deleted:
                return f'Task with ID {id} not found.'
            return f'Task {id} deleted successfully.'
        
        return delete_task
    
    async def process_message(self, message: str, session_id: Optional[str] = None) -> ChatMessage:
        """
        Process a user message and return the assistant's response.
        
        Args:
            message: The user's message
            session_id: Optional session ID for conversation continuity
            
        Returns:
            ChatMessage object containing the assistant's reply
        """
        if not self.agent:
            return ChatMessage(
                role=Role.ASSISTANT,
                content="LangGraph agent is not properly configured. Please check your Azure OpenAI settings."
            )
        
        try:
            # Use provided session_id or generate a new one
            if session_id:
                thread_id = self.session_ids.get(session_id)
                if not thread_id:
                    thread_id = str(uuid.uuid4())
                    self.session_ids[session_id] = thread_id
            else:
                thread_id = str(uuid.uuid4())
            
            # Create config for the agent
            config = {"configurable": {"thread_id": thread_id}}
            
            # Process the message
            result = await self.agent.ainvoke(
                {"messages": [("user", message)]},
                config=config
            )
            
            # Extract the assistant's response
            assistant_messages = [
                msg for msg in result["messages"] 
                if hasattr(msg, 'type') and msg.type == "ai"
            ]
            
            if assistant_messages:
                response_content = assistant_messages[-1].content
            else:
                response_content = "I apologize, but I couldn't process your request."
            
            return ChatMessage(
                role=Role.ASSISTANT,
                content=response_content
            )
            
        except Exception as e:
            print(f"Error processing message with LangGraph agent: {e}")
            return ChatMessage(
                role=Role.ASSISTANT,
                content="I apologize, but I encountered an error processing your request."
            )
