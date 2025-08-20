from fastapi import APIRouter, HTTPException
from typing import List
from ..models import TaskItem, TaskCreateRequest, TaskUpdateRequest, ChatRequest, ChatMessage
from ..services import TaskService
from ..agents import LangGraphTaskAgent, FoundryTaskAgent


def create_api_routes(
    task_service: TaskService,
    langgraph_agent: LangGraphTaskAgent,
    foundry_agent: FoundryTaskAgent
) -> APIRouter:
    """
    Create API router with task CRUD endpoints and chat agent routes.
    
    Routes:
    - GET    /tasks          : Retrieves all tasks
    - POST   /tasks          : Creates a new task
    - GET    /tasks/{id}     : Retrieves a task by its ID
    - PUT    /tasks/{id}     : Updates a task by its ID
    - DELETE /tasks/{id}     : Deletes a task by its ID
    - POST   /chat/langgraph : Processes a chat message using the LangGraph agent
    - POST   /chat/foundry   : Processes a chat message using the Foundry agent
    """
    router = APIRouter()
    
    @router.get(
        "/tasks",
        response_model=List[TaskItem],
        operation_id="getAllTasks",
        description="Retrieve all tasks in the task list."
    )
    async def get_all_tasks():
        """Get all tasks"""
        try:
            tasks = await task_service.get_all_tasks()
            return tasks
        except Exception as e:
            print(f"Error getting tasks: {e}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Failed to get tasks: {str(e)}")
    
    @router.post(
        "/tasks",
        response_model=TaskItem,
        status_code=201,
        operation_id="createTask",
        description="Create a new task with a title and completion status."
    )
    async def create_task(task_request: TaskCreateRequest):
        """Create a new task"""
        try:
            if not task_request.title:
                raise HTTPException(status_code=400, detail="Title is required")
            
            task = await task_service.add_task(
                task_request.title, 
                task_request.isComplete or False
            )
            return task
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error creating task: {e}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Failed to create task: {str(e)}")
    
    @router.get(
        "/tasks/{task_id}",
        response_model=TaskItem,
        operation_id="getTaskById",
        description="Retrieve a task by its unique ID."
    )
    async def get_task_by_id(task_id: int):
        """Get a task by its ID"""
        try:
            task = await task_service.get_task_by_id(task_id)
            if not task:
                raise HTTPException(status_code=404, detail="Task not found")
            return task
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail="Failed to get task")
    
    @router.put(
        "/tasks/{task_id}",
        response_model=TaskItem,
        operation_id="updateTask",
        description="Update a task's title or completion status by its ID."
    )
    async def update_task(task_id: int, task_request: TaskUpdateRequest):
        """Update a task by its ID"""
        try:
            updated = await task_service.update_task(
                task_id, 
                task_request.title, 
                task_request.isComplete
            )
            if not updated:
                raise HTTPException(status_code=404, detail="Task not found")
            
            task = await task_service.get_task_by_id(task_id)
            return task
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail="Failed to update task")
    
    @router.delete(
        "/tasks/{task_id}",
        operation_id="deleteTask",
        description="Delete a task by its unique ID."
    )
    async def delete_task(task_id: int):
        """Delete a task by its ID"""
        try:
            deleted = await task_service.delete_task(task_id)
            if not deleted:
                raise HTTPException(status_code=404, detail="Task not found")
            return {"message": "Task deleted successfully"}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail="Failed to delete task")
    
    @router.post("/chat/langgraph", response_model=ChatMessage, operation_id="chatWithLangGraph", include_in_schema=False)
    async def chat_with_langgraph(chat_request: ChatRequest):
        """Process a chat message using the LangGraph agent"""
        try:
            if not chat_request.message:
                raise HTTPException(status_code=400, detail="Message is required")
            
            response = await langgraph_agent.process_message(
                chat_request.message, 
                chat_request.sessionId
            )
            return response
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error in LangGraph chat: {e}")
            raise HTTPException(status_code=500, detail="Failed to process message")
    
    @router.post("/chat/foundry", response_model=ChatMessage, operation_id="chatWithFoundry", include_in_schema=False)
    async def chat_with_foundry(chat_request: ChatRequest):
        """Process a chat message using the Foundry agent"""
        try:
            if not chat_request.message:
                raise HTTPException(status_code=400, detail="Message is required")
            
            response = await foundry_agent.process_message(chat_request.message)
            return response
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error in Foundry chat: {e}")
            raise HTTPException(status_code=500, detail="Failed to process message")
    
    return router
