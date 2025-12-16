import { WebSocketServer } from 'ws';
import { randomInt } from 'crypto';

const PORT = process.env.PORT || 3001;
const wss = new WebSocketServer({ port: PORT });

// 预设头像列表（动物、水果、蔬菜）
const ANIMALS = [
  // 动物
  { name_cn: '老虎', name_en: 'Tiger', emoji: '🐯' },
  { name_cn: '熊猫', name_en: 'Panda', emoji: '🐼' },
  { name_cn: '狮子', name_en: 'Lion', emoji: '🦁' },
  { name_cn: '兔子', name_en: 'Rabbit', emoji: '🐰' },
  { name_cn: '狐狸', name_en: 'Fox', emoji: '🦊' },
  { name_cn: '考拉', name_en: 'Koala', emoji: '🐨' },
  { name_cn: '企鹅', name_en: 'Penguin', emoji: '🐧' },
  { name_cn: '猴子', name_en: 'Monkey', emoji: '🐵' },
  { name_cn: '小猪', name_en: 'Piglet', emoji: '🐷' },
  { name_cn: '青蛙', name_en: 'Frog', emoji: '🐸' },
  // 水果
  { name_cn: '苹果', name_en: 'Apple', emoji: '🍎' },
  { name_cn: '香蕉', name_en: 'Banana', emoji: '🍌' },
  { name_cn: '葡萄', name_en: 'Grape', emoji: '🍇' },
  { name_cn: '橙子', name_en: 'Orange', emoji: '🍊' },
  { name_cn: '草莓', name_en: 'Strawberry', emoji: '🍓' },
  { name_cn: '桃子', name_en: 'Peach', emoji: '🍑' },
  { name_cn: '西瓜', name_en: 'Watermelon', emoji: '🍉' },
  { name_cn: '梨', name_en: 'Pear', emoji: '🍐' },
  { name_cn: '猕猴桃', name_en: 'Kiwi', emoji: '🥝' },
  { name_cn: '樱桃', name_en: 'Cherry', emoji: '🍒' },
  { name_cn: '芒果', name_en: 'Mango', emoji: '🥭' },
  { name_cn: '菠萝', name_en: 'Pineapple', emoji: '🍍' },
  // 蔬菜
  { name_cn: '胡萝卜', name_en: 'Carrot', emoji: '🥕' },
  { name_cn: '西兰花', name_en: 'Broccoli', emoji: '🥦' },
  { name_cn: '黄瓜', name_en: 'Cucumber', emoji: '🥒' },
  { name_cn: '生菜', name_en: 'Lettuce', emoji: '🥬' },
  { name_cn: '番茄', name_en: 'Tomato', emoji: '🍅' },
  { name_cn: '土豆', name_en: 'Potato', emoji: '🥔' },
  { name_cn: '洋葱', name_en: 'Onion', emoji: '🧅' },
  { name_cn: '甜椒', name_en: 'Bell Pepper', emoji: '🫑' },
  { name_cn: '辣椒', name_en: 'Pepper', emoji: '🌶️' },
  { name_cn: '牛油果', name_en: 'Avocado', emoji: '🥑' },
  { name_cn: '蘑菇', name_en: 'Mushroom', emoji: '🍄' },
  { name_cn: '玉米', name_en: 'Corn', emoji: '🌽' },
];

// 房间存储（内存，不持久化）
const rooms = new Map(); // roomId -> { players: Map<playerId, player>, isEnded: boolean }
const playerToRoom = new Map(); // playerId -> roomId
const playerToSocket = new Map(); // playerId -> WebSocket

// 生成随机动物头像，确保不在房间中已存在
function getRandomAnimal(room = null) {
  if (!room || room.players.size === 0) {
    // 如果房间为空，直接返回随机动物
    return ANIMALS[randomInt(0, ANIMALS.length)];
  }
  
  // 获取房间中已使用的头像 emoji
  const usedEmojis = new Set();
  room.players.forEach((player) => {
    if (player.avatar && player.avatar.emoji) {
      usedEmojis.add(player.avatar.emoji);
    }
  });
  
  // 获取可用的动物列表
  const availableAnimals = ANIMALS.filter(animal => !usedEmojis.has(animal.emoji));
  
  // 如果没有可用动物，返回随机动物（理论上不应该发生，因为动物数量应该足够）
  if (availableAnimals.length === 0) {
    console.warn('No available animals, using random animal');
    return ANIMALS[randomInt(0, ANIMALS.length)];
  }
  
  // 从可用动物中随机选择
  return availableAnimals[randomInt(0, availableAnimals.length)];
}

