// 获取当前页面的主机名，用于API请求
const getApiBaseUrl = (): string => {
  // 如果是开发环境且在移动端访问
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    // 使用访问前台的主机名，但端口改为8000（后端端口）
    return `http://${window.location.hostname}:8000/api/v1`;
  }
  // 默认localhost（电脑端开发）
  return 'http://localhost:8000/api/v1';
};

const MANAGEMENT_API_BASE = getApiBaseUrl();

interface LogRequest {
  level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';
  module: string;
  message: string;
  model_name?: string;
  chat_id?: string;
  user_id?: string;
  request_id?: string;
  error_code?: string;
  response_time?: number;
  extra_data?: any;
}

export const logToManagement = async (logData: LogRequest): Promise<void> => {
  try {
    // 异步发送，不阻塞UI
    fetch(`${MANAGEMENT_API_BASE}/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(logData)
    }).catch(() => {
      // 静默处理日志发送失败，不影响用户体验
    });
  } catch (error) {
    // 静默处理，日志记录失败不应影响主业务
  }
};

// 便捷的错误日志记录函数
export const logError = (message: string, error: Error, context?: any) => {
  logToManagement({
    level: 'ERROR',
    module: 'frontend_chat',
    message: `${message}: ${error.message}`,
    error_code: 'FRONTEND_ERROR',
    chat_id: context?.chat_id,
    model_name: context?.model,
    request_id: context?.request_id,
    extra_data: {
      error_stack: error.stack,
      context: context
    }
  });
}; 