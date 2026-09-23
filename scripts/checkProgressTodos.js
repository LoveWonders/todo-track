import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

writeFileSync('/tmp/ext-loader.mjs', `
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && !/\\.(js|json|mjs|cjs)$/.test(specifier)) {
    try { return await nextResolve(specifier + '.js', context); }
    catch { return nextResolve(specifier, context); }
  }
  return nextResolve(specifier, context);
}
`);
register(pathToFileURL('/tmp/ext-loader.mjs'));

const {
  appendProgress,
  toggleProgressItem,
  patchProgressItem,
  removeProgressItem,
} = await import('../src/utils/progressTodos.js');

const todo = { id: 1, title: '父', progress: [] };
const added = appendProgress(todo, {
  id: 11,
  text: '  子项  ',
  createdAt: '2026-09-23T10:00:00',
  temporary: false,
  urgent: true,
  reminderTime: null,
  dueDate: '2026-09-24T23:59:59',
});
assert.equal(added.progress.length, 1);
assert.equal(added.progress[0].text, '子项');
assert.equal(added.progress[0].urgent, true);
assert.equal(added.progress[0].status, 'active');
assert.equal(appendProgress(todo, { id: 12, text: '   ' }), todo);

const done = toggleProgressItem(added, 11, 'completed', '2026-09-23T12:00:00');
assert.equal(done.progress[0].status, 'completed');
assert.equal(done.progress[0].completedAt, '2026-09-23T12:00:00');

const restored = toggleProgressItem(done, 11, 'completed', '2026-09-23T12:00:00');
assert.equal(restored.progress[0].status, 'active');
assert.equal(restored.progress[0].completedAt, '2026-09-23T12:00:00');

const patched = patchProgressItem(added, 11, { text: '改名', dueDate: null });
assert.equal(patched.progress[0].text, '改名');
assert.equal(patched.progress[0].dueDate, null);

const removed = removeProgressItem(added, 11);
assert.equal(removed.progress.length, 0);

const markerTodo = {
  id: 2,
  title: '周期',
  status: 'active',
  repeatRule: 'daily',
  dueDate: '2026-09-23T23:59:59',
  progress: [{
    id: 99,
    text: '本期完成',
    kind: 'cycle-done',
    status: 'completed',
    createdAt: '2026-09-23T23:59:59',
    completedAt: '2026-09-23T23:59:59',
  }],
};
const reopened = toggleProgressItem(markerTodo, 99, 'completed', '2026-09-23T12:00:00');
assert.equal(reopened.progress.some(p => p.kind === 'cycle-done'), false);

console.log('checkProgressTodos ok');
