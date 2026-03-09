'use client';

import { createContext, useContext, useState, useEffect, useRef } from 'react';

export interface UploadedFile {
  id: string;
  name: string;
  path: string;
  size: number;
  uploadedAt: string;
  category?: 'tracks' | 'videos' | 'community' | 'tickets' | 'other';
  coverPath?: string;
}

interface ExclusiveDataContextValue {
  uploadedFiles: UploadedFile[];
  fileAccess: Record<string, { token: string; address: string }>;
  favorites: string[];
  toggleFavorite: (path: string) => Promise<void>;
}

const ExclusiveDataContext = createContext<ExclusiveDataContextValue | null>(null);

export function useExclusiveData() {
  const ctx = useContext(ExclusiveDataContext);
  if (!ctx) throw new Error('useExclusiveData must be used within ExclusiveProvider');
  return ctx;
}

export function ExclusiveProvider({
  children,
  hasAccess,
  publicKeyStr,
}: {
  children: React.ReactNode;
  hasAccess: boolean;
  publicKeyStr: string;
}) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [fileAccess, setFileAccess] = useState<Record<string, { token: string; address: string }>>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    if (hasAccess) {
      fetch('/api/files/public')
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          if (mountedRef.current) setUploadedFiles(data);
        })
        .catch(() => {
          if (mountedRef.current) setUploadedFiles([]);
        });
    } else {
      setUploadedFiles([]);
      setFileAccess({});
    }
  }, [hasAccess]);

  useEffect(() => {
    if (!hasAccess || !publicKeyStr || uploadedFiles.length === 0) return;
    const addr = publicKeyStr;
    const fetchTokens = async () => {
      const access: Record<string, { token: string; address: string }> = {};
      await Promise.all(
        uploadedFiles.map(async (f) => {
          try {
            const res = await fetch('/api/serve-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ path: f.path, address: addr }),
            });
            if (res.ok) {
              const { token } = await res.json();
              access[f.path] = { token, address: addr };
            }
          } catch {
            // ignore
          }
        })
      );
      if (mountedRef.current) setFileAccess((prev) => ({ ...prev, ...access }));
    };
    fetchTokens();
  }, [hasAccess, publicKeyStr, uploadedFiles]);

  useEffect(() => {
    if (!hasAccess || !publicKeyStr) return;
    fetch(`/api/favorites?address=${encodeURIComponent(publicKeyStr)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        if (mountedRef.current) setFavorites(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
  }, [hasAccess, publicKeyStr]);

  const toggleFavorite = async (path: string) => {
    if (!publicKeyStr) return;
    const isFav = favorites.includes(path);
    try {
      const res = await fetch('/api/favorites', {
        method: isFav ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: publicKeyStr, path }),
      });
      if (res.ok) {
        const list = await res.json();
        setFavorites(Array.isArray(list) ? list : []);
      }
    } catch {
      // ignore
    }
  };

  return (
    <ExclusiveDataContext.Provider
      value={{ uploadedFiles, fileAccess, favorites, toggleFavorite }}
    >
      {children}
    </ExclusiveDataContext.Provider>
  );
}
