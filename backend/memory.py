from langchain.memory import ConversationSummaryMemory


class WindowedSummaryMemory(ConversationSummaryMemory):
    def __init__(self, llm, max_window=10, *args, **kwargs):
        super().__init__(llm=llm, *args, **kwargs)
        self.max_window = max_window
        self.history = []  # 存储对话历史

    def save_context(self, inputs, outputs):
        super().save_context(inputs, outputs)
        self.history.append({"input": inputs["input"], "output": outputs["response"]})
        if len(self.history) > self.max_window:
            self.history.pop(0)

    def load_memory_variables(self, inputs):
        summary = super().load_memory_variables(inputs)["history"]
        return {"history": summary}
