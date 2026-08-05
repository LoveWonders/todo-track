import { toISODateTime } from './datePatterns';

export function makeDefaultDueDate(hour, minute) {
  const now = new Date();
  now.setHours(hour, minute, 0, 0);
  return toISODateTime(now);
}
