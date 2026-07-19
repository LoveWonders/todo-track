/**
 * 智能输入解析器（纯函数）
 * @param {string} rawText - 用户输入的原始文本
 * @returns {object} 包含 cleanContent, date, tags 的对象
 */
export function parseSmartInput(rawText) {
  // TODO: 未来在这里实现 @ 提取日期、# 提取标签的逻辑

  return {
    cleanContent: rawText,
    date: null,
    tags: []
  };
}
