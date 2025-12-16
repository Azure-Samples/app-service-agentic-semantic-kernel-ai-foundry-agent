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
    // 4. Maintain messages in-memory rather than loading from ConversationsClient for
    //    simplicity of code while persisting messages persist across component navigation 
    //    via scoped DI lifetime

    public interface IFoundryAgentProvider
    {
        ProjectResponsesClient? ResponseClient { get; }
        ProjectConversation? Conversation { get; }
        ProjectConversationsClient? ConversationsClient { get; }
        List<ChatMessageDisplay> Messages { get; }
    }

    public class ChatMessageDisplay
    {
        public string Content { get; set; } = string.Empty;
        public bool IsUser { get; set; }
    }

    public class FoundryAgentProvider : IFoundryAgentProvider
    {
        private readonly Lazy<(ProjectResponsesClient? ResponseClient, ProjectConversation? Conversation, ProjectConversationsClient? ConversationsClient)> _lazyClients;

        public ProjectResponsesClient? ResponseClient => _lazyClients.Value.ResponseClient;
        public ProjectConversation? Conversation => _lazyClients.Value.Conversation;
        public ProjectConversationsClient? ConversationsClient => _lazyClients.Value.ConversationsClient;
        public List<ChatMessageDisplay> Messages { get; } = new();

        public FoundryAgentProvider(IConfiguration config)
        {
            // Use Lazy<T> to defer client creation until first access
            _lazyClients = new Lazy<(ProjectResponsesClient?, ProjectConversation?, ProjectConversationsClient?)>(() =>
            {
                // Get Microsoft Foundry configuration
                var endpoint = config["FoundryProjectEndpoint"];
                var agentName = config["FoundryAgentName"];
                var modelDeployment = config["ModelDeployment"];
                
                if (string.IsNullOrWhiteSpace(endpoint) || string.IsNullOrWhiteSpace(agentName))
                {
                    return (null, null, null);
                }

                try
                {
                    // Create project client
                    var projectClient = new AIProjectClient(new Uri(endpoint), new DefaultAzureCredential());
                    
                    // Get an existing agent from Microsoft Foundry
                    var agent = projectClient.Agents.GetAgent(agentName);
                    
                    // Get conversations client for retrieving history
                    var conversationsClient = projectClient.OpenAI.Conversations;
                    
                    // Create conversation for this browser session
                    var conversation = conversationsClient.CreateProjectConversation().Value;
                    
                    // Get response client for this agent and conversation
                    var responseClient = projectClient.OpenAI.GetProjectResponsesClientForAgent(agentName, conversation.Id);
                    
                    return (responseClient, conversation, conversationsClient);
                }
                catch (Exception)
                {
                    // If agent initialization fails, return null
                    // This prevents the entire app from crashing
                    return (null, null, null);
                }
            });
        }
    }
}
