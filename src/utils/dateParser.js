import { DATE_PATTERNS, parseLocalDate } from './datePatterns';

const TAG_REGEX = /#(\S+)/g;

export { DATE_PATTERNS };

export function parseInput(text) {
  let cleaned = text;

  const tags = [];
  let tagMatch;
  while ((tagMatch = TAG_REGEX.exec(text)) !== null) {
    tags.push(tagMatch[1]);
  }
  cleaned = cleaned.replace(TAG_REGEX, '').trim();

  let dueDate = null;
  for (const pattern of DATE_PATTERNS) {
    const m = cleaned.match(pattern.regex);
    if (m) {
      dueDate = pattern.handler(m);
      if (dueDate) { cleaned = cleaned.replace(pattern.regex, '').trim(); break; }
    }
  }

  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return { title: cleaned || text.replace(TAG_REGEX, '').trim(), dueDate, tags };
}

export function parseDateText(text) {
  if (!text || !text.trim()) return null;
  const trimmed = text.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return trimmed;
  const date = parseLocalDate(trimmed);
  return date ? toDateString(date) : null;
}

export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const mm = d.getMonth() + 1;
  const dd = d.getDate();
  return d.getFullYear() !== now.getFullYear() ? `${d.getFullYear()}.${mm}.${dd}` : `${mm}.${dd}`;
}

export function isOverdue(date) {
  if (!date) return false;
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

export function toDateString(date) {
  if (!date) return '';
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function formatDateRange(startDate, dueDate) {
  if (!dueDate) return '';
  if (startDate && startDate !== dueDate) return `${formatDate(startDate)} ~ ${formatDate(dueDate)}`;
  return formatDate(dueDate);
}
