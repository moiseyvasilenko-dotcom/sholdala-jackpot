const test = require('node:test');
const assert = require('node:assert/strict');
const { createOutcome } = require('../slot-engine.js');

const people = [
  { id: 'a', name: 'А' },
  { id: 'b', name: 'Б' },
  { id: 'c', name: 'В' }
];

function sequence(...values) {
  let cursor = 0;
  return maximum => {
    const value = values[cursor++];
    assert.notEqual(value, undefined, 'закончилась тестовая последовательность');
    assert.ok(value >= 0 && value < maximum, `${value} должно быть меньше ${maximum}`);
    return value;
  };
}

test('roll 0..2999 produces a jackpot with one uniformly selected winner', () => {
  const outcome = createOutcome(people, sequence(2999, 1));
  assert.equal(outcome.kind, 'jackpot');
  assert.equal(outcome.winner, people[1]);
  assert.deepEqual(outcome.reels, [people[1], people[1], people[1]]);
});

test('roll 3000..7499 produces an explicit near miss with a random odd reel', () => {
  const outcome = createOutcome(people, sequence(3000, 0, 0, 2));
  assert.equal(outcome.kind, 'near');
  assert.equal(outcome.winner, null);
  assert.deepEqual(outcome.reels, [people[0], people[0], people[1]]);
});

test('roll 7500..9999 produces a non-jackpot random combination', () => {
  const outcome = createOutcome(people, sequence(9999, 0, 1, 2));
  assert.equal(outcome.kind, 'mixed');
  assert.equal(outcome.winner, null);
  assert.deepEqual(outcome.reels, people);
});

test('mixed outcome replaces the final reel when three random picks match', () => {
  const outcome = createOutcome(people, sequence(7500, 0, 0, 0, 0));
  assert.equal(outcome.kind, 'mixed');
  assert.deepEqual(outcome.reels, [people[0], people[0], people[1]]);
});

test('requires at least two eligible participants', () => {
  assert.throws(() => createOutcome([people[0]], sequence(0)), /at least two/i);
});
