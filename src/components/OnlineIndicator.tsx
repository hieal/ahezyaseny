import React from 'react';

interface OnlineIndicatorProps {
  isOnline: boolean;
  className?: string;
}

export const OnlineIndicator: React.FC<OnlineIndicatorProps> = ({ isOnline, className = '' }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-slate-300'}`} />
      {isOnline && (
        <div className="absolute w-2 h-2 rounded-full bg-green-500 animate-ping" />
      )}
    </div>
  );
};
