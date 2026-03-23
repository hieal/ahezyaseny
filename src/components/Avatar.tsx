import React from 'react';
import { getAvatarUrl, getAvatarFallback } from '../utils/image';

interface AvatarProps {
  name?: string;
  url?: string | null;
  imageUrl?: string | null;
  userId?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const getColor = (name?: string) => {
  if (!name) return 'bg-slate-500';
  const colors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500',
    'bg-teal-500', 'bg-blue-500', 'bg-indigo-500', 'bg-violet-500',
    'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const Avatar: React.FC<AvatarProps> = ({ name, url, imageUrl, userId, size = 'md', className = '' }) => {
  const [failed, setFailed] = React.useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-2xl'
  };

  const processedUrl = getAvatarUrl(url || imageUrl, userId);

  if (processedUrl && !failed) {
    return (
      <img
        key={userId}
        src={processedUrl}
        alt={name || ''}
        className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div key={userId} className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold text-white ${getColor(name)} ${className}`}>
      {getAvatarFallback(name || '')}
    </div>
  );
};
