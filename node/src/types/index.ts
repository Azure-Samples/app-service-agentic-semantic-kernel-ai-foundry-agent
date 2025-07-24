export interface TaskItem {
    id: number;
    title: string;
    isComplete: boolean;
}

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface ChatRequest {
    message: string;
    sessionId?: string;
}
