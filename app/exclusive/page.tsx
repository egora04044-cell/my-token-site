'use client';

import { useState } from 'react';
import { useExclusiveData } from './ExclusiveProvider';
import { useLanguage } from '@/lib/language-context';
import { t } from '@/lib/translations';
import AudioPlayer from '@/app/components/AudioPlayer';
import SecureFileLink from '@/app/components/SecureFileLink';
import FavoriteButton from '@/app/components/FavoriteButton';

const isAudioFile = (name: string) => /\.(mp3|wav|ogg|m4a|flac)$/i.test(name);
const isTrack = (f: { category?: string; name: string }) =>
  f.category === 'tracks' || isAudioFile(f.name);

export default function ExclusivePage() {
  const { uploadedFiles, fileAccess, favorites, toggleFavorite } = useExclusiveData();
  const { lang } = useLanguage();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  return (
    <div className="w-full max-w-[1200px] mr-auto">
      <section id="projects" className="min-h-screen px-6 py-16 lg:py-24">
        <h1 className="font-display text-[clamp(1.75rem,3vw,2.25rem)] font-semibold text-[var(--foreground)] mb-2">
          {t(lang, 'projects')}
        </h1>
        <p className="text-[var(--text-secondary)] mb-12">
          {t(lang, 'projectsDesc')}
        </p>

        <div className="p-8 bg-[var(--bg-card)]/60 backdrop-blur-xl border border-[var(--border)]/60 rounded-lg">
          {uploadedFiles.length > 0 ? (
            <div className="space-y-10">
              {uploadedFiles.filter(isTrack).length > 0 && (
                <div>
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <h2 className="text-lg font-medium text-[var(--foreground)]">{t(lang, 'tracks')}</h2>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (isMuted) {
                            if (volume === 0) setVolume(0.5);
                            setIsMuted(false);
                          } else setIsMuted(true);
                        }}
                        className="p-1.5 text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors rounded"
                        aria-label={isMuted ? t(lang, 'unmuteAria') : t(lang, 'muteAria')}
                      >
                        {isMuted || volume === 0 ? (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
                        ) : volume < 0.5 ? (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/></svg>
                        ) : (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                        )}
                      </button>
                      <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => { const v = parseFloat(e.target.value); setVolume(v); setIsMuted(v === 0); }} className="audio-progress cursor-pointer w-24" />
                    </div>
                  </div>
                  <div className="grid gap-3">
                    {uploadedFiles.filter(isTrack).map((f) =>
                      fileAccess[f.path] ? (
                        <AudioPlayer key={f.id} id={f.id} path={f.path} token={fileAccess[f.path].token} address={fileAccess[f.path].address} name={f.name} coverPath={f.coverPath} playingId={playingId} onPlay={setPlayingId} volume={volume} isMuted={isMuted} isFavorite={favorites.includes(f.path)} onToggleFavorite={() => toggleFavorite(f.path)} />
                      ) : (
                        <div key={f.id} className="flex items-center gap-4 p-4 bg-[var(--bg-secondary)]/60 backdrop-blur-md rounded-lg animate-pulse">
                          <div className="w-10 h-10 rounded bg-[var(--border)]" />
                          <div><p className="text-sm font-medium truncate">{f.name}</p><p className="text-xs text-[var(--text-muted)]">{t(lang, 'loading')}</p></div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
              {uploadedFiles.filter((f) => !isTrack(f)).length > 0 && (
                <div>
                  <h2 className="text-lg font-medium text-[var(--foreground)] mb-4">{t(lang, 'otherFiles')}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {uploadedFiles.filter((f) => !isTrack(f)).map((f) => (
                      <div key={f.id} className="relative group/card">
                        <SecureFileLink path={f.path} access={fileAccess[f.path]} name={f.name} size={f.size} />
                        <div className="absolute top-2 right-2 z-10 opacity-100 sm:opacity-0 sm:group-hover/card:opacity-100 transition-opacity">
                          <FavoriteButton isFavorite={favorites.includes(f.path)} onToggle={() => toggleFavorite(f.path)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[var(--text-secondary)]">{t(lang, 'contentComing')}</p>
          )}
        </div>
      </section>

      <section id="favorites" className="min-h-screen px-6 py-16 lg:py-24 border-t border-[var(--border)]">
        <h1 className="font-display text-[clamp(1.75rem,3vw,2.25rem)] font-semibold text-[var(--foreground)] mb-2">{t(lang, 'favoritesSection')}</h1>
        <p className="text-[var(--text-secondary)] mb-12">{t(lang, 'favoritesContent')}</p>
        <div className="p-8 bg-[var(--bg-card)]/60 backdrop-blur-xl border border-[var(--border)]/60 rounded-lg">
          {favorites.length === 0 ? (
            <p className="text-[var(--text-secondary)]">{t(lang, 'favoritesEmpty')}</p>
          ) : (
            <div className="space-y-10">
              {uploadedFiles.filter(isTrack).filter((f) => favorites.includes(f.path)).length > 0 && (
                <div>
                  <h2 className="text-lg font-medium text-[var(--foreground)] mb-4">{t(lang, 'tracks')}</h2>
                  <div className="grid gap-3">
                    {uploadedFiles.filter(isTrack).filter((f) => favorites.includes(f.path)).map((f) =>
                      fileAccess[f.path] ? (
                        <AudioPlayer key={f.id} id={f.id} path={f.path} token={fileAccess[f.path].token} address={fileAccess[f.path].address} name={f.name} coverPath={f.coverPath} playingId={playingId} onPlay={setPlayingId} volume={volume} isMuted={isMuted} isFavorite={true} onToggleFavorite={() => toggleFavorite(f.path)} />
                      ) : null
                    )}
                  </div>
                </div>
              )}
              {uploadedFiles.filter((f) => !isTrack(f)).filter((f) => favorites.includes(f.path)).length > 0 && (
                <div>
                  <h2 className="text-lg font-medium text-[var(--foreground)] mb-4">{t(lang, 'otherFiles')}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {uploadedFiles.filter((f) => !isTrack(f)).filter((f) => favorites.includes(f.path)).map((f) => (
                      <div key={f.id} className="relative group/card">
                        <SecureFileLink path={f.path} access={fileAccess[f.path]} name={f.name} size={f.size} />
                        <div className="absolute top-2 right-2 z-10">
                          <FavoriteButton isFavorite={true} onToggle={() => toggleFavorite(f.path)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section id="about" className="min-h-screen px-6 py-16 lg:py-24 border-t border-[var(--border)]">
        <h2 className="font-display text-2xl font-semibold text-[var(--foreground)] mb-6">{t(lang, 'aboutUs')}</h2>
        <div className="max-w-[640px] space-y-4">
          <p className="text-[var(--text-secondary)] leading-relaxed">
            {t(lang, 'aboutUsP1')}
          </p>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            {t(lang, 'aboutUsP2')}
          </p>
        </div>
      </section>

      <section id="contact" className="min-h-screen px-6 py-16 lg:py-24 border-t border-[var(--border)]">
        <h2 className="font-display text-2xl font-semibold text-[var(--foreground)] mb-4">{t(lang, 'contact')}</h2>
        <p className="text-[var(--text-secondary)] max-w-[600px] leading-relaxed">
          {t(lang, 'contactDesc')}
        </p>
      </section>

      <footer className="px-6 pb-16 lg:pb-20 pt-16 lg:pt-20 border-t border-[var(--border)] bg-[linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.2)_50%,rgba(0,0,0,0.4)_100%)]">
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
            <div>
              <h3 className="font-display text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider mb-4">{t(lang, 'navAbout')}</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {t(lang, 'footerAbout')}
              </p>
            </div>
            <div>
              <h3 className="font-display text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider mb-4">{t(lang, 'footerContacts')}</h3>
              <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                <li><a href="mailto:info@nextuplabel.online" className="hover:text-[var(--foreground)] transition-colors">info@nextuplabel.online</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-display text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider mb-4">{t(lang, 'footerLinks')}</h3>
              <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                <li><a href="#projects" className="hover:text-[var(--foreground)] transition-colors">{t(lang, 'projects')}</a></li>
                <li><a href="#favorites" className="hover:text-[var(--foreground)] transition-colors">{t(lang, 'favoritesSection')}</a></li>
                <li><a href="#about" className="hover:text-[var(--foreground)] transition-colors">{t(lang, 'aboutUs')}</a></li>
                <li><a href="#contact" className="hover:text-[var(--foreground)] transition-colors">{t(lang, 'contact')}</a></li>
                <li><a href="https://phantom.app" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--foreground)] transition-colors">{t(lang, 'downloadPhantom')}</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-display text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider mb-4">{t(lang, 'footerTech')}</h3>
              <p className="text-sm text-[var(--text-muted)]">
                {t(lang, 'tech', { amount: '1000' })}
              </p>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-[var(--border)]/80">
            <p className="text-xs text-[var(--text-muted)]">
              {t(lang, 'footerCopyright', { year: String(new Date().getFullYear()) })}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
