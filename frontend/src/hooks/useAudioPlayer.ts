import { useRef, useCallback } from 'react'
import { synthesizeSpeech } from '@/lib/xunfeiTTS'
import { toByteArray } from 'base64-js';

interface AudioTask {
  id: number
  text: string
  timestamp: number
  status: 'pending' | 'synthesizing' | 'ready' | 'playing' | 'completed' | 'error'
  audioData?: string
}

export const useAudioPlayer = () => {
  const bufferRef = useRef<string[]>([])
  const taskQueueRef = useRef<AudioTask[]>([])
  const isProcessingRef = useRef(false)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const nextTaskIdRef = useRef(0)
  const activeTaskIdRef = useRef<number | null>(null)

  // 检查文本是否匹配忽略规则
  const shouldIgnoreText = (text: string): boolean => {
    // 定义需要忽略的正则规则
    const ignorePatterns = [
      // 1. 匹配 "RAG image: 任意内容 \n\n"
      /^RAG image:.*?\n\n$/,
      // 2. 匹配 "loading: 任意内容 \n\n"  
      /^loading:.*?\n\n$/
    ];

    // 检查文本是否完全匹配任一模式
    return ignorePatterns.some(pattern => pattern.test(text));
  };
  // 添加片段到缓冲区
  const addToAudioQueue = useCallback((str: string) => {
    if (shouldIgnoreText(str)) return;
    bufferRef.current.push(str)

    // 如果达到15段或遇到句子结束标点，立即合成
    if (bufferRef.current.length >= 50) {
      flushBuffer()
    }
  }, [])

  // 修复的 Base64 转 Blob 函数
  const base64ToBlob = (base64: string, mimeType: string = 'audio/mp3'): Blob => {
    try {
      // 移除可能的 data URI 前缀
      const base64Data = base64.replace(/^data:[^;]+;base64,/, '');

      // 移除所有非 Base64 字符（如空格、换行等）
      const cleanBase64 = base64Data.replace(/[^A-Za-z0-9+/=]/g, '');

      // 使用 base64-js 解码
      const byteArray = toByteArray(cleanBase64);

      return new Blob([byteArray], { type: mimeType });
    } catch (error) {
      console.error('Base64 转换失败:', error);
      throw new Error('Base64 数据格式错误');
    }
  };

  // 验证 Base64 字符串是否完整
  const validateBase64 = (base64: string): boolean => {
    // Base64 字符串长度应该是 4 的倍数
    if (base64.length % 4 !== 0) {
      console.warn('Base64 字符串长度不是 4 的倍数，可能不完整');
      return false;
    }

    // 检查是否包含非法字符
    if (/[^A-Za-z0-9+/=]/.test(base64)) {
      console.warn('Base64 字符串包含非法字符');
      return false;
    }

    return true;
  };

  // 修复的播放函数
  const playAudio = useCallback(async (base64Buffer: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        // 验证 Base64 数据
        if (!validateBase64(base64Buffer)) {
          console.warn('Base64 数据可能不完整，尝试修复...');
          // 尝试修复 Base64 字符串
          base64Buffer = fixBase64Padding(base64Buffer);
        }

        const audioBlob = base64ToBlob(base64Buffer, 'audio/mp3');
        const audioUrl = URL.createObjectURL(audioBlob);

        const audio = new Audio(audioUrl);
        currentAudioRef.current = audio;

        // 添加详细的事件监听
        audio.onloadedmetadata = () => {
          console.log('音频时长:', audio.duration, '秒');
        };

        audio.oncanplaythrough = () => {
          console.log('音频可以完整播放');
        };

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          currentAudioRef.current = null;
          resolve();
        };

        audio.onerror = (error) => {
          console.error('音频播放错误:', error);
          URL.revokeObjectURL(audioUrl);
          currentAudioRef.current = null;
          reject(error);
        };

        // 设置超时
        const timeoutId = setTimeout(() => {
          console.warn('音频加载超时');
          audio.pause();
          URL.revokeObjectURL(audioUrl);
          reject(new Error('音频加载超时'));
        }, 10000);

        audio.oncanplay = () => {
          clearTimeout(timeoutId);
          audio.play().catch((err) => {
            console.error('播放失败:', err);
            reject(err);
          });
        };

      } catch (error) {
        reject(error);
      }
    });
  }, []);

  // 修复 Base64 填充
  const fixBase64Padding = (base64: string): string => {
    // 移除所有非 Base64 字符
    let cleanBase64 = base64.replace(/[^A-Za-z0-9+/=]/g, '');

    // 确保长度是 4 的倍数
    while (cleanBase64.length % 4 !== 0) {
      cleanBase64 += '=';
    }

    return cleanBase64;
  };

  // 处理任务队列
  const processTaskQueue = useCallback(async () => {
    if (isProcessingRef.current || taskQueueRef.current.length === 0) return

    isProcessingRef.current = true

    try {
      // 找到第一个待处理的任务
      const nextTaskIndex = taskQueueRef.current.findIndex(
        task => task.status === 'pending' || task.status === 'ready'
      )

      if (nextTaskIndex === -1) {
        isProcessingRef.current = false
        return
      }

      const task = taskQueueRef.current[nextTaskIndex]
      activeTaskIdRef.current = task.id

      try {
        // 如果任务需要合成，先合成
        if (task.status === 'pending') {
          task.status = 'synthesizing'
          task.audioData = await synthesizeSpeech(task.text)
          task.status = 'ready'
        }

        // 播放音频
        if (task.status === 'ready') {
          task.status = 'playing'
          await playAudio(task.audioData!)
          task.status = 'completed'
        }

        // 从队列中移除已完成的任务
        taskQueueRef.current = taskQueueRef.current.filter(t => t.id !== task.id)
      } catch (error) {
        console.error('处理音频任务失败:', error)
        task.status = 'error'
        // 不立即移除错误任务，允许重试或其他处理
      }
    } finally {
      activeTaskIdRef.current = null
      isProcessingRef.current = false

      // 检查是否有更多任务需要处理
      if (taskQueueRef.current.length > 0) {
        // 使用 setTimeout 避免递归调用栈溢出
        setTimeout(() => processTaskQueue(), 0)
      }
    }
  }, [playAudio])

  // 合并缓冲区内容并添加到任务队列
  const flushBuffer = useCallback(() => {
    if (bufferRef.current.length === 0) return

    const fullText = bufferRef.current.join('')
    console.log('合成文本:', fullText)
    bufferRef.current = []

    // 创建新任务并添加到队列
    const taskId = nextTaskIdRef.current++
    taskQueueRef.current.push({
      id: taskId,
      text: fullText,
      timestamp: Date.now(),
      status: 'pending'
    })

    // 处理任务队列
    processTaskQueue()
  }, [processTaskQueue])

  // 停止当前播放
  const stopPlayback = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
    }
    isProcessingRef.current = false
  }, [])

  // 清空队列
  const clearQueue = useCallback(() => {
    taskQueueRef.current = []
    bufferRef.current = []
    stopPlayback()
  }, [stopPlayback])

  // 重试失败的任务
  const retryFailedTasks = useCallback(() => {
    taskQueueRef.current.forEach(task => {
      if (task.status === 'error') {
        task.status = 'pending'
      }
    })
    processTaskQueue()
  }, [processTaskQueue])

  // 获取队列状态（用于调试或显示）
  const getQueueStatus = useCallback(() => {
    return {
      bufferLength: bufferRef.current.length,
      taskQueue: [...taskQueueRef.current],
      isProcessing: isProcessingRef.current,
      activeTaskId: activeTaskIdRef.current
    }
  }, [])

  return {
    addToAudioQueue,
    flushBuffer,
    stopPlayback,
    clearQueue,
    retryFailedTasks,
    getQueueStatus
  }
}
