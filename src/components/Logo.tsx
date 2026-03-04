import React from 'react';
import { Heart } from 'lucide-react';

interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 32, showText = true, className = "" }) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Stylized Heart Logo matching the provided image */}
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 85C50 85 10 60 10 35C10 15 30 10 50 30C70 10 90 15 90 35C90 60 50 85 50 85Z" stroke="#16a34a" strokeWidth="8" strokeLinejoin="round"/>
        <path d="M50 75C50 75 20 55 20 35C20 20 35 15 50 30C65 15 80 20 80 35C80 55 50 75 50 75Z" fill="#16a34a" fillOpacity="0.1"/>
        <path d="M50 30C50 30 40 20 30 20C20 20 15 25 15 35C15 50 50 75 50 75" stroke="#16a34a" strokeWidth="4" strokeLinecap="round"/>
      </svg>
    </div>
    {showText && (
      <div className="flex flex-col text-right">
        <h1 className="text-xl font-extrabold text-text-main leading-none tracking-tight">החצי השני</h1>
        <p className="text-[10px] text-green-600 font-bold tracking-widest uppercase mt-0.5">אנשים פוגשים אנשים</p>
      </div>
    )}
  </div>
);
