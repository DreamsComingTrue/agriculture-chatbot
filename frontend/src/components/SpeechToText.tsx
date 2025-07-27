/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from "react";
import voiceIcon from "../assets/voice.png";
import voiceActiveIcon from "../assets/voice-active.png";
import rotating_circle from "@/assets/rotating_circle.gif";
import type { RecorderManager } from "@/index";

import CryptoJS from "crypto-js"; // 用于生成签名
import { VoiceWakeup } from "./VoiceWakeup";

interface SpeechToTextProps {
  disabled: boolean;
  afterTranslate?: (str: string) => void;
  onVoiceActive?: () => void;
  onVoiceInActive?: () => void;
}

export const SpeechToText: React.FC<SpeechToTextProps> = ({
  disabled = false,
  afterTranslate,
  onVoiceActive,
  onVoiceInActive
}) => {
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isWSActive, setIsWSActive] = useState(false);
  const recorderRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const APP_ID = "806aaf39";
  const API_KEY = "ab5148b8b6d4a0b3440b028651f163d9";
  const API_SECRET = "MDI5NjMxYzAyM2RhN2E2YTk2MjMyNzQx";

  // 生成 iFlyTek WebSocket URL（鉴权签名机制）
  const createUrl = () => {
    const host = "ws-api.xfyun.cn";
    const uri = "/v2/iat";

    const date = new Date().toUTCString();
    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${uri} HTTP/1.1`;
    const signatureSha = CryptoJS.HmacSHA256(signatureOrigin, API_SECRET);
    const signature = CryptoJS.enc.Base64.stringify(signatureSha);

    const authorizationOrigin = `api_key="${API_KEY}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
    const authorization = btoa(authorizationOrigin);

    return `wss://${host}${uri}?authorization=${authorization}&date=${encodeURIComponent(
      date
    )}&host=${host}`;
  };

  useEffect(() => {
    // @ts-expect-error recorder manager is a global class
    const recorder = new RecorderManager(__PROCESSOR_PATH__);
    recorderRef.current = recorder;

    recorder.onFrameRecorded = ({ frameBuffer }: any) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const audioData = frameBuffer; // Uint8Array
        const base64Audio = btoa(
          String.fromCharCode(...new Uint8Array(audioData))
        );

        const payload = {
          data: {
            status: 1, // 中间帧
            format: "audio/L16;rate=16000",
            encoding: "raw",
            audio: base64Audio
          }
        };

        wsRef.current.send(JSON.stringify(payload));
      }
    };

    recorder.onStop = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        // 发送最后一帧
        const endPayload = {
          data: {
            status: 2,
            format: "audio/L16;rate=16000",
            encoding: "raw",
            audio: ""
          }
        };
        wsRef.current.send(JSON.stringify(endPayload));
      }
      setIsVoiceActive(false);
      setIsWSActive(false);
      onVoiceInActive?.();
      
      // 恢复语音唤醒检测
      setTimeout(() => {
        (window as any).resumeWakeupDetection?.();
      }, 1000); // 延迟1秒后恢复，确保所有状态都已重置
    };
  }, [onVoiceInActive]);

  const connectWebSocket = () => {
    const url = createUrl();
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      const payload = {
        common: {
          app_id: APP_ID
        },
        business: {
          language: "zh_cn",
          domain: "iat",
          accent: "mandarin",
          vad_eos: 5000
        },
        data: {
          status: 0,
          format: "audio/L16;rate=16000",
          encoding: "raw",
          audio: ""
        }
      };
      ws.send(JSON.stringify(payload));
      setIsWSActive(true);
      onVoiceActive?.();
    };

    ws.onmessage = event => {
      const res = JSON.parse(event.data);
      if (res.data?.result) {
        const result = parseResult(res.data.result);
        if (result) afterTranslate?.(result);
        console.log("res---------------------", result);
      }
    };

    ws.onerror = e => {
      console.error("WebSocket 错误", e);
      setIsVoiceActive(false);
      setIsWSActive(false);
      onVoiceInActive?.();
    };

    ws.onclose = () => {
      console.log("WebSocket 已关闭");
      setIsVoiceActive(false);
      setIsWSActive(false);
      onVoiceInActive?.();
      
      // WebSocket关闭时也恢复语音唤醒检测
      setTimeout(() => {
        (window as any).resumeWakeupDetection?.();
      }, 1000);
    };
  };

  const parseResult = (result: any): string => {
    try {
      return result.ws
        .map((ws: any) => ws.cw.map((cw: any) => cw.w).join(""))
        .join("");
    } catch {
      return "";
    }
  };

  const handleToggle = () => {
    if (!recorderRef.current || disabled) return;

    if (isVoiceActive) {
      recorderRef.current.stop();
    } else {
      connectWebSocket();
      recorderRef.current.start({
        sampleRate: 16000,
        frameSize: 1280
      });
    }
    setIsVoiceActive(!isVoiceActive);
  };

  // 添加语音唤醒处理函数
  const handleWakeup = () => {
    if (!isVoiceActive && !disabled) {
      handleToggle();
    }
  };

  return (
    <>
      <VoiceWakeup onWakeup={handleWakeup} />
      <div
        className={`w-full h-full ${disabled ? "cursor-not-allowed" : ""}`}
        onClick={handleToggle}
      >
        <img
          src={
            isVoiceActive
              ? isWSActive
                ? voiceActiveIcon
                : rotating_circle
              : isWSActive
              ? rotating_circle
              : voiceIcon
          }
          alt="语音"
          className="w-full h-full"
        />
      </div>
    </>
  );
};
