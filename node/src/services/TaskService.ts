import sqlite3 from 'sqlite3';
import { TaskItem } from '../types';

/**
 * Service class for managing tasks with CRUD operations.
 * This service provides all the necessary operations for task management.
 */
export class TaskService {
    private db: sqlite3.Database;

    constructor() {
        this.db = new sqlite3.Database(':memory:'); // In-memory database
        this.initializeDatabase();
    }

    private initializeDatabase(): void {
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                isComplete BOOLEAN DEFAULT 0
            )
        `;
        
        this.db.run(createTableSQL, (err) => {
            if (err) {
                console.error('Error creating tasks table:', err);
            } else {
                console.log('Tasks table initialized');
            }
        });
    }

    async getAllTasks(): Promise<TaskItem[]> {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM tasks ORDER BY id', (err, rows: any[]) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map(row => ({
                        id: row.id,
                        title: row.title,
                        isComplete: !!row.isComplete
                    })));
                }
            });
        });
    }

    async getTaskById(id: number): Promise<TaskItem | null> {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM tasks WHERE id = ?', [id], (err, row: any) => {
                if (err) {
                    reject(err);
                } else if (row) {
                    resolve({
                        id: row.id,
                        title: row.title,
                        isComplete: !!row.isComplete
                    });
                } else {
                    resolve(null);
                }
            });
        });
    }

    async addTask(title: string, isComplete: boolean = false): Promise<TaskItem> {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO tasks (title, isComplete) VALUES (?, ?)', 
                [title, isComplete ? 1 : 0], 
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({
                            id: this.lastID,
                            title: title,
                            isComplete: isComplete
                        });
                    }
                }
            );
        });
    }

    async updateTask(id: number, title?: string, isComplete?: boolean): Promise<boolean> {
        // Fetch current task to preserve existing values
        const currentTask = await this.getTaskById(id);
        if (!currentTask) {
            return false;
        }
        const updatedTitle = typeof title !== 'undefined' ? title : currentTask.title;
        const updatedComplete = typeof isComplete !== 'undefined' ? isComplete : currentTask.isComplete;
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE tasks SET title = ?, isComplete = ? WHERE id = ?',
                [updatedTitle, updatedComplete ? 1 : 0, id],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(this.changes > 0);
                    }
                }
            );
        });
    }

    async deleteTask(id: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM tasks WHERE id = ?', [id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });
        });
    }

    close(): void {
        this.db.close();
    }
}
