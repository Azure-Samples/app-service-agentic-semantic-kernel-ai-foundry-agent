# Agentic Azure App Service app with LangGraph and Azure AI Foundry Agent Service

This repository demonstrates how to build a modern FatAPI web application that integrates with both Azure AI Foundry Agents and LangGraph Agents. It provides a simple CRUD task list and two interactive chat agents.

## Getting Started

See [Tutorial: Build an agentic web app in Azure App Service with LangGraph or Azure AI Foundry Agent Service (Python)](https://learn.microsoft.com/azure/app-service/tutorial-ai-agent-web-app-langgraph-foundry-python).

## Features

- **Task List**: Simple CRUD web app application.
- **LangGraph Agent**: Chat with an agent powered by LangGraph.
- **Azure AI Foundry Agent**: Chat with an agent powered by Azure AI Foundry Agent Service.
- **OpenAPI Schema**: Enables integration with Azure AI Foundry agents.

## Project Structure

```
.devcontainer/
└── devcontainer.json            # Dev container configuration for VS Code
infra/
├── main.bicep                   # Bicep IaC template
├── main.parameters.json         # Parameters for Bicep deployment
public/
└── index.html                   # React frontend
src/
├── __init__.py
├── app.py                       # Main FastAPI application
├── azure.yaml                   # Azure Developer CLI config
├── agents/                      # AI agent implementations
│   ├── __init__.py
│   ├── foundry_task_agent.py    # Azure AI Foundry agent
│   └── langgraph_task_agent.py  # LangGraph agent
├── models/                      # Pydantic models for data validation
│   └── __init__.py
├── routes/                      # API route definitions
│   ├── __init__.py
│   └── api.py                   # Task and chat endpoints
└── services/                    # Business logic services
    ├── __init__.py
    └── task_service.py          # Task CRUD operations with SQLite
tasks.db                         # SQLite database file
requirements.txt                 # Python dependencies
README.md                        # Project documentation
```