from .memory import WindowedSummaryMemory


class UserMemoryManager:
    def __init__(self):
        self.user_memories = {}  # {chatID: {model_name: memory_instance}}

    def get_memory(self, chat_id: str, llm: str) -> WindowedSummaryMemory:
        if chat_id not in self.user_memories:
            self.user_memories[chat_id] = {}

        if str not in self.user_memories[chat_id]:
            self.user_memories[chat_id][llm] = WindowedSummaryMemory(max_window=10)

        return self.user_memories[chat_id][llm]
