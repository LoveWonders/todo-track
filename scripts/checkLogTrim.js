import assert from 'node:assert/strict';
import { applyLogTrim, isTodoOpLog } from '../src/utils/logTrim.js';

function entry(type, id) {
  return { id, type, message: type + id };
}

assert.equal(isTodoOpLog({ type: 'data' }), true);
assert.equal(isTodoOpLog({ type: 'info' }), false);
assert.equal(isTodoOpLog({ type: 'error' }), false);
assert.equal(isTodoOpLog({ type: 'success' }), false);

const mixed = [
  entry('data', 'd1'),
  entry('info', 'i1'),
  entry('data', 'd2'),
  entry('info', 'i2'),
  entry('error', 'e1'),
  entry('data', 'd3'),
];
const trimmed = applyLogTrim(mixed, 4, true);
assert.deepEqual(trimmed.map(e => e.id), ['d1', 'i1', 'd2', 'd3']);
assert.equal(trimmed.filter(isTodoOpLog).length, 3);

const allOps = [entry('data', 'a'), entry('data', 'b'), entry('data', 'c')];
assert.equal(applyLogTrim(allOps, 2, true).length, 3);

const under = [entry('info', 'x'), entry('data', 'y')];
assert.equal(applyLogTrim(under, 10, true), under);

assert.equal(applyLogTrim(mixed, 2, false), mixed);

const onlyRoutine = [entry('info', 'a'), entry('info', 'b'), entry('error', 'c')];
assert.deepEqual(applyLogTrim(onlyRoutine, 2, true).map(e => e.id), ['a', 'b']);

console.log('checkLogTrim ok');
