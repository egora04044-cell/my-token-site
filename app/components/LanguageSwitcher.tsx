'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/language-context';
import { LANGUAGES, t } from '@/lib/translations';

type DropdownDirection = 'down-left' | 'up-right';

export default function LanguageSwitcher({ direction = 'down-left' }: { direction?: DropdownDirection }) {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);

  const listClasses = direction === 'down-left'
    ? 'absolute right-0 top-full mt-1 py-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-xl z-20 min-w-[120px]'
    : 'absolute left-0 bottom-full mb-1 py-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-xl z-20 min-w-[120px]';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="font-mono text-xs text-[var(--text-muted)] hover:text-[var(--foreground)] px-2 py-1.5 rounded-lg border border-[var(--border)] hover:border-[var(--border-hover)] transition-colors"
        aria-label="Select language"
      >
        {t(lang, 'language')}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <ul className={listClasses}>
            {LANGUAGES.map((l) => (
              <li key={l.code}>
                <button
                  type="button"
                  onClick={() => {
                    setLang(l.code);
                    setOpen(false);
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
        </>
      )}
    </div>
  );
}
