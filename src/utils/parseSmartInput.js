import * as chrono from 'chrono-node';
import { toISODateTime, parseLocalDate } from './datePatterns';

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
    console.log('[parseSmartInput] 无 @ 日期标记, cleanContent:', text, ', tags:', tags);
    return { cleanContent: text, startDate: null, dueDate: null, tags };
  }

  const dateText = dateMatch[1];
  console.log('[parseSmartInput] 尝试解析日期文本:', dateText);

  const parsed = tryChronoParse(dateText);
  if (parsed) {
    dueDate = parsed.dueDate;
    startDate = parsed.startDate;
  } else {
    const fallbackDate = parseLocalDate(dateText);
    if (fallbackDate) {
      dueDate = toISODateTime(fallbackDate);
      console.log('[parseSmartInput] 本地 fallback 解析成功, dueDate:', dueDate);
    } else {
      console.log('[parseSmartInput] 所有解析失败，无法识别日期文本:', dateText);
    }
  }

  text = text.replace(/@(\S+)/, '').trim();
  console.log('[parseSmartInput] 最终结果 cleanContent:', text, ', dueDate:', dueDate, ', tags:', tags);

  return { cleanContent: text, startDate, dueDate, tags };
}

function tryChronoParse(dateText) {
  try {
    const results = chrono.zh.parse(dateText, new Date(), { forwardDate: true });
    console.log('[parseSmartInput] chrono.zh 解析结果:', results.length, '条');
    if (results.length === 0) return null;

    const parsed = results[0];
    if (!parsed.start) return null;

    const hasRange = parsed.end != null && parsed.end.date().getTime() !== parsed.start.date().getTime();
    const dueDate = toISODateTime((parsed.end || parsed.start).date());
    const startDate = hasRange ? toISODateTime(parsed.start.date()) : null;
    console.log('[parseSmartInput] chrono 解析成功, dueDate:', dueDate, ', startDate:', startDate);
    return { dueDate, startDate };
  } catch (e) {
    console.log('[parseSmartInput] chrono 异常:', e);
    return null;
  }
}
