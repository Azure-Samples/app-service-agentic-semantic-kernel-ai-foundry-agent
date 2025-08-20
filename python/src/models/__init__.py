from pydantic import BaseModel
from typing import Optional
from enum import Enum


class TaskItem(BaseModel):
    id: int
    title: str
    isComplete: bool


class TaskCreateRequest(BaseModel):
    title: str
    isComplete: Optional[bool] = False


class TaskUpdateRequest(BaseModel):
    title: Optional[str] = None
    isComplete: Optional[bool] = None


class Role(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"


class ChatMessage(BaseModel):
    role: Role
    content: str


class ChatRequest(BaseModel):
    message: str
    sessionId: Optional[str] = None
