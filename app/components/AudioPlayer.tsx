'use client';

import { useRef, useState, useEffect } from 'react';

interface AudioPlayerProps {
  id: string;
  src: string;
  name: string;
  playingId: string | null;
  onPlay: (id: string | null) => void;
  volume: number;
  isMuted: boolean;
}

export default function AudioPlayer({ id, src, name, playingId, onPlay, volume, isMuted }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const savedTimeRef = useRef(0);
  const pausedByExternalRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

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
      const audio = audioRef.current;
      if (audio) savedTimeRef.current = audio.currentTime;
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
  }, [src, id, onPlay]);

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

  return (
    <div className="flex flex-col gap-3 p-4 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] hover:border-[var(--border-hover)] transition-colors">
      <audio ref={audioRef} src={src} preload="metadata" />
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