// 生成玩家 ID
function generatePlayerId() {
  return 'p_' + Date.now() + '_' + randomInt(1000, 9999);
}

// 生成房间 ID（4位数字）
function generateRoomId() {
  let roomId;
  do {
    roomId = randomInt(1000, 10000).toString();
  } while (rooms.has(roomId));
  return roomId;
}

// 获取房间状态
function getRoomState(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;

  const players = Array.from(room.players.values()).map(p => ({
    id: p.id,
    avatar: p.avatar,
    name: p.name,
    score: p.score,
    isHost: p.isHost,
  }));

  return {
    roomId,
    players,
    isEnded: room.isEnded,
  };
}

// 广播房间状态到所有玩家
function broadcastRoomState(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  const state = getRoomState(roomId);
  const message = JSON.stringify({ type: 'ROOM_STATE', data: state });

  room.players.forEach((player) => {
    const ws = playerToSocket.get(player.id);
    if (ws && ws.readyState === 1) { // WebSocket.OPEN
      ws.send(message);
    }
  });
}

// 处理创建房间
function handleCreateRoom(ws, playerId) {
  console.log(`handleCreateRoom: playerId=${playerId}`);
  console.log(`Current playerToRoom map:`, Array.from(playerToRoom.entries()));
  
  // 如果玩家已经在房间中，先完全清理
  if (playerToRoom.has(playerId)) {
    const oldRoomId = playerToRoom.get(playerId);
    const oldRoom = rooms.get(oldRoomId);
    
    console.log(`Player ${playerId} is in room ${oldRoomId}, cleaning up before creating new room`);
    
    if (oldRoom) {
      // 如果旧房间已结束，直接删除
      if (oldRoom.isEnded) {
        console.log(`Old room ${oldRoomId} is ended, deleting it`);
        rooms.delete(oldRoomId);
      } else {
        // 先检查离开的玩家是否是房主（在删除之前）
        const leavingPlayer = oldRoom.players.get(playerId);
        const wasHost = leavingPlayer?.isHost === true;
        
        // 从旧房间中移除玩家
        oldRoom.players.delete(playerId);
        
        // 如果旧房间为空，删除房间
        if (oldRoom.players.size === 0) {
          console.log(`Old room ${oldRoomId} is now empty, deleting it`);
          rooms.delete(oldRoomId);
        } else {
          // 如果离开的是房主，将第一个剩余玩家设为新房主
          if (wasHost && oldRoom.players.size > 0) {
            const firstPlayer = Array.from(oldRoom.players.values())[0];
            firstPlayer.isHost = true;
          }
          // 广播更新
          broadcastRoomState(oldRoomId);
        }
      }
    }
    
    // 清理映射关系（无论房间是否存在）
    console.log(`Cleaning up mappings for player ${playerId}`);
    playerToRoom.delete(playerId);
    playerToSocket.delete(playerId);
  } else {
    // 即使 playerToRoom 中没有，也要确保 playerToSocket 中没有残留
    if (playerToSocket.has(playerId)) {
      console.log(`Found residual socket mapping for player ${playerId}, cleaning up`);
      playerToSocket.delete(playerId);
    }
  }

  // 创建新房间，重置所有玩家状态
  const roomId = generateRoomId();
  
  // 创建空房间
  const room = {
    players: new Map(),
    isEnded: false,
  };
  
  // 为新房间生成不重复的头像
  const animal = getRandomAnimal(room);
  
  const player = {
    id: playerId,
    avatar: animal,
    name: animal.name_cn, // 默认使用中文名
    score: 0,
    isHost: true,
  };

  room.players.set(playerId, player);
  rooms.set(roomId, room);
  playerToRoom.set(playerId, roomId);
  playerToSocket.set(playerId, ws);

  console.log(`Room ${roomId} created for player ${playerId}`);
  console.log(`Total rooms: ${rooms.size}, Total players: ${playerToRoom.size}`);

  const state = getRoomState(roomId);
  ws.send(JSON.stringify({ type: 'ROOM_CREATED', data: state }));
}

