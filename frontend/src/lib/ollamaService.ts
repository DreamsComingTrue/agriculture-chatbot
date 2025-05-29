import type { OllamaRequest, OllamaResponse } from "@/types/types";

export const generateResponse = async (
  request: OllamaRequest,
  onData: (data: OllamaResponse) => void,
  onError: (error: Error) => void,
  signal?: AbortSignal
) => {
  try {
    // Convert images to base64 if they exist
    const payload = request.images?.length
      ? {
        ...request,
        images: request.images.map(img => {
          // Remove data URL prefix if present
          return img.startsWith('data:')
            ? img.split(',')[1]
            : img;
        })
      }
      : request;

    const response = await fetch(`${import.meta.env.VITE_OLLAMA_DOMAIN}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader available');

    const decoder = new TextDecoder();
    let buffer = '';
    let isFirstChunk = true;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        onData({ model: request.model, done: true }); // Explicit final chunk
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      for (let i = 0; i < lines.length - 1; i++) {
        try {
          const parsed: OllamaResponse = JSON.parse(lines[i]);

          // For multimodal models, the first chunk might be empty
          if (isFirstChunk && request.images?.length && !parsed.response) {
            isFirstChunk = false;
            continue;
          }

          onData(parsed);
        } catch (_e) {
          console.error('Error parsing line:', lines[i]);
        }
      }
      buffer = lines[lines.length - 1];
    }
  } catch (error) {
    if ((error as DOMException).name !== 'AbortError') {
      onError(error as Error);
    }
  }
};
