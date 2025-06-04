export type Message = {
  text: string;
  sender: 'user' | 'ai';
  isComplete?: boolean;
  images?: string[];
};

export type OllamaRequest = {
  model: string;
  prompt: string;
  stream: boolean;
  images?: string[];
};

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
