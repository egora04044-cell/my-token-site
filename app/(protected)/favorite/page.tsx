'use client';

import { useState } from 'react';
import { useExclusiveData } from '@/app/exclusive/ExclusiveProvider';
import AudioPlayer from '@/app/components/AudioPlayer';
import SecureFileLink from '@/app/components/SecureFileLink';
import FavoriteButton from '@/app/components/FavoriteButton';

const isAudioFile = (name: string) => /\.(mp3|wav|ogg|m4a|flac)$/i.test(name);
const isTrack = (f: { category?: string; name: string }) =>
  f.category === 'tracks' || isAudioFile(f.name);

export default function FavoritePage() {
  const { uploadedFiles, fileAccess, favorites, toggleFavorite } = useExclusiveData();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  return (
    <section className="min-h-screen px-6 py-16 lg:py-24">
      <h1 className="font-display text-[clamp(1.75rem,3vw,2.25rem)] font-semibold text-[var(--foreground)] mb-2">
        Избранное
      </h1>
      <p className="text-[var(--text-secondary)] mb-12">
        Контент, добавленный в избранное
      </p>

      <div className="p-8 bg-[var(--bg-card)]/60 backdrop-blur-xl border border-[var(--border)]/60 rounded-lg">
        {favorites.length === 0 ? (
          <p className="text-[var(--text-secondary)]">Добавьте контент в избранное, нажав на сердечко при наведении</p>
        ) : (
          <div className="space-y-10">
            {uploadedFiles.filter(isTrack).filter((f) => favorites.includes(f.path)).length > 0 && (
              <div>
                <h2 className="text-lg font-medium text-[var(--foreground)] mb-4">Треки</h2>
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
                <h2 className="text-lg font-medium text-[var(--foreground)] mb-4">Другие файлы</h2>
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
  );
}
