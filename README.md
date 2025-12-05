# Agentic Azure App Service app with Microsoft Agent Framework and Microsoft Foundry

This repository demonstrates how to build a modern .NET web application that integrates with both Microsoft Agent Framework and Foundry Agent Service. It provides a simple CRUD task list and two interactive chat agents.

## Getting Started

See [Tutorial: Build an agentic web app in Azure App Service with Microsoft Agent Framework or Foundry Agent Service (.NET)](https://learn.microsoft.com/azure/app-service/tutorial-ai-agentic-web-app-semantic-kernel-foundry).

## Features

- **Task List**: Simple CRUD web app application.
- **Microsoft Agent Framework Agent**: Chat with an agent powered by Microsoft Agent Framework.
- **Foundry Agent Service**: Chat with an agent created in Microsoft Foundry portal.
- **OpenAPI Schema**: Enables integration with external agents.

## Project Structure

- `Components/Layout/NavMenu.razor` — Sidebar navigation menu.
- `Components/Layout/MainLayout.razor` — Main layout with sidebar and content area.
- `Components/Pages/TaskList.razor` — Task list CRUD UI.
- `Components/Pages/AgentFrameworkAgent.razor` — Microsoft Agent Framework chat agent UI.
- `Components/Pages/FoundryAgent.razor` — Foundry Agent Service chat UI (uses Microsoft Foundry SDK).
- `Models/` — Data models for tasks and chat messages.
- `Services/` — Service classes for task management and agent providers.
- `Plugins/` — Example plugin for task CRUD operations.
- `infra/` — Bicep and parameter files for Azure deployment.
