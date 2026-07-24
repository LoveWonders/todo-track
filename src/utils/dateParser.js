import { DATE_PATTERNS, parseLocalDate } from './datePatterns';
import * as chrono from 'chrono-node';

const TAG_REGEX = /#(\S+)/g;

export { DATE_PATTERNS };

export function parseDateText(text) {
  if (!text || !text.trim()) return null;
  const trimmed = text.trim();

  try {
    const results = chrono.zh.parse(trimmed, new Date(), { forwardDate: true });
    if (results.length > 0) {
      const parsed = results[0];
      if (parsed.start) {
        const date = (parsed.end || parsed.start).date();
        return toDateString(date);
      }
    }
  } catch { /* fall through */ }

  const dtMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (dtMatch) return `${dtMatch[1]}-${dtMatch[2]}-${dtMatch[3]}T${dtMatch[4]}:${dtMatch[5]}:00`;

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T23:59:59`;

  const date = parseLocalDate(trimmed);
  return date ? toDateString(date) : null;
}

export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const mm = d.getMonth() + 1;
  const dd = d.getDate();
  const datePart = d.getFullYear() !== now.getFullYear() ? `${d.getFullYear()}.${mm}.${dd}` : `${mm}.${dd}`;
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
  if (hasTime) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${datePart} ${hh}:${mi}`;
  }
  return datePart;
}

export function formatDateTime(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

export function isOverdue(date) {
  if (!date) return false;
  const d = new Date(date);
  if (isNaN(d.getTime())) return false;
  return d < Date.now();
}

function toDateString(date) {
  if (!date) return '';
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  if (d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}:00`;
  }
  return `${yyyy}-${mm}-${dd}T23:59:59`;
}

export function formatDateRange(startDate, dueDate) {
  if (!dueDate) return '';
  if (startDate && startDate !== dueDate) return `${formatDate(startDate)} ~ ${formatDate(dueDate)}`;
  return formatDate(dueDate);
}
