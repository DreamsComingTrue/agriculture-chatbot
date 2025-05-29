import { ChatInterface } from '@/components/ChatInterface';
import './locales/i18n';

function App() {
  return (
    <div className="App">
      <ChatInterface
        defaultModel="deepseek-r1:7b"
        multimodalModel="qwen2.5vl:7b"
      />
    </div>
  );
}

export default App;
