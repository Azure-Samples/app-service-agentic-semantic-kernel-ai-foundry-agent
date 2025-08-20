"""
Task Manager FastAPI Application

A Python FastAPI app that integrates with both Azure AI Foundry Agents and LangGraph Agents.
"""

from .models import *
from .services import *
from .agents import *
from .routes import *
from .app import app

__version__ = "1.0.0"
