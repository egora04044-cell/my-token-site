'use client';

import { useRef, useState, useEffect } from 'react';

interface AudioPlayerProps {
  id: string;
  path: string;
  token: string;
  address: string;
  name: string;
  playingId: string | null;
  onPlay: (id: string | null) => void;
  volume: number;
  isMuted: boolean;
}

export default function AudioPlayer({ id, path, token, address, name, playingId, onPlay, volume, isMuted }: AudioPlayerProps) {
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
      savedTimeRef.current = audio.currentTime;
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

  if (loadError) {
    return (
      <div className="flex items-center gap-4 p-4 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] opacity-60">
        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">✕</div>
        <div className="flex-1">
          <p className="text-sm font-medium truncate">{name}</p>
          <p className="text-xs text-[var(--text-muted)]">Ошибка загрузки</p>
        </div>
      </div>
    );
  }

  if (!blobUrl) {
    return (
      <div className="flex items-center gap-4 p-4 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] opacity-60">
        <div className="w-12 h-12 rounded-full bg-[var(--border)] animate-pulse" />
        <div className="flex-1">
          <p className="text-sm font-medium truncate">{name}</p>
          <p className="text-xs text-[var(--text-muted)]">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-3 p-4 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] hover:border-[var(--border-hover)] transition-colors select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <audio ref={audioRef} src={blobUrl} preload="metadata" />
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={togglePlay}
          className="flex-shrink-0 w-12 h-12 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] opacity-70 hover:opacity-100 flex items-center justify-center hover:bg-[var(--accent)]/30 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
          aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
        >
          {isPlaying ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate text-[var(--foreground)]">{name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-[var(--text-muted)] w-9">{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 audio-progress cursor-pointer"
            />
            <span className="text-xs text-[var(--text-muted)] w-9">{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
