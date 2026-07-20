import * as chrono from 'chrono-node';
import { toISODateTime, parseLocalDate } from './datePatterns';

const DEBUG = import.meta.env.DEV;
const log = DEBUG ? console.log.bind(console) : () => {};

export function parseSmartInput(rawText) {
  const tags = [];
  let startDate = null;
  let dueDate = null;
  let text = rawText;

  const tagRegex = /#(\S+)/g;
  let tagMatch;
  while ((tagMatch = tagRegex.exec(text)) !== null) {
    tags.push(tagMatch[1]);
  }
  text = text.replace(tagRegex, '').trim();

  const dateMatch = text.match(/@(\S+)/);
  if (!dateMatch) {
    log('[parseSmartInput] 无 @ 日期标记, cleanContent:', text, ', tags:', tags);
    return { cleanContent: text, startDate: null, dueDate: null, tags };
  }

  const dateText = dateMatch[1];
  log('[parseSmartInput] 尝试解析日期文本:', dateText);

  const parsed = tryChronoParse(dateText);
  if (parsed) {
    dueDate = parsed.dueDate;
    startDate = parsed.startDate;
  } else {
    const fallbackDate = parseLocalDate(dateText);
    if (fallbackDate) {
      dueDate = toISODateTime(fallbackDate);
      log('[parseSmartInput] 本地 fallback 解析成功, dueDate:', dueDate);
    } else {
      log('[parseSmartInput] 所有解析失败，无法识别日期文本:', dateText);
    }
  }

  text = text.replace(/@(\S+)/, '').trim();
  log('[parseSmartInput] 最终结果 cleanContent:', text, ', dueDate:', dueDate, ', tags:', tags);

  return { cleanContent: text, startDate, dueDate, tags };
}

function tryChronoParse(dateText) {
  try {
    const results = chrono.zh.parse(dateText, new Date(), { forwardDate: true });
    log('[parseSmartInput] chrono.zh 解析结果:', results.length, '条');
    if (results.length === 0) return null;

    const parsed = results[0];
    if (!parsed.start) return null;

    const hasRange = parsed.end != null && parsed.end.date().getTime() !== parsed.start.date().getTime();
    const dueDate = toISODateTime((parsed.end ?? parsed.start).date());
    const startDate = hasRange ? toISODateTime(parsed.start.date()) : null;
    log('[parseSmartInput] chrono 解析成功, dueDate:', dueDate, ', startDate:', startDate);
    return { dueDate, startDate };
  } catch (e) {
    log('[parseSmartInput] chrono 异常:', e);
    return null;
  }
}
