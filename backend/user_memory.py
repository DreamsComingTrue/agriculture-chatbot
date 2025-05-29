from memory import WindowedSummaryMemory


class UserMemoryManager:
    def __init__(self):
        self.user_memories = {}  # {chatID: {model_name: memory_instance}}

    def get_memory(self, chat_id, llm):
        model_name = llm.model  # 假设 llm 是 Ollama 实例，包含 model 属性
        if chat_id not in self.user_memories:
            self.user_memories[chat_id] = {}

        if model_name not in self.user_memories[chat_id]:
            # 创建新的记忆实例
            self.user_memories[chat_id][model_name] = WindowedSummaryMemory(
                llm=llm, max_window=10
            )

        return self.user_memories[chat_id][model_name]
