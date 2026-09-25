import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { setAutoTrim } from '../utils/logger';
import { readJSON, save } from '../utils/storage';
import { DEFAULT_REMINDER_OFFSET } from '../utils/reminder';

const SETTINGS_KEY = 'todo_app_settings';

export const TEXT_SCALES = ['small', 'medium', 'large'];

const defaultSettings = {
  presetTags: undefined,
  compactMode: false,
  textScale: 'medium',
  autoArchive: true,
  autoClearLogs: true,
  defaultReminderOffset: DEFAULT_REMINDER_OFFSET,
};

export function normalizeTextScale(value) {
  return TEXT_SCALES.includes(value) ? value : 'medium';
}

export function applyAppearance({ compactMode, textScale }) {
  document.body.classList.toggle('compact-mode', !!compactMode);
  document.documentElement.dataset.textScale = normalizeTextScale(textScale);
}

export function getDefaultReminderOffset(settings) {
  const raw = settings?.defaultReminderOffset;
  if (raw == null || raw === '') return DEFAULT_REMINDER_OFFSET;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_REMINDER_OFFSET;
}

function loadSettings() {
  const parsed = readJSON(SETTINGS_KEY, null);
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return { ...defaultSettings, ...parsed };
  }
  return { ...defaultSettings };
}

function saveSettings(settings) {
  save(SETTINGS_KEY, settings);
}

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    applyAppearance(settings);
  }, [settings]);

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
