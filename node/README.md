# Agentic Azure App Service app with LangGraph and Azure AI Foundry Agent Service

This repository demonstrates how to build a modern Node.js web application that integrates with both Azure AI Foundry Agents and LangGraph Agents. It provides a simple CRUD task list and two interactive chat agents.

## Getting Started

See [Tutorial: Build an agentic web app in Azure App Service with LangGraph or Azure AI Foundry Agent Service (Node.js)](https://learn.microsoft.com/azure/app-service/tutorial-ai-agentic-web-app-langgraph-foundry-node).

## Features

- **Task List**: Simple CRUD web app application.
- **LangGraph Agent**: Chat with an agent powered by LangGraph.
- **Azure AI Foundry Agent**: Chat with an agent powered by Azure AI Foundry Agent Service.
- **OpenAPI Schema**: Enables integration with Azure AI Foundry agents.

## Project Structure

- `src/app.ts` — Main Express.js application entry point with middleware and route setup.
- `src/routes/api.ts` — API router with task CRUD endpoints and chat agent routes.
- `src/agents/LangGraphTaskAgent.ts` — LangGraph-based agent for task management chat.
- `src/agents/FoundryTaskAgent.ts` — Azure AI Foundry agent for task management chat.
- `src/services/TaskService.ts` — Service class for task CRUD operations with SQLite.
- `src/types/index.ts` — TypeScript interfaces for tasks, chat messages, and requests.
- `public/index.html` — Single-page React frontend with task list and dual agent chat UI.
- `infra/` — Bicep and parameter files for Azure deployment.
