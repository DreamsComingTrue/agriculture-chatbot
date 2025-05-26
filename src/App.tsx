import { ChatInterface } from '@/components/ChatInterface';
import './locales/i18n';

function App() {
  return (
    <div className="App">
      <ChatInterface
        defaultModel="deepseek-r1:7b"
        multimodalModel="qwen:2.5-vl"
      />
    </div>
  );
}

export default App;
