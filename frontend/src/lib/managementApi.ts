// 管理后台API调用服务 - 增强版
// 获取当前页面的主机名，用于API请求
const getApiBaseUrl = (): string => {
  // 如果是开发环境且在移动端访问
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    // 使用访问前台的主机名，但端口改为8000（后端端口）
    return `http://${window.location.hostname}:8100/api/v1`;
  }
  // 默认localhost（电脑端开发）
  return 'http://localhost:8100/api/v1';
};

const MANAGEMENT_API_BASE = getApiBaseUrl();

// 用户会话接口
interface UserSession {
  userId: string;
  currentChatId: string;
  lastActivity: number;
}

// 会话超时时间：1小时
const SESSION_TIMEOUT = 60 * 60 * 1000; // 1小时

// localStorage键名
const STORAGE_KEYS = {
  USER_SESSION: 'agriculture_user_session'
};

// 生成UUID
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// 获取用户会话
export const getUserSession = (): UserSession => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.USER_SESSION);
    
    if (stored) {
      const session: UserSession = JSON.parse(stored);
      
      // 检查会话是否过期
      const timeDiff = Date.now() - session.lastActivity;
      const isExpired = timeDiff > SESSION_TIMEOUT;
      
      if (!isExpired) {
        return session;
      }
    }
  } catch (error) {
    console.error('获取用户会话失败:', error);
  }
  
  // 创建新会话
  const newSession: UserSession = {
    userId: generateUUID(),
    currentChatId: '',
    lastActivity: Date.now()
  };
  
  saveUserSession(newSession);
  return newSession;
};

// 保存用户会话
export const saveUserSession = (session: UserSession): void => {
  try {
    session.lastActivity = Date.now();
    localStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(session));
  } catch (error) {
    console.error('保存用户会话失败:', error);
  }
};

// 更新当前对话ID
export const updateCurrentChatId = (chatId: string): void => {
  const session = getUserSession();
  session.currentChatId = chatId;
  saveUserSession(session);
};

// 清除用户会话（用于重置）
export const clearUserSession = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.USER_SESSION);
  } catch (error) {
    console.error('清除用户会话失败:', error);
  }
};

// 增强的用户消息创建
export const saveUserMessage = async (content: string, modelName: string, promptVersion?: string) => {
  try {
    const session = getUserSession();
    
    const requestBody = {
      content,
      model_name: modelName,
      user_id: session.userId,
      chat_id: session.currentChatId || undefined,
      prompt_version: promptVersion
    };
    
    const response = await fetch(`${MANAGEMENT_API_BASE}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    // 更新会话信息
    if (result.chat_id) {
      updateCurrentChatId(result.chat_id);
    }
    
    return result;
  } catch (error) {
    console.error('保存用户消息失败:', error);
    return null;
  }
};

// 增强的AI回答保存
export const saveAIResponse = async (
  userMessageId: string, 
  content: string, 
  modelName: string,
  responseTime?: number,
  tokensUsed?: number,
  promptVersion?: string
) => {
  try {
    const response = await fetch(`${MANAGEMENT_API_BASE}/ai-response`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_message_id: userMessageId,
        content,
        model_name: modelName,
        response_time: responseTime,
        tokens_used: tokensUsed,
        prompt_version: promptVersion
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('保存AI回答失败:', error);
    return null;
  }
};

// 获取Prompt版本
export const getPromptVersion = async (modelName: string) => {
  try {
    const response = await fetch(`${MANAGEMENT_API_BASE}/prompt/${modelName}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return result.version || '1.0';
  } catch (error) {
    console.error('获取Prompt版本失败:', error);
    return '1.0'; // 默认版本
  }
};