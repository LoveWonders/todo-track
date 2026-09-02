import { Fragment } from 'react';

export function normalizeQuery(q) {
  return String(q || '').trim().toLowerCase();
}

export function matchTodo(todo, query) {
  const q = normalizeQuery(query);
  if (!q) return true;
  const haystack = [
    todo && todo.title,
    ...((todo && todo.tags) || []).map(t => '#' + t),
    ...((todo && todo.progress) || []).map(p => p.text),
  ]
    .filter(Boolean)
    .join('\n')
    .toLowerCase();
  return haystack.includes(q);
}

export function highlightParts(text, query) {
  const q = normalizeQuery(query);
  if (!q || !text) return [text];
  const source = String(text);
  const lower = source.toLowerCase();
  const parts = [];
  let index = 0;
  let found = lower.indexOf(q);
  while (found !== -1) {
    if (found > index) parts.push(source.slice(index, found));
    parts.push(
      <mark key={index} className="search-highlight">
        {source.slice(found, found + q.length)}
      </mark>
    );
    index = found + q.length;
    found = lower.indexOf(q, index);
  }
  if (index < source.length) parts.push(source.slice(index));
  return parts.length ? parts : [source];
}

export function highlightText(text, query) {
  const parts = highlightParts(text, query);
  return (
    <Fragment>
      {parts.map((p, i) => (
        <Fragment key={i}>{p}</Fragment>
      ))}
    </Fragment>
  );
}
