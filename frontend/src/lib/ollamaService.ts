import type { OllamaRequest, OllamaResponse } from "@/types/types";

export const generateResponse = async (
  request: OllamaRequest,
  onData: (data: OllamaResponse) => void,
  onError: (error: Error) => void,
  signal?: AbortSignal
) => {
  try {
    // Convert images to base64 if they exist
    // 修改 payload 生成逻辑
    const payload = {
      ...request,
      prompt: request.prompt,        // ✅ 发送query而不是prompt  
      chat_id: request.chat_id,    // ✅ 发送chat_id
      images: request.images?.map(img =>
        img.startsWith('data:') ? img.split(',')[1] : img
      ) || [],
    };

    const domain = window.location.hostname;
    const response = await fetch(`http://${domain + ":" + import.meta.env.VITE_OLLAMA_PORT}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal
    });
    // const response = await { ok: true, body: { getReader: () => ({ read: () => ({ done: true, value: new ArrayBuffer() }) }) }, status: 200 }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader available');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        onData({ model: "", type: 'done' });
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');

      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (!line.startsWith('data:')) continue;

        const jsonPart = line.replace(/^data:\s*/, '');
        try {
          const parsed = JSON.parse(jsonPart);

          switch (parsed.type) {
            case 'delta':
              onData({ type: 'delta', token: parsed.token, model: parsed.model });
              break;
            case 'done':
              onData({ type: 'done', model: parsed.model });
              break;
            case 'error':
              onError(new Error(parsed.message));
              break;
            default:
              console.warn('Unknown message type:', parsed.type);
          }

        } catch (_e) {
          console.error('Failed to parse JSON chunk:', jsonPart);
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
