import * as chrono from 'chrono-node';

function toISODateTime(date) {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
}

/**
 * 智能输入解析器（纯函数）
 * @param {string} rawText - 用户输入的原始文本
 * @returns {{ cleanContent: string, startDate: string | null, dueDate: string | null, tags: string[] }}
 */
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
  if (dateMatch) {
    const dateText = dateMatch[1];
    try {
      const results = chrono.parse(dateText, new Date(), { forwardDate: true });
      if (results.length > 0) {
        const parsed = results[0];
        if (parsed.start) {
          const hasRange = parsed.end && parsed.end.date().getTime() !== parsed.start.date().getTime();
          dueDate = toISODateTime((parsed.end || parsed.start).date());
          startDate = hasRange ? toISODateTime(parsed.start.date()) : null;
        }
      }
    } catch (e) {
      // chrono 解析失败，忽略
    }
    text = text.replace(/@(\S+)/, '').trim();
  }

  return {
    cleanContent: text,
    startDate,
    dueDate,
    tags
  };
}
