/**
 * 智能输入解析器（纯函数）
 * @param {string} rawText - 用户输入的原始文本
 * @returns {{ cleanContent: string, date: string | null, tags: string[] }}
 */
export function parseSmartInput(rawText) {
  const tags = [];
  let date = null;
  let text = rawText;

  const tagRegex = /(?:^|\s)#(\S+)/g;
  let tagMatch;
  while ((tagMatch = tagRegex.exec(text)) !== null) {
    tags.push(tagMatch[1]);
  }
  text = text.replace(tagRegex, (match, captured, offset) => {
    return offset === 0 && match.startsWith('#') ? '' : ' ';
  }).trim();

  const dateRegex = /(?:^|\s)@(\S+)/g;
  let dateMatch;
  while ((dateMatch = dateRegex.exec(text)) !== null) {
    date = dateMatch[1];
  }
  text = text.replace(dateRegex, (match, captured, offset) => {
    return offset === 0 && match.startsWith('@') ? '' : ' ';
  }).trim();

  return {
    cleanContent: text,
    date,
    tags
  };
}