// 处理加入房间
function handleJoinRoom(ws, playerId, roomId) {
  console.log(`handleJoinRoom: playerId=${playerId}, roomId=${roomId}`);
  console.log(`Available rooms:`, Array.from(rooms.keys()));
  console.log(`playerToRoom map:`, Array.from(playerToRoom.entries()));
  console.log(`Room ${roomId} players:`, Array.from(rooms.get(roomId)?.players.keys() || []));
  
  const room = rooms.get(roomId);
  if (!room) {
    console.log(`Room ${roomId} not found for player ${playerId}`);
    console.log(`Current rooms:`, Array.from(rooms.keys()));
    ws.send(JSON.stringify({ type: 'ERROR', data: { message: '房间不存在' } }));
    return;
  }

  if (room.isEnded) {
    // 如果房间已结束，清理该玩家的 playerToRoom 映射
    if (playerToRoom.has(playerId) && playerToRoom.get(playerId) === roomId) {
      playerToRoom.delete(playerId);
      console.log(`Cleaned up playerToRoom mapping for player ${playerId} from ended room ${roomId}`);
    }
    ws.send(JSON.stringify({ type: 'ERROR', data: { message: '房间已结束' } }));
    return;
  }

  // 检查玩家是否已经在房间中（rejoin）
  const existingPlayer = room.players.get(playerId);
  console.log(`Checking for existing player ${playerId} in room ${roomId}:`, existingPlayer ? 'FOUND' : 'NOT FOUND');
  if (existingPlayer) {
    // Rejoin: 恢复玩家状态
    // 注意：如果玩家在 playerToRoom 中但指向不同的房间，需要先清理
    const oldRoomId = playerToRoom.get(playerId);
    if (oldRoomId && oldRoomId !== roomId) {
      console.log(`Player ${playerId} is in different room ${oldRoomId}, cleaning up`);
      // 从旧房间中移除（但不删除房间，因为可能还有其他玩家）
      const oldRoom = rooms.get(oldRoomId);
      if (oldRoom) {
        // 如果旧房间已结束，直接删除
        if (oldRoom.isEnded) {
          rooms.delete(oldRoomId);
          console.log(`Deleted ended room ${oldRoomId} during rejoin cleanup`);
        } else {
          oldRoom.players.delete(playerId);
          if (oldRoom.players.size === 0) {
            rooms.delete(oldRoomId);
          }
        }
      }
    }
    
    console.log(`Player ${playerId} rejoining room ${roomId}`);
    playerToSocket.set(playerId, ws);
    playerToRoom.set(playerId, roomId); // 确保映射关系正确
    const state = getRoomState(roomId);
    ws.send(JSON.stringify({ type: 'ROOM_JOINED', data: state }));
    return;
  }

  // 如果玩家在 playerToRoom 中但不在当前房间，需要先清理
  // 注意：只有在玩家确实在不同房间时才离开，避免误删当前房间
  if (playerToRoom.has(playerId)) {
    const oldRoomId = playerToRoom.get(playerId);
    if (oldRoomId && oldRoomId !== roomId) {
      console.log(`Player ${playerId} is in different room ${oldRoomId}, leaving first`);
      handleLeaveRoom(ws, playerId);
    } else if (oldRoomId === roomId) {
      // 玩家已经在当前房间的映射中，但不在 players 中（可能是数据不一致）
      // 这种情况不应该发生，但为了安全，我们直接更新 socket 映射
      console.log(`Player ${playerId} already mapped to room ${roomId}, updating socket only`);
      playerToSocket.set(playerId, ws);
      // 将玩家重新添加到房间（如果不在的话）
      if (!room.players.has(playerId)) {
        console.log(`Player ${playerId} not in room players, re-adding`);
        // 这里不应该发生，但如果发生了，我们需要恢复玩家数据
        // 由于我们不知道原始数据，只能创建一个新玩家
        const animal = getRandomAnimal(room); // 确保头像不在房间中已存在
        const player = {
          id: playerId,
          avatar: animal,
          name: animal.name_cn,
          score: 0,
          isHost: room.players.size === 0, // 如果房间为空，设为房主
        };
        room.players.set(playerId, player);
      }
      const state = getRoomState(roomId);
      ws.send(JSON.stringify({ type: 'ROOM_JOINED', data: state }));
      return;
    }
  }

  // 新玩家加入
  const animal = getRandomAnimal(room); // 确保头像不在房间中已存在
  const player = {
    id: playerId,
    avatar: animal,
    name: animal.name_cn,
    score: 0,
    isHost: false, // 只有第一个玩家是房主
  };

  room.players.set(playerId, player);
  playerToRoom.set(playerId, roomId);
  playerToSocket.set(playerId, ws);

  // 广播新玩家加入
  broadcastRoomState(roomId);
}

