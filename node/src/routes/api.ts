import { Router, Request, Response } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import { TaskService } from '../services/TaskService';
import { LangGraphTaskAgent } from '../agents/LangGraphTaskAgent';
import { FoundryTaskAgent } from '../agents/FoundryTaskAgent';
import { ChatRequest } from '../types';

/**
 * This function sets up RESTful routes for managing tasks (CRUD operations) and chat endpoints
 * for LangGraph and Foundry agents. It also provides an endpoint to serve the OpenAPI schema.
 *
 * Routes:
 * - GET    /api/schema         : Returns the OpenAPI schema for the API.
 * - GET    /api/tasks          : Retrieves all tasks.
 * - POST   /api/tasks          : Creates a new task.
 * - GET    /api/tasks/:id      : Retrieves a task by its ID.
 * - PUT    /api/tasks/:id      : Updates a task by its ID.
 * - DELETE /api/tasks/:id      : Deletes a task by its ID.
 * - POST   /api/chat/langgraph : Processes a chat message using the LangGraph agent.
 * - POST   /api/chat/foundry   : Processes a chat message using the Foundry agent.
 *
 * @param taskService - Service for handling task-related operations.
 * @param langGraphAgent - Agent for processing chat messages using LangGraph.
 * @param foundryAgent - Agent for processing chat messages using Foundry.
 * @returns An Express Router instance with all API routes configured.
 */
export function createApiRoutes(
    taskService: TaskService, 
    langGraphAgent: LangGraphTaskAgent, 
    foundryAgent: FoundryTaskAgent
): Router {
    const router = Router();

    /**
     * @swagger
     * /api/schema:
     *   get:
     *     summary: Get OpenAPI schema
     *     operationId: getSchema
     *     responses:
     *       200:
     *         description: OpenAPI schema
     */
    router.get('/schema', (req: Request, res: Response) => {
        try {
            const schema = swaggerJsdoc({
                definition: {
                    openapi: '3.0.0',
                    info: {
                        title: 'Task Manager API',
                        version: '1.0.0',
                        description: 'A simple task management API for Azure AI Foundry Agents'
                    },
                    servers: [
                        {
                            url: `${req.protocol}://${req.get('host')}`,
                            description: 'Task API',
                        }
                    ]
                },
                apis: ['./src/routes/*.ts'],
            });
            res.json(schema);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * @swagger
     * /api/tasks:
     *   get:
     *     summary: Get all tasks
     *     operationId: getAllTasks
     *     responses:
     *       200:
     *         description: List of tasks
     */
    router.get('/tasks', async (req: Request, res: Response) => {
        try {
            const tasks = await taskService.getAllTasks();
            res.json(tasks);
        } catch (error) {
            console.error('Error getting tasks:', error);
            res.status(500).json({ error: 'Failed to get tasks' });
        }
    });

    /**
     * @swagger
     * /api/tasks:
     *   post:
     *     summary: Create a new task
     *     operationId: createTask
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               title:
     *                 type: string
     *               isComplete:
     *                 type: boolean
     *     responses:
     *       201:
     *         description: Task created
     */
    router.post('/tasks', async (req: Request, res: Response) => {
        try {
            const { title, isComplete } = req.body;
            if (!title) {
                res.status(400).json({ error: 'Title is required' });
                return;
            }
            const task = await taskService.addTask(title, isComplete || false);
            res.status(201).json(task);
        } catch (error) {
            console.error('Error creating task:', error);
            res.status(500).json({ error: 'Failed to create task' });
        }
    });

    /**
     * @swagger
     * /api/tasks/{id}:
     *   get:
     *     summary: Get task by ID
     *     operationId: getTaskById
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *     responses:
     *       200:
     *         description: Task details
     */
    router.get('/tasks/:id', async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const taskId = parseInt(id, 10);
            if (isNaN(taskId)) {
                res.status(400).json({ error: 'Invalid task ID' });
                return;
            }
            const task = await taskService.getTaskById(taskId);
            if (!task) {
                res.status(404).json({ error: 'Task not found' });
                return;
            }
            res.json(task);
        } catch (error) {
            console.error('Error getting task:', error);
            res.status(500).json({ error: 'Failed to get task' });
        }
    });

    /**
     * @swagger
     * /api/tasks/{id}:
     *   put:
     *     summary: Update a task
     *     operationId: updateTask
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               title:
     *                 type: string
     *               isComplete:
     *                 type: boolean
     *     responses:
     *       200:
     *         description: Task updated
     */
    router.put('/tasks/:id', async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { title, isComplete } = req.body;
            const taskId = parseInt(id, 10);
            if (isNaN(taskId)) {
                res.status(400).json({ error: 'Invalid task ID' });
                return;
            }
            const updated = await taskService.updateTask(taskId, title, isComplete);
            if (!updated) {
                res.status(404).json({ error: 'Task not found' });
                return;
            }
            const task = await taskService.getTaskById(taskId);
            res.json(task);
        } catch (error) {
            console.error('Error updating task:', error);
            res.status(500).json({ error: 'Failed to update task' });
        }
    });

    /**
     * @swagger
     * /api/tasks/{id}:
     *   delete:
     *     summary: Delete a task
     *     operationId: deleteTask
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *     responses:
     *       200:
     *         description: Task deleted
     */
    router.delete('/tasks/:id', async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const taskId = parseInt(id, 10);
            if (isNaN(taskId)) {
                res.status(400).json({ error: 'Invalid task ID' });
                return;
            }
            const deleted = await taskService.deleteTask(taskId);
            if (!deleted) {
                res.status(404).json({ error: 'Task not found' });
                return;
            }
            res.json({ message: 'Task deleted successfully' });
        } catch (error) {
            console.error('Error deleting task:', error);
            res.status(500).json({ error: 'Failed to delete task' });
        }
    });

    // Chat agent routes

    router.post('/chat/langgraph', async (req: Request, res: Response) => {
        try {
            const { message, sessionId }: ChatRequest = req.body;
            
            if (!message) {
                res.status(400).json({ error: 'Message is required' });
                return;
            }

            const response = await langGraphAgent.processMessage(message, sessionId);
            res.json(response);
        } catch (error) {
            console.error('Error in LangGraph chat:', error);
            res.status(500).json({ error: 'Failed to process message' });
        }
    });

    router.post('/chat/foundry', async (req: Request, res: Response) => {
        try {
            const { message, sessionId }: ChatRequest = req.body;
            
            if (!message) {
                res.status(400).json({ error: 'Message is required' });
                return;
            }

            const response = await foundryAgent.processMessage(message);
            res.json(response);
        } catch (error) {
            console.error('Error in Foundry chat:', error);
            res.status(500).json({ error: 'Failed to process message' });
        }
    });

    return router;
}
