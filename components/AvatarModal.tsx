import React, { useState } from 'react';
import { AnimalProfile, Lang } from '../types';
import { ANIMALS, TEXT } from '../constants';
import { Button } from './Button';
import { X } from 'lucide-react';

interface AvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatar: AnimalProfile;
  lang: Lang;
  onConfirm: (avatar: AnimalProfile) => void;
}

export const AvatarModal: React.FC<AvatarModalProps> = ({
  isOpen,
  onClose,
  currentAvatar,
  lang,
  onConfirm,
}) => {
  const [selectedAvatar, setSelectedAvatar] = useState<AnimalProfile>(currentAvatar);
  const t = TEXT[lang];

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(selectedAvatar);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto transition-opacity"
        onClick={onClose}
      />

      {/* Content */}
      <div className="bg-white w-full max-w-md p-6 rounded-t-3xl sm:rounded-2xl shadow-2xl z-10 pointer-events-auto transform transition-transform duration-300 animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-5 fade-in">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">
            {lang === Lang.CN ? '更换头像' : 'Change Avatar'}
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full transition-colors"
            style={{ backgroundColor: '#EEF4FA', color: '#5B6E80' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#DCE8F5'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#EEF4FA'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Avatar Grid - 可滚动 */}
        <div className="max-h-[60vh] overflow-y-auto mb-6 -webkit-overflow-scrolling-touch">
          <div className="grid grid-cols-5 gap-4">
            {ANIMALS.map((animal) => (
              <button
                key={animal.emoji}
                onClick={() => setSelectedAvatar(animal)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all"
                style={
                  selectedAvatar.emoji === animal.emoji 
                    ? { borderColor: '#2F5D8C', backgroundColor: 'rgba(47, 93, 140, 0.1)' }
                    : { borderColor: '#DCE8F5' }
                }
                onMouseEnter={(e) => {
                  if (selectedAvatar.emoji !== animal.emoji) {
                    e.currentTarget.style.borderColor = '#2F5D8C';
                    e.currentTarget.style.backgroundColor = '#EEF4FA';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedAvatar.emoji !== animal.emoji) {
                    e.currentTarget.style.borderColor = '#DCE8F5';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div className="text-4xl">{animal.emoji}</div>
                <span className="text-xs font-medium" style={{ color: '#5B6E80' }}>
                  {lang === Lang.CN ? animal.name_cn : animal.name_en}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Button variant="secondary" fullWidth onClick={onClose}>
            {t.cancel}
          </Button>
          <Button fullWidth onClick={handleConfirm}>
            {t.confirm}
          </Button>
        </div>

      </div>
    </div>
  );
};

