import { useState, useRef, useEffect } from "react";
import type { Message } from "@/types/types";
import { promptGenerator } from "@/lib/promptGenerator";
import { generateResponse } from "@/lib/ollamaService";
import { ImageUploader } from "./ImageUploader";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { useTranslation } from "react-i18next";
import chatBg from "../assets/chat-bg.png";
import botAvatar from "../assets/bot-avatar.png";
import userAvatar from "../assets/user-avatar.png";
import textBg from "../assets/text-bg.png";
import voiceIcon from "../assets/voice.png";
import voiceActiveIcon from "../assets/voice-active.png";
import sendBg from "../assets/send-bg.png";
import robotPng from "../assets/robot.png";
import voiceGif from '../assets/voice-bg.gif';

interface ChatInterfaceProps {
  defaultModel: string;
  multimodalModel: string;
}

export const ChatInterface = ({
  defaultModel = "deepseek-r1:7b",
  multimodalModel = "qwen:2.5vl:7b"
}: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  // Add this new state for tracking image reset
  const [shouldResetImages, setShouldResetImages] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      text: input,
      sender: "user",
      images: images.length > 0 ? [...images] : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Initialize AI message
    setMessages(prev => [
      ...prev,
      {
        text: "",
        sender: "ai",
        isComplete: false
      }
    ]);

    // Determine which model to use
    const modelToUse = userMessage.images ? multimodalModel : defaultModel;
    // const fullPrompt = promptGenerator.generateAsAgricultureExpert(input, images);

    abortControllerRef.current = new AbortController();

    try {
      await generateResponse(
          {
            query: input,                    // ✅ 发送原始用户输入
            images: userMessage.images,      // ✅ 发送图片
            chat_id: `chat_${Date.now()}`,    // ✅ 添加chat_id
            model: modelToUse,
          },
        (data) => {
          if (data.type == 'delta') {
            setMessages(prev => {
              const updated = [...prev];
              const lastIdx = updated.length - 1;
              updated[lastIdx] = {
                ...updated[lastIdx],
                text: (updated[lastIdx].text || "") + data.token
              };
              return updated;
            });
          }
          // Check if response is complete and we have images
          if (data.type == "done" && userMessage.images) {
            setShouldResetImages(true);
          }
        },
        error => {
          console.error("Error:", error);
          setMessages(prev => [
            ...prev,
            {
              text: `Error: ${error.message}`,
              sender: "ai",
              isComplete: true
            }
          ]);
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
      // promptGenerator.addToHistory(fullPrompt, modelToUse);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Add this useEffect to handle image reset
  useEffect(() => {
    if (shouldResetImages) {
      setImages([]);
      setShouldResetImages(false);
    }
  }, [shouldResetImages]);

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="w-screen mx-auto p-6 bg-[#1a1a1a] min-h-screen">
      <div
        className="relative w-[683px] h-[747px] mx-auto flex flex-col"
        style={{
          backgroundImage: `url(${chatBg})`,
          backgroundSize: "100% 100%",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
        }}
      >
        <img
          src={robotPng}
          className="absolute bottom-[0] left-[-200px] w-[180px]"
        />
        <div className="w-full h-[45px] flex items-center justify-between px-4 flex-shrink-0">
          <span className="chat-title">AI智能决策</span>
        </div>
        <div className="flex-1 overflow-y-auto mb-4 p-4">
          <div className="flex items-start gap-3 text-gray-400">
            <img src={botAvatar} className="w-10 h-10" alt="AI" />
            <div
              className="mb-6"
              style={{
                background: "rgba(17, 96, 73, 0.40)",
                borderRadius: "4px",
                padding: "10px",
                maxWidth: "80%",
                color: "#D7ECFF"
              }}
            >
              您好啊！！我是
              <span style={{ color: "#d6a130" }}>
                人工智能农业模拟器--"小羲"
              </span>
              。我可以为您解答相关农业方面农技、农艺问题，您可以在下方输入框内输入想要提问的问题！！！也可以点击麦克风语音识别！！！很高兴为您服务！！！
            </div>
          </div>
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`mb-6 ${
                msg.sender === "user"
                  ? "flex justify-end"
                  : "flex justify-start"
              }`}
            >
              {msg.sender === "ai" && (
                <img src={botAvatar} className="w-10 h-10 mr-2" alt="AI" />
              )}
              <div
                style={{
                  background: "rgba(17, 96, 73, 0.40)",
                  borderRadius: "4px",
                  padding: "10px",
                  maxWidth: "80%",
                  color: "#D7ECFF"
                }}
              >
                <MarkdownRenderer content={msg.text} className="text-left" />
              </div>
              {msg.sender !== "ai" && (
                <img src={userAvatar} className="w-10 h-10 ml-2" alt="AI" />
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div
          className="flex flex-col gap-2 m-4 flex-shrink-0"
          style={{
            backgroundImage: `url(${isVoiceActive ? voiceGif : textBg})`,
            backgroundSize: "100% 100%",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            padding: "8px 4px"
          }}
        >
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={t(
              images.length > 0 ? "chat.file_placeholder" : "chat.placeholder"
            )}
            className="w-full p-3 bg-transparent text-white placeholder-gray-400 focus:outline-none resize-none"
            disabled={isLoading}
            rows={2}
            style={{
              opacity: isVoiceActive ? 0 : 1,
              pointerEvents: isVoiceActive ? "none" : "auto"
            }}
          />

          <div className="flex items-center justify-end gap-2 mt-2">
            <ImageUploader
              onImagesChange={imgs => {
                setImages(imgs);
              }}
              disabled={isLoading}
              resetTrigger={shouldResetImages}
            />

            <div
              className="w-8 h-8 flex items-center justify-center cursor-pointer"
              onClick={() => setIsVoiceActive(!isVoiceActive)}
            >
              <img
                src={isVoiceActive ? voiceActiveIcon : voiceIcon}
                alt="语音"
                className="w-full h-full"
              />
            </div>

            <div
              className="relative"
              style={{
                backgroundImage: `url(${sendBg})`,
                backgroundSize: "100% 100%",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat"
              }}
            >
              <div
                onClick={
                  isLoading
                    ? stopGeneration
                    : !input.trim()
                    ? undefined
                    : sendMessage
                }
                className={`px-4 h-8 font-medium cursor-pointer ${
                  isLoading
                    ? "text-red-500"
                    : !input.trim()
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-white hover:opacity-80"
                }`}
                style={{ lineHeight: "32px" }}
              >
                {isLoading ? t("chat.stop") : t("chat.send")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
