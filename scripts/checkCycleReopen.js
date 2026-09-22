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
  hasCycleDoneThisCycle,
  hasCycleClosedThisCycle,
  getCycleMarkerThisCycle,
  getCycleStats,
  formatLocalDueIso,
} = await import('../src/utils/repeat.js');
const { closeCurrentCycle, reopenCurrentCycle } = await import('../src/utils/cycleTodos.js');

let id = 1;
const alloc = () => id++;
const now = new Date(2026, 8, 22, 10, 0, 0);
const nowIso = now.toISOString();
const due = formatLocalDueIso(new Date(2026, 8, 22, 23, 59, 59), null);

const bare = {
  id: 1,
  title: '每日复盘',
  status: 'active',
  repeatRule: 'daily',
  repeatAnchor: null,
  dueDate: due,
  progress: [],
  checklistMode: false,
};

const closed = closeCurrentCycle(bare, 'cycle-done', nowIso, alloc);
assert.equal(closed.status, 'active');
assert.equal(closed.progress.length, 1);
assert.equal(closed.progress[0].kind, 'cycle-done');
assert.equal(closed.progress[0].text, '本期完成');
assert.notEqual(closed.dueDate, due);
assert.equal(hasCycleDoneThisCycle(closed, now), true);
assert.equal(hasCycleClosedThisCycle(closed, now), true);
assert.equal(getCycleStats(closed, now).cycleDone, true);
assert.equal(getCycleMarkerThisCycle(closed, now)?.kind, 'cycle-done');

const again = closeCurrentCycle(closed, 'cycle-done', nowIso, alloc);
assert.equal(again, closed);

const reopened = reopenCurrentCycle(closed, now);
assert.equal(reopened.dueDate, due);
assert.equal(reopened.progress.length, 0);
assert.equal(hasCycleClosedThisCycle(reopened, now), false);

const weeklyDue = formatLocalDueIso(new Date(2026, 8, 23, 23, 59, 59), null);
const weekly = {
  id: 2,
  title: '周报',
  status: 'active',
  repeatRule: 'weekly',
  repeatAnchor: 3,
  dueDate: weeklyDue,
  progress: [],
};
const weeklyClosed = closeCurrentCycle(weekly, 'cycle-done', nowIso, alloc);
assert.equal(hasCycleDoneThisCycle(weeklyClosed, now), true);
assert.ok(weeklyClosed.dueDate > weeklyDue);
const weeklyReopen = reopenCurrentCycle(weeklyClosed, now);
assert.equal(weeklyReopen.dueDate, weeklyDue);

const withKids = {
  id: 3,
  title: '清单',
  status: 'active',
  repeatRule: 'daily',
  dueDate: due,
  checklistMode: true,
  progress: [
    { id: 10, text: 'A', status: 'active', createdAt: nowIso },
    { id: 11, text: 'B', status: 'completed', createdAt: nowIso, completedAt: nowIso },
  ],
};
const kidsClosed = closeCurrentCycle(withKids, 'cycle-done', nowIso, alloc);
assert.equal(kidsClosed.progress.filter(p => p.kind === 'cycle-done').length, 1);
assert.ok(kidsClosed.progress.some(p => p.text === 'A' && p.status === 'completed'));
const kidsReopen = reopenCurrentCycle(kidsClosed, now);
assert.equal(kidsReopen.dueDate, due);
assert.equal(kidsReopen.progress.some(p => p.kind === 'cycle-done'), false);
assert.ok(kidsReopen.progress.some(p => p.text === 'A' && p.status === 'active'));
assert.ok(kidsReopen.progress.some(p => p.text === 'B' && p.status === 'completed'));

const skipped = closeCurrentCycle(bare, 'cycle-skip', nowIso, alloc);
assert.equal(hasCycleClosedThisCycle(skipped, now), true);
assert.equal(hasCycleDoneThisCycle(skipped, now), false);
assert.equal(reopenCurrentCycle(skipped, now).progress.length, 0);

console.log('cycle reopen checks passed');
