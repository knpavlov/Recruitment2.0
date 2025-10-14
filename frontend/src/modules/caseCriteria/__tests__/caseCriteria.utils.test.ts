import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { cloneCriterion, createEmptyCriterion, serializeCriteria } from '../utils';

const buildCriterion = (overrides?: Partial<ReturnType<typeof createEmptyCriterion>>) => ({
  id: 'criterion-1',
  title: ' Структура кейса ',
  ratings: {
    1: ' слабое структурирование ',
    3: '  уверенный подход  '
  },
  ...overrides
});

test('serializeCriteria normalizes whitespace and ids', () => {
  const first = buildCriterion();
  const second = buildCriterion({ title: 'Структура кейса' });
  const snapshot = serializeCriteria([first]);
  const comparison = serializeCriteria([second]);
  assert.equal(snapshot, comparison);
});

test('cloneCriterion returns a deep copy', () => {
  const original = buildCriterion();
  const cloned = cloneCriterion(original);
  assert.notStrictEqual(cloned, original);
  assert.notStrictEqual(cloned.ratings, original.ratings);
  cloned.ratings[5] = 'отличный результат';
  assert.equal(original.ratings[5], undefined);
});

test('createEmptyCriterion issues unique identifiers', () => {
  const first = createEmptyCriterion();
  const second = createEmptyCriterion();
  assert.ok(first.id);
  assert.ok(second.id);
  assert.notEqual(first.id, second.id);
  assert.equal(first.title, '');
  assert.deepEqual(first.ratings, {});
});
