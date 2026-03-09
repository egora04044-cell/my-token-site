'use client';

import { useState } from 'react';

interface FavoriteButtonProps {
  isFavorite: boolean;
  onToggle: () => void;
  className?: string;
}

export default function FavoriteButton({ isFavorite, onToggle, className = '' }: FavoriteButtonProps) {
  const [burst, setBurst] = useState(false);
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBurst(true);
    onToggle();
    setTimeout(() => setBurst(false), 600);
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`relative p-1.5 rounded transition-colors ${className}`}
      aria-label={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
    >
      {burst && (
        <span className="favorite-burst">
          {[...Array(8)].map((_, i) => (
            <span key={i} className="favorite-burst-particle" style={{ '--i': i } as React.CSSProperties} />
          ))}
        </span>
      )}
      <span className={`relative z-10 block transition-transform duration-200 ${burst ? 'scale-125' : ''}`}>
        {isFavorite ? (
          <svg className="w-4 h-4 text-rose-400 fill-current" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-[var(--text-muted)] hover:text-rose-400 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        )}
      </span>
    </button>
  );
}
