const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createOutcome,
  createManagedOutcome,
  createPresentation,
  JACKPOT_LIMIT,
  NEAR_LIMIT,
  ROLL_SIZE
} = require('../slot-engine.js');

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

test('roll 0..1499 produces a jackpot with one uniformly selected winner', () => {
  const outcome = createOutcome(people, sequence(1499, 1));
  assert.equal(outcome.kind, 'jackpot');
  assert.equal(outcome.winner, people[1]);
  assert.deepEqual(outcome.reels, [people[1], people[1], people[1]]);
});

test('roll 1500..6499 produces an explicit near miss with a random odd reel', () => {
  const outcome = createOutcome(people, sequence(1500, 0, 0, 2));
  assert.equal(outcome.kind, 'near');
  assert.equal(outcome.winner, null);
  assert.deepEqual(outcome.reels, [people[0], people[0], people[1]]);
});

test('roll 6500..9999 produces a non-jackpot random combination', () => {
  const outcome = createOutcome(people, sequence(9999, 0, 1, 2));
  assert.equal(outcome.kind, 'mixed');
  assert.equal(outcome.winner, null);
  assert.deepEqual(outcome.reels, people);
});

test('mixed outcome replaces the final reel when three random picks match', () => {
  const outcome = createOutcome(people, sequence(6500, 0, 0, 0, 0));
  assert.equal(outcome.kind, 'mixed');
  assert.deepEqual(outcome.reels, [people[0], people[0], people[1]]);
});

test('requires at least two eligible participants', () => {
  assert.throws(() => createOutcome([people[0]], sequence(0)), /at least two/i);
});

test('the complete 10,000-roll probability space is exactly 15% jackpot, 50% near and 35% mixed', () => {
  const counts = { jackpot: 0, near: 0, mixed: 0 };

  for (let roll = 0; roll < ROLL_SIZE; roll += 1) {
    let firstDraw = true;
    const outcome = createOutcome(people, maximum => {
      if (firstDraw) {
        firstDraw = false;
        return roll;
      }
      return 0 % maximum;
    });
    counts[outcome.kind] += 1;
  }

  assert.equal(JACKPOT_LIMIT, 1500);
  assert.equal(NEAR_LIMIT, 6500);
  assert.deepEqual(counts, { jackpot: 1500, near: 5000, mixed: 3500 });
});

test('managed mode protects the first two spins after a jackpot', () => {
  const first = createManagedOutcome(people, sequence(0, 0, 0, 0), 0);
  const second = createManagedOutcome(people, sequence(0, 0, 0, 0), first.nextSpinsSinceJackpot);

  assert.equal(first.kind, 'near');
  assert.equal(first.spinNumber, 1);
  assert.equal(first.nextSpinsSinceJackpot, 1);
  assert.equal(second.kind, 'near');
  assert.equal(second.spinNumber, 2);
  assert.equal(second.nextSpinsSinceJackpot, 2);
});

test('managed mode allows a random jackpot from the third spin', () => {
  const outcome = createManagedOutcome(people, sequence(0, 1), 2);

  assert.equal(outcome.kind, 'jackpot');
  assert.equal(outcome.winner, people[1]);
  assert.equal(outcome.spinNumber, 3);
  assert.equal(outcome.nextSpinsSinceJackpot, 0);
});

test('managed mode guarantees a jackpot on the tenth spin', () => {
  const outcome = createManagedOutcome(people, sequence(2), 9);

  assert.equal(outcome.kind, 'jackpot');
  assert.equal(outcome.winner, people[2]);
  assert.equal(outcome.spinNumber, 10);
  assert.equal(outcome.nextSpinsSinceJackpot, 0);
});

test('presentation occasionally adds a false stop only to the final reel', () => {
  assert.deepEqual(createPresentation(sequence(0)), {
    falseStopReel: 2,
    pauseMs: 240,
    nudgeMs: 360
  });
  assert.deepEqual(createPresentation(sequence(39)), {
    falseStopReel: 2,
    pauseMs: 240,
    nudgeMs: 360
  });
  assert.deepEqual(createPresentation(sequence(40)), {
    falseStopReel: -1,
    pauseMs: 0,
    nudgeMs: 0
  });
});
