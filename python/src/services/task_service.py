import sqlite3
import asyncio
from typing import List, Optional
from concurrent.futures import ThreadPoolExecutor
from ..models import TaskItem


class TaskService:
    """
    Service class for managing tasks with CRUD operations.
    This service provides all the necessary operations for task management.
    """
    
    def __init__(self):
        self.db_path = "tasks.db"  # Persistent file-based database
        self.executor = ThreadPoolExecutor(max_workers=1)
        self._initialize_database()
    
    def _initialize_database(self):
        """Initialize the SQLite database with tasks table."""
        def init_db():
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS tasks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    isComplete BOOLEAN DEFAULT 0
                )
            """)
            conn.commit()
            conn.close()
            print("Tasks table initialized")
        
        # Run in thread pool to avoid blocking
        self.executor.submit(init_db).result()
    
    async def get_all_tasks(self) -> List[TaskItem]:
        """Get all tasks from the database."""
        def get_tasks():
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM tasks ORDER BY id")
            rows = cursor.fetchall()
            conn.close()
            
            return [
                TaskItem(
                    id=row[0],
                    title=row[1],
                    isComplete=bool(row[2])
                )
                for row in rows
            ]
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self.executor, get_tasks)
    
    async def get_task_by_id(self, task_id: int) -> Optional[TaskItem]:
        """Get a task by its ID."""
        def get_task():
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
            row = cursor.fetchone()
            conn.close()
            
            if row:
                return TaskItem(
                    id=row[0],
                    title=row[1],
                    isComplete=bool(row[2])
                )
            return None
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self.executor, get_task)
    
    async def add_task(self, title: str, is_complete: bool = False) -> TaskItem:
        """Add a new task to the database."""
        def create_task():
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO tasks (title, isComplete) VALUES (?, ?)",
                (title, 1 if is_complete else 0)
            )
            task_id = cursor.lastrowid
            conn.commit()
            conn.close()
            
            return TaskItem(
                id=task_id,
                title=title,
                isComplete=is_complete
            )
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self.executor, create_task)
    
    async def update_task(self, task_id: int, title: Optional[str] = None, is_complete: Optional[bool] = None) -> bool:
        """Update a task by its ID."""
        def update():
            # First get current task to preserve existing values
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT title, isComplete FROM tasks WHERE id = ?", (task_id,))
            row = cursor.fetchone()
            
            if not row:
                conn.close()
                return False
            
            current_title, current_complete = row
            updated_title = title if title is not None else current_title
            updated_complete = is_complete if is_complete is not None else bool(current_complete)
            
            cursor.execute(
                "UPDATE tasks SET title = ?, isComplete = ? WHERE id = ?",
                (updated_title, 1 if updated_complete else 0, task_id)
            )
            changes = cursor.rowcount
            conn.commit()
            conn.close()
            
            return changes > 0
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self.executor, update)
    
    async def delete_task(self, task_id: int) -> bool:
        """Delete a task by its ID."""
        def delete():
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
            changes = cursor.rowcount
            conn.commit()
            conn.close()
            
            return changes > 0
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self.executor, delete)
    
    def close(self):
        """Close the database connection and thread pool."""
        self.executor.shutdown(wait=True)
