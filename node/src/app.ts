import express, { Request, Response } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import swaggerUI from 'swagger-ui-express';

// Services and Agents
import { TaskService } from './services/TaskService';
import { LangGraphTaskAgent } from './agents/LangGraphTaskAgent';
import { FoundryTaskAgent } from './agents/FoundryTaskAgent';
import { createApiRoutes } from './routes/api';

// Types
import { 
    ChatRequest
} from './types';

// Load environment variables
dotenv.config();

export class TaskManagerApp {
    private app: express.Application;
    private port: number;
    private taskService: TaskService;
    private langGraphAgent: LangGraphTaskAgent;
    private foundryAgent: FoundryTaskAgent;

    constructor() {
        this.app = express();
        this.port = parseInt(process.env.PORT || '3000', 10);
        
        // Initialize services
        this.taskService = new TaskService();
        this.langGraphAgent = new LangGraphTaskAgent(this.taskService);
        this.foundryAgent = new FoundryTaskAgent(this.taskService);
        
        this.setupMiddleware();
        this.setupRoutes();
    }

    private setupMiddleware(): void {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(express.static(path.join(__dirname, '../public')));
    }

    private setupRoutes(): void {
        // Use the API routes module with /api prefix
        const apiRouter = createApiRoutes(this.taskService, this.langGraphAgent, this.foundryAgent);
        this.app.use('/api', apiRouter);

        // Serve React app
        this.app.get('/{*any}', (req: Request, res: Response) => {
            res.sendFile(path.join(__dirname, '../public/index.html'));
        });
    }

    start(): void {
        this.app.listen(this.port, () => {
            console.log(`Task Manager app listening on port ${this.port}`);
        });
    }

    async shutdown(): Promise<void> {
        console.log('Shutting down Task Manager app...');
        
        // Cleanup resources
        this.taskService.close();
        await this.foundryAgent.cleanup();
        
        process.exit(0);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    if ((global as any).app) {
        await (global as any).app.shutdown();
    }
});

process.on('SIGTERM', async () => {
    if ((global as any).app) {
        await (global as any).app.shutdown();
    }
});

// Start the application
const app = new TaskManagerApp();
(global as any).app = app;
app.start();
