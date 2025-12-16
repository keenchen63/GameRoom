import React, { useState } from 'react';
import { Player, Lang } from '../types';
import { TEXT } from '../constants';
import { Button } from './Button';
import { X } from 'lucide-react';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPlayer: Player | null;
  lang: Lang;
  onConfirm: (amount: number) => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  targetPlayer,
  lang,
  onConfirm,
}) => {
  const [amount, setAmount] = useState<string>('');
  const t = TEXT[lang];

  if (!isOpen || !targetPlayer) return null;

  const handleQuickAdd = (val: number) => {
    setAmount(val.toString());
  };

  const handleSubmit = () => {
    const val = parseInt(amount, 10);
    if (!isNaN(val) && val > 0) {
      onConfirm(val);
      setAmount('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto transition-opacity"
        onClick={onClose}
      />

      {/* Content - 卡片式效果 */}
      <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-2xl z-10 pointer-events-auto transform transition-all duration-300 animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">
            {t.transferScore} <span style={{ color: '#2F5D8C' }}>{lang === Lang.CN ? targetPlayer.animalProfile.name_cn : targetPlayer.animalProfile.name_en}</span>
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

        {/* Input Display */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2" style={{ color: '#5B6E80' }}>{t.amount}</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-full text-4xl font-mono font-bold text-center py-4 border-b-2 focus:outline-none bg-transparent"
            style={{ 
              borderBottomColor: '#2F5D8C',
              '--tw-ring-color': '#2F5D8C',
            } as React.CSSProperties & { '--tw-ring-color': string }}
            onFocus={(e) => e.currentTarget.style.borderBottomColor = '#2F5D8C'}
            onBlur={(e) => e.currentTarget.style.borderBottomColor = '#DCE8F5'}
          />
        </div>

        {/* Quick Buttons */}
        <div className="grid grid-cols-5 gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((val) => (
            <button
              key={val}
              onClick={() => handleQuickAdd(val)}
              className="py-3 rounded-lg bg-slate-50 font-bold text-slate-600 border border-slate-200 transition-colors"
              onMouseDown={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(47, 93, 140, 0.1)';
                e.currentTarget.style.borderColor = '#2F5D8C';
                e.currentTarget.style.color = '#2F5D8C';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.backgroundColor = '#EEF4FA';
                e.currentTarget.style.borderColor = '#DCE8F5';
                e.currentTarget.style.color = '#5B6E80';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#EEF4FA';
                e.currentTarget.style.borderColor = '#DCE8F5';
                e.currentTarget.style.color = '#5B6E80';
              }}
            >
              {val}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Button variant="secondary" fullWidth onClick={onClose}>
            {t.cancel}
          </Button>
          <Button fullWidth onClick={handleSubmit} disabled={!amount || parseInt(amount) <= 0}>
            {t.confirm}
          </Button>
        </div>

      </div>
    </div>
  );
};
