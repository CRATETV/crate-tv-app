
import { useState, useEffect, useCallback } from 'react';
import { getDbInstance } from '../services/firebaseClient';
import { RokuConfig } from '../types';
import firebase from 'firebase/compat/app';

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

export function useRokuConfig() {
  const [config, setConfig] = useState<RokuConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const db = getDbInstance();
    if (!db) return;

    const unsubscribe = db.collection('roku').doc('config').onSnapshot(
      (snapshot) => {
        if (snapshot.exists) {
          setConfig({ ...DEFAULT_CONFIG, ...snapshot.data() } as RokuConfig);
        } else {
          setConfig(DEFAULT_CONFIG);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Config listener error:", err);
        setError("Failed to establish real-time config link.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const saveConfig = useCallback(async (updates: Partial<RokuConfig>) => {
    const db = getDbInstance();
    if (!db) return;

    setSaving(true);
    setError(null);

    const newConfig = {
      ...config,
      ...updates,
      _version: (config._version || 0) + 1,
      _lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
      _updatedBy: sessionStorage.getItem('operatorName') || 'admin'
    };

    try {
      await db.collection('roku').doc('config').set(newConfig, { merge: true });
    } catch (err) {
      console.error("Save failed:", err);
      setError("Failed to synchronize manifest.");
    } finally {
      setSaving(false);
    }
  }, [config]);

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
