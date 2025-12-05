using Microsoft.Extensions.AI;
using Microsoft.Agents.AI;
using Azure.AI.OpenAI;
using Azure.Identity;
using CRUDTasksWithAgent.Tools;

namespace CRUDTasksWithAgent.Services
{
    // This provider uses lazy initialization - the agent is only created when first accessed.
    // This allows:
    // 1. TaskList.razor to work independently without agent configuration
    // 2. Agent creation errors only affect the agent page, not the whole app
    // 3. Follows DI best practices while maintaining graceful degradation

    public interface IAgentFrameworkProvider
    {
        AIAgent? Agent { get; }
    }

    public class AgentFrameworkProvider : IAgentFrameworkProvider
    {
        private readonly Lazy<AIAgent?> _lazyAgent;

        public AIAgent? Agent => _lazyAgent.Value;

        public AgentFrameworkProvider(IConfiguration config, IServiceProvider sp)
        {
            // Use Lazy<T> to defer agent creation until first access
            _lazyAgent = new Lazy<AIAgent?>(() =>
            {
                // Get Azure OpenAI configuration
                var deployment = config["ModelDeployment"];
                var endpoint = config["AzureOpenAIEndpoint"];
                if (string.IsNullOrWhiteSpace(deployment) || string.IsNullOrWhiteSpace(endpoint))
                {
                    return null;
                }

                try
                {
                    // Create IChatClient
                    IChatClient chatClient = new AzureOpenAIClient(
                            new Uri(endpoint),
                            new DefaultAzureCredential())
                        .GetChatClient(deployment)
                        .AsIChatClient();

                    // Get TaskCrudTool instance from service provider
                    var taskCrudTool = sp.GetRequiredService<TaskCrudTool>();

                    // Create agent with tools
                    var agent = chatClient.CreateAIAgent(
                        instructions: @"You are an agent that manages tasks using CRUD operations. 
                            Use the provided functions to create, read, update, and delete tasks. 
                            Always call the appropriate function for any task management request.
                            Don't try to handle any requests that are not related to task management.
                            When handling requests, if you're missing any information, don't make it up but prompt the user for it instead.",
                        tools:
                        [
                            AIFunctionFactory.Create(taskCrudTool.CreateTaskAsync),
                            AIFunctionFactory.Create(taskCrudTool.ReadTasksAsync),
                            AIFunctionFactory.Create(taskCrudTool.UpdateTaskAsync),
                            AIFunctionFactory.Create(taskCrudTool.DeleteTaskAsync)
                        ]);

                    return agent;
                }
                catch
                {
                    // If agent creation fails, return null
                    // This prevents the entire app from crashing
                    return null;
                }
            });
        }
    }
}
