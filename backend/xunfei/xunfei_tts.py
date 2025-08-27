import websocket
import datetime
import hashlib
import base64
import hmac
import json
from urllib.parse import urlencode
import ssl
from wsgiref.handlers import format_date_time
from datetime import datetime
from time import mktime
import asyncio
import re
import threading
import time

class XunfeiTTS:
    def __init__(self, appid: str, apikey: str, apisecret: str):
        self.appid = appid
        self.apikey = apikey
        self.apisecret = apisecret
        self.ws_url = 'wss://cbm01.cn-huabei-1.xf-yun.com/v1/private/mcd9m97e6'
        
        # 单例WebSocket连接
        self.ws = None
        self.connected = False
        self.connection_lock = threading.Lock()
        self.last_activity = time.time()
        
        # 语音参数优化（解决吞音问题）
        self.tts_config = {
            "vcn": "x5_lingfeiyi_flow",  # 使用清晰的发音人
            "volume": 50,                   # 提高音量
            "speed": 45,                    # 降低语速，避免吞字
            "pitch": 50,
            "audio": {
                "encoding": "lame",
                "sample_rate": 24000,
                "channels": 1,
                "bit_depth": 16,
            }
        }
    
    def _clean_text(self, text: str) -> str:
        """清理文本，移除markdown格式"""
        if not text:
            return ""
        
        # 移除markdown语法但保留标点
        text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL)
        text = re.sub(r'```.*?```', '', text, flags=re.DOTALL)
        text = re.sub(r'`.*?`', '', text)
        text = re.sub(r'\*\*', '', text)
        text = re.sub(r'\*', '', text)
        text = re.sub(r'\n+', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()
        
        # 确保文本以标点结束
        if text and text[-1] not in '.!?。！？，,;；':
            text += '.'
        
        return text
    
    def _assemble_ws_auth_url(self):
        """构建WebSocket认证URL"""
        stidx = self.ws_url.index("://")
        host = self.ws_url[stidx + 3:]
        edidx = host.index("/")
        path = host[edidx:]
        host = host[:edidx]
        
        now = datetime.now()
        date = format_date_time(mktime(now.timetuple()))
        
        signature_origin = f"host: {host}\ndate: {date}\nGET {path} HTTP/1.1"
        signature_sha = hmac.new(
            self.apisecret.encode('utf-8'), 
            signature_origin.encode('utf-8'),
            digestmod=hashlib.sha256
        ).digest()
        signature_sha = base64.b64encode(signature_sha).decode('utf-8')
        
        authorization_origin = f'api_key="{self.apikey}", algorithm="hmac-sha256", headers="host date request-line", signature="{signature_sha}"'
        authorization = base64.b64encode(authorization_origin.encode('utf-8')).decode('utf-8')
        
        values = {
            "host": host,
            "date": date,
            "authorization": authorization
        }
        
        fullurl = self.ws_url + "?" + urlencode(values)
        print("完整 url: ---------------", fullurl)
        return fullurl
    
    def _ensure_connection(self):
        """确保WebSocket连接正常 - 增加超时时间"""
        with self.connection_lock:
            # 检查连接是否已存在且有效
            if (self.connected and self.ws and 
                hasattr(self.ws, 'sock') and self.ws.sock and self.ws.sock.connected):
                # 检查连接是否超时（1小时）
                if time.time() - self.last_activity > 3600:
                    print("连接超时，重新创建")
                    self._close_connection()
                else:
                    return True
            
            try:
                # 关闭旧连接
                self._close_connection()
                
                # 创建新连接
                auth_url = self._assemble_ws_auth_url()
                self.audio_queue = asyncio.Queue()
                self.audio_chunks = {}  # 初始化音频数据存储
                
                self.ws = websocket.WebSocketApp(
                    auth_url,
                    on_message=self._on_message,
                    on_error=self._on_error,
                    on_close=self._on_close
                )
                
                self.ws.on_open = self._on_open
                
                # 在后台线程中运行WebSocket
                def run_ws():
                    try:
                        # 使用 threading.Timer 实现整体超时
                        def close_on_timeout():
                            if self.ws:
                                print("超时关闭 WebSocket")
                                self.ws.close()

                        timeout_timer = threading.Timer(300, close_on_timeout)  # 300 秒超时
                        timeout_timer.start()

                        self.ws.run_forever(
                            sslopt={"cert_reqs": ssl.CERT_NONE},
                            ping_interval=30,   # 每 30 秒发送 ping
                            ping_timeout=10     # 10 秒没 pong 就重连
                        )

                        timeout_timer.cancel()  # 如果 run_forever 结束，取消定时器

                    except Exception as e:
                        print(f"WebSocket运行异常: {e}")
                        self.connected = False
                
                thread = threading.Thread(target=run_ws, daemon=True)
                thread.start()
                
                # 等待连接建立，增加重试次数
                retries = 0
                while not self.connected and retries < 10:  # 增加重试次数
                    time.sleep(1)
                    retries += 1
                    print(f"等待连接建立... ({retries}/10)")
                
                if not self.connected:
                    print("连接建立失败")
                    return False
                    
                return self.connected
                
            except Exception as e:
                print(f"创建连接失败: {e}")
                self.connected = False
                return False
    
    def _close_connection(self):
        """关闭WebSocket连接"""
        if self.ws:
            try:
                self.ws.close()
            except:
                pass
            self.ws = None
        self.connected = False
    
    def _on_message(self, ws, message):
        """WebSocket消息处理 - 根据seq字段排序音频数据"""
        try:
            message_data = json.loads(message)
            code = message_data["header"]["code"]
            
            if code != 0:
                error_msg = message_data["header"].get("message", "未知错误")
                print(f"讯飞TTS错误 ({code}): {error_msg}")
                
                # 如果是参数错误，尝试重新连接
                if code == 10163:  # 参数错误
                    print("检测到参数错误，尝试重新连接...")
                    self._close_connection()
                    return
                
                # 使用线程安全的方式放入队列
                if hasattr(self, 'audio_queue'):
                    self.audio_queue.put_nowait(None)
                return
            
            if "payload" in message_data and "audio" in message_data["payload"]:
                audio_payload = message_data["payload"]["audio"]
                audio_data = audio_payload["audio"]
                audio_bytes = base64.b64decode(audio_data)
                status = audio_payload["status"]
                seq = audio_payload.get("seq", 0)  # 获取序列号
                
                # 初始化音频数据存储
                if not hasattr(self, 'audio_chunks'):
                    self.audio_chunks = {}
                
                # 按seq存储音频数据
                self.audio_chunks[seq] = audio_bytes
                
                if status == 2:  # 最后一帧
                    # 按seq顺序输出所有音频数据
                    sorted_seqs = sorted(self.audio_chunks.keys())
                    for seq_num in sorted_seqs:
                        if hasattr(self, 'audio_queue'):
                            self.audio_queue.put_nowait(self.audio_chunks[seq_num])
                    
                    # 发送结束信号
                    if hasattr(self, 'audio_queue'):
                        self.audio_queue.put_nowait(None)
                    
                    # 清理音频数据存储
                    if hasattr(self, 'audio_chunks'):
                        del self.audio_chunks
                    
        except Exception as e:
            print(f"处理消息错误: {e}")
            if hasattr(self, 'audio_queue'):
                self.audio_queue.put_nowait(None)
            if hasattr(self, 'audio_chunks'):
                del self.audio_chunks

    def _on_error(self, ws, error):
        """WebSocket错误处理 - 修复事件循环问题"""
        print(f"WebSocket错误: {error}")
        self._close_connection()
        if hasattr(self, 'audio_queue'):
            self.audio_queue.put_nowait(None)

    def _on_close(self, ws, close_status_code, close_msg):
        """WebSocket关闭处理 - 修复事件循环问题"""
        print(f"WebSocket连接关闭: {close_status_code} - {close_msg}")
        self.connected = False
        if hasattr(self, 'audio_queue'):
            self.audio_queue.put_nowait(None)
    
    def _on_open(self, ws):
        """WebSocket连接建立处理"""
        print("WebSocket连接已建立")
        self.connected = True
    
    def _send_tts_request(self, text):
        """发送TTS请求 - 修复缺少status字段的问题"""
        # 添加必需的status字段
        common_args = {
            "app_id": self.appid,
            "status": 2  # 必需字段：2表示开始
        }
        
        # 文本数据也需要status字段
        data = {
            "text": {
                "encoding": "utf8",
                "compress": "raw",
                "format": "plain",
                "status": 2,  # 必需字段
                "seq": 0,     # 序列号
                "text": base64.b64encode(text.encode('utf-8')).decode('UTF8')
            }
        }
        
        message = {
            "header": common_args,
            "parameter": {"tts": self.tts_config},
            "payload": data
        }
        
        print(f"发送TTS请求: {json.dumps(message, ensure_ascii=False)}")
        self.ws.send(json.dumps(message))
        self.last_activity = time.time()
    
    async def synthesize_speech(self, text: str):
        """流式合成语音 - 修复队列处理"""
        clean_text = self._clean_text(text)
        if not clean_text or len(clean_text) < 3:
            return
        
        print(f"讯飞TTS合成: {clean_text}")
        
        # 确保连接正常
        if not self._ensure_connection():
            raise Exception("WebSocket连接不可用")
        
        # 创建新的音频队列
        self.audio_queue = asyncio.Queue()
        
        # 发送合成请求
        self._send_tts_request(clean_text)
        
        # 接收音频数据
        try:
            # 动态超时：根据文本长度调整
            dynamic_timeout = max(50.0, len(clean_text) / 40.0 + 8.0)
            start_time = time.time()
            
            while True:
                try:
                    # 使用同步方式获取队列数据
                    if self.audio_queue.empty():
                        await asyncio.sleep(0.1)  # 短暂等待
                        continue
                    
                    audio_chunk = self.audio_queue.get_nowait()
                    
                    if audio_chunk is None:  # 结束信号
                        break
                    
                    yield audio_chunk
                    
                    # 重置超时时间
                    start_time = time.time()
                    
                except asyncio.QueueEmpty:
                    # 检查是否超时
                    if time.time() - start_time > dynamic_timeout:
                        print("TTS合成超时")
                        break
                    await asyncio.sleep(0.1)  # 短暂等待后再试
                    
        except Exception as e:
            print(f"TTS合成异常: {e}")
        finally:
            # 清理队列
            if hasattr(self, 'audio_queue'):
                try:
                    while True:
                        self.audio_queue.get_nowait()
                except:
                    pass
