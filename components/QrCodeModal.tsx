import React, { useEffect, useState } from 'react';
import { Lang } from '../types';
import { TEXT } from '../constants';
import { X } from 'lucide-react';
import { Button } from './Button';
import QRCode from 'qrcode';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  lang: Lang;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({
  isOpen,
  onClose,
  roomCode,
  lang,
}) => {
  const t = TEXT[lang];
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  useEffect(() => {
    if (isOpen && roomCode) {
      // 生成二维码，内容为包含房间号的 URL
      const qrUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
      console.log('Generating QR code with URL:', qrUrl);
      
      QRCode.toDataURL(qrUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
        .then((url) => {
          setQrCodeDataUrl(url);
        })
        .catch((err) => {
          console.error('Failed to generate QR code:', err);
        });
    } else {
      // 关闭模态框时清理状态
      setQrCodeDataUrl('');
    }
  }, [isOpen, roomCode]);

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
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">
            {t.roomQrTitle}
          </h2>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200">
            <X size={20} />
          </button>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center justify-center py-6 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-inner border-2 border-slate-200">
            {qrCodeDataUrl ? (
              <img 
                src={qrCodeDataUrl} 
                alt={`QR Code for room ${roomCode}`}
                className="w-64 h-64"
              />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center bg-slate-100 rounded">
                <div className="text-slate-400 text-sm">生成中...</div>
              </div>
            )}
          </div>
          
          <div className="text-center">
             <p className="text-sm text-slate-500 mb-1">{t.scanToJoin}</p>
             <p className="font-mono text-4xl font-extrabold text-indigo-600 tracking-wider">
               {roomCode}
             </p>
          </div>
        </div>

        <Button variant="secondary" fullWidth onClick={onClose}>
          {t.cancel}
        </Button>
      </div>
    </div>
  );
};
