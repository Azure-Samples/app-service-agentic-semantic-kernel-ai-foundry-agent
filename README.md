# Agentic Azure App Service app with Microsoft Agent Framework and Microsoft Foundry

This repository demonstrates how to build a modern .NET web application that integrates with both Microsoft Agent Framework and Foundry Agent Service. It provides a simple CRUD task list and two interactive chat agents.

## Getting Started

See [Tutorial: Build an agentic web app in Azure App Service with Microsoft Agent Framework or Foundry agent Service (.NET)](https://learn.microsoft.com/azure/app-service/tutorial-ai-agent-web-app-semantic-kernel-foundry-dotnet).

## Features

- **Task List**: Simple CRUD web app application.
- **Microsoft Agent Framework Agent**: Chat with an agent powered by Microsoft Agent Framework.
- **Foundry Agent Service**: Chat with an agent created in Microsoft Foundry portal.
- **OpenAPI Schema**: Enables integration with external agents.
- **App Service authentication**: Infrastructure enables Microsoft Entra authentication for the Blazor app and all API endpoints.

## Security configuration note

The Bicep template enables App Service authentication (`authsettingsV2`) with
Microsoft Entra ID. The Microsoft Graph Bicep extension creates the tenant-local
app registration, service principal, and federated identity credential. App
Service uses a user-assigned managed identity as its client assertion, so the
authentication setup is fully declarative and does not use client secrets.

When a Foundry OpenAPI tool calls the protected task API, configure the parent
Foundry resource identity's application ID in the AZD environment:

```bash
azd env set AZURE_AI_FOUNDRY_ACCOUNT_CLIENT_ID <application-id>
azd provision
```

The deployment prints the managed identity audience to use in the OpenAPI tool.
When you run `azd down`, the template also deletes the tenant-level Entra
application created for App Service authentication.

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
