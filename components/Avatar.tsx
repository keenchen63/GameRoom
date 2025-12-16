import React from 'react';
import { Player, Lang } from '../types';

interface AvatarProps {
  player: Player;
  lang: Lang;
  onClick?: () => void;
  size?: 'normal' | 'large';
  showScore?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({ 
  player, 
  lang, 
  onClick, 
  size = 'normal',
  showScore = true 
}) => {
  const isLarge = size === 'large';
  
  return (
    <div 
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-colors cursor-pointer select-none
        ${onClick ? 'active:bg-slate-100' : ''}
      `}
    >
      {/* Avatar Circle */}
      <div className={`
        relative flex items-center justify-center rounded-full shadow-sm bg-white border border-slate-100
        ${isLarge ? 'w-20 h-20 text-5xl' : 'w-16 h-16 text-4xl'}
      `}>
        {player.animalProfile.emoji}
        
        {player.isSelf && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full border-2 border-white" />
        )}
      </div>

      {/* Name */}
      <div className="text-center">
        <h3 className={`font-bold text-slate-800 ${isLarge ? 'text-lg' : 'text-base'}`}>
          {lang === Lang.CN ? player.animalProfile.name_cn : player.animalProfile.name_en}
        </h3>
        {player.isSelf && (
          <span className="text-xs text-indigo-500 font-semibold mt-1 block">
            {lang === Lang.CN ? '我' : 'me'}
          </span>
        )}
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
