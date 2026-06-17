// @ts-nocheck
import { useEffect, useState } from 'react';
import API from './api';

const CACHE_KEY = 'np_settings_cache_v1';

function readCache(): any {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function useSettings() {
  const cached = typeof window !== 'undefined' ? readCache() : null;
  const [settings, setSettings] = useState<any>(cached);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let mounted = true;

    const load = () => {
      API.get('/settings')
        .then(r => {
          if (!mounted) return;
          setSettings(r.data);
          try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(r.data)); } catch {}
        })
        .catch(() => { if (mounted) setSettings((prev: any) => prev || {}); })
        .finally(() => { if (mounted) setLoading(false); });
    };

    const handleSettingsUpdate = (event: Event) => {
      const detail = (event as CustomEvent<any>).detail;
      if (detail && typeof detail === 'object') {
        setSettings((prev: any) => ({ ...(prev || {}), ...detail }));
        setLoading(false);
        return;
      }
      load();
    };

    load();
    window.addEventListener('site-settings-updated', handleSettingsUpdate);

    return () => {
      mounted = false;
      window.removeEventListener('site-settings-updated', handleSettingsUpdate);
    };
  }, []);

  return { settings, loading };
}
