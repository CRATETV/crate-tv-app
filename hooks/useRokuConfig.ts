
import { useState, useEffect, useCallback } from 'react';
import { RokuConfig } from '../types';

const DEFAULT_CONFIG: RokuConfig = {
  _version: 0,
  _lastUpdated: null,
  _updatedBy: 'system',
  hero: { mode: 'auto', items: [] },
  topTen: { enabled: true, mode: 'auto', title: 'Top 10 Today', movieKeys: [], showNumbers: true },
  nowStreaming: { enabled: true, title: 'Now Streaming', mode: 'auto', movieKeys: [], daysBack: 30 },
  categories: { mode: 'all', hidden: [], order: [], customTitles: {}, separateSection: [] },
  content: { hiddenMovies: [], featuredMovies: [] },
  features: {
    liveStreaming: false,
    watchParties: false,
    paidContent: false,
    festivalMode: false,
  },
};

// Fetches/saves roku/config through admin-password-gated server endpoints
// instead of a direct client Firestore listener — that collection has no
// (and shouldn't have) a client security rule, since this app's admin
// access is a plain password check with no Firebase-Auth-based role to
// gate a rule against. See api/get-roku-config.ts and
// api/save-roku-config.ts. This trades the old real-time listener for a
// fetch-on-load + refetch-after-save pattern, matching the rest of the
// admin dashboard's data tabs.
export function useRokuConfig() {
  const [config, setConfig] = useState<RokuConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const password = sessionStorage.getItem('adminPassword');
      const res = await fetch('/api/get-roku-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setConfig(json.config as RokuConfig);
      setError(null);
    } catch (err) {
      console.error("Config fetch error:", err);
      setError("Failed to load Roku config.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const saveConfig = useCallback(async (updates: Partial<RokuConfig>) => {
    setSaving(true);
    setError(null);

    try {
      const password = sessionStorage.getItem('adminPassword');
      const res = await fetch('/api/save-roku-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          updates,
          currentVersion: config._version || 0,
          operatorName: sessionStorage.getItem('operatorName') || 'admin',
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      await fetchConfig();
    } catch (err) {
      console.error("Save failed:", err);
      setError("Failed to synchronize manifest.");
    } finally {
      setSaving(false);
    }
  }, [config, fetchConfig]);

  const showAllContent = async () => {
    if (!window.confirm("RESET PROTOCOL: This will clear all hidden lists and restore all categories. Proceed?")) return;
    await saveConfig({
      categories: { ...config.categories, hidden: [] },
      content: { ...config.content, hiddenMovies: [] }
    });
  };

  return {
    config,
    loading,
    error,
    saving,
    saveConfig,
    showAllContent
  };
}
