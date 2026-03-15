'use client';

import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/lib/language-context';
import { LANGUAGES, t } from '@/lib/translations';

type DropdownDirection = 'down-left' | 'up-right';

const AUTO_CLOSE_MS = 1000;

export default function LanguageSwitcher({ direction = 'down-left' }: { direction?: DropdownDirection }) {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const closeCompleteRef = useRef(false);
  const startCloseAnimation = () => {
    clearCloseTimer();
    closeCompleteRef.current = false;
    setClosing(true);
    setTimeout(() => {
      if (!closeCompleteRef.current) handleCloseComplete();
    }, 250);
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(startCloseAnimation, AUTO_CLOSE_MS);
  };

  const handleCloseComplete = () => {
    if (closeCompleteRef.current) return;
    closeCompleteRef.current = true;
    setOpen(false);
    setClosing(false);
  };

  useEffect(() => {
    return () => clearCloseTimer();
  }, []);

  const listClasses = direction === 'down-left'
    ? 'absolute right-0 top-full mt-1 py-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-xl z-20 min-w-[120px]'
    : 'absolute left-0 bottom-full mb-1 py-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-xl z-20 min-w-[120px]';

  return (
    <div className="relative">
      {(open || closing) && (
        <div className={`fixed inset-0 z-10 ${closing ? 'language-overlay-exit' : 'language-overlay-enter'}`} onClick={() => { clearCloseTimer(); startCloseAnimation(); }} aria-hidden />
      )}
      <div
        className="relative"
        onMouseEnter={clearCloseTimer}
        onMouseLeave={() => open && scheduleClose()}
      >
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="font-mono text-xs text-[var(--text-muted)] hover:text-[var(--foreground)] px-2 py-1.5 rounded-lg border border-[var(--border)] hover:border-[var(--border-hover)] transition-colors"
          aria-label="Select language"
        >
          {t(lang, 'language')}
        </button>
        {(open || closing) && (
          <ul
            className={`${listClasses} ${
              closing
                ? direction === 'down-left'
                  ? 'language-dropdown-exit'
                  : 'language-dropdown-exit-up'
                : direction === 'down-left'
                  ? 'language-dropdown-enter'
                  : 'language-dropdown-enter-up'
            }`}
            onAnimationEnd={(e) => {
              if (closing && (e.animationName === 'dropdown-fade-out' || e.animationName === 'dropdown-fade-out-up')) {
                handleCloseComplete();
              }
            }}
          >
            {LANGUAGES.map((l) => (
              <li key={l.code}>
                <button
                  type="button"
                  onClick={() => {
                    setLang(l.code);
                    startCloseAnimation();
                  }}
                  className={`font-mono text-xs w-full text-left px-3 py-2 hover:bg-[var(--bg-elevated)] transition-colors ${
                    lang === l.code ? 'text-[var(--foreground)] font-medium' : 'text-[var(--text-muted)]'
                  }`}
                >
                  {l.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
