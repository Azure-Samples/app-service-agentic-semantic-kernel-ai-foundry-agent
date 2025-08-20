from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from dotenv import load_dotenv
from .services import TaskService
from .agents import LangGraphTaskAgent, FoundryTaskAgent
from .routes import create_api_routes

# Load environment variables from .env file
load_dotenv()


class TaskManagerApp:
    """FastAPI application for task management with AI agents."""
    
    def __init__(self):
        # Auto-detect server URL: Azure App Service or local development
        if os.getenv("WEBSITE_HOSTNAME"):
            # Running in Azure App Service
            server_url = f"https://{os.getenv('WEBSITE_HOSTNAME')}"
        else:
            # Local development
            server_url = "http://localhost:3000"
        
        self.app = FastAPI(
            title="Task Manager API",
            version="1.0.0",
            description="A simple task management API for Azure AI Foundry Agents",
            servers=[
                {"url": server_url, "description": "Task Manager API Server"}
            ]
        )
        
        # Initialize services
        self.task_service = TaskService()
        self.langgraph_agent = LangGraphTaskAgent(self.task_service)
        self.foundry_agent = FoundryTaskAgent(self.task_service)
        
        self._setup_middleware()
        self._setup_routes()
    
    def _setup_middleware(self):
        """Set up CORS and other middleware."""
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],  # Configure as needed for production
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    
    def _setup_routes(self):
        """Set up API routes and static file serving."""
        # API routes
        api_router = create_api_routes(
            self.task_service,
            self.langgraph_agent,
            self.foundry_agent
        )
        self.app.include_router(api_router, prefix="/api")
        
        # Static files
        static_dir = os.path.join(os.path.dirname(__file__), "..", "public")
        if os.path.exists(static_dir):
            self.app.mount("/static", StaticFiles(directory=static_dir), name="static")
        
        # Serve index.html for all other routes (SPA)
        @self.app.get("/")
        @self.app.get("/{path:path}")
        async def serve_spa(path: str = ""):
            index_path = os.path.join(static_dir, "index.html")
            if os.path.exists(index_path):
                return FileResponse(index_path)
            return {"message": "Static files not found. Place your frontend in the 'public' directory."}
    
    def get_app(self) -> FastAPI:
        """Get the FastAPI application instance."""
        return self.app
    
    async def shutdown(self):
        """Cleanup resources."""
        print("Shutting down Task Manager app...")
        self.task_service.close()
        await self.foundry_agent.cleanup()


# Create the application instance
app_instance = TaskManagerApp()
app = app_instance.get_app()


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "3000"))
    uvicorn.run(
        "src.app:app",
        host="0.0.0.0",
        port=port,
        reload=True
    )
