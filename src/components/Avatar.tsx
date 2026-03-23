import React from 'react';
import { getAvatarUrl, getAvatarFallback } from '../utils/image';
import { AlertCircle } from 'lucide-react';

interface AvatarProps {
  name?: string;
  url?: string | null;
  imageUrl?: string | null;
  userId?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
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
  const [triedStorage, setTriedStorage] = React.useState(false);

  const originalUrl = url || imageUrl;
  const storageUrl = userId ? `https://bdxddmsdkebxpfuirkmh.supabase.co/storage/v1/object/public/images/${userId}.png` : null;

  // Decide which URL to use
  let currentUrl = null;
  if (userId && !triedStorage) {
    currentUrl = storageUrl;
  } else {
    currentUrl = originalUrl;
  }

  const isAirtable = originalUrl?.includes('airtable');
  const isExpired = failed && isAirtable;

  const handleError = () => {
    if (currentUrl === storageUrl && originalUrl && originalUrl !== storageUrl) {
      setTriedStorage(true);
    } else {
      setFailed(true);
    }
  };

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-2xl',
    xl: 'w-24 h-24 text-4xl'
  };

  return (
    <div className={`relative flex-shrink-0 rounded-full overflow-hidden flex items-center justify-center font-bold text-white ${getColor(name)} ${sizeClasses[size]} ${className}`}>
      {currentUrl && !failed ? (
        <img
          key={currentUrl}
          src={currentUrl}
          alt={name || ''}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={handleError}
        />
      ) : (
        <span>{getAvatarFallback(name || '')}</span>
      )}

      {isExpired && (
        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white p-1 text-center">
          <AlertCircle size={size === 'sm' ? 12 : 16} className="text-amber-400 mb-0.5" />
          {size !== 'sm' && (
            <span className="text-[8px] font-black leading-tight">קישור פג תוקף - נדרש סנכרון</span>
          )}
        </div>
      )}
    </div>
  );
};
