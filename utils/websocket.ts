import { WSMessage, WSResponse, RoomData } from '../types';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isManualClose = false;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private onConnectCallback?: () => void;
  private onDisconnectCallback?: () => void;
  private connectingPromise: Promise<void> | null = null;

  connect(): Promise<void> {
    // 如果已经连接，直接 resolve
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    // 如果正在连接，返回现有的 promise
    if (this.connectingPromise) {
      return this.connectingPromise;
    }

    this.connectingPromise = new Promise((resolve, reject) => {
      // 如果正在连接，等待连接完成
      if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
        const checkConnection = setInterval(() => {
          if (this.ws) {
            if (this.ws.readyState === WebSocket.OPEN) {
              clearInterval(checkConnection);
              this.connectingPromise = null;
              resolve();
            } else if (this.ws.readyState === WebSocket.CLOSED) {
              clearInterval(checkConnection);
              this.connectingPromise = null;
              // 重新连接
              this.connect().then(resolve).catch(reject);
            }
          }
        }, 100);
        return;
      }

      try {
        this.ws = new WebSocket(WS_URL);
        this.isManualClose = false;

        let resolved = false;

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          this.connectingPromise = null;
          this.onConnectCallback?.();
          if (!resolved) {
            resolved = true;
            resolve();
          }
        };

        this.ws.onmessage = (event) => {
          try {
            const response: WSResponse = JSON.parse(event.data);
            this.handleMessage(response);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          // 不立即 reject，等待 onclose 处理
          // 只有在手动关闭时才不重连
        };

        this.ws.onclose = (event) => {
          this.onDisconnectCallback?.();
          
          // 如果连接还未建立就被关闭，且不是手动关闭，则 reject
          if (!resolved && !this.isManualClose) {
            resolved = true;
            this.connectingPromise = null;
            reject(new Error('WebSocket connection closed before established'));
          }
          
          // 自动重连逻辑
          if (!this.isManualClose && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
              this.connect().catch(() => {
                // 静默处理重连错误
              });
            }, this.reconnectDelay * this.reconnectAttempts);
          }
        };
      } catch (error) {
        this.connectingPromise = null;
        reject(error);
      }
    });

    return this.connectingPromise;
  }

  disconnect() {
    this.isManualClose = true;
    this.connectingPromise = null;
    if (this.ws) {
      // 只有在连接已建立时才关闭，避免在 CONNECTING 状态下关闭导致错误
      if (this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.close();
        } catch (error) {
          // 忽略关闭错误
        }
      } else if (this.ws.readyState === WebSocket.CONNECTING) {
        // 在连接中时，只清理引用，不调用 close()
        // 连接会自动失败，onclose 会处理
        // 移除所有事件监听器，让连接自然失败
        this.ws.onopen = null;
        this.ws.onerror = null;
        this.ws.onclose = null;
        this.ws.onmessage = null;
      }
      this.ws = null;
    }
  }

  send(message: WSMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  on(event: string, handler: (data: any) => void) {
    this.messageHandlers.set(event, handler);
  }

  off(event: string) {
    this.messageHandlers.delete(event);
  }

  setOnConnect(callback: () => void) {
    this.onConnectCallback = callback;
  }

  setOnDisconnect(callback: () => void) {
    this.onDisconnectCallback = callback;
  }

  private handleMessage(response: WSResponse) {
    const handler = this.messageHandlers.get(response.type);
    if (handler) {
      handler(response.data);
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