// 处理离开房间
function handleLeaveRoom(ws, playerId) {
  const roomId = playerToRoom.get(playerId);
  if (!roomId) return;

  const room = rooms.get(roomId);
  if (!room) {
    // 如果房间不存在，清理映射关系
    playerToRoom.delete(playerId);
    playerToSocket.delete(playerId);
    return;
  }

  // 检查离开的玩家是否是房主
  const leavingPlayer = room.players.get(playerId);
  const wasHost = leavingPlayer?.isHost === true;

  room.players.delete(playerId);
  playerToRoom.delete(playerId);
  playerToSocket.delete(playerId);

  // 如果房间为空，删除房间
  if (room.players.size === 0) {
    rooms.delete(roomId);
  } else {
    // 如果离开的是房主，将第一个剩余玩家设为新房主
    if (wasHost && room.players.size > 0) {
      const firstPlayer = Array.from(room.players.values())[0];
      firstPlayer.isHost = true;
    }
    // 只有在房间未结束时才广播更新
    if (!room.isEnded) {
      broadcastRoomState(roomId);
    }
  }
}

// 处理转分
function handleTransfer(ws, playerId, targetPlayerId, amount) {
  const roomId = playerToRoom.get(playerId);
  if (!roomId) {
    ws.send(JSON.stringify({ type: 'ERROR', data: { message: '你不在任何房间中' } }));
    return;
  }

  const room = rooms.get(roomId);
  if (!room) {
    ws.send(JSON.stringify({ type: 'ERROR', data: { message: '房间不存在' } }));
    return;
  }

  if (room.isEnded) {
    ws.send(JSON.stringify({ type: 'ERROR', data: { message: '房间已结束' } }));
    return;
  }

  if (playerId === targetPlayerId) {
    ws.send(JSON.stringify({ type: 'ERROR', data: { message: '不能给自己转分' } }));
    return;
  }

  const fromPlayer = room.players.get(playerId);
  const toPlayer = room.players.get(targetPlayerId);

  if (!fromPlayer || !toPlayer) {
    ws.send(JSON.stringify({ type: 'ERROR', data: { message: '玩家不存在' } }));
    return;
  }

  // 允许负分，不检查分数是否足够

  // 原子操作：转分
  fromPlayer.score -= amount;
  toPlayer.score += amount;

  // 广播更新
  broadcastRoomState(roomId);
}

// 处理结束游戏
function handleEndGame(ws, playerId) {
  const roomId = playerToRoom.get(playerId);
  if (!roomId) {
    ws.send(JSON.stringify({ type: 'ERROR', data: { message: '你不在任何房间中' } }));
    return;
  }

  const room = rooms.get(roomId);
  if (!room) {
    ws.send(JSON.stringify({ type: 'ERROR', data: { message: '房间不存在' } }));
    return;
  }

  const player = room.players.get(playerId);
  if (!player || !player.isHost) {
    ws.send(JSON.stringify({ type: 'ERROR', data: { message: '只有房主可以结束房间' } }));
    return;
  }

  room.isEnded = true;
  
  // 先广播房间状态（包含结算数据），客户端会保存到 state 中
  broadcastRoomState(roomId);
  
  // 清理所有玩家的 playerToRoom 映射（房间已结束，不允许 rejoin）
  room.players.forEach((player) => {
    if (playerToRoom.get(player.id) === roomId) {
      playerToRoom.delete(player.id);
      console.log(`Cleaned up playerToRoom mapping for player ${player.id} from ended room ${roomId}`);
    }
  });
  
  // 立即删除已结束的房间（结算数据已发送给客户端，不需要保留）
  rooms.delete(roomId);
  console.log(`Room ${roomId} ended and deleted`);
}

