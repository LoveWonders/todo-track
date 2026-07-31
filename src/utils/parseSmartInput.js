import { parseDateText } from './dateParser';

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
    log('[parseSmartInput] 无 @ 日期标记，cleanContent:', text, ', tags:', tags);
    return { cleanContent: text, startDate: null, dueDate: null, tags };
  }

  const dateText = dateMatch[1];
  log('[parseSmartInput] 尝试解析日期文本:', dateText);

  const parsedDueDate = parseDateText(dateText);
  if (parsedDueDate) {
    dueDate = parsedDueDate;
    log('[parseSmartInput] parseDateText 解析成功，dueDate:', dueDate);
  } else {
    log('[parseSmartInput] 解析失败，无法识别日期文本:', dateText);
  }

  text = text.replace(/@(\S+)/, '').trim();
  log('[parseSmartInput] 最终结果 cleanContent:', text, ', dueDate:', dueDate, ', tags:', tags);

  return { cleanContent: text, startDate, dueDate, tags };
}
