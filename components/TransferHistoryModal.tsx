import React from 'react';
import { TransferRecord, Lang, RoomData } from '../types';
import { X } from 'lucide-react';

interface TransferHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  transferHistory: TransferRecord[];
  room: RoomData | null; // 添加 room 参数，用于查找玩家 avatar
  lang: Lang;
}

export const TransferHistoryModal: React.FC<TransferHistoryModalProps> = ({
  isOpen,
  onClose,
  transferHistory,
  room,
  lang,
}) => {
  if (!isOpen) return null;

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  // 根据 playerId 获取玩家名称（优先从 room.players 中查找，否则使用历史记录中的名称）
  const getPlayerName = (playerId: string, fallbackName: string, fallbackEmoji: string) => {
    if (room) {
      const player = room.players.find(p => p.id === playerId);
      if (player) {
        return lang === Lang.CN ? player.animalProfile.name_cn : player.animalProfile.name_en;
      }
    }
    // 如果找不到玩家（可能已离开），使用历史记录中的名称
    return fallbackName;
  };

  // 根据 playerId 获取玩家 emoji（优先从 room.players 中查找，否则使用历史记录中的 emoji）
  const getPlayerEmoji = (playerId: string, fallbackEmoji: string) => {
    if (room) {
      const player = room.players.find(p => p.id === playerId);
      if (player) {
        return player.animalProfile.emoji;
      }
    }
    // 如果找不到玩家（可能已离开），使用历史记录中的 emoji
    return fallbackEmoji;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: '#DCE8F5' }}>
          <h2 className="text-xl font-bold text-slate-800">
            {lang === Lang.CN ? '转分记录' : 'Transfer History'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg active:scale-95 transition-transform"
            style={{ color: '#5B6E80' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#EEF4FA'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {transferHistory.length === 0 ? (
            <div className="text-center py-12" style={{ color: '#5B6E80' }}>
              {lang === Lang.CN ? '暂无转分记录' : 'No transfer records'}
            </div>
          ) : (
            <div className="space-y-3">
              {[...transferHistory].reverse().map((record, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-4 rounded-xl border"
                  style={{ backgroundColor: '#EEF4FA', borderColor: '#DCE8F5' }}
                >
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-2xl">{getPlayerEmoji(record.fromPlayerId, record.fromPlayerEmoji)}</span>
                    <span className="font-semibold text-slate-800">
                      {getPlayerName(record.fromPlayerId, record.fromPlayerName, record.fromPlayerEmoji)}
                    </span>
                    <span style={{ color: '#5B6E80' }}>
                      {lang === Lang.CN ? '向' : '→'}
                    </span>
                    <span className="text-2xl">{getPlayerEmoji(record.toPlayerId, record.toPlayerEmoji)}</span>
                    <span className="font-semibold text-slate-800">
                      {getPlayerName(record.toPlayerId, record.toPlayerName, record.toPlayerEmoji)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-lg" style={{ color: '#2F5D8C' }}>
                      {record.amount > 0 ? '+' : ''}{record.amount}
                    </span>
                    <span className="text-xs" style={{ color: '#5B6E80' }}>
                      {formatTime(record.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

