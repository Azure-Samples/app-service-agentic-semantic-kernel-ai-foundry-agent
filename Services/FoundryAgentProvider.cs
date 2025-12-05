using Azure.AI.Projects;
using Azure.AI.Projects.OpenAI;
using Azure.Identity;

namespace CRUDTasksWithAgent.Services
{
    // This provider uses lazy initialization - the agent response client is only created 
    // when first accessed. This allows:
    // 1. Other pages to work independently without Foundry agent configuration
    // 2. Agent initialization errors only affect the agent page, not the whole app
    // 3. Follows DI best practices while maintaining graceful degradation

    public interface IFoundryAgentProvider
    {
        ProjectResponsesClient? ResponseClient { get; } // The response client for chatting
    }

    public class FoundryAgentProvider : IFoundryAgentProvider
    {
        private readonly Lazy<ProjectResponsesClient?> _lazyResponseClient;

        public ProjectResponsesClient? ResponseClient => _lazyResponseClient.Value;

        public FoundryAgentProvider(IConfiguration config)
        {
            // Use Lazy<T> to defer agent client creation until first access
            _lazyResponseClient = new Lazy<ProjectResponsesClient?>(() =>
            {
                // Get Microsoft Foundry configuration
                var endpoint = config["FoundryProjectEndpoint"];
                var agentName = config["FoundryAgentName"];
                var modelDeployment = config["ModelDeployment"];
                
                if (string.IsNullOrWhiteSpace(endpoint) || string.IsNullOrWhiteSpace(agentName))
                {
                    return null;
                }

                try
                {
                    // Create project client
                    var projectClient = new AIProjectClient(new Uri(endpoint), new DefaultAzureCredential());
                    
                    // Get an existing agent from Microsoft Foundry
                    var agent = projectClient.Agents.GetAgent(agentName);
                    
                    // Create conversation for this browser session
                    var conversation = projectClient.OpenAI.Conversations.CreateProjectConversation().Value;
                    
                    // Get response client for this agent and conversation
                    var responseClient = projectClient.OpenAI.GetProjectResponsesClientForAgent(agentName, conversation.Id);
                    
                    return responseClient;
                }
                catch (Exception)
                {
                    // If agent initialization fails, return null
                    // This prevents the entire app from crashing
                    return null;
                }
            });
        }
    }
}
