import React from 'react';
import { Player, Lang } from '../types';
import { TransferAnimation } from './TransferAnimation';

interface AvatarProps {
  player: Player;
  lang: Lang;
  onClick?: () => void;
  size?: 'normal' | 'large';
  showScore?: boolean;
  transferAmount?: number | null;
  onTransferAnimationComplete?: () => void;
}

export const Avatar: React.FC<AvatarProps> = ({ 
  player, 
  lang, 
  onClick, 
  size = 'normal',
  showScore = true,
  transferAmount = null,
  onTransferAnimationComplete
}) => {
  const isLarge = size === 'large';
  
  return (
    <div 
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-colors cursor-pointer select-none"
      onMouseDown={onClick ? (e) => e.currentTarget.style.backgroundColor = '#EEF4FA' : undefined}
      onMouseUp={onClick ? (e) => e.currentTarget.style.backgroundColor = 'transparent' : undefined}
      onMouseLeave={onClick ? (e) => e.currentTarget.style.backgroundColor = 'transparent' : undefined}
    >
      {/* Avatar Circle */}
      <div 
        className={`relative flex items-center justify-center rounded-full shadow-sm bg-white border ${isLarge ? 'w-20 h-20 text-5xl' : 'w-16 h-16 text-4xl'}`}
        style={{ borderColor: '#DCE8F5' }}
      >
        {player.animalProfile.emoji}
        
        {player.isSelf && (
          <div className="absolute -top-1 -right-1 flex items-center gap-0.5">
            <div className="w-4 h-4 rounded-full border-2 border-white" style={{ backgroundColor: '#2F5D8C' }} />
            <span className="text-xs font-semibold leading-none whitespace-nowrap" style={{ color: '#2F5D8C' }}>
              {lang === Lang.CN ? '我' : 'me'}
            </span>
          </div>
        )}

        {/* 转分动画 */}
        {transferAmount !== null && transferAmount !== 0 && (
          <TransferAnimation
            amount={transferAmount}
            onComplete={onTransferAnimationComplete || (() => {})}
          />
        )}
      </div>

      {/* Name */}
      <div className="text-center">
        <h3 className={`font-bold text-slate-800 ${isLarge ? 'text-lg' : 'text-base'}`}>
          {lang === Lang.CN ? player.animalProfile.name_cn : player.animalProfile.name_en}
        </h3>
      </div>

      {/* Score */}
      {showScore && (
        <div className={`font-mono font-bold text-lg ${player.score >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {player.score > 0 ? '+' : ''}{player.score}
        </div>
      )}
    </div>
  );
};
