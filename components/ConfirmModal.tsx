import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { Lang } from '../types';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message?: string;
  confirmText: string;
  cancelText: string;
  variant?: 'danger' | 'warning';
  lang: Lang;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'warning',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Content */}
      <div className="bg-white w-full max-w-sm mx-4 p-6 rounded-2xl shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className={`p-3 rounded-full ${
            variant === 'danger' ? 'bg-rose-100' : 'bg-yellow-100'
          }`}>
            <AlertTriangle 
              size={32} 
              className={variant === 'danger' ? 'text-rose-600' : 'text-yellow-600'} 
            />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-slate-800 text-center mb-6">
          {title}
        </h2>

        {/* Message */}
        {message && (
          <p className="text-slate-600 text-center mb-6">
            {message}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button 
            variant="secondary" 
            fullWidth 
            onClick={onClose}
          >
            {cancelText}
          </Button>
          <Button 
            variant="secondary" 
            fullWidth 
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

