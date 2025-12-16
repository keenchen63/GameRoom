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
            {t.transferScore} <span className="text-indigo-600">{lang === Lang.CN ? targetPlayer.animalProfile.name_cn : targetPlayer.animalProfile.name_en}</span>
          </h2>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200">
            <X size={20} />
          </button>
        </div>

        {/* Input Display */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-500 mb-2">{t.amount}</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-full text-4xl font-mono font-bold text-center py-4 border-b-2 border-slate-200 focus:border-indigo-500 focus:outline-none bg-transparent"
          />
        </div>

        {/* Quick Buttons */}
        <div className="grid grid-cols-5 gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((val) => (
            <button
              key={val}
              onClick={() => handleQuickAdd(val)}
              className="py-3 rounded-lg bg-slate-50 font-bold text-slate-600 border border-slate-200 active:bg-indigo-50 active:border-indigo-200 active:text-indigo-600 transition-colors"
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
