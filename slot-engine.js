(function exposeSlotEngine(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SlotEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const JACKPOT_LIMIT = 1500;
  const NEAR_LIMIT = 6500;
  const ROLL_SIZE = 10000;

  function createOutcome(people, randomIndex) {
    if (!Array.isArray(people) || people.length < 2) {
      throw new Error('At least two eligible participants are required');
    }
    if (typeof randomIndex !== 'function') throw new Error('randomIndex is required');

    const roll = randomIndex(ROLL_SIZE);

    if (roll < JACKPOT_LIMIT) {
      const winner = people[randomIndex(people.length)];
      return { kind: 'jackpot', winner, reels: [winner, winner, winner] };
    }

    if (roll < NEAR_LIMIT) {
      const repeated = people[randomIndex(people.length)];
      const alternatives = people.filter(person => person !== repeated);
      const oddPerson = alternatives[randomIndex(alternatives.length)];
      const oddReel = randomIndex(3);
      const reels = [repeated, repeated, repeated];
      reels[oddReel] = oddPerson;
      return { kind: 'near', winner: null, reels };
    }

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

  return { createOutcome, JACKPOT_LIMIT, NEAR_LIMIT, ROLL_SIZE };
});
