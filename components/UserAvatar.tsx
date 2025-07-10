import React from 'react';

interface UserAvatarProps {
  color: string;
  emoji: string;
  size?: number | string;
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ 
  color, 
  emoji, 
  size = 40, 
  className 
}) => (
  <span
    className={`flex items-center justify-center rounded-full border-2 border-zinc-900 shadow-md ${className || ''}`}
    style={{
      width: size,
      height: size,
      backgroundColor: color,
      fontSize: typeof size === 'number' ? size * 0.49 : '1.4rem',
      userSelect: 'none',
      lineHeight: 1,
      display: 'inline-flex',
      overflow: 'hidden',
      position: 'relative',
    }}
    aria-label="User avatar"
  >
    <span className="select-none" style={{ lineHeight: 1 }}>{emoji}</span>
  </span>
);
