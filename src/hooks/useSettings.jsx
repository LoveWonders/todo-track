import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { setAutoTrim } from '../utils/logger';

const SETTINGS_KEY = 'todo_app_settings';

const defaultSettings = {
  defaultDueMinute: 0,
  presetTags: undefined,
  compactMode: false,
  autoArchive: true,
  autoClearLogs: true,
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return { ...defaultSettings, ...parsed };
      }
    }
  } catch { /* ignore */ }
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

  return (
    <SettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
