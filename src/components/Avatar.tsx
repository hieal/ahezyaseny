import React from 'react';

interface AvatarProps {
  name?: string;
  url?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const getInitials = (name?: string) => {
  if (!name) return '?';
  return name.charAt(0);
};

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

export const Avatar: React.FC<AvatarProps> = ({ name, url, size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-2xl'
  };

  if (url) {
    return (
      <img
        src={url}
        alt={name || ''}
        className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
        }}
      />
    );
  }

  return (
    <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold text-white ${getColor(name)} ${className}`}>
      {getInitials(name)}
    </div>
  );
};
