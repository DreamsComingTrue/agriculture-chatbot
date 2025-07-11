export type Message = {
  text: string;
  sender: 'user' | 'ai';
  isComplete?: boolean;
  images?: string[];
};

// 在types文件中更新OllamaRequest类型
export interface OllamaRequest {
  prompt: string;
  chat_id: string;      // 添加chat_id
  images?: string[];
  targetDB?: string;    // the target db
}

export type OllamaResponse =
  | { type: 'delta'; token: string; model: string }
  | { type: 'done'; model?: string }
  | { type: 'error'; message: string; model?: string };

export type PromptGenerator = {
  generate: (input: string, images?: string[]) => string;
  addToHistory: (prompt: string) => void;
};

export type ArchivedPrompt = {
  id: string;
  prompt: string;
  timestamp: Date;
  modelUsed: string;
};
