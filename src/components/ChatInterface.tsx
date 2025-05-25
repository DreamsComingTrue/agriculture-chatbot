import { useState, useRef, useEffect } from 'react';
import type { Message } from '@/types/types';
import { promptGenerator } from '@/lib/promptGenerator';
import { generateResponse } from '@/lib/ollamaService';
import { ImageUploader } from './ImageUploader';

interface ChatInterfaceProps {
  defaultModel: string;
  multimodalModel: string;
}

export const ChatInterface = ({
  defaultModel = 'deepseek-r1:7b',
  multimodalModel = 'qwen:2.5-vl'
}: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      text: input,
      sender: 'user',
      images: images.length > 0 ? [...images] : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setImages([]);

    // Initialize AI message
    setMessages(prev => [...prev, {
      text: '',
      sender: 'ai',
      isComplete: false
    }]);

    // Determine which model to use
    const modelToUse = userMessage.images ? multimodalModel : defaultModel;
    const fullPrompt = promptGenerator.generateAsAgricultureExpert(input, images);

    abortControllerRef.current = new AbortController();

    try {
      await generateResponse(
        {
          model: modelToUse,
          prompt: fullPrompt,
          stream: true,
          images: userMessage.images
        },
        (data) => {
          if (data.response) {
            setMessages(prev => {
              const updated = [...prev];
              const lastIdx = updated.length - 1;
              updated[lastIdx] = {
                ...updated[lastIdx],
                text: (updated[lastIdx].text || '') + data.response
              };
              return updated;
            });
          }
        },
        (error) => {
          console.error('Error:', error);
          setMessages(prev => [...prev, {
            text: `Error: ${error.message}`,
            sender: 'ai',
            isComplete: true
          }]);
        },
        abortControllerRef.current?.signal
      );

      // Mark as complete
      setMessages(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        updated[lastIdx] = {
          ...updated[lastIdx],
          isComplete: true
        };
        return updated;
      });

      // Save to prompt history
      promptGenerator.addToHistory(fullPrompt, modelToUse);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-center mb-6 text-blue-600">
        {images.length > 0 ? 'Multimodal Chat' : 'Text Chat'}
      </h1>

      <ImageUploader onImagesChange={setImages} />

      <div className="bg-white rounded-lg shadow-md p-4 h-96 overflow-y-auto mb-4">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-center mt-4">
            {images.length > 0
              ? 'Upload images and ask questions about them'
              : 'Send a message to start chatting'}
          </p>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`mb-3 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
              <span className={`inline-block px-4 py-2 rounded-lg ${msg.sender === 'user'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-800'
                }`}>
                {msg.text}
                {!msg.isComplete && msg.sender === 'ai' && (
                  <span className="ml-2 inline-block h-2 w-2 animate-pulse rounded-full bg-blue-400"></span>
                )}
              </span>

              {msg.images && msg.images.length > 0 && (
                <div className={`flex flex-wrap gap-2 mt-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}>
                  {msg.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Attached ${idx}`}
                      className="h-16 w-16 object-cover rounded"
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={images.length > 0
            ? "Ask about the images..."
            : "Type your message..."}
          className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        {isLoading ? (
          <button
            onClick={stopGeneration}
            className="px-6 py-3 rounded-lg font-medium bg-red-500 !important hover:bg-red-600 !important text-white"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className={`px-6 py-3 rounded-lg font-medium ${!input.trim()
              ? 'bg-gray-400 !important cursor-not-allowed'
              : 'bg-blue-600 !important hover:bg-blue-700 !important text-white'
              }`}
          >
            Send
          </button>
        )}
      </div>
    </div>
  );
};
