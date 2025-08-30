import { useRef, useCallback, useEffect } from 'react'
import { synthesizeSpeech } from '@/lib/xunfeiTTS'
import { toByteArray } from 'base64-js'

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
  const playQueueRef = useRef<AudioTask[]>([])
  const isProcessingRef = useRef(false)
  const isPlayingRef = useRef(false)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const nextTaskIdRef = useRef(0)
  const maxConcurrentSynthesis = useRef(3)
  const activeSynthesisCount = useRef(0)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const playPollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // 停止合成轮询
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    isProcessingRef.current = false
  }, [])

  // 停止播放轮询
  const stopPlayPolling = useCallback(() => {
    if (playPollIntervalRef.current) {
      clearInterval(playPollIntervalRef.current)
      playPollIntervalRef.current = null
    }
    isPlayingRef.current = false
  }, [])

  // 检查文本是否匹配忽略规则
  const shouldIgnoreText = useCallback((text: string): boolean => {
    const ignorePatterns = [
      /^RAG image:.*?\n\n$/,
      /^loading:.*?\n\n$/
    ]
    const shouldIgnore = ignorePatterns.some(pattern => pattern.test(text))
    if (shouldIgnore) {
      console.log('忽略文本:', text.substring(0, 50) + '...')
    }
    return shouldIgnore
  }, [])

  // 修复的 Base64 转 Blob 函数
  const base64ToBlob = useCallback((base64: string, mimeType: string = 'audio/mp3'): Blob => {
    try {
      const base64Data = base64.replace(/^data:[^;]+;base64,/, '')
      const cleanBase64 = base64Data.replace(/[^A-Za-z0-9+/=]/g, '')
      const byteArray = toByteArray(cleanBase64)
      return new Blob([byteArray], { type: mimeType })
    } catch (error) {
      console.error('Base64 转换失败:', error)
      throw new Error('Base64 数据格式错误')
    }
  }, [])

  // 验证 Base64 字符串是否完整
  const validateBase64 = useCallback((base64: string): boolean => {
    if (base64.length % 4 !== 0) {
      console.warn('Base64 字符串长度不是 4 的倍数，可能不完整')
      return false
    }

    if (/[^A-Za-z0-9+/=]/.test(base64)) {
      console.warn('Base64 字符串包含非法字符')
      return false
    }

    return true
  }, [])


  // 修复 Base64 填充
  const fixBase64Padding = useCallback((base64: string): string => {
    let cleanBase64 = base64.replace(/[^A-Za-z0-9+/=]/g, '')
    while (cleanBase64.length % 4 !== 0) {
      cleanBase64 += '='
    }
    return cleanBase64
  }, [])

  // 修复的播放函数
  const playAudio = useCallback(async (base64Buffer: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        if (!validateBase64(base64Buffer)) {
          console.warn('Base64 数据可能不完整，尝试修复...')
          base64Buffer = fixBase64Padding(base64Buffer)
        }

        const audioBlob = base64ToBlob(base64Buffer, 'audio/mp3')
        const audioUrl = URL.createObjectURL(audioBlob)

        const audio = new Audio(audioUrl)
        currentAudioRef.current = audio

        audio.onloadedmetadata = () => {
          console.log('音频时长:', audio.duration, '秒')
        }

        audio.oncanplaythrough = () => {
          console.log('音频可以完整播放')
        }

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl)
          currentAudioRef.current = null
          isPlayingRef.current = false
          resolve()
        }

        audio.onerror = (error) => {
          console.error('音频播放错误:', error)
          URL.revokeObjectURL(audioUrl)
          currentAudioRef.current = null
          isPlayingRef.current = false
          reject(error)
        }

        const timeoutId = setTimeout(() => {
          console.warn('音频加载超时')
          audio.pause()
          URL.revokeObjectURL(audioUrl)
          isPlayingRef.current = false
          reject(new Error('音频加载超时'))
        }, 10000)

        audio.oncanplay = () => {
          clearTimeout(timeoutId)
          isPlayingRef.current = true
          audio.play().catch((err) => {
            console.error('播放失败:', err)
            isPlayingRef.current = false
            reject(err)
          })
        }

      } catch (error) {
        isPlayingRef.current = false
        reject(error)
      }
    })
  }, [base64ToBlob, validateBase64, fixBase64Padding])

  // 启动播放轮询
  const startPlayPolling = useCallback(() => {
    if (isPlayingRef.current || playQueueRef.current.length === 0) return

    console.log('启动播放轮询')

    // 清除现有的播放轮询（如果有）
    stopPlayPolling()

    // 设置新的播放轮询
    playPollIntervalRef.current = setInterval(async () => {
      // 检查播放队列是否为空
      if (playQueueRef.current.length === 0) {
        console.log('播放队列为空，停止播放轮询')
        stopPlayPolling()
        return
      }

      // 如果当前正在播放，等待下一次轮询
      if (isPlayingRef.current) {
        return
      }

      // 确保只播放第一个就绪的任务（按ID顺序）
      const nextTask = playQueueRef.current[0]

      if (nextTask.status !== 'ready') {
        console.log('任务未就绪:', nextTask.id, nextTask.status)
        return
      }

      try {
        console.log('开始播放任务:', nextTask.id)
        nextTask.status = 'playing'
        await playAudio(nextTask.audioData!)

        // 播放完成后更新状态
        nextTask.status = 'completed'

        // 从播放队列中移除
        const removedTask = playQueueRef.current.shift()
        console.log('播放完成，移除任务:', removedTask?.id)

        // 从任务队列中也移除
        taskQueueRef.current = taskQueueRef.current.filter(t => t.id !== nextTask.id)

        if (playQueueRef.current.length === 0) {
          console.log('播放队列为空，停止播放轮询')
          stopPlayPolling()
        }
      } catch (error) {
        console.error('播放音频失败:', error)
        nextTask.status = 'error'

        // 即使失败也移除，避免阻塞队列
        playQueueRef.current.shift()

        if (playQueueRef.current.length === 0) {
          stopPlayPolling()
        }
      }
    }, 100)
  }, [playAudio, stopPlayPolling])

  // 启动轮询处理任务队列
  const startPolling = useCallback(() => {
    if (isProcessingRef.current || taskQueueRef.current.length === 0) return

    isProcessingRef.current = true
    console.log('启动合成轮询')

    // 清除现有的轮询（如果有）
    stopPolling()

    // 设置新的轮询
    pollIntervalRef.current = setInterval(async () => {
      // 检查任务队列是否为空
      if (taskQueueRef.current.length === 0) {
        console.log('任务队列为空，停止合成轮询')
        stopPolling()
        return
      }

      try {
        // 找出所有待处理的任务
        const pendingTasks = taskQueueRef.current.filter(
          task => task.status === 'pending'
        )

        // 如果没有待处理任务，检查是否还有正在合成的任务
        if (pendingTasks.length === 0) {
          const synthesizingTasks = taskQueueRef.current.filter(
            task => task.status === 'synthesizing'
          )

          // 如果没有正在合成的任务，停止轮询
          if (synthesizingTasks.length === 0) {
            console.log('没有待处理任务，停止合成轮询')
            stopPolling()
            return
          }

          // 还有任务正在合成，继续等待
          return
        }

        // 计算可以启动的新任务数量
        const availableSlots = maxConcurrentSynthesis.current - activeSynthesisCount.current
        const tasksToProcess = pendingTasks.slice(0, Math.max(0, availableSlots))

        if (tasksToProcess.length === 0) {
          // 没有可用槽位，继续等待
          return
        }

        console.log(`开始处理 ${tasksToProcess.length} 个合成任务`)

        // 并行处理合成任务
        await Promise.allSettled(
          tasksToProcess.map(async (task) => {
            try {
              activeSynthesisCount.current++
              task.status = 'synthesizing'
              console.log('开始合成任务:', task.id)

              task.audioData = await synthesizeSpeech(task.text)
              task.status = 'ready'
              console.log('合成完成:', task.id)

              // 确保按任务ID顺序添加到播放队列
              let insertIndex = playQueueRef.current.length
              for (let i = 0; i < playQueueRef.current.length; i++) {
                if (playQueueRef.current[i].id > task.id) {
                  insertIndex = i
                  break
                }
              }

              playQueueRef.current.splice(insertIndex, 0, task)
              console.log('添加到播放队列:', task.id, '位置:', insertIndex)

              // 启动播放轮询
              startPlayPolling()
            } catch (error) {
              console.error('处理音频任务失败:', error)
              task.status = 'error'
            } finally {
              activeSynthesisCount.current--
            }
          })
        )
      } catch (error) {
        console.error('处理任务队列时出错:', error)
        stopPolling()
      }
    }, 100)
  }, [startPlayPolling, stopPolling])

  // 合并缓冲区内容并添加到任务队列
  const flushBuffer = useCallback(() => {
    if (bufferRef.current.length === 0) return

    const fullText = bufferRef.current.join('')
    console.log('合成文本:', fullText.substring(0, 100) + (fullText.length > 100 ? '...' : ''))

    // 清空缓冲区前检查是否已经有相同的任务在处理
    const existingTask = taskQueueRef.current.find(
      task => task.text === fullText && (task.status === 'pending' || task.status === 'synthesizing' || task.status === 'ready')
    )

    if (existingTask) {
      console.log('已有相同任务在处理，跳过重复合成')
      bufferRef.current = []
      return
    }

    bufferRef.current = []

    // 创建新任务并添加到队列
    const taskId = nextTaskIdRef.current++
    const newTask = {
      id: taskId,
      text: fullText,
      timestamp: Date.now(),
      status: 'pending' as const
    }

    taskQueueRef.current.push(newTask)
    console.log('创建新任务:', taskId)

    // 启动轮询处理
    startPolling()
  }, [startPolling])

  // 添加片段到缓冲区
  const addToAudioQueue = useCallback((str: string) => {
    if (shouldIgnoreText(str)) return

    bufferRef.current.push(str)

    if (/[.!?。！？]$/.test(str)) {
      flushBuffer()
    }
  }, [flushBuffer, shouldIgnoreText])

  // 停止当前播放
  const stopPlayback = useCallback(() => {
    console.log('停止所有播放和轮询')
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
    }
    isPlayingRef.current = false
    stopPolling()
    stopPlayPolling()
  }, [stopPolling, stopPlayPolling])

  // 清空队列
  const clearQueue = useCallback(() => {
    console.log('清空所有队列')
    taskQueueRef.current = []
    playQueueRef.current = []
    bufferRef.current = []
    stopPlayback()
  }, [stopPlayback])

  // 重试失败的任务
  const retryFailedTasks = useCallback(() => {
    console.log('重试失败的任务')
    let retryCount = 0
    taskQueueRef.current.forEach(task => {
      if (task.status === 'error') {
        task.status = 'pending'
        retryCount++
      }
    })

    if (retryCount > 0) {
      console.log(`重试 ${retryCount} 个失败任务`)
      startPolling()
    }
  }, [startPolling])

  // 获取队列状态
  const getQueueStatus = useCallback(() => {
    return {
      bufferLength: bufferRef.current.length,
      taskQueue: [...taskQueueRef.current],
      playQueue: [...playQueueRef.current],
      isProcessing: isProcessingRef.current,
      isPlaying: isPlayingRef.current,
      activeSynthesisCount: activeSynthesisCount.current,
      isPolling: pollIntervalRef.current !== null,
      isPlayPolling: playPollIntervalRef.current !== null
    }
  }, [])

  // 组件卸载时清理所有轮询
  useEffect(() => {
    return () => {
      stopPolling()
      stopPlayPolling()
    }
  }, [stopPolling, stopPlayPolling])

  return {
    addToAudioQueue,
    flushBuffer,
    stopPlayback,
    clearQueue,
    retryFailedTasks,
    getQueueStatus,
  }
}
