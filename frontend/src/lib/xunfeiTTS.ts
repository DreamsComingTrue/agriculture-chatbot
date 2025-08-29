import CryptoJS from 'crypto-js';

export interface XunfeiTTSConfig {
  vcn?: string;
  volume?: number;
  speed?: number;
  pitch?: number;
  audio?: {
    encoding: string;
    sample_rate: number;
    channels: number;
    bit_depth: number;
  };
}

// 清理文本
function cleanText(text: string): string {
  if (!text) return '';

  let cleanText = text
    .replace(/<think>.*?<\/think>/gs, '')
    .replace(/<.*?>/gs, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleanText && !/[.!?。！？，,;；]$/.test(cleanText)) {
    cleanText += '.';
  }

  return cleanText;
}

// 生成认证 URL
function assembleWsAuthUrl(wsUrl: string, apikey: string, apisecret: string): string {
  const url = new URL(wsUrl);
  const host = url.host;
  const path = url.pathname;

  const now = new Date();
  const date = now.toUTCString();

  const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;
  const signatureSha = CryptoJS.HmacSHA256(signatureOrigin, apisecret);
  const signatureBase64 = CryptoJS.enc.Base64.stringify(signatureSha);

  const authorizationOrigin = `api_key="${apikey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signatureBase64}"`;
  const authorization = btoa(authorizationOrigin);

  const params = new URLSearchParams({
    host,
    date,
    authorization
  });

  return `${wsUrl}?${params.toString()}`;
}

// 编码文本为 Base64
function encodeTextToBase64(text: string): string {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(text);
  return bytesToBase64(encoded);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// 发送 TTS 请求
function sendTtsRequest(ws: WebSocket, appid: string, text: string, ttsConfig: XunfeiTTSConfig): void {
  const data = {
    header: { app_id: appid, status: 2 },
    parameter: { tts: ttsConfig },
    payload: {
      text: {
        encoding: 'utf8',
        compress: 'raw',
        format: 'plain',
        status: 2,
        seq: 0,
        text: encodeTextToBase64(text)
      }
    }
  };

  ws.send(JSON.stringify(data));
}

// 移除 Data URL 头
const stripDataUrlHeader = (data: string): string => {
  if (typeof data !== 'string') return data;

  // 移除 data:audio/mp3;base64, 或类似的头
  return data.replace(/^data:[^;]+;base64,/, '');
};

// 正确的音频拼接方式
const mergeAudioBuffers = async (base64Chunks: string[]): Promise<string> => {
  try {
    // 1. 将每个 Base64 转换为 ArrayBuffer
    const arrayBuffers = await Promise.all(
      base64Chunks.map(chunk => base64ToArrayBuffer(stripDataUrlHeader(chunk)))
    );

    // 2. 合并所有 ArrayBuffer
    const totalLength = arrayBuffers.reduce((sum, buf) => sum + buf.byteLength, 0);
    const mergedBuffer = new Uint8Array(totalLength);

    let offset = 0;
    for (const buffer of arrayBuffers) {
      mergedBuffer.set(new Uint8Array(buffer), offset);
      offset += buffer.byteLength;
    }

    // 3. 转换回 Base64
    return arrayBufferToBase64(mergedBuffer.buffer);
  } catch (error) {
    console.error('音频合并失败:', error);
    throw error;
  }
};

// Base64 转 ArrayBuffer
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

// ArrayBuffer 转 Base64
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// 主函数：合成语音
export async function synthesizeSpeech(
  text: string,
  config?: XunfeiTTSConfig,
  onError?: (error: string) => void
): Promise<string> {
  const wsUrl = 'wss://cbm01.cn-huabei-1.xf-yun.com/v1/private/mcd9m97e6';

  const appid = import.meta.env.VITE_XUNFEI_ID;
  const apikey = import.meta.env.VITE_XUNFEI_KEY;
  const apisecret = import.meta.env.VITE_XUNFEI_SECRET;

  const cleanTextValue = cleanText(text);
  if (!cleanTextValue || cleanTextValue.length < 3) {
    onError?.('文本太短或为空');
    return "";
  }

  const ttsConfig: XunfeiTTSConfig = {
    vcn: 'x5_lingfeiyi_flow',
    volume: 50,
    speed: 45,
    pitch: 50,
    audio: {
      encoding: 'lame',
      sample_rate: 24000,
      channels: 1,
      bit_depth: 16,
    },
    ...config
  };

  return new Promise((resolve, reject) => {
    const authUrl = assembleWsAuthUrl(wsUrl, apikey, apisecret);
    const ws = new WebSocket(authUrl);
    const audioChunks = new Map<number, string>();

    ws.onopen = () => {
      sendTtsRequest(ws, appid, cleanTextValue, ttsConfig);
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        const code = data.header?.code;

        if (code !== 0) {
          onError?.(`TTS错误: ${JSON.stringify(data)}`);
          ws.close();
          reject(new Error(`TTS错误: ${code}`));
          return;
        }

        if (data.payload?.audio) {
          const audioPayload = data.payload.audio;
          const audioData = audioPayload.audio;
          const seq = audioPayload.seq || 0;

          audioChunks.set(seq, audioData);

          if (audioPayload.status === 2) {
            const sortedSequences = Array.from(audioChunks.keys()).sort((a, b) => a - b);
            const base64Chunks: string[] = [];

            sortedSequences.forEach(seqNum => {
              const chunk = audioChunks.get(seqNum);
              if (chunk) {
                base64Chunks.push(stripDataUrlHeader(chunk));
              }
            });

            // 正确合并音频
            const mergedAudio = await mergeAudioBuffers(base64Chunks);

            ws.close();
            resolve(mergedAudio);
          }
        }
      } catch (error) {
        onError?.(`处理消息错误: ${error}`);
        ws.close();
        reject(error);
      }
    };

    ws.onerror = (error) => {
      onError?.(`WebSocket错误: ${error}`);
      ws.close();
      reject(error);
    };

    ws.onclose = () => {
      // 清理完成
    };

    // 设置超时
    setTimeout(() => {
      if (ws.readyState !== WebSocket.CLOSED) {
        ws.close();
        reject(new Error('TTS请求超时'));
      }
    }, 30000); // 30秒超时
  });
}

