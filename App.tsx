import React, { useState, useEffect, useRef } from 'react';
import { QrCode, LogOut, ArrowLeft, Trophy, Users, Languages, Gamepad2 } from 'lucide-react';
import { Lang, ViewState, Player, RoomData } from './types';
import { ANIMALS, TEXT } from './constants';
import { Button } from './components/Button';
import { Avatar } from './components/Avatar';
import { TransferModal } from './components/TransferModal';
import { QrCodeModal } from './components/QrCodeModal';
import { AvatarModal } from './components/AvatarModal';
import { ConfirmModal } from './components/ConfirmModal';
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const wsClientRef = useRef<WebSocketClient | null>(null);
  const isManualJoinRef = useRef<boolean>(false);
  const roomRef = useRef<RoomData | null>(null);
  const t = TEXT[lang];
  
  // 同步 room 到 ref，以便在事件处理函数中访问最新值
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  // --- Helpers ---
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  };

  const toggleLang = () => {
    setLang(prev => prev === Lang.CN ? Lang.EN : Lang.CN);
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

    // 监听页面可见性变化，处理息屏后恢复的情况
    let lastVisibilityChange = Date.now();
    const handleVisibilityChange = () => {
      if (!isMounted) return;
      
      // 页面从隐藏变为可见
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        // 防止频繁触发（至少间隔 1 秒）
        if (now - lastVisibilityChange < 1000) return;
        lastVisibilityChange = now;
        
        const ws = wsClientRef.current;
        if (!ws) return;
        
        // 检查连接状态
        if (!ws.isConnected()) {
          // 连接断开，尝试重连
          setIsConnecting(true);
          ws.connect()
            .then(() => {
              if (isMounted) {
                setIsConnecting(false);
                // 重连成功后，如果在房间中，重新加入获取最新状态
                const savedRoomId = localStorage.getItem('roomId');
                const savedPlayerId = localStorage.getItem('playerId');
                
                if (savedRoomId && savedPlayerId && ws.isConnected()) {
                  // 重新加入房间获取最新状态
                  ws.send({
                    type: 'JOIN_ROOM',
                    playerId: savedPlayerId,
                    roomId: savedRoomId,
                  });
                }
              }
            })
            .catch(() => {
              if (isMounted) {
                setIsConnecting(false);
              }
            });
        } else {
          // 连接正常，如果在房间中，重新加入以获取最新状态
          // 服务器端会返回最新的房间状态
          const savedRoomId = localStorage.getItem('roomId');
          const savedPlayerId = localStorage.getItem('playerId');
          
          // 使用 ref 获取最新的 room 状态
          if (savedRoomId && savedPlayerId && roomRef.current) {
            // 重新加入房间以获取最新状态（服务器会返回当前状态）
            ws.send({
              type: 'JOIN_ROOM',
              playerId: savedPlayerId,
              roomId: savedRoomId,
            });
          }
        }
      }
    };

    // 添加页面可见性监听
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 监听页面焦点变化（作为备用）
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        handleVisibilityChange();
      }
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
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
    if (!ws || !ws.isConnected()) {
      showToast('连接未就绪，请稍候');
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
    if (!ws || !ws.isConnected()) {
      showToast('连接未就绪，请稍候');
      return;
    }

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
    if (!ws || !ws.isConnected()) {
      showToast('连接未就绪，请稍候');
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
      <div className="flex flex-col h-full bg-slate-50 p-6 relative">
        <div className="absolute top-6 right-6">
          <button onClick={toggleLang} className="flex items-center gap-1 text-slate-500 font-medium bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-200">
            <Languages size={16} />
            <span>{lang}</span>
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center items-center gap-8 max-w-md mx-auto w-full">
          <div className="text-center mb-4">
            <div className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-200 rotate-3">
              <Gamepad2 size={48} className="text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              GameRoom
            </h1>
          </div>

          <div className="w-full space-y-4">
             <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center">
                <input 
                  type="tel" 
                  maxLength={4}
                  placeholder={t.roomCodePlaceholder}
                  className="flex-1 px-4 py-3 text-lg outline-none bg-transparent placeholder:text-slate-400 text-center tracking-widest font-mono"
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
                  <div className="w-full border-t border-slate-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-slate-50 text-slate-500">Or</span>
                </div>
              </div>

             <Button fullWidth variant="secondary" onClick={createRoom} disabled={isConnecting}>
               {isConnecting ? t.mockProcessing : t.createRoom}
             </Button>
          </div>
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
      <div className="flex flex-col h-screen h-[100dvh] bg-slate-50 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center fixed top-0 left-0 right-0 z-10" style={{ top: 'env(safe-area-inset-top, 0)' }}>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsQrModalOpen(true)}
              className="bg-indigo-50 p-2 rounded-lg text-indigo-600 hover:bg-indigo-100 active:scale-95 transition-transform"
            >
              <QrCode size={20} />
            </button>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{t.room}</p>
              <p className="font-mono font-bold text-xl leading-none text-slate-800">{room.code}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleLang} className="text-slate-400 font-bold text-sm">
              {lang}
            </button>
            {(() => {
              const currentPlayer = room?.players.find(p => p.id === selfId);
              const isHost = currentPlayer?.isHost === true;
              
              if (isHost) {
                return (
                  <button
                    onClick={handleEndGameClick}
                    className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 active:scale-95 transition-transform"
                    title={t.endGame}
                  >
                    <LogOut size={20} />
                  </button>
                );
              } else {
                return (
                  <button
                    onClick={handleLeaveRoomClick}
                    className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 active:scale-95 transition-transform"
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
            {room.players.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <Avatar 
                  player={p} 
                  lang={lang} 
                  onClick={() => handlePlayerClick(p)}
                />
              </div>
            ))}
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

        {/* Toast */}
        {toastMessage && (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-slate-900/90 text-white px-6 py-3 rounded-full shadow-xl pointer-events-none transition-all z-50 animate-bounce-short">
            {toastMessage}
          </div>
        )}
      </div>
    );
  }

  // 3. Settlement View (Updated to Light Theme)
  if (view === ViewState.SETTLEMENT && room) {
    const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);

    return (
      <div className="flex flex-col h-screen h-[100dvh] bg-slate-50 text-slate-900 overflow-hidden">
        <div className="p-6 pt-12 text-center">
          <div className="inline-block p-4 rounded-full bg-yellow-100 mb-4">
             <Trophy size={48} className="text-yellow-500 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">{t.scoreResult}</h2>
          <p className="text-slate-500 mt-1 font-mono">{t.room}: {room.code}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-8" style={{ WebkitOverflowScrolling: 'touch' }}>
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
                  <div className={`
                    w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm
                    ${index === 0 ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-200' : 'bg-slate-100 text-slate-500'}
                  `}>
                    {index + 1}
                  </div>
                  <span className="text-3xl filter drop-shadow-sm">{p.animalProfile.emoji}</span>
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800">
                      {lang === Lang.CN ? p.animalProfile.name_cn : p.animalProfile.name_en}
                    </span>
                    {p.isSelf && <span className="text-xs text-indigo-500 font-semibold">{t.you}</span>}
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

        {/* Toast */}
        {toastMessage && (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-slate-900/90 text-white px-6 py-3 rounded-full shadow-xl pointer-events-none transition-all z-50 animate-bounce-short">
            {toastMessage}
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default App;
