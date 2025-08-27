import { useRef, useCallback } from 'react'

export const useAudioPlayer = () => {
  const audioQueueRef = useRef<string[]>([])
  const isPlayingRef = useRef(false)

  const playRealAudio = useCallback(async (base64Audio: string): Promise<void> => {
    return new Promise((resolve) => {
      try {
        // 创建音频元素播放真实的MP3数据
        const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`)

        audio.onended = () => {
          console.log('真实音频播放完成')
          resolve()
        }

        audio.onerror = (error) => {
          console.error('真实音频播放错误:', error)
          resolve()
        }

        audio.oncanplaythrough = () => {
          console.log('音频可以播放')
          audio.play().catch(error => {
            console.error('播放失败:', error)
            resolve()
          })
        }

        audio.load()

        // 设置超时，避免卡住
        setTimeout(() => resolve(), 20000)

      } catch (error) {
        console.error('音频播放异常:', error)
        resolve()
      }
    })
  }, [])

  const processAudioQueue = async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return

    isPlayingRef.current = true
    while (audioQueueRef.current.length > 0) {
      const audioData = audioQueueRef.current.shift()!
      try {
        console.log('开始播放真实音频')
        await playRealAudio(audioData)
        console.log('真实音频播放完成')
      } catch (error) {
        console.error('音频队列处理错误:', error)
      }
    }
    isPlayingRef.current = false
  }

  const addToAudioQueue = (audioData: string) => {
    console.log('收到真实音频数据，添加到队列')
    audioQueueRef.current.push(audioData)
    if (!isPlayingRef.current) {
      processAudioQueue()
    }
  }

  return { addToAudioQueue }
}

