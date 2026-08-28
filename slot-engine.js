(function exposeSlotEngine(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SlotEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const JACKPOT_LIMIT = 1500;
  const NEAR_LIMIT = 6500;
  const ROLL_SIZE = 10000;

  function createNearOutcome(people, randomIndex) {
    const repeated = people[randomIndex(people.length)];
    const alternatives = people.filter(person => person !== repeated);
    const oddPerson = alternatives[randomIndex(alternatives.length)];
    const oddReel = randomIndex(3);
    const reels = [repeated, repeated, repeated];
    reels[oddReel] = oddPerson;
    return { kind: 'near', winner: null, reels };
  }

  function createMixedOutcome(people, randomIndex) {
    const reels = [
      people[randomIndex(people.length)],
      people[randomIndex(people.length)],
      people[randomIndex(people.length)]
    ];
    if (reels[0] === reels[1] && reels[1] === reels[2]) {
      const alternatives = people.filter(person => person !== reels[0]);
      reels[2] = alternatives[randomIndex(alternatives.length)];
    }
    return { kind: 'mixed', winner: null, reels };
  }

  function createJackpotOutcome(people, randomIndex) {
    const winner = people[randomIndex(people.length)];
    return { kind: 'jackpot', winner, reels: [winner, winner, winner] };
  }

  function validateInputs(people, randomIndex) {
    if (!Array.isArray(people) || people.length < 2) {
      throw new Error('At least two eligible participants are required');
    }
    if (typeof randomIndex !== 'function') throw new Error('randomIndex is required');
  }

  function createOutcome(people, randomIndex) {
    validateInputs(people, randomIndex);
    const roll = randomIndex(ROLL_SIZE);

    if (roll < JACKPOT_LIMIT) return createJackpotOutcome(people, randomIndex);
    if (roll < NEAR_LIMIT) return createNearOutcome(people, randomIndex);
    return createMixedOutcome(people, randomIndex);
  }

  function createManagedOutcome(people, randomIndex, spinsSinceJackpot = 0) {
    validateInputs(people, randomIndex);
    const completedSpins = Number.isInteger(spinsSinceJackpot)
      ? Math.max(0, Math.min(spinsSinceJackpot, 9))
      : 0;
    const spinNumber = completedSpins + 1;
    let outcome;

    if (spinNumber <= 2) {
      // Preserve the original 50:35 near/mixed ratio while jackpots are protected.
      outcome = randomIndex(8500) < 5000
        ? createNearOutcome(people, randomIndex)
        : createMixedOutcome(people, randomIndex);
    } else if (spinNumber >= 10) {
      outcome = createJackpotOutcome(people, randomIndex);
    } else {
      outcome = createOutcome(people, randomIndex);
    }

    return {
      ...outcome,
      spinNumber,
      nextSpinsSinceJackpot: outcome.kind === 'jackpot' ? 0 : spinNumber
    };
  }

  return {
    createOutcome,
    createManagedOutcome,
    JACKPOT_LIMIT,
    NEAR_LIMIT,
    ROLL_SIZE
  };
});
