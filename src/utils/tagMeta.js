export const TAG_COLOR_PALETTE = [
  { name: '蓝', bg: '#e3f2fd', fg: '#1976d2' },
  { name: '绿', bg: '#e8f5e9', fg: '#2e7d32' },
  { name: '橙', bg: '#fff3e0', fg: '#e65100' },
  { name: '粉', bg: '#fce4ec', fg: '#c2185b' },
  { name: '紫', bg: '#f3e5f5', fg: '#7b1fa2' },
  { name: '青', bg: '#e0f7fa', fg: '#00838f' },
  { name: '黄', bg: '#fff8e1', fg: '#9a7d0a' },
  { name: '棕', bg: '#efebe9', fg: '#5d4037' },
  { name: '靛', bg: '#e8eaf6', fg: '#3949ab' },
  { name: '墨绿', bg: '#e0f2f1', fg: '#00695c' },
];

const TAG_META_KEY = 'todo_tag_meta';

export const RESERVED_TAG_NAMES = new Set(['__proto__', 'constructor', 'prototype']);

export function isSafeTagName(tag) {
  return typeof tag === 'string' && !RESERVED_TAG_NAMES.has(tag);
}

export function hashTag(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function getTagColor(tag, tagMeta) {
  const entry = tagMeta && tagMeta[tag];
  if (entry && entry.bg && entry.fg) return { bg: entry.bg, fg: entry.fg };
  return TAG_COLOR_PALETTE[hashTag(tag) % TAG_COLOR_PALETTE.length];
}

export function loadTagMeta() {
  try {
    const raw = localStorage.getItem(TAG_META_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    }
  } catch { /* ignore */ }
  return {};
}

export function saveTagMeta(meta) {
  try {
    localStorage.setItem(TAG_META_KEY, JSON.stringify(meta));
  } catch { /* ignore */ }
}

export function normalizeTag(tag) {
  return String(tag || '').trim().toLowerCase();
}

export function findDuplicateGroups(allTags) {
  const groups = new Map();
  for (const tag of allTags) {
    const key = normalizeTag(tag);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(tag);
  }
  return [...groups.values()]
    .filter(g => g.length > 1)
    .map(g => ({ canonical: g[0], duplicates: g.slice(1) }));
}
