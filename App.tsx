import React, { useState, useEffect, useRef } from 'react';
import { QrCode, LogOut, ArrowLeft, Trophy, Users, Languages, Gamepad2, RefreshCw, History } from 'lucide-react';
import { Lang, ViewState, Player, RoomData, TransferRecord } from './types';
import { ANIMALS, TEXT } from './constants';
import { Button } from './components/Button';
import { Avatar } from './components/Avatar';
import { TransferModal } from './components/TransferModal';
import { QrCodeModal } from './components/QrCodeModal';
import { AvatarModal } from './components/AvatarModal';
import { ConfirmModal } from './components/ConfirmModal';
import { TransferHistoryModal } from './components/TransferHistoryModal';
import { WebSocketClient } from './utils/websocket';

const App: React.FC = () => {
  // --- State ---
  const [lang, setLang] = useState<Lang>(Lang.CN);
  const [view, setView] = useState<ViewState>(ViewState.HOME);
  const [room, setRoom] = useState<RoomData | null>(null);
  const [selfId, setSelfId] = useState<string>('');
  
  // Input states
  const [inputCode, setInputCode] = useState('');
  
  // UI states
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isEndGameConfirmOpen, setIsEndGameConfirmOpen] = useState(false);
  const [isLeaveRoomConfirmOpen, setIsLeaveRoomConfirmOpen] = useState(false);
  const [isTransferHistoryModalOpen, setIsTransferHistoryModalOpen] = useState(false);
  const [transferHistory, setTransferHistory] = useState<TransferRecord[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // 转分动画状态：playerId -> amount
  const [transferAnimations, setTransferAnimations] = useState<Map<string, number>>(new Map());
  // 微信浏览器检测
  const [isWeChatBrowser, setIsWeChatBrowser] = useState(false);
  const [showWeChatTip, setShowWeChatTip] = useState(false);

  const wsClientRef = useRef<WebSocketClient | null>(null);
  const isManualJoinRef = useRef<boolean>(false);
  const roomRef = useRef<RoomData | null>(null);
  const isRefreshingRef = useRef<boolean>(false);
  const t = TEXT[lang];
  
  // 同步 room 到 ref，以便在事件处理函数中访问最新值
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  // 检测微信浏览器
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isWeChat = /micromessenger/i.test(ua);
    setIsWeChatBrowser(isWeChat);
    if (isWeChat) {
      // 在微信浏览器中，显示提示
      setShowWeChatTip(true);
    }
  }, []);

  // 根据视图动态更新 iOS Safari 状态栏颜色（theme-color）
  useEffect(() => {
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      // 房间页：状态栏为白色（与 header 一致）
      // 首页和结算页：状态栏为浅蓝色（与背景一致）
      const color = view === ViewState.ROOM ? '#FFFFFF' : '#EEF4FA';
      themeColorMeta.setAttribute('content', color);
    }
  }, [view]);

  // 强制刷新房间数据的函数
  const forceRefreshRoomData = () => {
    const ws = wsClientRef.current;
    if (!ws) return false;

    const savedRoomId = localStorage.getItem('roomId');
    const savedPlayerId = localStorage.getItem('playerId');
    
    if (!savedRoomId || !savedPlayerId) return false;

    // 如果连接断开，先重连
    if (!ws.isConnected()) {
      setIsConnecting(true);
      ws.connect()
        .then(() => {
          setIsConnecting(false);
          // 重连成功后刷新数据
          if (ws.isConnected()) {
            ws.send({
              type: 'JOIN_ROOM',
              playerId: savedPlayerId,
              roomId: savedRoomId,
            });
          }
        })
        .catch(() => {
          setIsConnecting(false);
        });
      return false;
    }

    // 连接正常，请求最新数据
    ws.send({
      type: 'JOIN_ROOM',
      playerId: savedPlayerId,
      roomId: savedRoomId,
    });
    return true;
  };

  // --- Helpers ---
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  };

  const toggleLang = () => {
    setLang(prev => prev === Lang.CN ? Lang.EN : Lang.CN);
  };

  // 手动刷新数据
  const handleManualRefresh = () => {
    if (isRefreshingRef.current) return; // 防止重复点击
    
    isRefreshingRef.current = true;
    setIsRefreshing(true);
    const success = forceRefreshRoomData();
    
    if (!success) {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
      showToast(lang === Lang.CN ? '刷新失败，请稍后重试' : 'Refresh failed, please try again');
      return;
    }
    
    // 如果成功，等待服务器响应后，在 handleRoomState 中重置刷新状态
    // 添加超时保护：3 秒后自动重置，防止服务器无响应
    setTimeout(() => {
      if (isRefreshingRef.current) {
        isRefreshingRef.current = false;
        setIsRefreshing(false);
      }
    }, 3000);
  };

  // 将服务器返回的玩家数据转换为前端格式
  const transformServerPlayer = (serverPlayer: any, currentPlayerId: string): Player => {
    // 服务器返回的 avatar 就是完整的动物对象
    return {
      id: serverPlayer.id,
      animalProfile: serverPlayer.avatar,
      score: serverPlayer.score,
      isSelf: serverPlayer.id === currentPlayerId,
      isHost: serverPlayer.isHost,
    };
  };

  // 处理房间状态更新
  const handleRoomState = (data: any) => {
    if (!data || !data.players) {
      return;
    }

    // 如果正在手动刷新，收到响应后立即重置刷新状态
    if (isRefreshingRef.current) {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }

    // 使用最新的 selfId（从 state 或 localStorage）
    const currentPlayerId = selfId || localStorage.getItem('playerId') || '';
    const players: Player[] = data.players.map((p: any) => 
      transformServerPlayer(p, currentPlayerId)
    );

    // 更新 selfId（如果还没有设置）
    if (!selfId && currentPlayerId) {
      setSelfId(currentPlayerId);
    }

    // 保存 roomId 和 playerId 到 localStorage
    if (data.roomId) {
      localStorage.setItem('roomId', data.roomId);
    }
    // 只有在 currentPlayerId 存在且不为空时才保存
    if (currentPlayerId && currentPlayerId.trim() !== '') {
      localStorage.setItem('playerId', currentPlayerId);
    }

    // 将本人放在第一位
    const sortedPlayers = [...players].sort((a, b) => {
      if (a.isSelf) return -1;
      if (b.isSelf) return 1;
      return 0;
    });

    setRoom({
      code: data.roomId,
      players: sortedPlayers,
      isEnded: data.isEnded || false,
    });

    // 更新转分记录
    if (data.transferHistory) {
      setTransferHistory(data.transferHistory);
    }

    // 如果房间已结束，进入结算页面
    if (data.isEnded) {
      // 房间结束后，清除 localStorage 中的 roomId 和 playerId
      // 防止使用旧的 playerId 创建新房间时出现问题
      localStorage.removeItem('roomId');
      localStorage.removeItem('playerId');
      setSelfId(''); // 清空 selfId state
      setView(ViewState.SETTLEMENT);
    } else {
      setView(ViewState.ROOM);
    }
  };

  // 初始化 WebSocket
  useEffect(() => {
    let isMounted = true;
    let autoRejoinAttempted = false;
    let hasAttemptedRejoin = false; // 防止重复执行
    
    // 在连接前先初始化 selfId（从 localStorage）
    // 注意：这里必须同步读取，不能依赖 state
    const savedPlayerId = localStorage.getItem('playerId');
    const savedRoomId = localStorage.getItem('roomId');
    
    // 检查 URL 参数中的房间号（优先级高于 localStorage）
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    const roomIdFromUrl = roomParam && roomParam.length === 4 ? roomParam : null;
    
    if (savedPlayerId && !selfId) {
      setSelfId(savedPlayerId);
    }
    
    const ws = new WebSocketClient();
    wsClientRef.current = ws;

    // 注册消息处理器
    ws.on('ROOM_CREATED', (data) => {
      if (isMounted) {
        autoRejoinAttempted = false; // 创建房间后，标记不再需要自动 rejoin
        handleRoomState(data);
      }
    });

    ws.on('ROOM_JOINED', (data) => {
      if (isMounted) {
        autoRejoinAttempted = false; // rejoin 成功，重置标志
        handleRoomState(data);
      }
    });

    ws.on('ROOM_STATE', (data) => {
      if (isMounted) {
        handleRoomState(data);
      }
    });

    ws.on('ROOM_LEFT', (data) => {
      if (isMounted) {
        // 离开房间后返回首页
        localStorage.removeItem('roomId');
        setView(ViewState.HOME);
        setRoom(null);
        setInputCode('');
      }
    });

    ws.on('PONG', () => {
      // 心跳响应，连接正常
      // 不需要特殊处理，只是确认连接正常
    });

    ws.on('TRANSFER_SUCCESS', (data: any) => {
      if (isMounted) {
        // WebSocket 客户端已经传递了 response.data，所以这里直接使用 data
        const { fromPlayerName, toPlayerName, toPlayerEmoji, amount } = data || {};
        if (fromPlayerName && toPlayerName && amount !== undefined) {
          // 使用当前的 lang state
          const currentLang = lang;
          const message = currentLang === Lang.CN 
            ? `已向 ${toPlayerEmoji} ${toPlayerName} 转 ${amount} 分`
            : `Transferred ${amount} points to ${toPlayerEmoji} ${toPlayerName}`;
          showToast(message);
        }
      }
    });

    ws.on('TRANSFER_ANIMATION', (data: any) => {
      if (isMounted) {
        const { fromPlayerId, toPlayerId, amount } = data || {};
        if (fromPlayerId && toPlayerId && amount !== undefined) {
          // 更新动画状态
          setTransferAnimations(prev => {
            const newMap = new Map(prev);
            // 转出玩家显示负数
            newMap.set(fromPlayerId, -amount);
            // 转入玩家显示正数
            newMap.set(toPlayerId, amount);
            return newMap;
          });
        }
      }
    });

    ws.on('ERROR', (data) => {
      if (isMounted) {
        const errorMessage = data?.message || '发生错误';
        const isManualJoin = isManualJoinRef.current;
        
        // 如果是自动 rejoin 失败，静默处理，不显示错误提示
        if (autoRejoinAttempted && !isManualJoin && (errorMessage === '房间不存在' || errorMessage === '房间已结束')) {
          // 静默清除 localStorage，不显示错误
          localStorage.removeItem('roomId');
          setView(ViewState.HOME);
          setRoom(null);
          autoRejoinAttempted = false; // 重置标志
          isManualJoinRef.current = false; // 重置标志
          return;
        }
        
        // 显示错误提示（包括房间不存在和其他所有错误）
        showToast(errorMessage);
        
        // 如果房间不存在或已结束，清除 localStorage 中的房间信息
        if (errorMessage === '房间不存在' || errorMessage === '房间已结束') {
          localStorage.removeItem('roomId');
          // 只有在非自动 rejoin 的情况下才返回首页
          if (!autoRejoinAttempted || isManualJoin) {
            setView(ViewState.HOME);
            setRoom(null);
            // 如果是手动加入且房间不存在，清空输入框
            if (isManualJoin && errorMessage === '房间不存在') {
              setInputCode('');
            }
          }
        }
        
        // 重置手动加入标志
        isManualJoinRef.current = false;
      }
    });

    // 连接 WebSocket
    setIsConnecting(true);
    ws.connect()
      .then(() => {
        if (isMounted) {
          setIsConnecting(false);
          // 检查是否有保存的房间信息，自动 rejoin
          // 延迟一下，确保所有状态都已初始化
          setTimeout(() => {
            if (isMounted && !hasAttemptedRejoin) {
              hasAttemptedRejoin = true; // 防止重复执行（React StrictMode）
              
              // 重新读取 localStorage（确保获取最新值）
              const savedRoomId = localStorage.getItem('roomId');
              const savedPlayerId = localStorage.getItem('playerId');
              
              // 检查 URL 参数中的房间号（优先级最高）
              const urlParams = new URLSearchParams(window.location.search);
              const roomParam = urlParams.get('room');
              const roomIdFromUrl = roomParam && roomParam.length === 4 ? roomParam : null;
              
              // 优先使用 URL 中的房间号，否则使用 localStorage
              const targetRoomId = roomIdFromUrl || savedRoomId;
              
              // 自动 rejoin（只在页面加载时执行一次）
              // 确保使用 localStorage 中的 playerId，而不是新生成的
              if (targetRoomId && savedPlayerId && ws.isConnected()) {
                autoRejoinAttempted = true;
                
                // 如果是来自 URL 的房间号，标记为手动加入并设置输入框
                if (roomIdFromUrl) {
                  isManualJoinRef.current = true;
                  setInputCode(roomIdFromUrl);
                  // 清除 URL 参数，避免刷新时重复加入
                  window.history.replaceState({}, '', window.location.pathname);
                }
                
                // 强制使用 localStorage 中的 playerId，确保 selfId 也更新
                if (selfId !== savedPlayerId) {
                  setSelfId(savedPlayerId);
                }
                
                // 保存房间号到 localStorage
                if (roomIdFromUrl) {
                  localStorage.setItem('roomId', roomIdFromUrl);
                }
                
                // 直接使用 localStorage 中的 playerId，不依赖 selfId state（因为 setState 是异步的）
                ws.send({
                  type: 'JOIN_ROOM',
                  playerId: savedPlayerId, // 强制使用 localStorage 中的 playerId
                  roomId: targetRoomId,
                });
              }
            }
          }, 300); // 增加延迟，确保所有初始化完成
        }
      })
      .catch((error) => {
        if (isMounted) {
          setIsConnecting(false);
          // 只在非手动关闭时显示错误
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage !== 'WebSocket connection closed before established') {
            showToast('连接失败，请刷新重试');
          }
        }
      });

    // 统一的刷新触发函数（防止重复触发）
    let lastRefreshTime = 0;
    const triggerRefresh = () => {
      if (!isMounted) return;
      
      const now = Date.now();
      // 防止频繁触发（至少间隔 1 秒）
      if (now - lastRefreshTime < 1000) return;
      lastRefreshTime = now;
      
      const ws = wsClientRef.current;
      if (!ws) return;
      
      // 使用统一的刷新函数
      forceRefreshRoomData();
    };

    // 1. 监听页面可见性变化（主要机制）
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 延迟一下，确保页面完全恢复
        setTimeout(() => {
          if (document.visibilityState === 'visible' && document.hasFocus()) {
            triggerRefresh();
          }
        }, 100);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 2. 监听窗口焦点变化（iPhone Safari 备用机制）
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        // 延迟一下，确保页面完全获得焦点
        setTimeout(() => {
          if (document.visibilityState === 'visible' && document.hasFocus()) {
            triggerRefresh();
          }
        }, 100);
      }
    };
    window.addEventListener('focus', handleFocus);
    
    // 3. 监听页面显示事件（处理从后台恢复，iPhone 特别需要）
    const handlePageShow = (event: PageTransitionEvent) => {
      // 如果是从缓存恢复（back/forward），也需要刷新
      // iPhone Safari 切回时，pageshow 事件会触发
      if (event.persisted || document.visibilityState === 'visible') {
        setTimeout(() => {
          if (document.visibilityState === 'visible') {
            triggerRefresh();
          }
        }, 200);
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    
    // 4. 监听 WebSocket 连接恢复（当连接重新建立时）
    const handleWebSocketReconnect = () => {
      // WebSocket 重连成功后，如果在房间中，刷新数据
      const savedRoomId = localStorage.getItem('roomId');
      const savedPlayerId = localStorage.getItem('playerId');
      const ws = wsClientRef.current;
      
      if (savedRoomId && savedPlayerId && ws && ws.isConnected()) {
        // 延迟一下，确保连接稳定
        setTimeout(() => {
          if (ws.isConnected() && document.visibilityState === 'visible') {
            triggerRefresh();
          }
        }, 300);
      }
    };
    
    // 注册 WebSocket 连接回调
    ws.setOnConnect(handleWebSocketReconnect);

    // 已取消：定期心跳机制
    // 已取消：定期自动刷新机制
    // 数据实时更新依赖服务器主动推送（WebSocket 双向通信）

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handlePageShow);
      ws.disconnect();
    };
  }, []);

  const createRoom = () => {
    const ws = wsClientRef.current;
    if (!ws || !ws.isConnected()) {
      showToast('连接未就绪，请稍候');
      return;
    }

    // 清除旧的房间信息
    localStorage.removeItem('roomId');
    
    // 创建新房间时，总是生成新的 playerId，避免使用旧的 playerId 导致后端映射问题
    // 这样可以确保每次创建房间都是全新的玩家身份
    const playerId = 'p_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    setSelfId(playerId);
    localStorage.setItem('playerId', playerId);

    ws.send({
      type: 'CREATE_ROOM',
      playerId,
    });
  };

  const handleJoinRoom = (roomCode?: string) => {
    const code = roomCode || inputCode;
    if (code.length !== 4) return;

    const ws = wsClientRef.current;
    if (!ws || !ws.isConnected()) {
      showToast('连接未就绪，请稍候');
      return;
    }

    // 生成或获取 playerId
    let playerId = selfId || localStorage.getItem('playerId');
    if (!playerId) {
      playerId = 'p_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
      setSelfId(playerId);
      localStorage.setItem('playerId', playerId);
    }

    // 标记这是手动加入操作
    isManualJoinRef.current = true;

    // 保存 roomId 和 playerId（在发送请求之前）
    // 注意：如果房间不存在，会在错误处理中清除
    localStorage.setItem('roomId', code);
    localStorage.setItem('playerId', playerId);

    // 发送加入房间请求
    ws.send({
      type: 'JOIN_ROOM',
      playerId,
      roomId: code,
    });
  };

  const handlePlayerClick = (p: Player) => {
    if (p.isSelf) {
      setIsAvatarModalOpen(true);
    } else {
      setSelectedPlayer(p);
      setIsTransferModalOpen(true);
    }
  };

  const handleChangeAvatar = (avatar: AnimalProfile) => {
    const ws = wsClientRef.current;
    if (!ws) {
      showToast('连接未就绪，请稍候');
      return;
    }

    // 操作前强制刷新数据
    forceRefreshRoomData();

    if (!ws.isConnected()) {
      showToast('连接断开，正在重连...');
      // 延迟重试
      setTimeout(() => {
        if (ws.isConnected()) {
          ws.send({
            type: 'CHANGE_AVATAR',
            playerId: selfId,
            avatar,
          });
        } else {
          showToast('连接失败，请稍后重试');
        }
      }, 2000);
      return;
    }

    // 发送更换头像消息
    ws.send({
      type: 'CHANGE_AVATAR',
      playerId: selfId,
      avatar,
    });
  };

  const handleTransfer = (amount: number) => {
    if (!selectedPlayer || !room) return;

    const ws = wsClientRef.current;
    if (!ws) {
      showToast('连接未就绪，请稍候');
      return;
    }

    // 操作前强制刷新数据，确保使用最新状态
    const refreshSuccess = forceRefreshRoomData();
    
    // 如果连接断开，等待重连
    if (!ws.isConnected()) {
      if (!refreshSuccess) {
        showToast('连接断开，正在重连...');
        // 延迟重试
        setTimeout(() => {
          if (ws.isConnected()) {
            ws.send({
              type: 'TRANSFER',
              playerId: selfId,
              targetPlayerId: selectedPlayer.id,
              amount,
            });
            setIsTransferModalOpen(false);
            setSelectedPlayer(null);
          } else {
            showToast('连接失败，请稍后重试');
          }
        }, 2000);
      }
      return;
    }

    // 连接正常，发送转分请求
    ws.send({
      type: 'TRANSFER',
      playerId: selfId,
      targetPlayerId: selectedPlayer.id,
      amount,
    });

    setIsTransferModalOpen(false);
    setSelectedPlayer(null);
  };

  const handleEndGameClick = () => {
    // 显示确认对话框
    setIsEndGameConfirmOpen(true);
  };

  const handleEndGameConfirm = () => {
    const ws = wsClientRef.current;
    if (!ws) {
      showToast('连接未就绪，请稍候');
      return;
    }

    // 操作前强制刷新数据
    forceRefreshRoomData();

    if (!ws.isConnected()) {
      showToast('连接断开，正在重连...');
      // 延迟重试
      setTimeout(() => {
        if (ws.isConnected()) {
          const currentPlayer = roomRef.current?.players.find(p => p.id === selfId);
          if (!currentPlayer?.isHost) {
            showToast(lang === Lang.CN ? '只有房主可以结束房间' : 'Only host can end room');
            return;
          }
          ws.send({
            type: 'END_GAME',
            playerId: selfId,
          });
        } else {
          showToast('连接失败，请稍后重试');
        }
      }, 2000);
      return;
    }

    // 检查是否是房主
    const currentPlayer = room?.players.find(p => p.id === selfId);
    if (!currentPlayer?.isHost) {
      showToast(lang === Lang.CN ? '只有房主可以结束房间' : 'Only host can end room');
      return;
    }

    ws.send({
      type: 'END_GAME',
      playerId: selfId,
    });
  };

  const handleLeaveRoomClick = () => {
    const currentPlayer = room?.players.find(p => p.id === selfId);
    if (!currentPlayer) {
      return;
    }
    
    // 检查积分是否为0
    if (currentPlayer.score !== 0) {
      const errorMsg = lang === Lang.CN ? '积分为0才能离开房间' : 'Score must be 0 to leave room';
      showToast(errorMsg);
      return;
    }

    // 显示确认对话框
    setIsLeaveRoomConfirmOpen(true);
  };

  const handleLeaveRoomConfirm = () => {
    const ws = wsClientRef.current;
    if (!ws || !ws.isConnected()) {
      showToast('连接未就绪，请稍候');
      return;
    }

    ws.send({
      type: 'LEAVE_ROOM',
      playerId: selfId,
    });
  };

  const handleExit = () => {
    // 清除 localStorage
    localStorage.removeItem('roomId');
    localStorage.removeItem('playerId');
    
    setView(ViewState.HOME);
    setRoom(null);
    setInputCode('');
    setSelfId('');
  };

  // --- Views ---

  // 1. Home View
  if (view === ViewState.HOME) {
    return (
      <div className="flex flex-col h-screen h-[100dvh] p-6 relative" style={{ backgroundColor: '#EEF4FA', minHeight: '-webkit-fill-available' }}>
        <div className="absolute top-6 right-6">
          <button onClick={toggleLang} className="flex items-center gap-1 font-medium bg-white px-3 py-1.5 rounded-full shadow-sm border" style={{ color: '#5B6E80', borderColor: '#DCE8F5' }}>
            <Languages size={16} />
            <span>{lang}</span>
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-start items-center gap-8 max-w-md mx-auto w-full pt-16">
          <div className="text-center mb-4">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl rotate-3" style={{ backgroundColor: '#2F5D8C', boxShadow: '0 20px 25px -5px rgba(47, 93, 140, 0.1), 0 10px 10px -5px rgba(47, 93, 140, 0.04)' }}>
              <Gamepad2 size={48} className="text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              GameRoom
            </h1>
          </div>

          <div className="w-full space-y-4">
             <div className="bg-white p-2 rounded-2xl border shadow-sm flex items-center" style={{ borderColor: '#DCE8F5' }}>
                <input 
                  type="tel" 
                  maxLength={4}
                  placeholder={t.roomCodePlaceholder}
                  className="flex-1 px-4 py-3 text-lg outline-none bg-transparent text-center tracking-widest font-mono"
                  style={{ color: '#5B6E80' }}
                  value={inputCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, ''); // 只允许数字
                    setInputCode(value);
                    // 当输入长度为4时，自动加入房间
                    if (value.length === 4) {
                      handleJoinRoom(value);
                    }
                  }}
                />
             </div>

             <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" style={{ borderColor: '#DCE8F5' }}></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2" style={{ backgroundColor: '#EEF4FA', color: '#5B6E80' }}>Or</span>
                </div>
              </div>

             <Button fullWidth variant="secondary" onClick={createRoom} disabled={isConnecting}>
               {isConnecting ? t.mockProcessing : t.createRoom}
             </Button>
          </div>
        </div>

        {/* 底部署名 - 适配 iOS Safari 底部地址栏 */}
        <div className="absolute left-0 right-0 text-center" style={{ 
          bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px) + 50px)' 
        }}>
          <p className="text-sm" style={{ color: '#5B6E80' }}>© 2025 Keen</p>
        </div>

        {/* Toast - 在所有视图中都显示 */}
        {toastMessage && (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-slate-900/90 text-white px-6 py-3 rounded-full shadow-xl pointer-events-none transition-all z-50 animate-bounce-short">
            {toastMessage}
          </div>
        )}
      </div>
    );
  }

  // 2. Room View
  if (view === ViewState.ROOM && room) {
    return (
      <div className="flex flex-col h-screen h-[100dvh] overflow-hidden" style={{ backgroundColor: '#EEF4FA' }}>
        {/* 状态栏区域白色背景（iOS Safari） */}
        <div className="fixed top-0 left-0 right-0 z-20 bg-white" style={{ height: 'env(safe-area-inset-top, 0px)' }}></div>
        
        {/* Header */}
        <header className="bg-white border-b px-6 py-4 flex justify-between items-center fixed left-0 right-0 z-10" style={{ top: 'env(safe-area-inset-top, 0)', borderColor: '#DCE8F5' }}>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsQrModalOpen(true)}
              className="p-2 rounded-lg active:scale-95 transition-transform"
              style={{ backgroundColor: 'rgba(47, 93, 140, 0.1)', color: '#2F5D8C' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(47, 93, 140, 0.15)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(47, 93, 140, 0.1)'}
            >
              <QrCode size={20} />
            </button>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#5B6E80' }}>{t.room}</p>
              <p className="font-mono font-bold text-xl leading-none text-slate-800">{room.code}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleLang} className="font-bold text-sm" style={{ color: '#5B6E80' }}>
              {lang}
            </button>
            {(() => {
              const currentPlayer = room?.players.find(p => p.id === selfId);
              const isHost = currentPlayer?.isHost === true;
              
              if (isHost) {
                return (
                  <button
                    onClick={handleEndGameClick}
                    className="p-2 rounded-lg active:scale-95 transition-transform"
                    style={{ color: '#5B6E80' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#EEF4FA'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    title={t.endGame}
                  >
                    <LogOut size={20} />
                  </button>
                );
              } else {
                return (
                  <button
                    onClick={handleLeaveRoomClick}
                    className="p-2 rounded-lg active:scale-95 transition-transform"
                    style={{ color: '#5B6E80' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#EEF4FA'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    title={t.leaveRoom}
                  >
                    <LogOut size={20} />
                  </button>
                );
              }
            })()}
          </div>
        </header>

        {/* Grid - 添加顶部间距避免被 header 遮挡 */}
        <div className="flex-1 overflow-y-auto p-4" style={{ 
          paddingTop: 'calc(1rem + 64px + env(safe-area-inset-top, 0px))',
          WebkitOverflowScrolling: 'touch'
        }}>
          <div className="grid grid-cols-2 gap-4 pb-20">
            {room.players.map((p) => {
              const transferAmount = transferAnimations.get(p.id) ?? null;
              return (
                <div key={p.id} className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: '#DCE8F5' }}>
                  <Avatar 
                    player={p} 
                    lang={lang} 
                    onClick={() => handlePlayerClick(p)}
                    transferAmount={transferAmount}
                    onTransferAnimationComplete={() => {
                      setTransferAnimations(prev => {
                        const newMap = new Map(prev);
                        newMap.delete(p.id);
                        return newMap;
                      });
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>


        {/* Modals & Toasts */}
        <TransferModal 
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          targetPlayer={selectedPlayer}
          lang={lang}
          onConfirm={handleTransfer}
        />

        <QrCodeModal 
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          roomCode={room.code}
          lang={lang}
        />

        <AvatarModal 
          isOpen={isAvatarModalOpen}
          onClose={() => setIsAvatarModalOpen(false)}
          currentAvatar={room.players.find(p => p.id === selfId)?.animalProfile || ANIMALS[0]}
          lang={lang}
          onConfirm={handleChangeAvatar}
        />

        <ConfirmModal
          isOpen={isEndGameConfirmOpen}
          onClose={() => setIsEndGameConfirmOpen(false)}
          onConfirm={handleEndGameConfirm}
          title={lang === Lang.CN ? '确认结束房间' : 'Confirm End Room'}
          confirmText={lang === Lang.CN ? '确认结束' : 'Confirm End'}
          cancelText={t.cancel}
          variant="warning"
          lang={lang}
        />

        <ConfirmModal
          isOpen={isLeaveRoomConfirmOpen}
          onClose={() => setIsLeaveRoomConfirmOpen(false)}
          onConfirm={handleLeaveRoomConfirm}
          title={lang === Lang.CN ? '确认离开房间' : 'Confirm Leave Room'}
          confirmText={lang === Lang.CN ? '确认离开' : 'Confirm Leave'}
          cancelText={t.cancel}
          variant="warning"
          lang={lang}
        />

        <TransferHistoryModal
          isOpen={isTransferHistoryModalOpen}
          onClose={() => setIsTransferHistoryModalOpen(false)}
          transferHistory={transferHistory}
          lang={lang}
        />

        {/* Toast */}
        {toastMessage && (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-slate-900/90 text-white px-6 py-3 rounded-full shadow-xl pointer-events-none transition-all z-50 animate-bounce-short">
            {toastMessage}
          </div>
        )}

        {/* 操作按钮组 - 固定在右下角 */}
        <div 
          className="fixed right-6 flex flex-col gap-3 z-50"
          style={{
            bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px) + 50px)',
            right: 'calc(1.5rem + env(safe-area-inset-right, 0px))',
          }}
        >
          {/* 历史记录按钮 */}
          <button
            onClick={() => setIsTransferHistoryModalOpen(true)}
            className="w-14 h-14 bg-white border-2 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95"
            style={{ borderColor: '#DCE8F5' }}
            title={lang === Lang.CN ? '转分记录' : 'Transfer History'}
          >
            <History size={24} style={{ color: '#5B6E80' }} />
          </button>
          
          {/* 刷新按钮 */}
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="w-14 h-14 bg-white border-2 border-slate-200 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95 disabled:opacity-50"
            title={lang === Lang.CN ? '刷新数据' : 'Refresh Data'}
          >
            <RefreshCw 
              size={24} 
              className={`${isRefreshing ? 'animate-spin' : ''}`}
              style={{ color: '#2F5D8C' }}
            />
          </button>
        </div>

        {/* 底部署名 - 适配 iOS Safari 底部地址栏 */}
        <div className="fixed left-0 right-0 text-center z-40" style={{ 
          bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px) + 50px)' 
        }}>
          <p className="text-sm" style={{ color: '#5B6E80' }}>© 2025 Keen</p>
        </div>
      </div>
    );
  }

  // 3. Settlement View (Updated to Light Theme)
  if (view === ViewState.SETTLEMENT && room) {
    const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);

    return (
      <div className="flex flex-col h-screen h-[100dvh] text-slate-900 overflow-hidden" style={{ backgroundColor: '#EEF4FA' }}>
        <div className="p-6 pt-12 text-center">
          <div className="inline-block p-4 rounded-full bg-yellow-100 mb-4">
             <Trophy size={48} className="text-yellow-500 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">{t.scoreResult}</h2>
          <p className="mt-1 font-mono" style={{ color: '#5B6E80' }}>{t.room}: {room.code}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-8" style={{ 
          WebkitOverflowScrolling: 'touch',
          paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px) + 50px)'
        }}>
          <div className="space-y-3 max-w-md mx-auto">
            {sortedPlayers.map((p, index) => (
              <div 
                key={p.id} 
                className={`
                  flex items-center justify-between p-4 rounded-xl border shadow-sm
                  ${index === 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-slate-100'}
                `}
              >
                <div className="flex items-center gap-4">
                  <div 
                    className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${index === 0 ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-200' : ''}`}
                    style={index === 0 ? {} : { backgroundColor: '#EEF4FA', color: '#5B6E80' }}
                  >
                    {index + 1}
                  </div>
                  <div className="relative">
                    <span className="text-3xl filter drop-shadow-sm">{p.animalProfile.emoji}</span>
                    {p.isSelf && (
                      <span className="absolute -top-1 -right-1 text-xs font-semibold leading-none whitespace-nowrap" style={{ color: '#0E172B' }}>
                        {t.you}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800">
                      {lang === Lang.CN ? p.animalProfile.name_cn : p.animalProfile.name_en}
                    </span>
                  </div>
                </div>
                <div className={`font-mono text-xl font-bold ${p.score >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {p.score > 0 ? '+' : ''}{p.score}
                </div>
              </div>
            ))}
            
            {/* 返回首页按钮 - 作为列表的一部分 */}
            <div className="pt-4">
              <Button 
                fullWidth 
                variant="secondary" 
                onClick={handleExit}
              >
                <ArrowLeft size={18} />
                {t.backHome}
              </Button>
            </div>
          </div>
        </div>

        {/* 底部署名 - 适配 iOS Safari 底部地址栏 */}
        <div className="fixed left-0 right-0 text-center z-40" style={{ 
          bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px) + 50px)' 
        }}>
          <p className="text-sm" style={{ color: '#5B6E80' }}>© 2025 Keen</p>
        </div>

        {/* Toast */}
        {toastMessage && (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-slate-900/90 text-white px-6 py-3 rounded-full shadow-xl pointer-events-none transition-all z-50 animate-bounce-short">
            {toastMessage}
          </div>
        )}
      </div>
    );
  }

  // 微信浏览器提示遮罩
  if (showWeChatTip && isWeChatBrowser) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6" style={{ backgroundColor: '#EEF4FA' }}>
        <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full border" style={{ borderColor: '#DCE8F5' }}>
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-slate-800 mb-2">
              {lang === Lang.CN ? '请在浏览器中打开' : 'Please Open in Browser'}
            </h2>
            <p className="text-sm" style={{ color: '#5B6E80' }}>
              {lang === Lang.CN 
                ? '为了获得更好的体验，请在系统浏览器中打开此页面' 
                : 'For better experience, please open this page in your system browser'}
            </p>
          </div>
          
          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: '#EEF4FA' }}>
              <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: '#2F5D8C', color: 'white' }}>
                1
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">
                  {lang === Lang.CN ? '点击右上角菜单' : 'Tap the menu in the top right'}
                </p>
                <p className="text-xs mt-1" style={{ color: '#5B6E80' }}>
                  {lang === Lang.CN ? '（三个点或更多）' : '(Three dots or more)'}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: '#EEF4FA' }}>
              <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: '#2F5D8C', color: 'white' }}>
                2
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">
                  {lang === Lang.CN ? '选择"在浏览器中打开"' : 'Select "Open in Browser"'}
                </p>
                <p className="text-xs mt-1" style={{ color: '#5B6E80' }}>
                  {lang === Lang.CN ? '或"用Safari打开"' : 'or "Open in Safari"'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button
              fullWidth
              variant="outline"
              onClick={() => setShowWeChatTip(false)}
            >
              {lang === Lang.CN ? '稍后提醒' : 'Remind Later'}
            </Button>
            <Button
              fullWidth
              variant="primary"
              onClick={() => {
                // 尝试复制链接到剪贴板
                const url = window.location.href;
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(url).then(() => {
                    setShowWeChatTip(false);
                    showToast(lang === Lang.CN ? '链接已复制，请在浏览器中打开' : 'Link copied, please open in browser');
                  });
                } else {
                  setShowWeChatTip(false);
                }
              }}
            >
              {lang === Lang.CN ? '复制链接' : 'Copy Link'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default App;