// 处理更换头像
function handleChangeAvatar(ws, playerId, newAvatar) {
  const roomId = playerToRoom.get(playerId);
  if (!roomId) {
    ws.send(JSON.stringify({ type: 'ERROR', data: { message: '你不在任何房间中' } }));
    return;
  }

  const room = rooms.get(roomId);
  if (!room) {
    ws.send(JSON.stringify({ type: 'ERROR', data: { message: '房间不存在' } }));
    return;
  }

  const player = room.players.get(playerId);
  if (!player) {
    ws.send(JSON.stringify({ type: 'ERROR', data: { message: '玩家不存在' } }));
    return;
  }

  // 更新头像和昵称
  player.avatar = newAvatar;
  player.name = newAvatar.name_cn; // 默认使用中文名

  // 广播更新
  broadcastRoomState(roomId);
}

// 处理离开房间请求
function handleLeaveRoomRequest(ws, playerId) {
  const roomId = playerToRoom.get(playerId);
  if (!roomId) {
    ws.send(JSON.stringify({ type: 'ERROR', data: { message: '你不在任何房间中' } }));
    return;
  }

  const room = rooms.get(roomId);
  if (!room) {
    ws.send(JSON.stringify({ type: 'ERROR', data: { message: '房间不存在' } }));
    return;
  }

  const player = room.players.get(playerId);
  if (!player) {
    ws.send(JSON.stringify({ type: 'ERROR', data: { message: '玩家不存在' } }));
    return;
  }

  // 检查积分是否为0
  if (player.score !== 0) {
    ws.send(JSON.stringify({ type: 'ERROR', data: { message: '积分为0才能离开房间' } }));
    return;
  }

  // 执行离开房间
  handleLeaveRoom(ws, playerId);
  
  // 发送离开成功消息
  ws.send(JSON.stringify({ type: 'ROOM_LEFT', data: { message: '已离开房间' } }));
}

// WebSocket 连接处理
wss.on('connection', (ws) => {
  let playerId = null;

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'CREATE_ROOM':
          if (!playerId) {
            playerId = message.playerId || generatePlayerId();
          }
          handleCreateRoom(ws, playerId);
          break;

        case 'JOIN_ROOM':
          // 强制使用 message 中的 playerId，不要使用连接级别的 playerId
          // 因为每次连接可能使用不同的 playerId（刷新页面时）
          const joinPlayerId = message.playerId || generatePlayerId();
          console.log(`JOIN_ROOM message received: playerId=${joinPlayerId}, roomId=${message.roomId}, connection playerId=${playerId}`);
          handleJoinRoom(ws, joinPlayerId, message.roomId);
          // 更新连接级别的 playerId，以便后续消息使用
          if (!playerId) {
            playerId = joinPlayerId;
          }
          break;

        case 'TRANSFER':
          if (!playerId) {
            playerId = message.playerId;
          }
          handleTransfer(ws, playerId, message.targetPlayerId, message.amount);
          break;

        case 'END_GAME':
          if (!playerId) {
            playerId = message.playerId;
          }
          handleEndGame(ws, playerId);
          break;

        case 'CHANGE_AVATAR':
          if (!playerId) {
            playerId = message.playerId;
          }
          handleChangeAvatar(ws, playerId, message.avatar);
          break;

        case 'LEAVE_ROOM':
          if (!playerId) {
            playerId = message.playerId;
          }
          handleLeaveRoomRequest(ws, playerId);
          break;

        case 'PING':
          ws.send(JSON.stringify({ type: 'PONG' }));
          break;

        default:
          ws.send(JSON.stringify({ type: 'ERROR', data: { message: '未知消息类型' } }));
      }
    } catch (error) {
      console.error('Error handling message:', error);
      ws.send(JSON.stringify({ type: 'ERROR', data: { message: '消息格式错误' } }));
    }
  });

  ws.on('close', () => {
    if (playerId) {
      // 注意：不删除玩家，允许 rejoin
      // 只删除 socket 映射，保留玩家在房间中的信息
      const roomId = playerToRoom.get(playerId);
      console.log(`Player ${playerId} disconnected from room ${roomId}, keeping room data for rejoin`);
      console.log(`Room ${roomId} still exists:`, rooms.has(roomId));
      playerToSocket.delete(playerId);
      // 不删除 playerToRoom，这样 rejoin 时可以找到房间
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

console.log(`WebSocket server running on ws://localhost:${PORT}`);

