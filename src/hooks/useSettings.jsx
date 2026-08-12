import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { setAutoTrim } from '../utils/logger';
import { readJSON } from '../utils/storage';

const SETTINGS_KEY = 'todo_app_settings';

const defaultSettings = {
  presetTags: undefined,
  compactMode: false,
  autoArchive: true,
  autoClearLogs: true,
};

function loadSettings() {
  const parsed = readJSON(SETTINGS_KEY, null);
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return { ...defaultSettings, ...parsed };
  }
  return { ...defaultSettings };
}

function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    document.body.classList.toggle('compact-mode', !!settings.compactMode);
  }, [settings.compactMode]);

  useEffect(() => {
    setAutoTrim(settings.autoClearLogs !== false);
  }, [settings.autoClearLogs]);

  const updateSetting = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const value = useMemo(() => ({ settings, updateSetting }), [settings, updateSetting]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
