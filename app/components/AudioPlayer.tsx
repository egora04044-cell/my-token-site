'use client';

import { useRef, useState, useEffect } from 'react';

interface AudioPlayerProps {
  id: string;
  path: string;
  token: string;
  address: string;
  name: string;
  coverPath?: string;
  playingId: string | null;
  onPlay: (id: string | null) => void;
  volume: number;
  isMuted: boolean;
}

export default function AudioPlayer({ id, path, token, address, name, coverPath, playingId, onPlay, volume, isMuted }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const savedTimeRef = useRef(0);
  const pausedByExternalRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let revoked = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/serve?path=${encodeURIComponent(path)}`, {
          headers: {
            'X-Serve-Token': token,
            'X-Serve-Address': address,
          },
        });
        if (!res.ok) throw new Error('Access denied');
        const blob = await res.blob();
        if (revoked) {
          URL.revokeObjectURL(URL.createObjectURL(blob));
          return;
        }
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setBlobUrl(url);
      } catch {
        if (!revoked) setLoadError(true);
      }
    };
    load();
    return () => {
      revoked = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [path, token, address]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.muted = isMuted;
  }, [volume, isMuted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      savedTimeRef.current = audio.currentTime;
      setCurrentTime(audio.currentTime);
    };
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      savedTimeRef.current = 0;
      onPlay(null);
    };
    const handlePlay = () => {
      setIsPlaying(true);
      onPlay(id);
    };
    const handlePause = () => {
      const a = audioRef.current;
      if (a) savedTimeRef.current = a.currentTime;
      setIsPlaying(false);
      if (!pausedByExternalRef.current) onPlay(null);
      pausedByExternalRef.current = false;
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [blobUrl, id, onPlay]);

  useEffect(() => {
    const audio = audioRef.current;
    if (playingId !== null && playingId !== id && audio) {
      savedTimeRef.current = 0;
      setCurrentTime(0);
      pausedByExternalRef.current = true;
      audio.pause();
    }
  }, [playingId, id]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      onPlay(id);
      const saved = savedTimeRef.current;
      audio.currentTime = saved;
      setCurrentTime(saved);
      audio.play();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    const value = parseFloat(e.target.value);
    if (audio && !isNaN(value)) {
      audio.currentTime = value;
      savedTimeRef.current = value;
      setCurrentTime(value);
    }
  };

  const formatTime = (sec: number) => {
    if (!isFinite(sec) || isNaN(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isActive = playingId === id;

  if (loadError) {
    return (
      <div className="flex items-center gap-4 p-4 rounded-xl border border-red-500/20 bg-red-500/5">
        <div className="w-14 h-14 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
          <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate text-[var(--foreground)]">{name}</p>
          <p className="text-sm text-red-400/80">Ошибка загрузки</p>
        </div>
      </div>
    );
  }

  if (!blobUrl) {
    return (
      <div className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] animate-pulse">
        <div className="w-14 h-14 rounded-xl bg-[var(--border)] shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate text-[var(--foreground)]">{name}</p>
          <p className="text-sm text-[var(--text-muted)]">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 select-none ${
        isActive
          ? 'border-[var(--foreground)]/20 bg-[var(--bg-elevated)]/70 backdrop-blur-md shadow-lg shadow-[var(--foreground)]/5'
          : 'border-[var(--border)]/70 bg-[var(--bg-card)]/60 backdrop-blur-md hover:border-[var(--border-hover)] hover:bg-[var(--bg-elevated)]/70'
      }`}
      onContextMenu={(e) => e.preventDefault()}
    >
      <audio ref={audioRef} src={blobUrl} preload="metadata" />

      {/* Cover / Artwork */}
      <button
        type="button"
        onClick={togglePlay}
        className="relative w-14 h-14 rounded-xl shrink-0 overflow-hidden bg-gradient-to-br from-[var(--foreground)]/10 to-[var(--foreground)]/5 flex items-center justify-center transition-transform hover:scale-[1.02] active:scale-[0.98]"
        aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
      >
        {coverPath ? (
          <img src={coverPath} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : null}
        <span className={`relative z-10 flex items-center justify-center ${coverPath ? 'bg-black/40 rounded-xl w-full h-full' : ''}`}>
        {isPlaying ? (
          <div className="flex items-center justify-center gap-1 h-5">
            <span className="w-1 h-full bg-[var(--foreground)] rounded-full audio-wave-bar" style={{ animationDelay: '0ms' }} />
            <span className="w-1 h-full bg-[var(--foreground)] rounded-full audio-wave-bar" style={{ animationDelay: '100ms' }} />
            <span className="w-1 h-full bg-[var(--foreground)] rounded-full audio-wave-bar" style={{ animationDelay: '200ms' }} />
            <span className="w-1 h-full bg-[var(--foreground)] rounded-full audio-wave-bar" style={{ animationDelay: '300ms' }} />
            <span className="w-1 h-full bg-[var(--foreground)] rounded-full audio-wave-bar" style={{ animationDelay: '400ms' }} />
          </div>
        ) : (
          <svg className="w-6 h-6 text-[var(--foreground)] ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
        </span>
      </button>

      {/* Track info & progress */}
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate text-[var(--foreground)] mb-2">{name}</p>

        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--text-muted)] tabular-nums w-9 shrink-0">{formatTime(currentTime)}</span>
          <div className="relative flex-1 h-2 rounded-full bg-[var(--border)] overflow-hidden cursor-pointer">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-[var(--foreground)] transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-[var(--text-muted)] tabular-nums w-9 shrink-0 text-right">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Play/Pause button (desktop) */}
      <button
        type="button"
        onClick={togglePlay}
        className="hidden sm:flex w-10 h-10 rounded-full bg-[var(--foreground)] text-[var(--background)] items-center justify-center shrink-0 hover:opacity-90 transition-opacity"
        aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
      >
        {isPlaying ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
    </div>
  );
}
