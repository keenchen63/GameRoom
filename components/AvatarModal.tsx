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
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200">
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
                className={`
                  flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all
                  ${selectedAvatar.emoji === animal.emoji 
                    ? 'border-indigo-500 bg-indigo-50' 
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }
                `}
              >
                <div className="text-4xl">{animal.emoji}</div>
                <span className="text-xs font-medium text-slate-600">
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

