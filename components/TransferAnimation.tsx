import React, { useEffect, useState } from 'react';

interface TransferAnimationProps {
  amount: number;
  onComplete: () => void;
}

export const TransferAnimation: React.FC<TransferAnimationProps> = ({ amount, onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // 1.5 秒后隐藏动画
    const timer = setTimeout(() => {
      setIsVisible(false);
      // 等待动画完成后调用 onComplete
      setTimeout(onComplete, 300);
    }, 1500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  const isPositive = amount > 0;
  const displayAmount = isPositive ? `+${amount}` : `${amount}`;

  return (
    <div
      className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      } transition-opacity duration-300`}
      style={{
        animation: isVisible ? 'floatUp 1.5s ease-out forwards' : 'none',
      }}
    >
      <div
        className={`text-2xl font-bold font-mono ${
          isPositive ? 'text-emerald-600' : 'text-rose-600'
        } drop-shadow-lg`}
        style={{
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
        }}
      >
        {displayAmount}
      </div>
      <style>{`
        @keyframes floatUp {
          0% {
            transform: translate(-50%, -50%) translateY(0) scale(0.8);
            opacity: 0;
          }
          20% {
            opacity: 1;
            transform: translate(-50%, -50%) translateY(-10px) scale(1);
          }
          100% {
            transform: translate(-50%, -50%) translateY(-60px) scale(0.9);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

