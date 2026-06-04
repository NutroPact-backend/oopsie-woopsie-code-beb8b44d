// @ts-nocheck
import { useEffect, useState } from 'react';
import API from './api';

export function useSettings() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = () => {
      API.get('/settings')
        .then(r => { if (mounted) setSettings(r.data); })
        .catch(() => { if (mounted) setSettings({}); })
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
