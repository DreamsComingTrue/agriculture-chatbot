from langchain_core.runnables import Runnable
from memory import WindowedSummaryMemory


class UserMemoryManager:
    def __init__(self):
        self.user_memories = {}  # {chatID: {model_name: memory_instance}}

    def get_memory(self, chat_id: str, llm: Runnable) -> WindowedSummaryMemory:
        model_name = getattr(llm, "model", "default_model")
        if chat_id not in self.user_memories:
            self.user_memories[chat_id] = {}

        if model_name not in self.user_memories[chat_id]:
            self.user_memories[chat_id][model_name] = WindowedSummaryMemory(
                llm=llm, max_window=10
            )

        return self.user_memories[chat_id][model_name]
