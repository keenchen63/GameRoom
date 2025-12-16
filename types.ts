export enum Lang {
  CN = 'CN',
  EN = 'EN',
}

export enum ViewState {
  HOME = 'HOME',
  ROOM = 'ROOM',
  SETTLEMENT = 'SETTLEMENT',
}

export interface AnimalProfile {
  name_cn: string;
  name_en: string;
  emoji: string;
}

export interface Player {
  id: string;
  animalProfile: AnimalProfile;
  score: number;
  isSelf: boolean;
  isHost?: boolean;
}

export interface RoomData {
  code: string;
  players: Player[];
  isEnded?: boolean;
}

// 转分操作记录
export interface TransferRecord {
  fromPlayerId: string;
  fromPlayerName: string;
  fromPlayerEmoji: string;
  toPlayerId: string;
  toPlayerName: string;
  toPlayerEmoji: string;
  amount: number;
  timestamp: number;
}

// WebSocket 消息类型
export interface WSMessage {
  type: 'CREATE_ROOM' | 'JOIN_ROOM' | 'TRANSFER' | 'END_GAME' | 'PING' | 'CHANGE_AVATAR' | 'LEAVE_ROOM' | 'GET_TRANSFER_HISTORY';
  playerId?: string;
  roomId?: string;
  targetPlayerId?: string;
  amount?: number;
  avatar?: AnimalProfile;
}

export interface WSResponse {
  type: 'ROOM_CREATED' | 'ROOM_JOINED' | 'ROOM_STATE' | 'ERROR' | 'PONG' | 'ROOM_LEFT' | 'TRANSFER_SUCCESS' | 'TRANSFER_HISTORY' | 'TRANSFER_ANIMATION';
  data?: any;
}
